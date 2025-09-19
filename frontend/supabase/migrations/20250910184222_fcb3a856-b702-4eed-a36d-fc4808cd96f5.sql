-- Create price alerts table
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL,
  target_price DECIMAL(20,8) NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('above', 'below')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create market alerts table
CREATE TABLE public.market_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  asset_symbol TEXT,
  protocol_name TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolio snapshots table for historical tracking
CREATE TABLE public.portfolio_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_value DECIMAL(20,2) NOT NULL,
  holdings_count INTEGER DEFAULT 0,
  positions_count INTEGER DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, snapshot_date)
);

-- Enable RLS for all new tables
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for price_alerts
CREATE POLICY "Users can view their own price alerts" 
ON public.price_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own price alerts" 
ON public.price_alerts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price alerts" 
ON public.price_alerts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price alerts" 
ON public.price_alerts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for market_alerts (viewable by all authenticated users)
CREATE POLICY "Authenticated users can view market alerts" 
ON public.market_alerts 
FOR SELECT 
TO authenticated
USING (true);

-- Create RLS policies for portfolio_snapshots
CREATE POLICY "Users can view their own portfolio snapshots" 
ON public.portfolio_snapshots 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolio snapshots" 
ON public.portfolio_snapshots 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for price_alerts
CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON public.price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_price_alerts_user_active ON public.price_alerts(user_id, is_active);
CREATE INDEX idx_price_alerts_asset ON public.price_alerts(asset_symbol);
CREATE INDEX idx_market_alerts_created ON public.market_alerts(created_at DESC);
CREATE INDEX idx_portfolio_snapshots_user_date ON public.portfolio_snapshots(user_id, snapshot_date DESC);