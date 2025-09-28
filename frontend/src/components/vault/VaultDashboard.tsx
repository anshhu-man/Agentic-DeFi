import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  BarChart3,
  Vault
} from "lucide-react";

interface VaultPosition {
  id: string;
  asset: string;
  depositAmount: number;
  currentValue: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  status: "active" | "triggered" | "emergency_exit";
  triggerType?: "stop_loss" | "take_profit" | "manual";
  createdAt: string;
  pnl: number;
  pnlPercentage: number;
}

interface TriggerEvent {
  id: string;
  vaultId: string;
  type: "stop_loss" | "take_profit" | "confidence_check" | "emergency_exit";
  price: number;
  confidence: number;
  timestamp: string;
  executed: boolean;
  txHash?: string;
  reason?: string;
}

const VaultDashboard = ({
  positions,
  triggerEvents,
  assetPrices,
  onExecuteTrigger,
  onEmergencyExit
}: {
  positions: VaultPosition[];
  triggerEvents: TriggerEvent[];
  assetPrices: Array<{ symbol: string; price: number }>;
  onExecuteTrigger: (positionId: string, type: "stop_loss" | "take_profit") => void;
  onEmergencyExit: (positionId: string) => void;
}) => {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  const activePositions = positions.filter((p) => p.status === "active");
  const totalValue = activePositions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalPnL = activePositions.reduce((sum, p) => sum + p.pnl, 0);
  const totalPnLPercentage =
    activePositions.length > 0
      ? activePositions.reduce((sum, p) => sum + p.pnlPercentage, 0) / activePositions.length
      : 0;

  const getPositionStatus = (position: VaultPosition) => {
    const currentPrice = assetPrices.find((a) => a.symbol === position.asset)?.price || position.currentPrice;
    const stopLossPrice = position.entryPrice * (1 - position.stopLoss / 100);
    const takeProfitPrice = position.entryPrice * (1 + position.takeProfit / 100);

    if (currentPrice <= stopLossPrice) {
      return { status: "stop_loss_ready" as const, color: "text-red-400", icon: TrendingDown };
    }
    if (currentPrice >= takeProfitPrice) {
      return { status: "take_profit_ready" as const, color: "text-green-400", icon: TrendingUp };
    }
    if (position.confidence < 85) {
      return { status: "low_confidence" as const, color: "text-yellow-400", icon: AlertTriangle };
    }
    return { status: "healthy" as const, color: "text-blue-400", icon: Shield };
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return "text-green-400";
    if (pnl < 0) return "text-red-400";
    return "text-gray-400";
  };

  const getProgressValue = (position: VaultPosition) => {
    const currentPrice = assetPrices.find((a) => a.symbol === position.asset)?.price || position.currentPrice;
    const stopLossPrice = position.entryPrice * (1 - position.stopLoss / 100);
    const takeProfitPrice = position.entryPrice * (1 + position.takeProfit / 100);

    const range = takeProfitPrice - stopLossPrice;
    const current = currentPrice - stopLossPrice;
    return Math.max(0, Math.min(100, (current / range) * 100));
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 animate-slide-up">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
        <div className="relative">
          <CardHeader className="flex flex-row items-center justify-between pb-6 px-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                  Portfolio Overview
                </CardTitle>
                <p className="text-sm text-muted-foreground/80 font-medium mt-1">
                  {activePositions.length} active vault{activePositions.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="px-3 py-1 bg-blue-500/10 text-blue-300 border-blue-400/30 rounded-full font-medium group-hover:bg-blue-500/20 group-hover:border-blue-400/50 transition-all duration-300"
            >
              <Shield className="w-3 h-3 mr-1" />
              Protected
            </Badge>
          </CardHeader>
          <CardContent className="px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                <p className="text-sm text-muted-foreground/70 font-medium mb-2">Total Value</p>
                <p className="text-2xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                  ${totalValue.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                <p className="text-sm text-muted-foreground/70 font-medium mb-2">Total P&L</p>
                <p className={`text-2xl font-bold transition-colors duration-300 ${getPnLColor(totalPnL)}`}>
                  ${totalPnL > 0 ? "+" : ""}{totalPnL.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all duration-300">
                <p className="text-sm text-muted-foreground/70 font-medium mb-2">Avg Return</p>
                <p className={`text-2xl font-bold transition-colors duration-300 ${getPnLColor(totalPnLPercentage)}`}>
                  {totalPnLPercentage > 0 ? "+" : ""}{totalPnLPercentage.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Active Positions */}
      <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-green-500/10 animate-slide-up">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/0 via-blue-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-green-500/20 group-hover:via-blue-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
        <div className="relative">
          <CardHeader className="flex flex-row items-center justify-between pb-6 px-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-all duration-300">
                  <Vault className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-green-500/30 to-blue-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                  Active Vaults ({activePositions.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground/80 font-medium mt-1">Automated protection enabled</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="px-3 py-1 bg-green-500/10 text-green-300 border-green-400/30 rounded-full font-medium group-hover:bg-green-500/20 group-hover:border-green-400/50 transition-all duration-300"
            >
              <Shield className="w-3 h-3 mr-1" />
              Protected
            </Badge>
          </CardHeader>
          <CardContent className="px-6 space-y-4">
            {activePositions.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative mx-auto w-16 h-16 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center">
                    <Vault className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                </div>
                <p className="text-lg font-medium text-muted-foreground/80 mb-2">No active vault positions</p>
                <p className="text-sm text-muted-foreground/60">Create your first protected position above</p>
              </div>
            ) : (
              activePositions.map((position) => {
                const statusInfo = getPositionStatus(position);
                const StatusIcon = statusInfo.icon;
                const progress = getProgressValue(position);

                return (
                  <Card
                    key={position.id}
                    className="group relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer animate-slide-up"
                    onClick={() => setSelectedPosition(selectedPosition === position.id ? null : position.id)}
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-cyan-500/0 rounded-2xl opacity-0 group-hover:opacity-30 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
                    <CardContent className="relative p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                                statusInfo.status === "healthy"
                                  ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/25"
                                  : statusInfo.status === "stop_loss_ready"
                                  ? "bg-gradient-to-br from-red-500 to-orange-600 shadow-red-500/25"
                                  : statusInfo.status === "take_profit_ready"
                                  ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/25"
                                  : "bg-gradient-to-br from-yellow-500 to-orange-600 shadow-yellow-500/25"
                              }`}
                            >
                              <StatusIcon className="w-5 h-5 text-white" />
                            </div>
                            <div
                              className={`absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${
                                statusInfo.status === "healthy"
                                  ? "bg-gradient-to-br from-blue-500/30 to-purple-600/30"
                                  : statusInfo.status === "stop_loss_ready"
                                  ? "bg-gradient-to-br from-red-500/30 to-orange-600/30"
                                  : statusInfo.status === "take_profit_ready"
                                  ? "bg-gradient-to-br from-green-500/30 to-emerald-600/30"
                                  : "bg-gradient-to-br from-yellow-500/30 to-orange-600/30"
                              }`}
                            />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-foreground group-hover:text-white transition-colors duration-300">
                              {position.asset}
                            </h4>
                            <p className="text-sm text-muted-foreground/80 font-medium">
                              {position.depositAmount} tokens deposited
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`text-xl font-bold transition-colors duration-300 ${getPnLColor(position.pnl)}`}>
                            {position.pnlPercentage > 0 ? "+" : ""}
                            {position.pnlPercentage.toFixed(2)}%
                          </p>
                          <p className="text-sm text-muted-foreground/80 font-medium">
                            ${position.currentValue.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Price Progress */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-red-400">
                            Stop: ${(position.entryPrice * (1 - position.stopLoss / 100)).toFixed(4)}
                          </span>
                          <span className="text-blue-400">Current: ${position.currentPrice.toFixed(4)}</span>
                          <span className="text-green-400">
                            Target: ${(position.entryPrice * (1 + position.takeProfit / 100)).toFixed(4)}
                          </span>
                        </div>
                        <div className="relative">
                          <Progress value={progress} className="h-3 bg-white/10 rounded-full" />
                          <div className="absolute top-0 left-0 right-0 h-3 rounded-full bg-gradient-to-r from-red-500/20 via-blue-500/20 to-green-500/20" />
                        </div>
                      </div>

                      {/* Confidence & Actions */}
                      <div className="flex items-center justify-between mt-6">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={`font-medium px-3 py-1 rounded-full ${
                              position.confidence > 95
                                ? "text-green-400 border-green-400/30 bg-green-500/10"
                                : position.confidence > 90
                                ? "text-yellow-400 border-yellow-400/30 bg-yellow-500/10"
                                : "text-red-400 border-red-400/30 bg-red-500/10"
                            }`}
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            {position.confidence.toFixed(1)}%
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-blue-400 border-blue-400/30 bg-blue-500/10 font-medium px-3 py-1 rounded-full"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(position.createdAt).toLocaleDateString()}
                          </Badge>
                        </div>

                        <div className="flex gap-3">
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEmergencyExit(position.id);
                            }}
                            className="border-red-400/30 text-red-400 hover:bg-red-500/10 bg-red-500/5 font-medium px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Exit
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedPosition === position.id && (
                        <div className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-slide-up">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                              <p className="text-xs text-muted-foreground/70 font-medium mb-1">Entry Price</p>
                              <p className="text-sm font-bold text-foreground">${position.entryPrice.toFixed(6)}</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                              <p className="text-xs text-muted-foreground/70 font-medium mb-1">Current Price</p>
                              <p className="text-sm font-bold text-blue-400">${position.currentPrice.toFixed(6)}</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-400/30">
                              <p className="text-xs text-red-400/80 font-medium mb-1">Stop Loss</p>
                              <p className="text-sm font-bold text-red-400">-{position.stopLoss}%</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-green-500/10 border border-green-400/30">
                              <p className="text-xs text-green-400/80 font-medium mb-1">Take Profit</p>
                              <p className="text-sm font-bold text-green-400">+{position.takeProfit}%</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </div>
      </Card>

      {/* Recent Trigger Events */}
      <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 animate-slide-up">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-purple-500/20 group-hover:via-pink-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
        <div className="relative">
          <CardHeader className="flex flex-row items-center justify-between pb-6 px-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-all duration-300">
                  <Activity className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                  Recent Activity
                </CardTitle>
                <p className="text-sm text-muted-foreground/80 font-medium mt-1">Trigger execution history</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            {triggerEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative mx-auto w-16 h-16 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center">
                    <Activity className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                </div>
                <p className="text-lg font-medium text-muted-foreground/80 mb-2">No trigger events yet</p>
                <p className="text-sm text-muted-foreground/60">Activity will appear here when triggers execute</p>
              </div>
            ) : (
              <div className="space-y-4">
                {triggerEvents.slice(0, 5).map((event, index) => (
                  <div
                    key={event.id}
                    className="group/item relative overflow-hidden p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                              event.type === "stop_loss"
                                ? "bg-gradient-to-br from-red-500 to-orange-600 shadow-red-500/25"
                                : event.type === "take_profit"
                                ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/25"
                                : event.type === "emergency_exit"
                                ? "bg-gradient-to-br from-yellow-500 to-orange-600 shadow-yellow-500/25"
                                : "bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/25"
                            }`}
                          >
                            {event.executed ? (
                              <CheckCircle className="w-5 h-5 text-white" />
                            ) : (
                              <Clock className="w-5 h-5 text-white" />
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground capitalize">
                            {event.type.replace("_", " ")} {event.executed ? "executed" : "pending"}
                          </p>
                          <p className="text-sm text-muted-foreground/80 font-medium">
                            Price: ${event.price.toFixed(6)} | Confidence: {event.confidence.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                        {event.txHash && (
                          <Badge
                            variant="outline"
                            className="text-xs mt-2 bg-blue-500/10 text-blue-400 border-blue-400/30 rounded-full"
                          >
                            View Tx
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
};

export default VaultDashboard;
