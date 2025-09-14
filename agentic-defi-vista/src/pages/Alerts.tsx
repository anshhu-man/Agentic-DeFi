import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Bell, Shield, TrendingDown, Zap, Settings } from "lucide-react";

const Alerts = () => {
  const riskAlerts = [
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
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  AI Risk Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {riskAlerts.map((alert) => {
                  const Icon = alert.icon;
                  return (
                    <div 
                      key={alert.id}
                      className={`p-4 rounded-lg border-l-4 bg-muted/20 ${getSeverityColor(alert.severity)}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 ${getSeverityColor(alert.severity).split(' ')[0]}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {alert.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{alert.time}</span>
                          </div>
                          <p className="text-sm font-medium">{alert.message}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Integration Status */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Data Sources Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: "Pyth Oracles", status: "Active", color: "text-accent" },
                    { name: "The Graph", status: "Active", color: "text-accent" },
                    { name: "Alchemy API", status: "Active", color: "text-accent" },
                    { name: "AI Agents", status: "Learning", color: "text-primary" }
                  ].map((source) => (
                    <div key={source.name} className="text-center">
                      <div className="w-3 h-3 rounded-full bg-accent mx-auto mb-2"></div>
                      <p className="text-sm font-medium">{source.name}</p>
                      <p className={`text-xs ${source.color}`}>{source.status}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert Settings */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Custom Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {alertSettings.map((setting) => (
                  <div key={setting.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">{setting.label}</Label>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                      <Switch checked={setting.enabled} />
                    </div>
                    
                    {setting.enabled && (
                      <div className="pl-4 border-l-2 border-border/50">
                        <Label className="text-xs text-muted-foreground">Threshold</Label>
                        <Input 
                          value={setting.threshold} 
                          className="h-8 text-sm mt-1"
                          placeholder="Enter threshold"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Email Notifications</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Push Notifications</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">SMS Alerts</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Discord Webhook</Label>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;