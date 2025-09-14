import React from 'react';
import { Activity, Clock, Lightbulb, Star } from 'lucide-react';

const ActivityRecommendations = ({ recommendations, marineConditions }) => {
  if (!recommendations) {
    return null;
  }

  return (
    <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
      <h3 className="flex items-center mb-4 font-semibold text-gray-900">
        <Activity className="w-5 h-5 mr-2" />
        Activity Recommendations
      </h3>
      
      {/* Best Activity */}
      <div className="p-4 mb-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center mb-2 space-x-2">
          <Star className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-900">Recommended Activity</span>
        </div>
        <p className="text-lg font-medium text-green-800">
          {recommendations.best_activity}
        </p>
        {recommendations.best_time && (
          <div className="flex items-center mt-2 space-x-2 text-sm text-green-700">
            <Clock className="w-4 h-4" />
            <span>Best time: {new Date(recommendations.best_time).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
      
      {/* Tips */}
      {recommendations.tips && recommendations.tips.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center mb-3 space-x-2">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-gray-900">Tips & Insights</span>
          </div>
          <ul className="space-y-2">
            {recommendations.tips.map((tip, index) => (
              <li key={index} className="flex items-start text-sm text-gray-700">
                <span className="flex-shrink-0 w-2 h-2 mt-2 mr-3 rounded-full bg-amber-400"></span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Activity Ratings */}
      {marineConditions?.suitability && (
        <div>
          <h4 className="mb-3 font-medium text-gray-900">Activity Suitability</h4>
          <div className="space-y-3">
            {Object.entries(marineConditions.suitability).map(([activity, rating]) => (
              <div key={activity} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">{activity}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-20 h-2 bg-gray-200 rounded-full">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        rating >= 8 ? 'bg-green-500' :
                        rating >= 6 ? 'bg-blue-500' :
                        rating >= 4 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${rating * 10}%` }}
                    />
                  </div>
                  <span className="w-8 text-sm font-medium text-right">{rating}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityRecommendations;
