import React from 'react';
import FloatingButton from './FloatingButton';
import ChatWindow from './ChatWindow';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="chat-widget">
      {isOpen && <ChatWindow onClose={toggleChat} />}
      <FloatingButton onClick={toggleChat} isOpen={isOpen} />
    </div>
  );
};

export default ChatWidget;