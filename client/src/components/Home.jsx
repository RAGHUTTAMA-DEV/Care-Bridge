import React from 'react';
import ChatWidget from './ChatWidget'; // Make sure the path is correct

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">
          Medical Report Analysis System
        </h1>
        <p className="text-gray-600">
          Use the chat widget to analyze medical reports or ask questions.
        </p>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default Home;
