import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const MessageInput = ({ onSend }) => {
  const [message, setMessage] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSend({
        type: 'text',
        content: message
      });
      setMessage('');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input
    e.target.value = '';

    // Validate file type
    if (!file.type.match('image.*')) {
      alert('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Please upload an image smaller than 5MB');
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSend({
          type: 'image',
          content: reader.result
        });
      }
      setIsUploading(false);
    };

    reader.onerror = () => {
      alert('Error reading file. Please try again.');
      setIsUploading(false);
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      alert('Error processing file. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200">
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
          disabled={isUploading}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`p-2 ${
            isUploading 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-500 hover:text-blue-600'
          } transition-colors`}
          title="Upload medical report"
        >
          <DocumentTextIcon className={`w-5 h-5 ${isUploading ? 'animate-pulse' : ''}`} />
        </button>

        <button
          type="submit"
          disabled={!message.trim() || isUploading}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  );
};

export default MessageInput;