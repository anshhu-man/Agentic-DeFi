import React, { useEffect } from 'react';
import AIAssistantUI from './agentic/AIAssistantUI';

interface FullScreenChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FullScreenChatModal = ({ isOpen, onClose }: FullScreenChatModalProps) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-full h-full bg-background overflow-hidden">
        {/* AI Assistant UI */}
        <div className="w-full h-full overflow-hidden">
          <AIAssistantUI onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default FullScreenChatModal;