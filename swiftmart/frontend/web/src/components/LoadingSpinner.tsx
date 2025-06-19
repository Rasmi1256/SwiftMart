// src/components/LoadingSpinner.tsx
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
      <p className="ml-4 text-lg text-gray-700">Loading...</p>
    </div>
  );
};

export default LoadingSpinner;