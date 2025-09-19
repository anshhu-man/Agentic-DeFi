import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PortfolioMetrics {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalPnL: number;
  totalPnLPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  valueAtRisk: number;
  portfolioBeta: number;
  diversificationScore: number;
  riskScore: number;
}

interface AssetAllocation {
  asset: string;
  value: number;
  allocation: number;
  risk: 'Low' | 'Medium' | 'High';
}

interface RiskAnalysis {
  overallRisk: number;
  concentrationRisk: number;
  protocolRisk: number;
  liquidityRisk: number;
  recommendations: string[];
}

export const usePortfolioAnalytics = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [allocation, setAllocation] = useState<AssetAllocation[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('portfolio-analytics', {
        body: { 
          user_id: user.id,
          action: 'calculate_metrics'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = await data;
      
      if (result.success) {
        setMetrics(result.metrics);
      } else {
        throw new Error(result.error || 'Failed to calculate metrics');
      }
    } catch (err) {
      console.error('Error fetching portfolio metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocation = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('portfolio-analytics', {
        body: { 
          user_id: user.id,
          action: 'get_allocation'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = await data;
      
      if (result.success) {
        setAllocation(result.allocation);
      }
    } catch (err) {
      console.error('Error fetching allocation:', err);
    }
  };

  const fetchRiskAnalysis = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('portfolio-analytics', {
        body: { 
          user_id: user.id,
          action: 'risk_analysis'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = await data;
      
      if (result.success) {
        setRiskAnalysis(result.riskAnalysis);
      }
    } catch (err) {
      console.error('Error fetching risk analysis:', err);
    }
  };

  const fetchPerformanceHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('portfolio-analytics', {
        body: { 
          user_id: user.id,
          action: 'performance_history'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = await data;
      
      if (result.success) {
        setPerformanceData(result.performanceData);
      }
    } catch (err) {
      console.error('Error fetching performance history:', err);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchMetrics(),
      fetchAllocation(),
      fetchRiskAnalysis(),
      fetchPerformanceHistory(),
    ]);
  };

  useEffect(() => {
    if (user) {
      refreshAll();
    }
  }, [user]);

  return {
    metrics,
    allocation,
    riskAnalysis,
    performanceData,
    loading,
    error,
    refresh: refreshAll,
    fetchMetrics,
    fetchAllocation,
    fetchRiskAnalysis,
    fetchPerformanceHistory,
  };
};