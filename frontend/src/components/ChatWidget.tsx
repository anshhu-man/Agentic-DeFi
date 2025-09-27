import React, { useState } from 'react';
import { MessageCircle, X, Send, TrendingUp, BarChart3, PieChart, LineChart, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChartGenerator } from './ChartGenerator';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatWidgetProps {
  onFullScreen?: () => void;
}

const ChatWidget = ({ onFullScreen }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, addMessage, isGenerating, setIsGenerating } = useChat();

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

    addMessage({
      type: 'user',
      content: inputValue
    });

    setInputValue('');
    setIsGenerating(true);

    try {
      // First try AI-powered response
      const { data, error } = await supabase.functions.invoke('ai-portfolio-chat', {
        body: {
          message: inputValue,
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
      const chartResult = await generateChart(inputValue);
      
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
