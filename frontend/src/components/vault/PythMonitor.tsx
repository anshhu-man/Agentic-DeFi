import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";

interface PriceUpdate {
  symbol: string;
  price: number;
  confidence: number;
  publishTime: string;
  slot: number;
  previousPrice?: number;
  priceChange?: number;
  priceChangePercentage?: number;
}

interface ConfidenceBand {
  symbol: string;
  upperBound: number;
  lowerBound: number;
  confidence: number;
  timestamp: string;
}

interface TriggerCheck {
  vaultId: string;
  asset: string;
  triggerType: "stop_loss" | "take_profit";
  currentPrice: number;
  triggerPrice: number;
  confidence: number;
  shouldExecute: boolean;
  reason: string;
  timestamp: string;
}

const PythMonitor = ({
  priceUpdates,
  confidenceBands,
  triggerChecks,
  isConnected,
  onRefresh,
  onExecuteTrigger
}: {
  priceUpdates: PriceUpdate[];
  confidenceBands: ConfidenceBand[];
  triggerChecks: TriggerCheck[];
  isConnected: boolean;
  onRefresh: () => void;
  onExecuteTrigger: (check: TriggerCheck) => void;
}) => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (autoRefresh && isConnected) {
      const interval = setInterval(() => {
        onRefresh();
        setLastUpdate(new Date());
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh, isConnected, onRefresh]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return "text-green-400 border-green-400/30 bg-green-500/10";
    if (confidence >= 90) return "text-yellow-400 border-yellow-400/30 bg-yellow-500/10";
    return "text-red-400 border-red-400/30 bg-red-500/10";
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return "text-green-400";
    if (change < 0) return "text-red-400";
    return "text-gray-400";
  };

  const executableTriggers = triggerChecks.filter((check) => check.shouldExecute);

  return (
    <div className="space-y-6">
      {/* Connection Status & Controls */}
      <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 animate-slide-up">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-green-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-blue-500/20 group-hover:via-green-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
        <div className="relative">
          <CardHeader className="flex flex-row items-center justify-between pb-6 px-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isConnected
                      ? "bg-gradient-to-br from-green-500 to-blue-600 shadow-green-500/25"
                      : "bg-gradient-to-br from-red-500 to-orange-600 shadow-red-500/25"
                  }`}
                >
                  {isConnected ? (
                    <Wifi className="w-7 h-7 text-white" />
                  ) : (
                    <WifiOff className="w-7 h-7 text-white" />
                  )}
                </div>
                <div
                  className={`absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${
                    isConnected
                      ? "bg-gradient-to-br from-green-500/30 to-blue-600/30"
                      : "bg-gradient-to-br from-red-500/30 to-orange-600/30"
                  }`}
                />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                  Pyth Network Monitor
                </CardTitle>
                <p className="text-sm text-muted-foreground/80 font-medium mt-1">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={`font-medium px-3 py-1 rounded-full ${
                  isConnected
                    ? "text-green-400 border-green-400/30 bg-green-500/10"
                    : "text-red-400 border-red-400/30 bg-red-500/10"
                }`}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onRefresh();
                  setLastUpdate(new Date());
                }}
                className="bg-white/5 border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
        </div>
      </Card>

      {/* Executable Triggers Alert */}
      {executableTriggers.length > 0 && (
        <Card className="bg-orange-500/10 border border-orange-500/30 rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-orange-400">
              <Zap className="w-6 h-6" />
              Ready to Execute ({executableTriggers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {executableTriggers.map((check, index) => (
              <div
                key={`${check.vaultId}-${index}`}
                className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      check.triggerType === "stop_loss" ? "bg-red-500/20" : "bg-green-500/20"
                    }`}
                  >
                    {check.triggerType === "stop_loss" ? (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{check.asset}</p>
                    <p className="text-sm text-muted-foreground">
                      {check.triggerType.replace("_", " ")} at ${check.triggerPrice.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Current: ${check.currentPrice.toFixed(6)} | Confidence: {check.confidence.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => onExecuteTrigger(check)}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Execute Now
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Real-time Price Updates */}
      <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            Live Price Feeds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {priceUpdates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No price updates available</p>
              <p className="text-sm mt-2">Check Pyth network connection</p>
            </div>
          ) : (
            priceUpdates.map((update, index) => {
              const band = confidenceBands.find((b) => b.symbol === update.symbol);

              return (
                <Card key={`${update.symbol}-${index}`} className="bg-white/5 border border-white/10 rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{update.symbol.split("/")[0].substring(0, 2)}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{update.symbol}</h4>
                          <p className="text-sm text-muted-foreground">Slot: {update.slot.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-bold">
                          ${update.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </p>
                        {update.priceChangePercentage !== undefined && (
                          <p className={`text-sm font-medium ${getPriceChangeColor(update.priceChangePercentage)}`}>
                            {update.priceChangePercentage > 0 ? "+" : ""}
                            {update.priceChangePercentage.toFixed(3)}%
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <Badge variant="outline" className={getConfidenceColor(update.confidence)}>
                          {update.confidence.toFixed(2)}%
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Published</p>
                        <p className="text-sm font-medium">{new Date(update.publishTime).toLocaleTimeString()}</p>
                      </div>
                    </div>

                    {/* Confidence Band Visualization */}
                    {band && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Lower: ${band.lowerBound.toFixed(6)}</span>
                          <span>Upper: ${band.upperBound.toFixed(6)}</span>
                        </div>
                        <div className="relative">
                          <Progress value={50} className="h-2 bg-white/10" />
                          <div
                            className="absolute top-0 w-1 h-2 bg-blue-400 rounded-full"
                            style={{
                              left: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  ((update.price - band.lowerBound) / (band.upperBound - band.lowerBound)) * 100
                                )
                              )}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          Price within {band.confidence.toFixed(1)}% confidence band
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Trigger Monitoring */}
      <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            Trigger Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          {triggerChecks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No active triggers to monitor</p>
            </div>
          ) : (
            <div className="space-y-3">
              {triggerChecks.map((check, index) => (
                <div
                  key={`${check.vaultId}-${index}`}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    check.shouldExecute ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          check.shouldExecute
                            ? "bg-orange-500/20"
                            : check.triggerType === "stop_loss"
                            ? "bg-red-500/20"
                            : "bg-green-500/20"
                        }`}
                      >
                        {check.shouldExecute ? (
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                        ) : check.triggerType === "stop_loss" ? (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{check.asset}</p>
                        <p className="text-sm text-muted-foreground">{check.triggerType.replace("_", " ")} trigger</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Current:</span> ${check.currentPrice.toFixed(6)}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Target:</span> ${check.triggerPrice.toFixed(6)}
                      </p>
                      <p className="text-xs text-muted-foreground">Confidence: {check.confidence.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-white/5 rounded-lg">
                    <p className="text-xs text-muted-foreground">{check.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Checked: {new Date(check.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PythMonitor;
