import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, TrendingUp, BarChart3, PieChart, LineChart, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChartGenerator } from './ChartGenerator';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/contexts/ChatContext';
import apiService from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ChatWidgetProps {
  onFullScreen?: () => void;
}

const ChatWidget = ({ onFullScreen }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, addMessage, isGenerating, setIsGenerating, setMessages } = useChat();

  // Load chat history from Supabase via backend when available
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = user?.id || session?.user?.id;
        const token = session?.access_token;
        if (!uid || !token) return;

        const rows = await apiService.getChatHistory(uid, token, 50);
        const mapped: { id: string; type: 'user' | 'assistant'; content: string; timestamp: number }[] =
          (rows || []).reverse().map((row: any) => ({
            id: row.id || `${Date.now()}-${Math.random()}`,
            type: row.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: String(row.content ?? ''),
            timestamp: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          }));
        if (mapped.length > 0) {
          setMessages(mapped);
        }
      } catch (e) {
        // ignore history load errors in UI
        console.debug('Chat history load skipped:', e);
      }
    })();
  }, [user?.id, setMessages]);

  const generateChart = async (query: string): Promise<{ chartType: string; data: any } | null> => {
    try {
      const res = await apiService.query({ query, userAddress: user?.id || undefined });
      if (res?.success && res?.data?.results) {
        const viz = res.data.results.visualizations?.find((v: any) => (v.type === 'chart') || v?.config?.chartType) || null;
        const mapped = viz ? mapVisualizationToChart(viz) : null;
        if (mapped) return mapped;
      }
      // Fallback to simple pattern matching if backend didn't return usable chart
      return generateFallbackChart(query);
    } catch (error) {
      console.error('Error getting backend chart:', error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Using fallback chart generation",
      });
      return generateFallbackChart(query);
    }
  };

  const mapVisualizationToChart = (viz: any): { chartType: string; data: any } | null => {
    try {
      if (!viz) return null;
      const type = viz?.config?.chartType || viz?.type;
      const data = viz?.data || [];
      switch (type) {
        case 'bar': {
          if (Array.isArray(data) && data.length > 0) {
            if ('protocol' in data[0] && 'apy' in data[0]) {
              return {
                chartType: 'bar',
                data: data.map((d: any) => ({
                  category: d.protocol ?? d.label ?? 'Item',
                  value: typeof d.apy === 'string' ? parseFloat(d.apy) : d.apy,
                })),
              };
            }
            if ('category' in data[0] && 'value' in data[0]) {
              return { chartType: 'bar', data };
            }
          }
          return null;
        }
        case 'line': {
          if (Array.isArray(data) && data.length > 0) {
            if ('time' in data[0] && 'value' in data[0]) {
              return { chartType: 'line', data: data.map((d: any) => ({ month: d.time, value: d.value })) };
            }
            if ('timestamp' in data[0] && 'value' in data[0]) {
              return { chartType: 'line', data: data.map((d: any) => ({ month: d.timestamp, value: d.value })) };
            }
          }
          return null;
        }
        case 'area': {
          if (Array.isArray(data) && data.length > 0) {
            if ('time' in data[0] && 'portfolio' in data[0]) {
              return { chartType: 'area', data };
            }
            if ('time' in data[0] && 'value' in data[0]) {
              return { chartType: 'area', data: data.map((d: any) => ({ time: d.time, portfolio: d.value })) };
            }
          }
          return null;
        }
        case 'pie': {
          if (Array.isArray(data) && data.length > 0) {
            if ('name' in data[0] && 'value' in data[0]) {
              return { chartType: 'pie', data };
            }
            if ('label' in data[0] && 'value' in data[0]) {
              return {
                chartType: 'pie',
                data: data.map((d: any, i: number) => ({
                  name: d.label,
                  value: d.value,
                  fill: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))'][i % 3],
                })),
              };
            }
          }
          return null;
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  };

  const generateFallbackChart = (query: string): { chartType: string; data: any } | null => {
    // Simple pattern matching for demo - fallback when AI fails
    const queryLower = query.toLowerCase();
    if (queryLower.includes('line chart') || queryLower.includes('trends') || queryLower.includes('over time')) {
      return {
        chartType: 'line',
        data: [
          { month: 'Jan', value: Math.floor(Math.random() * 1000) + 500 },
          { month: 'Feb', value: Math.floor(Math.random() * 1000) + 500 },
          { month: 'Mar', value: Math.floor(Math.random() * 1000) + 500 },
          { month: 'Apr', value: Math.floor(Math.random() * 1000) + 500 },
          { month: 'May', value: Math.floor(Math.random() * 1000) + 500 },
          { month: 'Jun', value: Math.floor(Math.random() * 1000) + 500 },
        ]
      };
    }
    
    if (queryLower.includes('bar chart') || queryLower.includes('comparison') || queryLower.includes('categories')) {
      return {
        chartType: 'bar',
        data: [
          { category: 'DeFi', value: Math.floor(Math.random() * 100) + 20 },
          { category: 'NFTs', value: Math.floor(Math.random() * 100) + 20 },
          { category: 'Gaming', value: Math.floor(Math.random() * 100) + 20 },
          { category: 'AI', value: Math.floor(Math.random() * 100) + 20 },
          { category: 'Web3', value: Math.floor(Math.random() * 100) + 20 },
        ]
      };
    }
    
    if (queryLower.includes('pie chart') || queryLower.includes('distribution') || queryLower.includes('breakdown')) {
      return {
        chartType: 'pie',
        data: [
          { name: 'Ethereum', value: 45, fill: 'hsl(var(--primary))' },
          { name: 'Bitcoin', value: 30, fill: 'hsl(var(--accent))' },
          { name: 'Others', value: 25, fill: 'hsl(var(--muted))' },
        ]
      };
    }
    
    // Default to area chart
    return {
      chartType: 'area',
      data: [
        { time: '00:00', portfolio: Math.floor(Math.random() * 50000) + 10000 },
        { time: '04:00', portfolio: Math.floor(Math.random() * 50000) + 10000 },
        { time: '08:00', portfolio: Math.floor(Math.random() * 50000) + 10000 },
        { time: '12:00', portfolio: Math.floor(Math.random() * 50000) + 10000 },
        { time: '16:00', portfolio: Math.floor(Math.random() * 50000) + 10000 },
        { time: '20:00', portfolio: Math.floor(Math.random() * 50000) + 10000 },
      ]
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userText = inputValue;
    addMessage({
      type: 'user',
      content: userText
    });

    setInputValue('');
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const uid = user?.id || session?.user?.id;

      const res = await apiService.postChat(userText, uid, token);
      if (res?.success && res?.data?.reply) {
        addMessage({
          type: 'assistant',
          content: res.data.reply,
        });
      } else {
        throw new Error('AI response failed');
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback to chart generation only
      const chartResult = await generateChart(userText);
      
      addMessage({
        type: 'assistant',
        content: chartResult ? `Here's your ${chartResult.chartType} chart:` : "I've created a visualization for you:",
        chartData: chartResult?.data,
        chartType: chartResult?.chartType
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { icon: LineChart, label: 'Portfolio Trend', query: 'Show me my portfolio performance over time' },
    { icon: BarChart3, label: 'Asset Comparison', query: 'Compare my different crypto holdings' },
    { icon: PieChart, label: 'Allocation', query: 'Show my portfolio allocation breakdown' },
    { icon: TrendingUp, label: 'Risk Analysis', query: 'Analyze the risk profile of my portfolio' }
  ];

  return (
    <>
      {/* Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="h-14 w-14 rounded-full shadow-floating glow-effect hover:scale-110 transition-all duration-300"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}

        {/* Chat Interface */}
        {isOpen && (
          <Card className="glass-card w-[520px] h-[700px] flex flex-col shadow-floating animate-in slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Chart Assistant</h3>
                  <p className="text-xs text-muted-foreground">Generate interactive charts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onFullScreen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      onFullScreen();
                    }}
                    className="h-8 w-8 p-0"
                    title="Expand to full screen"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      {message.chartData && message.chartType && (
                        <div className="mt-3 w-full">
                          <ChartGenerator 
                            data={message.chartData} 
                            type={message.chartType}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isGenerating && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse-glow">Generating chart...</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Actions */}
            <div className="p-3 border-t border-border/50">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-auto p-2 flex flex-col items-center gap-1"
                    onClick={() => {
                      setInputValue(action.query);
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                  >
                    <action.icon className="h-3 w-3" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me to create a chart..."
                  className="flex-1"
                  disabled={isGenerating}
                />
                <Button 
                  onClick={handleSendMessage}
                  size="sm"
                  disabled={!inputValue.trim() || isGenerating}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
};

export default ChatWidget;
