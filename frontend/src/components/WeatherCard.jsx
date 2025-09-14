import React from 'react';
import { Sun, Cloud, Wind, Droplets, Eye, Thermometer } from 'lucide-react';

const WeatherCard = ({ weather }) => {
  if (!weather || !weather.current) {
    return null;
  }

  const { current, forecast } = weather;

  const getWeatherIcon = (condition) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('sun') || lowerCondition.includes('clear')) {
      return <Sun className="w-6 h-6 text-yellow-500" />;
    } else if (lowerCondition.includes('cloud')) {
      return <Cloud className="w-6 h-6 text-gray-500" />;
    } else {
      return <Cloud className="w-6 h-6 text-blue-500" />;
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
      <h3 className="flex items-center mb-4 font-semibold text-gray-900">
        <Thermometer className="w-5 h-5 mr-2" />
        Weather Conditions
      </h3>
      
      {/* Current Weather */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getWeatherIcon(current.condition)}
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {current.temperature}°C
              </div>
              <div className="text-sm text-gray-600">
                Feels like {current.feels_like}°C
              </div>
            </div>
          </div>
        </div>
        
        <p className="mb-4 text-sm text-gray-700 capitalize">
          {current.condition}
        </p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Wind className="w-4 h-4 text-gray-500" />
            <span>{current.wind_speed} m/s</span>
          </div>
          <div className="flex items-center space-x-2">
            <Droplets className="w-4 h-4 text-gray-500" />
            <span>{current.humidity}%</span>
          </div>
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <span>{current.visibility ? `${current.visibility}km` : 'N/A'}</span>
          </div>
          <div className="text-gray-600">
            {current.pressure} hPa
          </div>
        </div>
      </div>
      
      {/* Forecast */}
      {forecast && forecast.length > 0 && (
        <div>
          <h4 className="mb-3 font-medium text-gray-900">Next 12 Hours</h4>
          <div className="space-y-3">
            {forecast.slice(0, 4).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.time}</span>
                <div className="flex items-center space-x-2">
                  {getWeatherIcon(item.condition)}
                  <span>{item.temperature}°C</span>
                  <span className="text-gray-500">{item.wind_speed} m/s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherCard;
