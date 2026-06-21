import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PKB_CONTRACT = "0x5114fA131C4C0100c29c30563efd121363d51cdC";
const POLYGON_RPCS = [
  "https://polygon.llamarpc.com",
  "https://rpc.ankr.com/polygon",
  "https://polygon-bor-rpc.publicnode.com",
];
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

async function getProvider(): Promise<ethers.JsonRpcProvider> {
  for (const rpc of POLYGON_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getNetwork(); // verify connectivity
      return provider;
    } catch {
      // try next
    }
  }
  throw new Error("All Polygon RPC endpoints failed");
}

async function getTreasuryWallet(provider: ethers.JsonRpcProvider) {
  const privateKey = Deno.env.get("PKB_TREASURY_PRIVATE_KEY");
  if (!privateKey) throw new Error("PKB_TREASURY_PRIVATE_KEY secret is not configured.");
  return new ethers.Wallet(privateKey, provider);
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return respond({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const action: string = body.action ?? "transfer";

    // Return treasury address (public info — no private key exposed)
    if (action === "get-treasury-address") {
      const privateKey = Deno.env.get("PKB_TREASURY_PRIVATE_KEY");
      if (!privateKey) return respond({ error: "PKB_TREASURY_PRIVATE_KEY not configured" }, 500);
      const wallet = new ethers.Wallet(privateKey);
      return respond({ address: wallet.address });
    }

    // Transfer PKB from treasury to customer's wallet after a purchase
    if (action === "transfer") {
      const { order_id } = body;
      if (!order_id) return respond({ error: "order_id required" }, 400);

      // Verify the order belongs to this user and get the wallet address from their profile
      const [orderRes, profileRes] = await Promise.all([
        supabase.from("orders").select("id, total, user_id").eq("id", order_id).eq("user_id", user.id).single(),
        supabase.from("profiles").select("wallet_address").eq("id", user.id).single(),
      ]);

      if (orderRes.error || !orderRes.data) return respond({ error: "Order not found" }, 404);
      const walletAddress: string | null = profileRes.data?.wallet_address ?? null;
      if (!walletAddress) return respond({ error: "No wallet address linked to this account" }, 400);

      // Find the "earned" ledger entry for this order
      const { data: ledgerEntry } = await supabase
        .from("rewards_ledger")
        .select("id, amount, pkb_tx_hash")
        .eq("order_id", order_id)
        .eq("type", "earned")
        .maybeSingle();

      if (!ledgerEntry) return respond({ error: "No PKB earned entry found for this order" }, 404);
      if (ledgerEntry.pkb_tx_hash) {
        // Already transferred — idempotent
        return respond({ success: true, tx_hash: ledgerEntry.pkb_tx_hash, already_sent: true });
      }

      const earnAmount = Math.floor(Number(ledgerEntry.amount)); // display units (e.g. 250)
      if (earnAmount <= 0) return respond({ error: "Zero PKB to transfer" }, 400);

      // Build on-chain transfer
      const provider = await getProvider();
      const treasury = await getTreasuryWallet(provider);
      const contract = new ethers.Contract(PKB_CONTRACT, ERC20_ABI, treasury);

      const decimals: number = await contract.decimals();
      const tokenAmount = BigInt(earnAmount) * 10n ** BigInt(decimals);

      const tx = await (contract.transfer as (to: string, amount: bigint) => Promise<ethers.TransactionResponse>)(walletAddress, tokenAmount);
      await tx.wait(1); // wait for 1 confirmation

      // Record tx hash on the ledger entry
      await supabase
        .from("rewards_ledger")
        .update({ pkb_tx_hash: tx.hash })
        .eq("id", ledgerEntry.id);

      return respond({ success: true, tx_hash: tx.hash, amount_pkb: earnAmount });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);

  } catch (err: any) {
    console.error("pkb-transfer error:", err.message);
    return respond({ error: err.message ?? "Unknown error" }, 500);
  }
});
