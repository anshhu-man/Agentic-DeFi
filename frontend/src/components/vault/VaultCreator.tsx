import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Shield, TrendingDown, TrendingUp, Zap, DollarSign } from "lucide-react";
import { addSepolia } from "@/integrations/network";
import { useToast } from "@/hooks/use-toast";

interface VaultConfig {
  asset: string;
  depositAmount: string;
  stopLoss: number;
  takeProfit: number;
  confidenceThreshold: number;
  maxSlippage: number;
  autoReinvest: boolean;
  emergencyExit: boolean;
}

interface AssetPrice {
  symbol: string;
  price: number;
  confidence: number;
  publishTime: string;
}

const VaultCreator = ({
  assetPrices,
  onCreateVault
}: {
  assetPrices: AssetPrice[];
  onCreateVault: (config: VaultConfig) => void;
}) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<VaultConfig>({
    asset: "",
    depositAmount: "",
    stopLoss: 10,
    takeProfit: 25,
    confidenceThreshold: 95,
    maxSlippage: 0.5,
    autoReinvest: false,
    emergencyExit: true
  });

  const selectedAsset = assetPrices.find((a) => a.symbol === config.asset);
  const currentPrice = selectedAsset?.price || 0;
  const confidence = selectedAsset?.confidence || 0;

  const stopLossPrice = currentPrice * (1 - config.stopLoss / 100);
  const takeProfitPrice = currentPrice * (1 + config.takeProfit / 100);

  const handleCreate = () => {
    if (!config.asset || !config.depositAmount) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please select an asset and enter deposit amount"
      });
      return;
    }

    if (parseFloat(config.depositAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Deposit amount must be greater than 0"
      });
      return;
    }

    if (confidence < config.confidenceThreshold) {
      toast({
        variant: "destructive",
        title: "Low confidence detected",
        description: `Current price confidence (${confidence.toFixed(1)}%) is below threshold (${config.confidenceThreshold}%)`
      });
      return;
    }

    onCreateVault(config);
    toast({
      title: "Vault created successfully",
      description: `Protected position for ${config.depositAmount} ${config.asset.replace("/USD", "")}`
    });
  };

  const getRiskLevel = () => {
    const range = config.takeProfit + config.stopLoss;
    if (range < 20) return { level: "Conservative", color: "text-green-400" };
    if (range < 40) return { level: "Moderate", color: "text-yellow-400" };
    return { level: "Aggressive", color: "text-red-400" };
  };

  const risk = getRiskLevel();

  return (
    <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 animate-slide-up">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/0 via-blue-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-purple-500/20 group-hover:via-blue-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
      <div className="relative">
        <CardHeader className="flex flex-row items-center justify-between pb-6 px-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all duration-300">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/30 to-blue-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                Create Safe-Exit Vault
              </CardTitle>
              <p className="text-sm text-muted-foreground/80 font-medium mt-1">Automated protection with Pyth confidence</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="px-3 py-1 bg-purple-500/10 text-purple-300 border-purple-400/30 rounded-full font-medium group-hover:bg-purple-500/20 group-hover:border-purple-400/50 transition-all duration-300"
          >
            <Zap className="w-3 h-3 mr-1" />
            Powered by Hermes
          </Badge>
        </CardHeader>

        <CardContent className="px-6 space-y-6">
          {/* Testnet Notice */}
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-300">Testnet Mode</p>
              <p className="text-xs text-blue-200/80">
                This app uses Ethereum Sepolia testnet. Deposits are in SepoliaETH (not mainnet ETH).
              </p>
            </div>
            <Button
              variant="outline"
              className="border-blue-400/50 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl"
              onClick={async () => {
                try {
                  const ok = await addSepolia();
                  if (!ok) {
                    // optional: toast could be used here, but keep minimal to avoid extra imports
                    console.warn("User declined or MetaMask not available");
                  }
                } catch {
                  // ignore
                }
              }}
            >
              Use Sepolia
            </Button>
          </div>
          {/* Asset Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground/80">Asset to protect</Label>
            <Select value={config.asset} onValueChange={(value) => setConfig({ ...config, asset: value })}>
              <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-12 transition-all duration-300 hover:bg-white/10 hover:border-white/20">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl">
                {assetPrices.map((asset) => (
                  <SelectItem key={asset.symbol} value={asset.symbol} className="hover:bg-white/10 rounded-xl">
                    <div className="flex items-center justify-between w-full gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium">{asset.symbol}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">${asset.price.toLocaleString()}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium ${
                            asset.confidence > 95
                              ? "text-green-400 border-green-400/30 bg-green-500/10"
                              : asset.confidence > 90
                              ? "text-yellow-400 border-yellow-400/30 bg-yellow-500/10"
                              : "text-red-400 border-red-400/30 bg-red-500/10"
                          }`}
                        >
                          {asset.confidence.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deposit Amount */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground/80">Deposit amount (SepoliaETH)</Label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={config.depositAmount}
                onChange={(e) => setConfig({ ...config, depositAmount: e.target.value })}
                className="bg-white/5 border-white/10 rounded-2xl h-12 transition-all duration-300 hover:bg-white/10 hover:border-white/20 focus:border-purple-400/50 focus:ring-purple-400/20"
              />
              {selectedAsset && config.depositAmount && (
                <div className="mt-2 text-center p-3 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-sm font-medium text-muted-foreground/70">USD Value</p>
                  <p className="text-lg font-bold text-foreground">
                    ${(parseFloat(config.depositAmount) * currentPrice).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Risk Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
              <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground/80">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Stop Loss ({config.stopLoss}%)
              </Label>
              <Slider value={[config.stopLoss]} onValueChange={(value) => setConfig({ ...config, stopLoss: value[0] })} max={50} min={1} step={1} className="w-full" />
              <div className="text-center p-2 rounded-xl bg-red-500/10 border border-red-400/30">
                <p className="text-xs text-red-400/80 font-medium">Trigger at</p>
                <p className="text-sm font-bold text-red-400">${stopLossPrice.toFixed(6)}</p>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
              <Label className="text-sm font-medium flex items-center gap-2 text-muted-foreground/80">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Take Profit ({config.takeProfit}%)
              </Label>
              <Slider value={[config.takeProfit]} onValueChange={(value) => setConfig({ ...config, takeProfit: value[0] })} max={100} min={5} step={5} className="w-full" />
              <div className="text-center p-2 rounded-xl bg-green-500/10 border border-green-400/30">
                <p className="text-xs text-green-400/80 font-medium">Trigger at</p>
                <p className="text-sm font-bold text-green-400">${takeProfitPrice.toFixed(6)}</p>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-6 p-6 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-all duration-300">
            <h4 className="font-medium flex items-center gap-2 text-foreground">
              <Zap className="w-4 h-4 text-blue-400" />
              Pyth Confidence Settings
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground/80">Confidence threshold ({config.confidenceThreshold}%)</Label>
                <Slider
                  value={[config.confidenceThreshold]}
                  onValueChange={(value) => setConfig({ ...config, confidenceThreshold: value[0] })}
                  max={99}
                  min={80}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-center p-2 rounded-xl bg-blue-500/10 border border-blue-400/30 text-blue-400/80">
                  Safety: Execute only when confidence ≥ {config.confidenceThreshold}%
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground/80">Max slippage ({config.maxSlippage}%)</Label>
                <Slider
                  value={[config.maxSlippage]}
                  onValueChange={(value) => setConfig({ ...config, maxSlippage: value[0] })}
                  max={5}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-center p-2 rounded-xl bg-orange-500/10 border border-orange-400/30 text-orange-400/80">
                  Protection: Max {config.maxSlippage}% price impact
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <Label className="text-sm font-medium text-muted-foreground/80">Auto-reinvest profits</Label>
                <Switch checked={config.autoReinvest} onCheckedChange={(checked) => setConfig({ ...config, autoReinvest: checked })} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <Label className="text-sm font-medium text-muted-foreground/80">Emergency exit enabled</Label>
                <Switch checked={config.emergencyExit} onCheckedChange={(checked) => setConfig({ ...config, emergencyExit: checked })} />
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-medium text-foreground">Risk Assessment</h4>
              <Badge variant="outline" className={`${risk.color} border-current font-medium px-3 py-1 rounded-full`}>
                {risk.level}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-sm text-muted-foreground/70 font-medium mb-2">Max Loss</p>
                <p className="text-xl font-bold text-red-400">-{config.stopLoss}%</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-sm text-muted-foreground/70 font-medium mb-2">Max Gain</p>
                <p className="text-xl font-bold text-green-400">+{config.takeProfit}%</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-sm text-muted-foreground/70 font-medium mb-2">R:R Ratio</p>
                <p className="text-xl font-bold text-blue-400">{(config.takeProfit / config.stopLoss).toFixed(2)}</p>
              </div>
            </div>

            {selectedAsset && confidence < 90 && (
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-sm font-medium text-yellow-400">Low confidence warning</span>
                </div>
                <p className="text-xs text-yellow-400/80">
                  Current price confidence is {confidence.toFixed(1)}%. Consider waiting for higher confidence before creating vault.
                </p>
              </div>
            )}
          </div>

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            className="w-full h-14 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-[1.02]"
          >
            <Shield className="w-5 h-5 mr-2" />
            Create Protected Vault
          </Button>
        </CardContent>
      </div>
    </Card>
  );
};

export default VaultCreator;
