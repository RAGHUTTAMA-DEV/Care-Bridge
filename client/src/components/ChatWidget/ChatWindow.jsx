import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const ChatWindow = ({ onClose }) => {
  const [messages, setMessages] = React.useState([{
    type: 'bot',
    content: 'Hello! I can help you chat or analyze medical reports. Type a message or upload a medical report image.'
  }]);

  const handleError = (error) => {
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
    const errorDetails = error.response?.data?.details 
      ? `\n\nDetails: ${JSON.stringify(error.response.data.details)}`
      : '';

    setMessages(prev => {
      const withoutLoading = prev.filter(msg => !msg.loading);
      return [...withoutLoading, {
        type: 'bot',
        content: `Error: ${errorMessage}${errorDetails}`,
        error: true
      }];
    });
  };

  const handleSendMessage = async (message) => {
    try {
      // Add user message
      setMessages(prev => [...prev, {
        type: 'user',
        content: message.type === 'image' ? 'Uploaded a medical report' : message.content,
        imageUrl: message.type === 'image' ? message.content : null
      }]);
      
      // Add loading message
      setMessages(prev => [...prev, { 
        type: 'bot', 
        loading: true,
        content: message.type === 'image' ? 'Analyzing medical report...' : 'Thinking...'
      }]);

      if (message.type === 'image') {
        try {
          // Send image for OCR and analysis
          const response = await axios.post('http://localhost:3002/api/analyze-image', {
            image: message.content
          });

          // Remove loading message
          setMessages(prev => {
            const withoutLoading = prev.filter(msg => !msg.loading);
            if (!response.data || (!response.data.text && !response.data.analysis)) {
              return [...withoutLoading, {
                type: 'bot',
                content: 'Sorry, I couldn\'t extract any meaningful text from the image.',
                error: true
              }];
            }
            return [...withoutLoading, {
              type: 'bot',
              content: 'Here\'s what I found in the medical report:',
              text: response.data.text,
              analysis: response.data.analysis
            }];
          });
        } catch (error) {
          console.error('OCR Error:', error);
          handleError(error);
        }
      } else {
        try {
          // Regular chat message
          const response = await axios.post('http://localhost:3002/api/chat', {
            message: message.content
          });

          setMessages(prev => {
            const withoutLoading = prev.filter(msg => !msg.loading);
            if (!response.data?.response) {
              return [...withoutLoading, {
                type: 'bot',
                content: 'Sorry, I received an invalid response. Please try again.',
                error: true
              }];
            }
            return [...withoutLoading, {
              type: 'bot',
              content: response.data.response
            }];
          });
        } catch (error) {
          console.error('Chat Error:', error);
          handleError(error);
        }
      }
    } catch (error) {
      console.error('General Error:', error);
      handleError(error);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 w-96 h-[32rem] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      <div className="bg-blue-600 px-4 py-3 flex items-center justify-between shadow-sm">
        <span className="text-white font-semibold">Medical Assistant</span>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
          aria-label="Close chat"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <MessageList messages={messages} />
        <div className="bg-white border-t border-gray-200">
          <MessageInput onSend={handleSendMessage} />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;