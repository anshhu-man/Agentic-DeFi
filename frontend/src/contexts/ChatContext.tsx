import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  chartData?: any;
  chartType?: string;
  timestamp?: number;
}

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  addMessage: (message: Omit<Message, 'id'>) => void;
  clearMessages: () => void;
  isGenerating: boolean;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hi! I can generate charts and provide AI-powered insights about your DeFi portfolio. Try asking me to create visualizations or analyze your holdings!',
      timestamp: Date.now()
    }
  ]);
  
  const [isGenerating, setIsGenerating] = useState(false);

  const addMessage = (message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const clearMessages = () => {
    setMessages([
      {
        id: '1',
        type: 'assistant',
        content: 'Hi! I can generate charts and provide AI-powered insights about your DeFi portfolio. Try asking me to create visualizations or analyze your holdings!',
        timestamp: Date.now()
      }
    ]);
  };

  const value: ChatContextType = {
    messages,
    setMessages,
    addMessage,
    clearMessages,
    isGenerating,
    setIsGenerating
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};