import React from 'react';
import { Waves, Server } from 'lucide-react';

const LoadingSpinner = ({ message = "Getting your location..." }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="text-center">
        <div className="relative mb-6">
          <Waves className="w-16 h-16 mx-auto text-blue-600 animate-bounce" />
          <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
        </div>
        
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          TideTracker Pro
        </h2>
        
        <p className="mb-4 text-gray-600">
          {message}
        </p>
        
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <Server className="w-4 h-4" />
          <span>Connecting to services...</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
