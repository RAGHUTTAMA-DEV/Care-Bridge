import React from 'react';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/solid';

const FloatingButton = ({ onClick, isOpen }) => {
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-4 right-4 p-4 
        bg-blue-500 text-white rounded-full 
        shadow-lg hover:bg-blue-600 
        transform transition-transform duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50
        ${isOpen ? 'scale-0' : 'scale-100'}
      `}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      <ChatBubbleLeftIcon className="w-6 h-6" />
    </button>
  );
};

export default FloatingButton;