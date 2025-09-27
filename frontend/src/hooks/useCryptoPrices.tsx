import { useState, useEffect } from 'react';
import apiService from '@/services/api';

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  change24h: number;
  volume24h: number;
  lastUpdated: string | null;
}

function toPythSymbols(tokens?: string[]): string[] {
  if (!tokens || tokens.length === 0) {
    // sensible defaults for the UI
    return ['ETH/USD', 'BTC/USD', 'USDC/USD', 'MATIC/USD'];
  }
  return tokens.map(t => `${t.toUpperCase()}/USD`);
}

export const useCryptoPrices = (tokens?: string[]) => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = async () => {
    try {
      setLoading(true);
      setError(null);

      const symbols = toPythSymbols(tokens);
      const data = await apiService.getPythPrices(symbols);

      const mapped: CryptoPrice[] = (data || []).map((p) => ({
        id: p.symbol,
        symbol: p.symbol.replace('/USD', ''),
        name: p.symbol,
        price: Number(p.price || 0),
        marketCap: 0,
        change24h: 0,
        volume24h: 0,
        lastUpdated: p.publishTime || null,
      }));

      setPrices(mapped);
    } catch (err) {
      console.error('Error fetching Pyth prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens?.join(',')]);

  const getPriceBySymbol = (symbol: string): CryptoPrice | undefined => {
    return prices.find(price =>
      price.symbol.toLowerCase() === symbol.toLowerCase() ||
      price.id.toLowerCase() === symbol.toLowerCase()
    );
  };

  const getPriceById = (id: string): CryptoPrice | undefined => {
    return prices.find(price => price.id === id);
  };

  return {
    prices,
    loading,
    error,
    refresh: fetchPrices,
    getPriceBySymbol,
    getPriceById,
  };
};
