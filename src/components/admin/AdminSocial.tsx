import { useEffect, useState } from 'react';
import {
  Facebook,
  Instagram,
  Send,
  Clock,
  Calendar,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Plus,
  X,
  Key,
  Wifi,
  WifiOff,
  Pencil,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Platform = 'facebook' | 'instagram' | 'both';
type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

interface SocialPost {
  id: string;
  platform: Platform;
  content: string;
  image_url: string | null;
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  facebook_post_id: string | null;
  instagram_post_id: string | null;
  error_message: string | null;
  created_at: string;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  both: 'Both',
};

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft:      { label: 'Draft',      color: 'bg-gray-100 text-gray-600 border-gray-200',   icon: Clock },
  scheduled:  { label: 'Scheduled',  color: 'bg-blue-50 text-blue-700 border-blue-200',    icon: Calendar },
  publishing: { label: 'Publishing', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Loader2 },
  published:  { label: 'Published',  color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  failed:     { label: 'Failed',     color: 'bg-red-50 text-red-700 border-red-200',       icon: XCircle },
};

function PlatformIcon({ platform, size = 'md' }: { platform: Platform; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <span className="inline-flex items-center gap-1">
      {(platform === 'facebook' || platform === 'both') && (
        <Facebook className={`${cls} text-blue-600`} />
      )}
      {(platform === 'instagram' || platform === 'both') && (
        <Instagram className={`${cls} text-pink-500`} />
      )}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const FILTER_TABS: { key: PostStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Published' },
  { key: 'failed', label: 'Failed' },
  { key: 'draft', label: 'Drafts' },
];

export default function AdminSocial() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PostStatus | 'all'>('all');
  const [showComposer, setShowComposer] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  // Composer state
  const [platform, setPlatform] = useState<Platform>('both');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [saving, setSaving] = useState(false);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<{ checked: boolean; connected: boolean; pageName?: string; error?: string }>({ checked: false, connected: false });
  const [checkingConnection, setCheckingConnection] = useState(false);

  // Action loading state (by post ID)
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('social_posts')
      .select('*')
      .order('created_at', { ascending: false });
    setPosts((data ?? []) as SocialPost[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    supabase.functions.invoke('social-post', { body: { action: 'check-scheduled' } }).catch(() => {});
  }, []);

  const checkConnection = async () => {
    setCheckingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-post', { body: { action: 'check' } });
      if (error) throw new Error(error.message);
      setConnectionStatus({ checked: true, connected: data?.connected === true, pageName: data?.pageName, error: data?.error });
    } catch (err: any) {
      setConnectionStatus({ checked: true, connected: false, error: err.message });
    } finally {
      setCheckingConnection(false);
    }
  };

  const setAction = (id: string, on: boolean) =>
    setActionLoading((prev) => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });

  const handlePublishNow = async (post: SocialPost) => {
    setAction(post.id, true);
    try {
      const { data, error } = await supabase.functions.invoke('social-post', {
        body: { action: 'publish', post_id: post.id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
    } catch {
      // error stored in DB by edge function
    } finally {
      setAction(post.id, false);
      await fetchPosts();
    }
  };

  const handleDelete = async (post: SocialPost) => {
    const isPublished = post.status === 'published' && post.facebook_post_id;
    const msg = isPublished
      ? 'Delete this post from your website AND Facebook?'
      : 'Delete this post?';
    if (!confirm(msg)) return;

    setAction(post.id, true);
    try {
      const { data, error } = await supabase.functions.invoke('social-post', {
        body: { action: 'delete', post_id: post.id },
      });
      if (error) throw new Error(error.message);
      if (data?.warnings?.length) {
        console.warn('Delete warnings:', data.warnings);
      }
    } catch {
      // Still remove from local list — DB delete succeeded even if FB call failed
    } finally {
      setAction(post.id, false);
      await fetchPosts();
    }
  };

  const openEditor = (post: SocialPost) => {
    setEditingPost(post);
    setContent(post.content);
    setImageUrl(post.image_url ?? '');
    setPlatform(post.platform);
    setIsScheduled(false);
    setScheduleDate('');
    setScheduleTime('12:00');
    setShowComposer(false);
  };

  const closeEditor = () => {
    setEditingPost(null);
    resetComposer();
  };

  const handleUpdate = async () => {
    if (!editingPost || !content.trim()) return;
    setSaving(true);
    try {
      const isPublished = editingPost.status === 'published' && editingPost.facebook_post_id;

      if (isPublished) {
        // Update via edge function so it syncs to Facebook
        const { data, error } = await supabase.functions.invoke('social-post', {
          body: { action: 'update', post_id: editingPost.id, content: content.trim() },
        });
        if (error) throw new Error(error.message);
        if (data?.warnings?.length) {
          alert(`Saved locally. Note: ${data.warnings.join('; ')}`);
        }
      } else {
        // Draft/scheduled — just update DB directly
        await supabase.from('social_posts').update({
          content: content.trim(),
          image_url: imageUrl.trim() || null,
          platform,
        }).eq('id', editingPost.id);
      }
    } finally {
      setSaving(false);
      closeEditor();
      await fetchPosts();
    }
  };

  const resetComposer = () => {
    setContent('');
    setImageUrl('');
    setPlatform('both');
    setIsScheduled(false);
    setScheduleDate('');
    setScheduleTime('12:00');
  };

  const handleSave = async (mode: 'publish' | 'schedule' | 'draft') => {
    if (!content.trim()) return;
    setSaving(true);

    let scheduledAt: string | null = null;
    if (mode === 'schedule' && scheduleDate) {
      scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
    }

    const { data: newPost, error } = await supabase
      .from('social_posts')
      .insert({
        platform,
        content: content.trim(),
        image_url: imageUrl.trim() || null,
        status: mode === 'draft' ? 'draft' : mode === 'schedule' ? 'scheduled' : 'draft',
        scheduled_at: scheduledAt,
      })
      .select()
      .single();

    if (!error && newPost && mode === 'publish') {
      setSaving(false);
      setShowComposer(false);
      resetComposer();
      await fetchPosts();
      setAction(newPost.id, true);
      await supabase.functions.invoke('social-post', { body: { action: 'publish', post_id: newPost.id } }).catch(() => {});
      setAction(newPost.id, false);
    } else {
      setSaving(false);
      if (!error) { setShowComposer(false); resetComposer(); }
    }
    await fetchPosts();
  };

  const filteredPosts = filter === 'all' ? posts : posts.filter((p) => p.status === filter);

  const instagramWarning = (platform === 'instagram' || platform === 'both') && !imageUrl.trim();
  const charLimit = platform === 'instagram' ? 2200 : 63206;
  const charCount = content.length;

  const isEditing = !!editingPost;
  const editIsPublished = editingPost?.status === 'published' && !!editingPost?.facebook_post_id;

  return (
    <div className="p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {connectionStatus.checked ? (
            <button
              onClick={checkConnection}
              disabled={checkingConnection}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                connectionStatus.connected
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              }`}
            >
              {connectionStatus.connected
                ? <><Wifi className="w-3 h-3" />{connectionStatus.pageName ?? 'Connected'}</>
                : <><WifiOff className="w-3 h-3" />Not connected</>}
            </button>
          ) : (
            <button
              onClick={checkConnection}
              disabled={checkingConnection}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors"
            >
              {checkingConnection ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
              {checkingConnection ? 'Checking...' : 'Test Connection'}
            </button>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={() => { setShowComposer(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-pink-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        )}
      </div>

      {/* Edit panel */}
      {isEditing && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900 text-sm">Edit Post</span>
              {editIsPublished && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                  Will update on Facebook
                </span>
              )}
              {editingPost.instagram_post_id && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  Instagram captions cannot be edited via API
                </span>
              )}
            </div>
            <button onClick={closeEditor} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Platform selector — only for non-published posts */}
            {!editIsPublished && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Platform</label>
                <div className="flex gap-2">
                  {(['facebook', 'instagram', 'both'] as Platform[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        platform === p
                          ? p === 'facebook' ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : p === 'instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-sm'
                            : 'bg-gradient-to-r from-blue-600 to-pink-500 text-white border-transparent shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {p === 'facebook' && <Facebook className="w-3.5 h-3.5" />}
                      {p === 'instagram' && <Instagram className="w-3.5 h-3.5" />}
                      {p === 'both' && <><Facebook className="w-3.5 h-3.5" /><Instagram className="w-3.5 h-3.5" /></>}
                      {PLATFORM_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Caption / Post Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Write your post content here..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{content.length.toLocaleString()} characters</p>
            </div>

            {/* Image URL — only for non-published posts */}
            {!editIsPublished && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Image URL</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full pl-9 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {imageUrl && (
                    <div className="w-12 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                      <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={closeEditor}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={saving || !content.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              {editIsPublished ? 'Update Post' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Composer */}
      {showComposer && !isEditing && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-pink-50">
            <div className="flex items-center gap-2">
              <Facebook className="w-4 h-4 text-blue-600" />
              <Instagram className="w-4 h-4 text-pink-500" />
              <span className="font-semibold text-gray-900 text-sm">Compose Post</span>
            </div>
            <button onClick={() => { setShowComposer(false); resetComposer(); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Platform selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Platform</label>
              <div className="flex gap-2">
                {(['facebook', 'instagram', 'both'] as Platform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      platform === p
                        ? p === 'facebook' ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : p === 'instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-sm'
                          : 'bg-gradient-to-r from-blue-600 to-pink-500 text-white border-transparent shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {p === 'facebook' && <Facebook className="w-3.5 h-3.5" />}
                    {p === 'instagram' && <Instagram className="w-3.5 h-3.5" />}
                    {p === 'both' && <><Facebook className="w-3.5 h-3.5" /><Instagram className="w-3.5 h-3.5" /></>}
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Caption / Post Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={charLimit}
                placeholder="Write your post content here... #pokemon #trading #cards"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${charCount > charLimit * 0.9 ? 'text-red-500' : 'text-gray-400'}`}>
                  {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                </span>
                {instagramWarning && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="w-3 h-3" />
                    Instagram requires an image
                  </span>
                )}
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Image URL
                {(platform === 'instagram' || platform === 'both') && (
                  <span className="ml-1.5 text-pink-500 font-normal normal-case">(required for Instagram)</span>
                )}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-9 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {imageUrl && (
                  <div className="w-12 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
            </div>

            {/* Schedule toggle */}
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Schedule for later</span>
                </div>
                <button
                  onClick={() => setIsScheduled(!isScheduled)}
                  className="relative rounded-full transition-colors"
                  style={{ width: 40, height: 22, backgroundColor: isScheduled ? '#2563eb' : '#d1d5db' }}
                >
                  <div className="absolute bg-white rounded-full shadow transition-all" style={{ width: 18, height: 18, top: 2, left: isScheduled ? 20 : 2 }} />
                </button>
              </div>
              {isScheduled && (
                <div className="flex gap-3">
                  <input
                    type="date"
                    value={scheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving || !content.trim()}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Draft
            </button>
            <div className="flex items-center gap-2">
              {isScheduled ? (
                <button
                  onClick={() => handleSave('schedule')}
                  disabled={saving || !content.trim() || !scheduleDate || (instagramWarning)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  Schedule
                </button>
              ) : (
                <button
                  onClick={() => handleSave('publish')}
                  disabled={saving || !content.trim() || instagramWarning}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-pink-500 hover:opacity-90 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Post Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {FILTER_TABS.map(({ key, label }) => {
          const count = key === 'all' ? posts.length : posts.filter((p) => p.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setFilter(key as PostStatus | 'all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${filter === key ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Posts list */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />)
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Facebook className="w-8 h-8 text-blue-200" />
              <Instagram className="w-8 h-8 text-pink-200" />
            </div>
            <p className="text-sm text-gray-400">No posts yet. Create your first post above.</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const StatusIcon = STATUS_CONFIG[post.status].icon;
            const isActing = actionLoading.has(post.id);
            const isThisEditing = editingPost?.id === post.id;
            return (
              <div
                key={post.id}
                className={`bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-shadow ${
                  isThisEditing ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4 p-5">
                  {/* Image thumbnail */}
                  {post.image_url ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                      <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-300" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <PlatformIcon platform={post.platform} />
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CONFIG[post.status].color}`}>
                        {post.status === 'publishing' || isActing
                          ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          : <StatusIcon className="w-2.5 h-2.5" />}
                        {isActing ? 'Publishing...' : STATUS_CONFIG[post.status].label}
                      </span>
                      {post.scheduled_at && post.status === 'scheduled' && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDate(post.scheduled_at)}
                        </span>
                      )}
                      {post.published_at && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5 text-green-500" />
                          {formatDate(post.published_at)}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-800 line-clamp-3 leading-relaxed">{post.content}</p>

                    {post.error_message && (
                      <p className="mt-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 line-clamp-2">
                        {post.error_message}
                      </p>
                    )}

                    {/* Published links */}
                    <div className="flex items-center gap-2 mt-2">
                      {post.facebook_post_id && (
                        <a
                          href={`https://www.facebook.com/${post.facebook_post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800"
                        >
                          <Facebook className="w-3 h-3" />
                          View on Facebook
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {post.instagram_post_id && (
                        <a
                          href={`https://www.instagram.com/p/${post.instagram_post_id}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-medium text-pink-600 hover:text-pink-800"
                        >
                          <Instagram className="w-3 h-3" />
                          View on Instagram
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(post.status === 'draft' || post.status === 'failed' || post.status === 'scheduled') && (
                      <button
                        onClick={() => handlePublishNow(post)}
                        disabled={isActing}
                        title="Publish now"
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                      >
                        {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    )}
                    {post.status === 'failed' && (
                      <button
                        onClick={() => handlePublishNow(post)}
                        disabled={isActing}
                        title="Retry"
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditor(post)}
                      title="Edit"
                      disabled={isActing}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(post)}
                      title={post.facebook_post_id ? 'Delete from website & Facebook' : 'Delete'}
                      disabled={isActing}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Setup guide (shown when not yet connected) */}
      {connectionStatus.checked && !connectionStatus.connected && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-amber-100 bg-amber-50">
            <Key className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">Setup Required</h3>
          </div>
          <div className="p-6 space-y-3 text-sm text-gray-600">
            <p>Add these secrets to Supabase (Project Settings → Edge Functions → Secrets):</p>
            {[
              { name: 'FACEBOOK_PAGE_ACCESS_TOKEN', desc: 'Long-lived Page Access Token from your Facebook App' },
              { name: 'FACEBOOK_PAGE_ID', desc: 'Your Facebook Page ID (found in Page Settings)' },
              { name: 'INSTAGRAM_USER_ID', desc: 'Instagram Business Account ID linked to your Facebook Page' },
            ].map(({ name, desc }) => (
              <div key={name} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <code className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100 whitespace-nowrap flex-shrink-0">{name}</code>
                <span className="text-xs text-gray-500 pt-1">{desc}</span>
              </div>
            ))}
            <a
              href="https://developers.facebook.com/docs/pages/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              Facebook for Developers — Get Started
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
