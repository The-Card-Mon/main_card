import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GRAPH = "https://graph.facebook.com/v21.0";

async function postToFacebook(
  pageId: string,
  token: string,
  content: string,
  imageUrl?: string | null,
): Promise<string> {
  let url: string;
  let body: Record<string, string>;

  if (imageUrl) {
    // Photo post
    url = `${GRAPH}/${pageId}/photos`;
    body = { url: imageUrl, caption: content, access_token: token };
  } else {
    // Text-only post
    url = `${GRAPH}/${pageId}/feed`;
    body = { message: content, access_token: token };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Facebook: ${data.error?.message ?? `HTTP ${res.status}`}`);
  }
  return data.id ?? data.post_id ?? "";
}

async function updateFacebookPost(postId: string, token: string, message: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Facebook update: ${data.error?.message ?? `HTTP ${res.status}`}`);
  }
}

async function deleteFacebookPost(postId: string, token: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${postId}?access_token=${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
  const data = await res.json();
  // error code 100 = object does not exist — treat as already deleted
  if (!res.ok && data.error && data.error.code !== 100) {
    throw new Error(`Facebook delete: ${data.error?.message ?? `HTTP ${res.status}`}`);
  }
}

async function postToInstagram(
  igUserId: string,
  token: string,
  content: string,
  imageUrl: string,
): Promise<string> {
  // Step 1: create media container
  const containerRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption: content, access_token: token }),
  });
  const containerData = await containerRes.json();
  if (!containerRes.ok || containerData.error) {
    throw new Error(`Instagram container: ${containerData.error?.message ?? `HTTP ${containerRes.status}`}`);
  }
  const creationId: string = containerData.id;

  // Step 2: publish
  const publishRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok || publishData.error) {
    throw new Error(`Instagram publish: ${publishData.error?.message ?? `HTTP ${publishRes.status}`}`);
  }
  return publishData.id ?? "";
}

async function publishPost(
  supabase: ReturnType<typeof createClient>,
  post: Record<string, any>,
): Promise<void> {
  const pageId = Deno.env.get("FACEBOOK_PAGE_ID") ?? "";
  const token = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN") ?? "";
  const igUserId = Deno.env.get("INSTAGRAM_USER_ID") ?? "";

  if (!pageId || !token) {
    throw new Error("FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN secrets are required.");
  }

  const platform: string = post.platform;
  const needsInstagram = platform === "instagram" || platform === "both";
  const needsFacebook = platform === "facebook" || platform === "both";

  if (needsInstagram && !igUserId) {
    throw new Error("INSTAGRAM_USER_ID secret is required for Instagram posts.");
  }
  if (needsInstagram && !post.image_url) {
    throw new Error("Instagram requires an image URL (Instagram feed posts must include a photo).");
  }

  // Mark as publishing
  await supabase.from("social_posts").update({ status: "publishing" }).eq("id", post.id);

  let facebookPostId: string | null = null;
  let instagramPostId: string | null = null;
  const errors: string[] = [];

  if (needsFacebook) {
    try {
      facebookPostId = await postToFacebook(pageId, token, post.content, post.image_url);
    } catch (err: any) {
      errors.push(err.message);
    }
  }

  if (needsInstagram) {
    try {
      instagramPostId = await postToInstagram(igUserId, token, post.content, post.image_url);
    } catch (err: any) {
      errors.push(err.message);
    }
  }

  const allFailed = errors.length > 0 && !facebookPostId && !instagramPostId;
  const partialSuccess = errors.length > 0 && (facebookPostId || instagramPostId);

  await supabase.from("social_posts").update({
    status: allFailed ? "failed" : "published",
    published_at: allFailed ? null : new Date().toISOString(),
    facebook_post_id: facebookPostId,
    instagram_post_id: instagramPostId,
    error_message: errors.length > 0
      ? (partialSuccess ? `Partial: ${errors.join("; ")}` : errors.join("; "))
      : null,
  }).eq("id", post.id);

  if (allFailed) throw new Error(errors.join("; "));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = await req.json();
    const action: string = body.action;

    // Check connection only
    if (action === "check") {
      const pageId = Deno.env.get("FACEBOOK_PAGE_ID") ?? "";
      const token = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN") ?? "";
      if (!pageId || !token) {
        return respond({ connected: false, error: "Missing FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN" });
      }
      const res = await fetch(`${GRAPH}/${pageId}?fields=name,id&access_token=${token}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        return respond({ connected: false, error: data.error?.message ?? "Invalid credentials" });
      }
      return respond({ connected: true, pageName: data.name });
    }

    // Publish a specific post now
    if (action === "publish") {
      const { post_id } = body;
      if (!post_id) return respond({ error: "post_id required" }, 400);

      const { data: post, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("id", post_id)
        .single();

      if (error || !post) return respond({ error: "Post not found" }, 404);

      await publishPost(supabase, post);
      return respond({ success: true });
    }

    if (action === "update") {
      const { post_id, content } = body;
      if (!post_id || !content) return respond({ error: "post_id and content required" }, 400);

      const token = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN") ?? "";
      if (!token) return respond({ error: "FACEBOOK_PAGE_ACCESS_TOKEN not configured" }, 500);

      const { data: post, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("id", post_id)
        .single();

      if (error || !post) return respond({ error: "Post not found" }, 404);

      const warnings: string[] = [];

      if (post.facebook_post_id) {
        try {
          await updateFacebookPost(post.facebook_post_id, token, content);
        } catch (err: any) {
          warnings.push(err.message);
        }
      }

      // Instagram does not support caption edits via the API
      await supabase.from("social_posts").update({
        content,
        error_message: warnings.length > 0 ? `DB updated; ${warnings.join("; ")}` : null,
      }).eq("id", post_id);

      return respond({ success: true, warnings: warnings.length > 0 ? warnings : undefined });
    }

    if (action === "delete") {
      const { post_id } = body;
      if (!post_id) return respond({ error: "post_id required" }, 400);

      const token = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN") ?? "";

      const { data: post, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("id", post_id)
        .single();

      if (error || !post) return respond({ error: "Post not found" }, 404);

      const warnings: string[] = [];

      if (post.facebook_post_id && token) {
        try {
          await deleteFacebookPost(post.facebook_post_id, token);
        } catch (err: any) {
          warnings.push(err.message);
        }
      }

      await supabase.from("social_posts").delete().eq("id", post_id);

      return respond({ success: true, warnings: warnings.length > 0 ? warnings : undefined });
    }

    // Check for scheduled posts that are due
    if (action === "check-scheduled") {
      const { data: duePosts } = await supabase
        .from("social_posts")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_at", new Date().toISOString());

      if (!duePosts || duePosts.length === 0) {
        return respond({ published: 0 });
      }

      let published = 0;
      let failed = 0;
      for (const post of duePosts) {
        try {
          await publishPost(supabase, post);
          published++;
        } catch {
          failed++;
        }
      }

      return respond({ published, failed });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);

  } catch (err: any) {
    console.error("social-post error:", err.message);
    return respond({ error: err.message ?? "Unknown error" }, 500);
  }
});
