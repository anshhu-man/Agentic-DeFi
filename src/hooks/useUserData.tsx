import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/WalletContext';
import apiService from '@/services/api';

// Minimal ERC20 ABI for balanceOf and decimals
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
    stateMutability: 'view',
  },
];

// Known tokens on Ethereum mainnet (for v1)
const MAINNET_TOKENS = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606e48',
    decimals: 6,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    decimals: 18,
  },
] as const;

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  total_portfolio_value: number;
  preferred_currency: string;
  risk_tolerance: string;
}

interface UserHolding {
  id: string;
  user_id: string;
  asset_symbol: string;
  asset_name: string;
  amount: number;
  current_value_usd: number;
  chain: string;
  wallet_address: string | null;
}

interface DeFiPosition {
  id: string;
  user_id: string;
  protocol_name: string;
  position_type: string;
  position_value_usd: number;
  apy: number;
  chain: string;
  status: string;
  transaction_hash: string | null;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const useUserData = () => {
  const { user } = useAuth();
  const { address: walletAddress } = useWallet();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [holdings, setHoldings] = useState<UserHolding[]>([]);
  const [defiPositions, setDeFiPositions] = useState<DeFiPosition[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------------- Supabase-backed data (when user is authenticated) ----------------
  const fetchUserProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      toast({
        variant: "destructive",
        title: "Error fetching profile",
        description: error.message,
      });
    } else if (data) {
      setProfile(data);
    }
  };

  const fetchUserHoldings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_holdings')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error fetching holdings",
        description: error.message,
      });
    } else {
      setHoldings(data || []);
    }
  };

  const fetchDeFiPositions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('defi_positions')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error fetching DeFi positions",
        description: error.message,
      });
    } else {
      setDeFiPositions(data || []);
    }
  };

  const addHolding = async (holding: Omit<UserHolding, 'id' | 'user_id'>) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_holdings')
      .insert({
        user_id: user.id,
        asset_symbol: holding.asset_symbol,
        asset_name: holding.asset_name,
        amount: parseFloat(holding.amount.toString()),
        current_value_usd: parseFloat(holding.current_value_usd.toString()),
        chain: holding.chain,
        wallet_address: holding.wallet_address
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error adding holding",
        description: error.message,
      });
      return false;
    } else {
      toast({
        title: "Holding added",
        description: `Successfully added ${holding.asset_symbol} to your portfolio`,
      });
      fetchUserHoldings();
      return true;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: error.message,
      });
      return false;
    } else {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      fetchUserProfile();
      return true;
    }
  };

  // ---------------- Wallet-based data (when wallet is connected but user is null) ----------------
  const fetchWalletData = async () => {
    if (!walletAddress) return;

    try {
      // Prices via backend Pyth proxy (reused from Explorer)
      const symbols = ['ETH/USD', 'USDC/USD', 'USDT/USD', 'DAI/USD', 'UNI/USD'];
      let prices: Array<{ symbol: string; price: number }> = [];
      try {
        const res = await apiService.getPythPrices(symbols);
        prices = (res || []).map((p: any) => ({ symbol: p.symbol, price: Number(p.price) || 0 }));
      } catch {
        // Keep prices empty on failure; values will be 0
      }
      const getPrice = (sym: string) =>
        prices.find((p) => p.symbol === sym)?.price ?? 0;

      // Use MetaMask provider to read chain balances
      if (!window.ethereum) {
        toast({
          variant: "destructive",
          title: "MetaMask not detected",
          description: "Install MetaMask to read wallet balances.",
        });
        return;
      }

      // Use EIP-1193 provider directly for balance
      // ETH balance
      const ethBalanceHex: string = await window.ethereum.request({
        method: "eth_getBalance",
        params: [walletAddress, "latest"],
      });
      const ethBalance = parseInt(ethBalanceHex, 16) / 1e18;
      const ethValueUsd = ethBalance * getPrice('ETH/USD');

      const walletHoldings: UserHolding[] = [];
      if (ethBalance > 0) {
        walletHoldings.push({
          id: `wallet-ETH`,
          user_id: 'wallet',
          asset_symbol: 'ETH',
          asset_name: 'Ether',
          amount: ethBalance,
          current_value_usd: ethValueUsd,
          chain: 'Ethereum',
          wallet_address: walletAddress,
        });
      }

      // ERC20 balances via eth_call to balanceOf
      for (const t of MAINNET_TOKENS) {
        try {
          // Encode balanceOf(address) selector + argument
          // balanceOf(address) -> 0x70a08231
          const selector = '0x70a08231';
          const addrPadded = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
          const data = selector + addrPadded;

          const balanceHex: string = await window.ethereum.request({
            method: 'eth_call',
            params: [
              {
                to: t.address,
                data,
              },
              'latest',
            ],
          });
          const bal = parseInt(balanceHex || '0x0', 16) / 10 ** t.decimals;

          if (bal > 0) {
            const price = getPrice(`${t.symbol}/USD`);
            walletHoldings.push({
              id: `wallet-${t.symbol}`,
              user_id: 'wallet',
              asset_symbol: t.symbol,
              asset_name: t.name,
              amount: bal,
              current_value_usd: bal * price,
              chain: 'Ethereum',
              wallet_address: walletAddress,
            });
          }
        } catch {
          // ignore token read failure
        }
      }

      // Sort by USD value desc
      walletHoldings.sort((a, b) => b.current_value_usd - a.current_value_usd);

      setHoldings(walletHoldings);
      // No DeFi positions in v1 wallet path
      setDeFiPositions([]);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Failed to load wallet balances",
        description: e?.message || "Request failed",
      });
      setHoldings([]);
      setDeFiPositions([]);
    }
  };

  // Orchestrate which data source to use
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (user) {
        await Promise.all([
          fetchUserProfile(),
          fetchUserHoldings(),
          fetchDeFiPositions()
        ]);
      } else if (walletAddress) {
        setProfile(null); // No supabase profile if just wallet
        await fetchWalletData();
      } else {
        setProfile(null);
        setHoldings([]);
        setDeFiPositions([]);
      }
      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, walletAddress]);

  return {
    profile,
    holdings,
    defiPositions,
    loading,
    addHolding,
    updateProfile,
    refreshData: () => {
      if (user) {
        fetchUserProfile();
        fetchUserHoldings();
        fetchDeFiPositions();
      } else if (walletAddress) {
        fetchWalletData();
      }
    }
  };
};
