// PokeBucks ($PKB) on-chain utilities
// Contract: 0x5114fA131C4C0100c29c30563efd121363d51cdC (Polygon Mainnet)

export const PKB_CONTRACT = '0x5114fA131C4C0100c29c30563efd121363d51cdC';
const POLYGON_CHAIN_ID = '0x89'; // 137

// Multiple RPC endpoints tried in order — first one that responds wins
const POLYGON_RPCS = [
  'https://polygon.llamarpc.com',
  'https://rpc.ankr.com/polygon',
  'https://polygon-bor-rpc.publicnode.com',
];

// ─── Raw Polygon JSON-RPC ────────────────────────────────────────────────────

async function ethCall(to: string, data: string): Promise<string> {
  let lastErr: Error = new Error('All RPC endpoints failed');
  for (const rpc of POLYGON_RPCS) {
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', method: 'eth_call',
          params: [{ to, data }, 'latest'],
          id: 1,
        }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? 'RPC error');
      if (json.result !== undefined) return json.result as string;
    } catch (err) {
      lastErr = err as Error;
    }
  }
  throw lastErr;
}

// Cache decimals — only fetched once per session
let _decimals: number | null = null;
async function getDecimals(): Promise<number> {
  if (_decimals !== null) return _decimals;
  const result = await ethCall(PKB_CONTRACT, '0x313ce567');
  // result is a 32-byte hex; decimals is the last byte
  _decimals = parseInt(result.slice(-2), 16);
  if (isNaN(_decimals) || _decimals < 0 || _decimals > 77) _decimals = 18;
  return _decimals;
}

/** Returns the human-readable $PKB balance (e.g. 250, not 250 * 10^18). */
export async function getOnChainPkbBalance(address: string): Promise<number> {
  const paddedAddr = address.replace(/^0x/, '').padStart(64, '0');
  const [rawHex, decimals] = await Promise.all([
    ethCall(PKB_CONTRACT, '0x70a08231' + paddedAddr),
    getDecimals(),
  ]);
  if (!rawHex || rawHex === '0x' || rawHex === '0x0') return 0;
  const raw = BigInt(rawHex);
  const divisor = 10n ** BigInt(decimals);
  return Number(raw / divisor);
}

// ─── MetaMask helpers ────────────────────────────────────────────────────────

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

export function isMetaMaskAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

/** Prompts MetaMask, switches to Polygon if needed, returns the wallet address. */
export async function connectMetaMask(): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to connect your wallet.');
  }

  const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts.length) throw new Error('No accounts returned from MetaMask.');

  const chainId = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
  if (chainId.toLowerCase() !== POLYGON_CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_CHAIN_ID }],
      });
    } catch {
      // Chain not in MetaMask yet — add it
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: POLYGON_CHAIN_ID,
          chainName: 'Polygon Mainnet',
          nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
          rpcUrls: ['https://polygon-rpc.com'],
          blockExplorerUrls: ['https://polygonscan.com'],
        }],
      });
    }
  }

  return accounts[0];
}

/** Shortens an Ethereum address for display: 0x1234...abcd */
export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
