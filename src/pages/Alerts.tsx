import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Bell, Shield, TrendingDown, Zap, Settings, RefreshCw, Activity, Sparkles, Eye, Layers, Radio } from "lucide-react";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useAuth } from "@/hooks/useAuth";
import PriceAlertDialog from "@/components/alerts/PriceAlertDialog";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Alerts = () => {
  const { user } = useAuth();
  const { prices, loading: pricesLoading, refresh: refreshPrices } = useCryptoPrices();
  const [marketAlerts, setMarketAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch market alerts on component mount
  useEffect(() => {
    const fetchMarketAlerts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('price-alerts', {
          body: { action: 'generate_market_alerts' }
        });

        if (error) {
          console.error('Error fetching market alerts:', error);
          return;
        }

        const result = await data;
        if (result.success) {
          setMarketAlerts(result.alerts);
        }
      } catch (error) {
        console.error('Error fetching market alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketAlerts();
  }, []);

  const riskAlerts = marketAlerts.length > 0 ? marketAlerts.map((alert, index) => ({
    id: index + 1,
    type: alert.type.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    message: alert.message,
    time: "Just now",
    severity: alert.severity,
    icon: getAlertIcon(alert.type)
  })) : [
    {
      id: 1,
      type: "High Risk", 
      message: "Unusual activity detected in USDC/ETH pool",
      time: "2 minutes ago",
      severity: "high",
      icon: AlertTriangle
    },
    {
      id: 2,
      type: "Price Alert",
      message: "ETH dropped below $1,800 threshold", 
      time: "15 minutes ago",
      severity: "medium",
      icon: TrendingDown
    },
    {
      id: 3,
      type: "Smart Contract",
      message: "New vulnerability reported in protocol XYZ",
      time: "1 hour ago", 
      severity: "high",
      icon: Shield
    },
    {
      id: 4,
      type: "APY Change",
      message: "Uniswap V3 USDC/ETH APY increased to 18.7%",
      time: "3 hours ago",
      severity: "low", 
      icon: Zap
    }
  ];

  function getAlertIcon(type: string) {
    switch (type) {
      case 'high_risk': return AlertTriangle;
      case 'price_movement': return TrendingDown;
      case 'smart_contract': return Shield;
      case 'apy_change': return Zap;
      default: return Bell;
    }
  }

  const alertSettings = [
    { 
      id: "slippage",
      label: "Slippage Alerts",
      description: "Notify when slippage exceeds threshold",
      enabled: true,
      threshold: "2%"
    },
    {
      id: "apy_drop", 
      label: "APY Drop Alerts",
      description: "Alert when yield drops significantly",
      enabled: true,
      threshold: "15%"
    },
    {
      id: "smart_contract",
      label: "Smart Contract Risks", 
      description: "Monitor for security vulnerabilities",
      enabled: true,
      threshold: "High"
    },
    {
      id: "price_movement",
      label: "Price Movement",
      description: "Track significant price changes",
      enabled: false,
      threshold: "10%"
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-destructive border-destructive/50";
      case "medium": return "text-yellow-500 border-yellow-500/50";
      case "low": return "text-accent border-accent/50";
      default: return "text-muted-foreground border-border";
    }
  };

  return (
    <div className="min-h-screen pt-16">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Risk & Alerts</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            AI-powered risk monitoring with real-time alerts
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Alert Feed */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-red-500/10 animate-slide-up">
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/0 via-orange-500/0 to-yellow-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-red-500/20 group-hover:via-orange-500/20 group-hover:to-yellow-500/20 transition-all duration-500 blur-sm" />
              
              {/* Floating alert particles */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-2 -right-2 w-16 h-16 bg-red-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-float" />
                <div className="absolute -bottom-2 -left-2 w-20 h-20 bg-orange-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-float-reverse" />
              </div>
              
              <div className="relative">
                <CardHeader className="flex flex-row items-center justify-between px-0 pb-8">
                  <CardTitle className="flex items-center gap-4 text-2xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25 group-hover:shadow-red-500/40 transition-all duration-300">
                        <Bell className="w-6 h-6 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full animate-pulse">
                        <div className="w-full h-full bg-red-400 rounded-full animate-ping" />
                      </div>
                    </div>
                    AI Risk Monitoring
                  </CardTitle>
                  <div className="flex gap-3">
                    <PriceAlertDialog />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={refreshPrices}
                      disabled={pricesLoading}
                      className="bg-white/5 backdrop-blur-xl border-white/20 rounded-xl hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105"
                    >
                      <RefreshCw className={`w-4 h-4 ${pricesLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="px-0 space-y-6">
                  {riskAlerts.map((alert, index) => {
                    const Icon = alert.icon;
                    const severityConfig = {
                      high: { 
                        bg: "bg-red-500/10", 
                        border: "border-red-400/30", 
                        text: "text-red-400",
                        glow: "shadow-red-500/20"
                      },
                      medium: { 
                        bg: "bg-yellow-500/10", 
                        border: "border-yellow-400/30", 
                        text: "text-yellow-400",
                        glow: "shadow-yellow-500/20"
                      },
                      low: { 
                        bg: "bg-green-500/10", 
                        border: "border-green-400/30", 
                        text: "text-green-400",
                        glow: "shadow-green-500/20"
                      }
                    };
                    const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.low;
                    
                    return (
                      <div 
                        key={alert.id}
                        className={`group/alert relative overflow-hidden p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] ${config.glow} animate-slide-up`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {/* Alert severity indicator */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.bg} rounded-r-full`} />
                        
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <div className={`w-12 h-12 ${config.bg} ${config.border} border rounded-2xl flex items-center justify-center transition-all duration-300 group-hover/alert:scale-110`}>
                              <Icon className={`w-6 h-6 ${config.text}`} />
                            </div>
                            <div className={`absolute -inset-1 ${config.bg} rounded-2xl opacity-0 group-hover/alert:opacity-100 transition-opacity duration-300 blur-sm`} />
                          </div>
                          
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge 
                                variant="outline" 
                                className={`px-3 py-1 ${config.bg} ${config.text} ${config.border} rounded-full font-medium`}
                              >
                                <Activity className="w-3 h-3 mr-1" />
                                {alert.type}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                                <Radio className="w-3 h-3" />
                                {alert.time}
                              </div>
                              <div className="ml-auto">
                                <div className={`w-2 h-2 ${config.bg.replace('/10', '/60')} rounded-full animate-pulse`} />
                              </div>
                            </div>
                            
                            <p className="text-base font-medium text-foreground group-hover/alert:text-white transition-colors duration-300 leading-relaxed">
                              {alert.message}
                            </p>
                            
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                                <Eye className="w-3 h-3" />
                                <span>Priority: {alert.severity.toUpperCase()}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 px-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-105"
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </div>
            </Card>

            {/* Live Price Data */}
            {!pricesLoading && prices.length > 0 && (
              <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 animate-slide-up" style={{ animationDelay: '200ms' }}>
                {/* Gradient border effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/0 via-cyan-500/0 to-teal-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-blue-500/20 group-hover:via-cyan-500/20 group-hover:to-teal-500/20 transition-all duration-500 blur-sm" />
                
                <div className="relative">
                  <CardHeader className="px-0 pb-6">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      Live Market Data
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="px-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {prices.slice(0, 4).map((price, index) => (
                        <div 
                          key={price.id} 
                          className="group/price relative overflow-hidden p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 animate-slide-up"
                          style={{ animationDelay: `${300 + index * 50}ms` }}
                        >
                          <div className="text-center space-y-2">
                            <p className="font-bold text-sm text-muted-foreground/80 group-hover/price:text-white transition-colors duration-300">
                              {price.symbol}
                            </p>
                            <p className="text-xl font-bold text-foreground group-hover/price:text-white transition-colors duration-300">
                              ${price.price.toFixed(2)}
                            </p>
                            <div className="flex items-center justify-center gap-1">
                              <TrendingDown className={`w-3 h-3 ${price.change24h >= 0 ? 'text-green-400 rotate-180' : 'text-red-400'}`} />
                              <span className={`text-sm font-medium ${price.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {price.change24h >= 0 ? '+' : ''}{price.change24h.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                          
                          {/* Price change indicator */}
                          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${price.change24h >= 0 ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </div>
              </Card>
            )}

            {/* Integration Status */}
            <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-emerald-500/10 animate-slide-up" style={{ animationDelay: '400ms' }}>
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/0 via-teal-500/0 to-cyan-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-emerald-500/20 group-hover:via-teal-500/20 group-hover:to-cyan-500/20 transition-all duration-500 blur-sm" />
              
              <div className="relative">
                <CardHeader className="px-0 pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                    Data Sources Status
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="px-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { 
                        name: "Pyth Network", 
                        status: !pricesLoading && prices.length > 0 ? "Active" : "Loading", 
                        isActive: !pricesLoading && prices.length > 0,
                        icon: Activity
                      },
                      { 
                        name: "Price Alerts", 
                        status: user ? "Active" : "Sign in Required", 
                        isActive: !!user,
                        icon: Bell
                      },
                      { 
                        name: "AI Analysis", 
                        status: "Active", 
                        isActive: true,
                        icon: Sparkles
                      },
                      { 
                        name: "Email Alerts", 
                        status: user ? "Configured" : "Sign in Required", 
                        isActive: !!user,
                        icon: Settings
                      }
                    ].map((source, index) => {
                      const Icon = source.icon;
                      return (
                        <div 
                          key={source.name} 
                          className="group/source text-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 animate-slide-up"
                          style={{ animationDelay: `${500 + index * 50}ms` }}
                        >
                          <div className="space-y-3">
                            <div className="relative mx-auto w-12 h-12">
                              <div className={`w-full h-full rounded-xl flex items-center justify-center transition-all duration-300 ${
                                source.isActive 
                                  ? 'bg-emerald-500/20 border border-emerald-400/30' 
                                  : 'bg-gray-500/20 border border-gray-400/30'
                              }`}>
                                <Icon className={`w-5 h-5 ${source.isActive ? 'text-emerald-400' : 'text-gray-400'}`} />
                              </div>
                              <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${
                                source.isActive ? 'bg-emerald-400' : 'bg-gray-400'
                              } ${source.isActive ? 'animate-pulse' : ''}`}>
                                {source.isActive && <div className="w-full h-full bg-emerald-400 rounded-full animate-ping" />}
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-foreground group-hover/source:text-white transition-colors duration-300">
                                {source.name}
                              </p>
                              <p className={`text-xs mt-1 ${
                                source.isActive 
                                  ? 'text-emerald-400' 
                                  : 'text-muted-foreground/60'
                              }`}>
                                {source.status}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>

          {/* Alert Settings */}
          <div className="space-y-8">
            <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10 animate-slide-up" style={{ animationDelay: '600ms' }}>
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/0 via-indigo-500/0 to-blue-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-purple-500/20 group-hover:via-indigo-500/20 group-hover:to-blue-500/20 transition-all duration-500 blur-sm" />
              
              <div className="relative">
                <CardHeader className="px-0 pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    Custom Alerts
                  </CardTitle>
                  <p className="text-sm text-muted-foreground/80 mt-2">
                    Configure personalized risk thresholds and monitoring
                  </p>
                </CardHeader>
                
                <CardContent className="px-0 space-y-6">
                  {alertSettings.map((setting, index) => (
                    <div 
                      key={setting.id} 
                      className="group/setting p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 animate-slide-up"
                      style={{ animationDelay: `${700 + index * 50}ms` }}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Label className="text-sm font-medium text-foreground group-hover/setting:text-white transition-colors duration-300">
                                {setting.label}
                              </Label>
                              <div className={`w-2 h-2 rounded-full ${setting.enabled ? 'bg-green-400' : 'bg-gray-400'} ${setting.enabled ? 'animate-pulse' : ''}`} />
                            </div>
                            <p className="text-xs text-muted-foreground/70 leading-relaxed">
                              {setting.description}
                            </p>
                          </div>
                          <Switch 
                            checked={setting.enabled} 
                            className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-600"
                          />
                        </div>
                        
                        {setting.enabled && (
                          <div className="pl-4 border-l-2 border-purple-400/30 bg-purple-500/5 rounded-r-xl p-3 animate-slide-up">
                            <Label className="text-xs text-purple-300 font-medium">Threshold Setting</Label>
                            <div className="mt-2 relative">
                              <Input 
                                value={setting.threshold} 
                                className="h-9 text-sm bg-white/5 border-white/20 rounded-xl focus:border-purple-400/50 focus:ring-purple-400/20"
                                placeholder="Enter threshold"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Sparkles className="w-3 h-3 text-purple-400" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </div>
            </Card>

            <Card className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-cyan-500/10 animate-slide-up" style={{ animationDelay: '800ms' }}>
              {/* Gradient border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/0 via-blue-500/0 to-indigo-500/0 rounded-3xl opacity-0 group-hover:opacity-50 group-hover:from-cyan-500/20 group-hover:via-blue-500/20 group-hover:to-indigo-500/20 transition-all duration-500 blur-sm" />
              
              <div className="relative">
                <CardHeader className="px-0 pb-6">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground group-hover:text-white transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    Notification Channels
                  </CardTitle>
                  <p className="text-sm text-muted-foreground/80 mt-2">
                    Choose how you want to receive important alerts
                  </p>
                </CardHeader>
                
                <CardContent className="px-0 space-y-4">
                  {[
                    { label: "Email Notifications", icon: "📧", enabled: true, description: "Instant email alerts for critical events" },
                    { label: "Push Notifications", icon: "📱", enabled: true, description: "Browser and mobile push alerts" },
                    { label: "SMS Alerts", icon: "💬", enabled: false, description: "Text message alerts for high priority" },
                    { label: "Discord Webhook", icon: "🎮", enabled: false, description: "Send alerts to your Discord server" }
                  ].map((notification, index) => (
                    <div 
                      key={notification.label} 
                      className="group/notification flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 animate-slide-up"
                      style={{ animationDelay: `${900 + index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{notification.icon}</div>
                        <div>
                          <Label className="text-sm font-medium text-foreground group-hover/notification:text-white transition-colors duration-300">
                            {notification.label}
                          </Label>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {notification.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${notification.enabled ? 'bg-cyan-400' : 'bg-gray-400'} ${notification.enabled ? 'animate-pulse' : ''}`} />
                        <Switch 
                          defaultChecked={notification.enabled}
                          className="data-[state=checked]:bg-cyan-600 data-[state=unchecked]:bg-gray-600"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
