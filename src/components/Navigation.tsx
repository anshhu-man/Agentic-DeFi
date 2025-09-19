import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Search, TrendingUp, AlertTriangle, Wallet, Home, Info, LogOut, User, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";

const Navigation = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  // Theme state management
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  const navItems = [
    { path: "/", label: "Home", icon: Home, hideOnHome: true },
    { path: "/explorer", label: "Explorer", icon: Search },
    { path: "/strategy", label: "Strategy", icon: TrendingUp },
    { path: "/alerts", label: "Alerts", icon: AlertTriangle },
    { path: "/portfolio", label: "Portfolio", icon: Wallet },
    { path: "/about", label: "About", icon: Info }
  ];

  const isHomePage = location.pathname === "/";
  const { address, chainId, connect, disconnect, isConnecting } = useWallet();

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

          {user ? (
            <div className="flex items-center gap-2">
              {address ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      {`${address.slice(0, 6)}...${address.slice(-4)}`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 glass-card" align="end" forceMount>
                    <div className="px-3 py-2">
                      <p className="text-xs text-muted-foreground">Chain: {chainId || "—"}</p>
                      <p className="text-xs text-muted-foreground break-all">Address: {address}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={(event) => {
                        event.preventDefault();
                        disconnect();
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Disconnect
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={connect}
                  disabled={isConnecting}
                >
                  <Wallet className="w-4 h-4" />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-card" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.user_metadata?.display_name && (
                        <p className="font-medium">{user.user_metadata.display_name}</p>
                      )}
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/portfolio" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Portfolio
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={(event) => {
                      event.preventDefault();
                      signOut();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {address ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      {`${address.slice(0, 6)}...${address.slice(-4)}`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 glass-card" align="end" forceMount>
                    <div className="px-3 py-2">
                      <p className="text-xs text-muted-foreground">Chain: {chainId || "—"}</p>
                      <p className="text-xs text-muted-foreground break-all">Address: {address}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={(event) => {
                        event.preventDefault();
                        disconnect();
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Disconnect
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={connect}
                  disabled={isConnecting}
                >
                  <Wallet className="w-4 h-4" />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              )}

              <button
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
              </button>
              <Link to="/auth">
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
