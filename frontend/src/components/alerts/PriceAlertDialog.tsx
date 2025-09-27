import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PriceAlertDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    asset_symbol: "",
    target_price: "",
    alert_type: "above" as "above" | "below"
  });

  const { user } = useAuth();
  const { toast } = useToast();

  const cryptoAssets = [
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "USDC", name: "USD Coin" },
    { symbol: "UNI", name: "Uniswap" },
    { symbol: "RBTC", name: "Rootstock BTC" },
    { symbol: "MATIC", name: "Polygon" },
    { symbol: "LINK", name: "Chainlink" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to create price alerts",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('price-alerts', {
        body: {
          action: 'create_alert',
          user_id: user.id,
          asset_symbol: formData.asset_symbol,
          target_price: parseFloat(formData.target_price),
          alert_type: formData.alert_type,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = await data;
      
      if (result.success) {
        toast({
          title: "Price alert created",
          description: result.message,
        });
        
        setOpen(false);
        setFormData({
          asset_symbol: "",
          target_price: "",
          alert_type: "above"
        });
      } else {
        throw new Error(result.error || 'Failed to create alert');
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      toast({
        variant: "destructive",
        title: "Failed to create alert",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Bell className="w-4 h-4" />
          Create Price Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle>Create Price Alert</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset_symbol">Cryptocurrency</Label>
            <Select 
              value={formData.asset_symbol} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, asset_symbol: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cryptocurrency" />
              </SelectTrigger>
              <SelectContent>
                {cryptoAssets.map((asset) => (
                  <SelectItem key={asset.symbol} value={asset.symbol}>
                    {asset.symbol} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alert_type">Alert Type</Label>
              <Select 
                value={formData.alert_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, alert_type: value as "above" | "below" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Price Above</SelectItem>
                  <SelectItem value="below">Price Below</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target_price">Target Price ($)</Label>
              <Input
                id="target_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.target_price}
                onChange={(e) => setFormData(prev => ({ ...prev, target_price: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.asset_symbol || !formData.target_price} className="flex-1">
              {loading ? "Creating..." : "Create Alert"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PriceAlertDialog;