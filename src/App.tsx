import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Explorer from "./pages/Explorer";
import Strategy from "./pages/Strategy";
import Alerts from "./pages/Alerts";
import Portfolio from "./pages/Portfolio";
import About from "./pages/About";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AgenticChat from "./pages/AgenticChat";
import ChatWidget from "./components/ChatWidget";
import FullScreenChatModal from "./components/FullScreenChatModal";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import { ChatProvider } from "./contexts/ChatContext";
import { useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  const [isFullScreenChatOpen, setIsFullScreenChatOpen] = useState(false);
  const isDev = import.meta.env.DEV;

  return (
    <QueryClientProvider client={queryClient}>
      {isDev ? (
        <ChatProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/explorer" element={<Explorer />} />
                <Route path="/strategy" element={<Strategy />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/about" element={<About />} />
                <Route path="/chat" element={<AgenticChat />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ChatWidget onFullScreen={() => setIsFullScreenChatOpen(true)} />
              <FullScreenChatModal 
                isOpen={isFullScreenChatOpen} 
                onClose={() => setIsFullScreenChatOpen(false)} 
              />
            </BrowserRouter>
          </TooltipProvider>
        </ChatProvider>
      ) : (
        <AuthProvider>
          <ChatProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/explorer" element={<Explorer />} />
                  <Route path="/strategy" element={
                    <ProtectedRoute>
                      <Strategy />
                    </ProtectedRoute>
                  } />
                  <Route path="/alerts" element={
                    <ProtectedRoute>
                      <Alerts />
                    </ProtectedRoute>
                  } />
                  <Route path="/portfolio" element={
                    <ProtectedRoute>
                      <Portfolio />
                    </ProtectedRoute>
                  } />
                  <Route path="/about" element={<About />} />
                  <Route path="/chat" element={
                    <ProtectedRoute>
                      <AgenticChat />
                    </ProtectedRoute>
                  } />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <ChatWidget onFullScreen={() => setIsFullScreenChatOpen(true)} />
                <FullScreenChatModal 
                  isOpen={isFullScreenChatOpen} 
                  onClose={() => setIsFullScreenChatOpen(false)} 
                />
              </BrowserRouter>
            </TooltipProvider>
          </ChatProvider>
        </AuthProvider>
      )}
    </QueryClientProvider>
  );
};

export default App;
