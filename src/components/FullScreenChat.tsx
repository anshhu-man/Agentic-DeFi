import React, { useState, useRef, useEffect } from 'react';
import { Send, TrendingUp, BarChart3, PieChart, LineChart, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChartGenerator } from './ChartGenerator';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FullScreenChatProps {
  onClose?: () => void;
}

const FullScreenChat = ({ onClose }: FullScreenChatProps) => {
  const [inputValue, setInputValue] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, addMessage, isGenerating, setIsGenerating } = useChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const generateChart = async (query: string): Promise<{ chartType: string; data: any } | null> => {
    try {
      // Call AI portfolio chat function
      const { data, error } = await supabase.functions.invoke('ai-portfolio-chat', {
        body: {
          message: query,
          user_id: user?.id,
        }
      });

      if (error) {
        console.error('Error calling AI chat:', error);
        throw new Error(error.message);
      }

      const result = await data;
      
      if (result.success && result.chartData) {
        return {
          chartType: result.chartType,
          data: result.chartData
        };
      }

      // Fallback to simple pattern matching if AI doesn't return chart data
      return generateFallbackChart(query);
    } catch (error) {
      console.error('Error in AI chat:', error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Using fallback chart generation",
      });
      return generateFallbackChart(query);
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

    const currentInput = inputValue;
    addMessage({
      type: 'user',
      content: currentInput
    });

    setInputValue('');
    setIsGenerating(true);

    try {
      // First try AI-powered response
      const { data, error } = await supabase.functions.invoke('ai-portfolio-chat', {
        body: {
          message: currentInput,
          user_id: user?.id,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = await data;
      
      if (result.success) {
        addMessage({
          type: 'assistant',
          content: result.response,
          chartData: result.chartData,
          chartType: result.chartType
        });
      } else {
        throw new Error(result.error || 'AI response failed');
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Fallback to chart generation only
      const chartResult = await generateChart(currentInput);
      
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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AI Chart Assistant</h1>
            <p className="text-sm text-muted-foreground">Generate interactive charts and analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Minimize2 className="h-4 w-4" />
              Exit Full Screen
            </Button>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-foreground'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                {message.chartData && message.chartType && (
                  <div className="mt-4 p-4 bg-background/50 rounded-xl">
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
              <div className="bg-muted/50 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  </div>
                  <span className="text-sm text-muted-foreground">Generating response...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="p-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-auto p-3 flex flex-col items-center gap-2"
                onClick={() => {
                  setInputValue(action.query);
                  setTimeout(() => handleSendMessage(), 100);
                }}
              >
                <action.icon className="h-4 w-4" />
                <span className="text-xs">{action.label}</span>
              </Button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to create a chart or analyze your portfolio..."
              className="flex-1 h-12"
              disabled={isGenerating}
            />
            <Button 
              onClick={handleSendMessage}
              size="lg"
              className="h-12 px-6"
              disabled={!inputValue.trim() || isGenerating}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenChat;