import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Search, TrendingUp, AlertTriangle, Wallet, Home, Info } from "lucide-react";

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Home", icon: Home, hideOnHome: true },
    { path: "/explorer", label: "Explorer", icon: Search },
    { path: "/strategy", label: "Strategy", icon: TrendingUp },
    { path: "/alerts", label: "Alerts", icon: AlertTriangle },
    { path: "/portfolio", label: "Portfolio", icon: Wallet },
    { path: "/about", label: "About", icon: Info }
  ];

  const isHomePage = location.pathname === "/";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${isHomePage ? 'bg-transparent' : 'glass-card border-b'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Agentic</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              if (item.hideOnHome && isHomePage) return null;
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button 
                    variant={isActive ? "default" : "ghost"} 
                    size="sm" 
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <Button variant="outline" size="sm" className="gap-2">
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;