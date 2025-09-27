import { createPublicClient, createWalletClient, custom, http, Hex, Address, parseUnits } from 'viem';

export type OrdersConfig = {
  coins: Address;
  orderManager: Address;
  pyth: Address;
  ethUsdFeedId: string;
  rpcUrl: string;
  network: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Minimal ABIs
const coinsAbi = [
  { type: 'function', name: 'hasClaimed', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'claim', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

const orderManagerAbi = [
  { type: 'function', name: 'createOrder', stateMutability: 'nonpayable', inputs: [
    { name: 'amount', type: 'uint256' },
    { name: 'stopLossPrice18', type: 'uint256' },
    { name: 'takeProfitPrice18', type: 'uint256' },
    { name: 'executorTipBps', type: 'uint256' },
  ], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'executeOrder', stateMutability: 'payable', inputs: [
    { name: 'id', type: 'uint256' },
    { name: 'priceUpdateData', type: 'bytes[]' },
  ], outputs: [] },
  { type: 'function', name: 'getCurrentEthPrice18', stateMutability: 'view', inputs: [], outputs: [
    { type: 'uint256', name: 'price18' },
    { type: 'uint256', name: 'conf18' },
    { type: 'uint64',  name: 'publishTime' },
  ] },
  { type: 'function', name: 'orders', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [
    { type: 'address', name: 'user' },
    { type: 'uint256', name: 'amount' },
    { type: 'uint256', name: 'stopLossPrice18' },
    { type: 'uint256', name: 'takeProfitPrice18' },
    { type: 'uint256', name: 'executorTipBps' },
    { type: 'bool',    name: 'open' },
  ] },
  { type: 'function', name: 'nextOrderId', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

const pythAbi = [
  { type: 'function', name: 'getUpdateFee', stateMutability: 'view', inputs: [{ name: 'updateData', type: 'bytes[]' }], outputs: [{ type: 'uint256' }] },
] as const;

export async function fetchOrdersConfig(): Promise<OrdersConfig> {
  const r = await fetch(`${API_BASE}/api/orders/config`);
  if (!r.ok) throw new Error(`Failed to fetch orders config: ${r.status}`);
  const j = await r.json();
  if (!j?.success) throw new Error('Orders config not available');
  return j.data as OrdersConfig;
}

export async function fetchHermesUpdates(): Promise<string[]> {
  const r = await fetch(`${API_BASE}/api/orders/hermes-update`);
  if (!r.ok) throw new Error('Failed to fetch Hermes updates');
  const j = await r.json();
  if (!j?.success) throw new Error('Hermes update payload missing');
  const updates = (j.data?.updates || []) as string[];
  return updates;
}

export function base64ToHex(b64: string): Hex {
  // atob: base64 -> binary string
  const bin = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  let hex = '0x';
  for (let i = 0; i < bin.length; i++) {
    const h = bin.charCodeAt(i).toString(16).padStart(2, '0');
    hex += h;
  }
  return hex as Hex;
}

export async function getClients(rpcUrl: string) {
  if (!window.ethereum) throw new Error('MetaMask not detected');
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const walletClient = createWalletClient({ transport: custom(window.ethereum) });
  const [account] = await walletClient.getAddresses();
  return { publicClient, walletClient, account };
}

export async function hasClaimed(config: OrdersConfig, account: Address): Promise<boolean> {
  const { publicClient } = await getClients(config.rpcUrl);
  const claimed = await (publicClient.readContract as any)({
    address: config.coins,
    abi: coinsAbi,
    functionName: 'hasClaimed',
    args: [account],
  });
  return Boolean(claimed);
}

export async function claimFaucet(config: OrdersConfig): Promise<Hex> {
  const { walletClient, account } = await getClients(config.rpcUrl);
  const hash = await walletClient.writeContract({
    address: config.coins,
    abi: coinsAbi,
    functionName: 'claim',
    account,
    // Allow viem to infer chain from wallet provider; keep undefined for dynamic networks
    chain: undefined as any,
  } as any);
  return hash;
}

export async function importTokenToMetaMask(config: OrdersConfig) {
  if (!window.ethereum?.request) return false;
  try {
    const wasAdded = await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: config.coins,
          symbol: 'COIN',
          decimals: 18,
        },
      },
    });
    return wasAdded;
  } catch {
    return false;
  }
}

export type CreateOrderParams = {
  amount: string; // human, e.g., "10"
  slUsd: string;  // human USD, e.g., "1800"
  tpUsd: string;  // human USD, e.g., "2600"
  tipBps?: number; // 0-1000
};

export async function approveCoins(config: OrdersConfig, humanAmount: string): Promise<Hex> {
  const { walletClient, account } = await getClients(config.rpcUrl);
  const amount = parseUnits(humanAmount as `${number}`, 18);
  const hash = await walletClient.writeContract({
    address: config.coins,
    abi: coinsAbi,
    functionName: 'approve',
    args: [config.orderManager, amount],
    account,
    chain: undefined as any,
  } as any);
  return hash;
}

export async function createOrder(config: OrdersConfig, params: CreateOrderParams): Promise<Hex> {
  const { walletClient, account } = await getClients(config.rpcUrl);
  const amount = parseUnits(params.amount as `${number}`, 18);
  const sl = parseUnits(params.slUsd as `${number}`, 18);
  const tp = parseUnits(params.tpUsd as `${number}`, 18);
  const tip = BigInt(params.tipBps ?? 0);

  const hash = await walletClient.writeContract({
    address: config.orderManager,
    abi: orderManagerAbi,
    functionName: 'createOrder',
    args: [amount, sl, tp, tip],
    account,
    chain: undefined as any,
  } as any);
  return hash;
}

export async function executeOrderNow(config: OrdersConfig, orderId: bigint): Promise<Hex> {
  const { walletClient, publicClient, account } = await getClients(config.rpcUrl);

  // Detect local anvil (MockPyth) vs testnet/mainnet (real Pyth)
  let updateBytes: Hex[] = [];
  let fee: bigint = 0n;

  try {
    const chainId = await publicClient.getChainId();

    if (chainId === 31338) {
      // Local anvil + MockPyth path: do NOT pass Hermes updates and fee must be 0
      updateBytes = [];
      fee = 0n;
    } else {
      // Testnet/mainnet path: fetch Hermes updates and compute fee
      const updatesBase64 = await fetchHermesUpdates();
      if (!updatesBase64.length) throw new Error('No Hermes updates available');
      updateBytes = updatesBase64.map((u) => base64ToHex(u));

      fee = await (publicClient.readContract as any)({
        address: config.pyth,
        abi: pythAbi,
        functionName: 'getUpdateFee',
        args: [updateBytes],
      }) as bigint;
    }
  } catch (e) {
    // Fallback: attempt execution without updates (useful if fee/read fails)
    updateBytes = [];
    fee = 0n;
  }

  const hash = await walletClient.writeContract({
    address: config.orderManager,
    abi: orderManagerAbi,
    functionName: 'executeOrder',
    args: [orderId, updateBytes],
    account,
    value: fee,
    chain: undefined as any,
  } as any);

  return hash;
}

export async function getNextOrderId(config: OrdersConfig): Promise<bigint> {
  const { publicClient } = await getClients(config.rpcUrl);
  const id = await (publicClient.readContract as any)({
    address: config.orderManager,
    abi: orderManagerAbi,
    functionName: 'nextOrderId',
  }) as bigint;
  return id;
}

export async function getOrder(config: OrdersConfig, id: bigint): Promise<any> {
  const { publicClient } = await getClients(config.rpcUrl);
  const o = await (publicClient.readContract as any)({
    address: config.orderManager,
    abi: orderManagerAbi,
    functionName: 'orders',
    args: [id],
  });
  return o;
}
