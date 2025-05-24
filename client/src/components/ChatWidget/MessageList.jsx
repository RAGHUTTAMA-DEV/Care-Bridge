import React from 'react';
import { ExclamationCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const MessageList = ({ messages }) => {
  const messageRef = React.useRef();

  React.useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  }, [messages]);

  const renderMessageContent = (message) => {
    if (message.loading) {
      return (
        <div className="flex space-x-1 h-4 items-center px-2">
          <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
          <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
          <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {message.error ? (
          <div className="flex items-start space-x-2 text-red-500">
            <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          </div>
        ) : (
          <>
            {/* Regular message content */}
            {message.content && (
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
            )}

            {/* Uploaded image */}
            {message.imageUrl && (
              <div className="mt-2">
                <img 
                  src={message.imageUrl} 
                  alt="Medical report"
                  className="max-w-full h-auto rounded-md border border-gray-200"
                  style={{ maxHeight: '200px' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="%23f3f4f6"/></svg>';
                  }}
                />
              </div>
            )}

            {/* OCR Results */}
            {message.text && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center space-x-2 text-gray-700">
                  <DocumentTextIcon className="w-5 h-5" />
                  <span className="font-medium">Extracted Text:</span>
                </div>
                <div className="p-2.5 bg-white rounded-md text-sm text-gray-600 border border-gray-200 shadow-sm max-h-40 overflow-y-auto">
                  {message.text}
                </div>
              </div>
            )}

            {/* Analysis Results */}
            {message.analysis && (
              <div className="mt-3 space-y-2">
                <div className="font-medium text-gray-700">Analysis:</div>
                <div className="p-2.5 bg-blue-50 rounded-md text-sm text-gray-700">
                  {message.analysis}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messageRef}>
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] p-3 rounded-xl ${
              message.type === 'user' 
                ? 'bg-blue-500 text-white rounded-br-none'
                : message.error 
                  ? 'bg-red-50 text-red-500 rounded-bl-none border border-red-100'
                  : 'bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100'
            }`}
          >
            {renderMessageContent(message)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;