import { parseEther } from 'viem';

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';
const VAULT_ADDR: string | undefined = (import.meta as any).env?.VITE_VAULT_ADDR;

function requireVaultAddr(): string {
  if (!VAULT_ADDR || !VAULT_ADDR.startsWith('0x') || VAULT_ADDR.length !== 42) {
    throw new Error('VITE_VAULT_ADDR is not set or invalid in frontend/.env.local');
  }
  return VAULT_ADDR;
}

function toHex(value: bigint): string {
  return '0x' + value.toString(16);
}

async function fetchJson(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
}

export async function getSelectors(): Promise<{ depositSelector: string }> {
  const json = await fetchJson(`${API_BASE}/api/vault/selectors`);
  return json?.data || {};
}

export async function encodeSetTriggers(stopLossPrice: string, takeProfitPrice: string): Promise<string> {
  const json = await fetchJson(`${API_BASE}/api/vault/encode-set-triggers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stopLossPrice, takeProfitPrice }),
  });
  const data = json?.data?.data;
  if (!data || typeof data !== 'string') throw new Error('encode-set-triggers returned empty data');
  return data;
}

export async function depositETH(from: string, amountEth: string): Promise<string> {
  if (!window.ethereum) throw new Error('MetaMask not available');
  const to = requireVaultAddr();
  const { depositSelector } = await getSelectors();
  const value = toHex(parseEther(amountEth));
  const txParams: any = {
    from,
    to,
    value,
    data: depositSelector, // deposit() selector; no args
  };
  const txHash: string = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [txParams],
  });
  return txHash;
}

export async function setTriggersUSD(from: string, stopLossUsd: string, takeProfitUsd: string): Promise<string> {
  if (!window.ethereum) throw new Error('MetaMask not available');
  const to = requireVaultAddr();
  const data = await encodeSetTriggers(stopLossUsd, takeProfitUsd);
  const txParams: any = {
    from,
    to,
    data,
    value: '0x0',
  };
  const txHash: string = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [txParams],
  });
  return txHash;
}

export async function getPosition(userAddress: string): Promise<{
  position: {
    amountETH: string;
    stopLossPrice18: string;
    takeProfitPrice18: string;
    active: boolean;
    depositTime: number;
  };
  currentPrice: string;
  priceConfidence: string;
  canExecute: boolean;
  triggerDistance: { stopLoss: string; takeProfit: string };
}> {
  const vaultAddress = requireVaultAddr();
  const json = await fetchJson(
    `${API_BASE}/api/vault/positions/${userAddress}?vaultAddress=${vaultAddress}`
  );
  return json?.data;
}

export async function executeOnce(userAddress: string): Promise<{
  txHash: string;
  executed: boolean;
  triggerType: string;
  price18: string;
  amount: string;
  gasUsed: string;
  gasPrice: string;
}> {
  const vaultAddress = requireVaultAddr();
  const json = await fetchJson(`${API_BASE}/api/vault/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userAddress,
      vaultAddress,
      // backend uses defaults for maxStaleSecs/maxConfBps
    }),
  });
  return json?.data;
}

export async function getKeeperHealth(): Promise<any> {
  // Backend does not expose /api/vault/keeper-health; use Pyth health instead
  return fetchJson(`${API_BASE}/api/pyth/health`);
}

export async function getCurrentPrice(): Promise<{ price18: string; conf18: string }> {
  const vaultAddress = requireVaultAddr();
  const json = await fetchJson(
    `${API_BASE}/api/vault/current-price?vaultAddress=${vaultAddress}`
  );
  return json?.data || { price18: '0', conf18: '0' };
}
