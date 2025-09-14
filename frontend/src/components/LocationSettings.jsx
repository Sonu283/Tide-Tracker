import React, { useState } from 'react';
import { X, MapPin, Clock, Trash2, RefreshCw, Server, HardDrive, Database } from 'lucide-react';

const LocationSettings = ({
  location,
  onLocationUpdate,
  onClearLocation,
  autoRefresh,
  onAutoRefreshChange,
  refreshInterval,
  onRefreshIntervalChange,
  onClose,
  onClearCache,
  onClearLocalStorage,
  localStorageInfo,
  backendStatus
}) => {
  const [showStorageDetails, setShowStorageDetails] = useState(false);

  const intervalOptions = [
    { value: 5 * 60 * 1000, label: '5 minutes' },
    { value: 15 * 60 * 1000, label: '15 minutes' },
    { value: 30 * 60 * 1000, label: '30 minutes' },
    { value: 60 * 60 * 1000, label: '1 hour' }
  ];

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Settings & Storage Management</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 transition-colors hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Location Settings */}
          <div>
            <h3 className="flex items-center mb-3 font-medium text-gray-900">
              <MapPin className="w-4 h-4 mr-2" />
              Location Management
            </h3>
            
            {location && (
              <div className="p-3 mb-3 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-600">Current Location</p>
                <p className="font-mono text-sm">
                  {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
                </p>
                {location.accuracy && (
                  <p className="mt-1 text-xs text-gray-500">
                    Accuracy: ±{Math.round(location.accuracy)}m
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <button
                onClick={onLocationUpdate}
                className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Update Location</span>
              </button>
              
              <button
                onClick={onClearLocation}
                className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-red-700 transition-colors rounded-lg bg-red-50 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Stored Location</span>
              </button>
            </div>
          </div>
          
          {/* Auto-refresh Settings */}
          <div>
            <h3 className="flex items-center mb-3 font-medium text-gray-900">
              <Clock className="w-4 h-4 mr-2" />
              Auto-refresh Settings
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => onAutoRefreshChange(e.target.checked)}
                  className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable automatic data refresh
                </span>
              </label>
              
              {autoRefresh && (
                <div>
                  <label className="block mb-2 text-sm text-gray-700">
                    Refresh interval
                  </label>
                  <select
                    value={refreshInterval}
                    onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    {intervalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Storage Management */}
          <div>
            <h3 className="flex items-center mb-3 font-medium text-gray-900">
              <HardDrive className="w-4 h-4 mr-2" />
              Storage Management
            </h3>
            
            <div className="p-3 mb-3 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Local Storage Usage</span>
                <button
                  onClick={() => setShowStorageDetails(!showStorageDetails)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showStorageDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Size:</span>
                  <span className="font-medium">{formatBytes(localStorageInfo.totalSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span className="font-medium">{localStorageInfo.itemCount}</span>
                </div>
              </div>

              {showStorageDetails && localStorageInfo.items.length > 0 && (
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <div className="mb-2 text-xs text-gray-500">Storage Details:</div>
                  <div className="space-y-1 overflow-y-auto max-h-32">
                    {localStorageInfo.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="mr-2 truncate" title={item.key}>
                          {item.key.length > 20 ? item.key.substring(0, 20) + '...' : item.key}
                        </span>
                        <span className="font-mono">{formatBytes(item.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <button
                onClick={onClearLocalStorage}
                className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-red-700 transition-colors rounded-lg bg-red-50 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Local Storage</span>
              </button>
              
              <p className="text-xs text-center text-gray-500">
                This will remove all saved data and reset the application
              </p>
            </div>
          </div>

          {/* API Management */}
          <div>
            <h3 className="flex items-center mb-3 font-medium text-gray-900">
              <Server className="w-4 h-4 mr-2" />
              API Management
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={onClearCache}
                className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-orange-700 transition-colors rounded-lg bg-orange-50 hover:bg-orange-100"
              >
                <Database className="w-4 h-4" />
                <span>Clear API Cache</span>
              </button>

              {backendStatus && (
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="mb-2 text-sm text-gray-600">Backend Status</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium text-green-600">{backendStatus.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cache entries:</span>
                      <span className="font-medium">{backendStatus.cache_entries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tides API:</span>
                      <span className={`font-medium ${
                        backendStatus.services?.tides_api === 'configured' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {backendStatus.services?.tides_api}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weather API:</span>
                      <span className={`font-medium ${
                        backendStatus.services?.weather_api === 'configured' 
                          ? 'text-green-600' 
                          : 'text-yellow-600'
                      }`}>
                        {backendStatus.services?.weather_api}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSettings;
