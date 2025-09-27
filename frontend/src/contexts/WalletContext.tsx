import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
        }

        const id: string = await window.ethereum.request({
          method: "eth_chainId",
        });
        setChainId(id);
        localStorage.setItem("walletChainId", id);
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

      toast({
        title: "Wallet connected",
        description: `${selected.slice(0, 6)}...${selected.slice(-4)}`,
      });
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
