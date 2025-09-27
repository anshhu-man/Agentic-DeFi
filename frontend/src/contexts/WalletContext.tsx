import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { fetchOrdersConfig, hasClaimed as hasClaimedSvc, claimFaucet, importTokenToMetaMask } from "@/services/orders";
import { ensureSepolia, addSepolia } from "@/integrations/network";

declare global {
  interface Window {
    ethereum?: any;
  }
}

type WalletContextType = {
  address: string | null;
  chainId: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
};

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [address, setAddress] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("walletAddress") : null
  );
  const [chainId, setChainId] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("walletChainId") : null
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Attempt faucet claim once on connect for the current address
  const startFaucetFlow = async (acct: string) => {
    try {
      const cfg = await fetchOrdersConfig().catch(() => null as any);
      if (!cfg || !cfg.coins || typeof cfg.coins !== "string" || !cfg.coins.startsWith("0x")) {
        return; // contracts not deployed / not configured -> skip
      }
      const localKey = `faucet:${acct}`;
      if (localStorage.getItem(localKey) === "claimed") return;

      const already = await hasClaimedSvc(cfg as any, acct as any).catch(() => true);
      if (!already) {
        await claimFaucet(cfg as any);
        localStorage.setItem(localKey, "claimed");
        toast({
          title: "100 COIN minted",
          description: "Faucet claim successful. Token will be imported into MetaMask.",
        });
        await importTokenToMetaMask(cfg as any).catch(() => false);
      } else {
        localStorage.setItem(localKey, "claimed");
      }
    } catch (e: any) {
      // non-fatal
      console.debug("Faucet flow skipped:", e?.message || e);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const init = async () => {
      try {
        const accounts: string[] = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (accounts && accounts[0]) {
          setAddress(accounts[0]);
          localStorage.setItem("walletAddress", accounts[0]);
          // Try faucet flow on auto-connect
          startFaucetFlow(accounts[0]).catch(() => {});
        }

        const id: string = await window.ethereum.request({
          method: "eth_chainId",
        });
        setChainId(id);
        localStorage.setItem("walletChainId", id);

        // Ensure we are on Sepolia testnet
        try {
          const switched = await ensureSepolia();
          if (switched) {
            const nid: string = await window.ethereum.request({ method: "eth_chainId" });
            setChainId(nid);
            localStorage.setItem("walletChainId", nid);
            toast({
              title: "Switched network",
              description: "Using Ethereum Sepolia (SepoliaETH).",
            });
          }
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    };

    init();

    const onAccountsChanged = (accounts: string[]) => {
      const next = accounts && accounts[0] ? accounts[0] : null;
      setAddress(next);
      if (next) {
        localStorage.setItem("walletAddress", next);
      } else {
        localStorage.removeItem("walletAddress");
      }
    };

    const onChainChanged = (id: string) => {
      setChainId(id);
      localStorage.setItem("walletChainId", id);
    };

    try {
      window.ethereum.on("accountsChanged", onAccountsChanged);
      window.ethereum.on("chainChanged", onChainChanged);
    } catch {
      // ignore
    }

    return () => {
      try {
        window.ethereum?.removeListener("accountsChanged", onAccountsChanged);
        window.ethereum?.removeListener("chainChanged", onChainChanged);
      } catch {
        // ignore
      }
    };
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      setError("MetaMask not detected");
      toast({
        variant: "destructive",
        title: "MetaMask not detected",
        description: "Install MetaMask to connect your wallet.",
      });
      try {
        window.open("https://metamask.io/download/", "_blank");
      } catch {
        // ignore
      }
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const selected = Array.isArray(accounts) ? accounts[0] : accounts;
      setAddress(selected);
      localStorage.setItem("walletAddress", selected);

      const id = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(id);
      localStorage.setItem("walletChainId", id);

      // Enforce Sepolia testnet
      try {
        const switched = await ensureSepolia();
        if (switched) {
          const nid = await window.ethereum.request({ method: "eth_chainId" });
          setChainId(nid);
          localStorage.setItem("walletChainId", nid);
          toast({
            title: "Sepolia network active",
            description: "All actions use SepoliaETH test tokens.",
          });
        }
      } catch {
        // ignore
      }

      toast({
        title: "Wallet connected",
        description: `${selected.slice(0, 6)}...${selected.slice(-4)}`,
      });

      // Auto faucet claim + import token
      await startFaucetFlow(selected);
    } catch (e: any) {
      const msg = e?.message || e?.data?.message || "User rejected or request failed";
      setError(msg);
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: msg,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setChainId(null);
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("walletChainId");
    toast({
      title: "Wallet disconnected",
      description: "You have disconnected your wallet.",
    });
  };

  const value = useMemo(
    () => ({ address, chainId, isConnecting, error, connect, disconnect }),
    [address, chainId, isConnecting, error]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};
