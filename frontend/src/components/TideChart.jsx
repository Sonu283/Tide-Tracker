import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const TideChart = ({ tideData }) => {
  if (!tideData || tideData.length === 0) {
    return null;
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
      <h3 className="mb-4 font-semibold text-gray-900">Tide Timeline</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-4">
          {tideData.slice(0, 6).map((tide, index) => (
            <div key={index} className="relative flex items-center space-x-4">
              {/* Timeline dot */}
              <div className={`relative z-10 w-4 h-4 rounded-full border-2 ${
                tide.type === 'High' 
                  ? 'bg-blue-500 border-blue-500' 
                  : 'bg-amber-500 border-amber-500'
              }`}>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {tide.type === 'High' ? (
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="font-medium text-gray-900">
                      {tide.type} Tide
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatTime(tide.time)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {tide.relative_time}
                    </div>
                  </div>
                </div>
                
                <div className="mt-1 text-sm text-gray-600">
                  Height: {tide.height}m
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TideChart;
