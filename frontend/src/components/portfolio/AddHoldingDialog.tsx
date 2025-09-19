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
import { Plus } from "lucide-react";
import { useUserData } from "@/hooks/useUserData";

const AddHoldingDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    asset_symbol: "",
    asset_name: "",
    amount: "",
    current_value_usd: "",
    chain: "",
    wallet_address: ""
  });

  const { addHolding } = useUserData();

  const chains = [
    "Ethereum",
    "Polygon", 
    "Binance Smart Chain",
    "Avalanche",
    "Solana",
    "Rootstock",
    "Arbitrum",
    "Optimism"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await addHolding({
      asset_symbol: formData.asset_symbol,
      asset_name: formData.asset_name,
      amount: parseFloat(formData.amount),
      current_value_usd: parseFloat(formData.current_value_usd),
      chain: formData.chain,
      wallet_address: formData.wallet_address || null
    });

    if (success) {
      setOpen(false);
      setFormData({
        asset_symbol: "",
        asset_name: "",
        amount: "",
        current_value_usd: "",
        chain: "",
        wallet_address: ""
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Holding
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Holding</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset_symbol">Symbol</Label>
              <Input
                id="asset_symbol"
                placeholder="ETH"
                value={formData.asset_symbol}
                onChange={(e) => setFormData(prev => ({ ...prev, asset_symbol: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset_name">Name</Label>
              <Input
                id="asset_name"
                placeholder="Ethereum"
                value={formData.asset_name}
                onChange={(e) => setFormData(prev => ({ ...prev, asset_name: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="any"
                placeholder="1.5"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_value_usd">Value (USD)</Label>
              <Input
                id="current_value_usd"
                type="number"
                step="0.01"
                placeholder="3000.00"
                value={formData.current_value_usd}
                onChange={(e) => setFormData(prev => ({ ...prev, current_value_usd: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chain">Chain</Label>
            <Select value={formData.chain} onValueChange={(value) => setFormData(prev => ({ ...prev, chain: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select blockchain" />
              </SelectTrigger>
              <SelectContent>
                {chains.map((chain) => (
                  <SelectItem key={chain} value={chain}>
                    {chain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallet_address">Wallet Address (Optional)</Label>
            <Input
              id="wallet_address"
              placeholder="0x..."
              value={formData.wallet_address}
              onChange={(e) => setFormData(prev => ({ ...prev, wallet_address: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Adding..." : "Add Holding"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddHoldingDialog;