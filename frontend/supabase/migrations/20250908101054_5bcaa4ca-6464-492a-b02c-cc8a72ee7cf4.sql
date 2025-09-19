-- Create user profiles table for storing additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  total_portfolio_value DECIMAL(20,2) DEFAULT 0.00,
  preferred_currency TEXT DEFAULT 'USD',
  risk_tolerance TEXT DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create user portfolio holdings table
CREATE TABLE public.user_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  amount DECIMAL(20,8) NOT NULL DEFAULT 0.00,
  current_value_usd DECIMAL(20,2) DEFAULT 0.00,
  chain TEXT NOT NULL,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, asset_symbol, chain, wallet_address)
);

-- Enable RLS for holdings
ALTER TABLE public.user_holdings ENABLE ROW LEVEL SECURITY;

-- Create policies for user holdings
CREATE POLICY "Users can view their own holdings" 
ON public.user_holdings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own holdings" 
ON public.user_holdings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings" 
ON public.user_holdings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings" 
ON public.user_holdings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create DeFi positions table
CREATE TABLE public.defi_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_name TEXT NOT NULL,
  position_type TEXT NOT NULL,
  position_value_usd DECIMAL(20,2) DEFAULT 0.00,
  apy DECIMAL(5,2) DEFAULT 0.00,
  chain TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for DeFi positions
ALTER TABLE public.defi_positions ENABLE ROW LEVEL SECURITY;

-- Create policies for DeFi positions
CREATE POLICY "Users can view their own defi positions" 
ON public.defi_positions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own defi positions" 
ON public.defi_positions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own defi positions" 
ON public.defi_positions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own defi positions" 
ON public.defi_positions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_holdings_updated_at
  BEFORE UPDATE ON public.user_holdings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_defi_positions_updated_at
  BEFORE UPDATE ON public.defi_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();