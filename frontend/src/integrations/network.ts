/* Utilities to ensure the dApp runs on Ethereum Sepolia testnet
   and to help users add/switch networks and import tokens in MetaMask. */

declare global {
  interface Window {
    ethereum?: any;
  }
}

const DEFAULT_RPC = import.meta.env.VITE_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

export const SEPOLIA_PARAMS = {
  chainId: '0xaa36a7', // 11155111
  chainName: 'Ethereum Sepolia',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'SepoliaETH',
    decimals: 18,
  },
  rpcUrls: [DEFAULT_RPC],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

export async function addSepolia(): Promise<boolean> {
  if (!window.ethereum?.request) return false;
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [SEPOLIA_PARAMS],
    });
    return true;
  } catch {
    return false;
  }
}

export async function switchToSepolia(): Promise<boolean> {
  if (!window.ethereum?.request) return false;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_PARAMS.chainId }],
    });
    return true;
  } catch (e: any) {
    // If chain is not added, error code 4902 per EIP-1193; try adding it
    if (e?.code === 4902) {
      return addSepolia();
    }
    return false;
  }
}

export async function ensureSepolia(): Promise<boolean> {
  if (!window.ethereum?.request) return false;
  try {
    const current: string = await window.ethereum.request({ method: 'eth_chainId' });
    if (current?.toLowerCase() === SEPOLIA_PARAMS.chainId) return true;
  } catch {
    // ignore
  }
  return switchToSepolia();
}

export async function importToken(address: string, symbol = 'COINS', decimals = 18): Promise<boolean> {
  if (!window.ethereum?.request) return false;
  try {
    const wasAdded = await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: { address, symbol, decimals },
      },
    });
    return Boolean(wasAdded);
  } catch {
    return false;
  }
}
