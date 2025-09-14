import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Waves, Sun, Wind, Eye, AlertTriangle, Compass, Calendar, Settings, Server, Trash2, Check, X } from 'lucide-react';
import TideChart from './components/TideChart';
import WeatherCard from './components/WeatherCard';
import ActivityRecommendations from './components/ActivityRecommendations';
import LocationSettings from './components/LocationSettings';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import MapView from './components/MapView';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [location, setLocation] = useState(null);
  const [tideData, setTideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30 * 60 * 1000); // 30 minutes
  const [backendStatus, setBackendStatus] = useState(null);
  const [apiHealth, setApiHealth] = useState('unknown');
  
  // Notification system
  const [notifications, setNotifications] = useState([]);

  // Real-time clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Notification system
  const addNotification = (message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Check backend health
  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const health = await response.json();
        setBackendStatus(health);
        setApiHealth('healthy');
        addNotification('Backend health check successful', 'success', 2000);
      } else {
        setApiHealth('error');
        addNotification('Backend health check returned errors', 'warning');
      }
    } catch (error) {
      console.warn('Backend health check failed:', error);
      setApiHealth('offline');
      addNotification('Backend is offline or unreachable', 'error');
    }
  };

  // Clear API cache
  const clearAPICache = async () => {
    try {
      addNotification('Clearing API cache...', 'info', 1000);
      
      const response = await fetch(`${API_BASE_URL}/cache/clear`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        addNotification('API cache cleared successfully', 'success');
        // Refresh data after clearing cache
        await refreshData();
      } else {
        addNotification('Failed to clear API cache', 'error');
      }
    } catch (error) {
      console.error('Failed to clear API cache:', error);
      addNotification('Error clearing API cache: ' + error.message, 'error');
    }
  };

  // Clear all local storage
  const clearAllLocalStorage = () => {
    try {
      const confirmClear = window.confirm(
        'This will clear all locally stored data including saved location, preferences, and cached data. Are you sure you want to continue?'
      );
      
      if (confirmClear) {
        // Get storage size before clearing
        const storageSize = JSON.stringify(localStorage).length;
        
        localStorage.clear();
        
        addNotification(
          `Local storage cleared successfully. Freed ${(storageSize / 1024).toFixed(1)} KB of space`,
          'success',
          5000
        );
        
        // Reset app state
        setLocation(null);
        setTideData(null);
        setAutoRefresh(true);
        setRefreshInterval(30 * 60 * 1000);
        
        // Re-initialize the app
        setTimeout(() => {
          initializeApp();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to clear local storage:', error);
      addNotification('Error clearing local storage: ' + error.message, 'error');
    }
  };

  // Get local storage info
  const getLocalStorageInfo = () => {
    try {
      const items = [];
      const totalSize = JSON.stringify(localStorage).length;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        const size = (key + value).length;
        items.push({ key, size });
      }
      
      return {
        totalSize,
        itemCount: items.length,
        items: items.sort((a, b) => b.size - a.size)
      };
    } catch (error) {
      return { totalSize: 0, itemCount: 0, items: [] };
    }
  };

  // Get user's current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      };

      addNotification('Getting your current location...', 'info', 2000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          addNotification('Location obtained successfully', 'success', 2000);
          resolve(coords);
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          addNotification(errorMessage, 'error');
          reject(new Error(errorMessage));
        },
        options
      );
    });
  };

  // Enhanced error handling with backend status codes
  const handleAPIError = (error, response) => {
    if (response?.status === 422) {
      setError('Invalid location coordinates provided. Please check your location settings.');
    } else if (response?.status === 500) {
      setError('Server error occurred. This might be due to missing API keys or service unavailability.');
    } else if (response?.status === 404) {
      setError('API endpoint not found. Please check if the backend server is running.');
    } else {
      setError(error.message || 'An unexpected error occurred');
    }
  };

  // Fetch tide data from backend
  const fetchTideData = async (lat, lon) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tides?lat=${lat}&lon=${lon}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorDetail;
        try {
          const errorJson = JSON.parse(errorText);
          errorDetail = errorJson.detail || errorText;
        } catch {
          errorDetail = errorText;
        }
        throw { message: `API Error: ${response.status} - ${errorDetail}`, response };
      }
      
      const data = await response.json();
      addNotification('Tide data updated successfully', 'success', 2000);
      return data;
    } catch (error) {
      if (error.response) {
        handleAPIError(error, error.response);
      }
      addNotification('Failed to fetch tide data', 'error');
      throw error;
    }
  };

  // Load location from localStorage
  const loadStoredLocation = () => {
    try {
      const stored = localStorage.getItem('tideApp_location');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if stored location is less than 1 hour old
        const age = Date.now() - parsed.timestamp;
        if (age < 3600000) { // 1 hour
          addNotification('Using stored location', 'info', 2000);
          return parsed.coords;
        } else {
          addNotification('Stored location expired, getting fresh location', 'info', 2000);
        }
      }
    } catch (error) {
      console.warn('Failed to load stored location:', error);
      addNotification('Failed to load stored location', 'warning');
    }
    return null;
  };

  // Save location to localStorage
  const saveLocation = (coords) => {
    try {
      const locationData = {
        coords,
        timestamp: Date.now()
      };
      localStorage.setItem('tideApp_location', JSON.stringify(locationData));
      addNotification('Location saved to device', 'success', 2000);
    } catch (error) {
      console.warn('Failed to save location:', error);
      addNotification('Failed to save location', 'warning');
    }
  };

  // Clear stored location
  const clearStoredLocation = () => {
    try {
      localStorage.removeItem('tideApp_location');
      addNotification('Stored location cleared', 'success', 2000);
    } catch (error) {
      console.warn('Failed to clear stored location:', error);
      addNotification('Failed to clear stored location', 'error');
    }
  };

  // Initialize app
  const initializeApp = async () => {
    setLoading(true);
    setError(null);

    try {
      addNotification('Initializing TideTracker Pro...', 'info', 2000);
      
      // Check backend health first
      await checkBackendHealth();

      // Try to use stored location first
      let coords = loadStoredLocation();
      
      if (!coords) {
        // Get fresh location
        coords = await getCurrentLocation();
        saveLocation(coords);
      }

      setLocation(coords);

      // Fetch tide data
      const data = await fetchTideData(coords.lat, coords.lon);
      setTideData(data);
      setLastUpdated(new Date());

      addNotification('Application initialized successfully', 'success');

    } catch (error) {
      handleAPIError(error, error.response);
      console.error('Initialization error:', error);
      addNotification('Application initialization failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    if (!location) return;
    
    try {
      setError(null);
      addNotification('Refreshing data...', 'info', 1000);
      
      const data = await fetchTideData(location.lat, location.lon);
      setTideData(data);
      setLastUpdated(new Date());
      await checkBackendHealth(); // Also refresh health status
    } catch (error) {
      handleAPIError(error, error.response);
    }
  };

  // Update location
  const updateLocation = async () => {
    try {
      setLoading(true);
      const coords = await getCurrentLocation();
      saveLocation(coords);
      setLocation(coords);
      
      const data = await fetchTideData(coords.lat, coords.lon);
      setTideData(data);
      setLastUpdated(new Date());
    } catch (error) {
      handleAPIError(error, error.response);
    } finally {
      setLoading(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !location) return;

    const interval = setInterval(() => {
      refreshData();
      addNotification('Auto-refresh triggered', 'info', 1000);
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, location]);

  // Periodic health checks
  useEffect(() => {
    const healthInterval = setInterval(checkBackendHealth, 60000); // Every minute
    return () => clearInterval(healthInterval);
  }, []);

  // Format time for display
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Get time until next tide
  const getTimeUntilTide = (tideTime) => {
    const now = new Date();
    const tide = new Date(tideTime);
    const diff = tide - now;

    if (diff < 0) return 'Past';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return <LoadingSpinner message="Connecting to backend services..." />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
        {/* Notification System */}
        <div className="fixed z-50 max-w-sm space-y-2 top-4 right-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-center justify-between p-4 rounded-lg shadow-lg transition-all duration-300 transform ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                notification.type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
              } animate-slide-in`}
            >
              <div className="flex items-center space-x-2">
                {notification.type === 'success' && <Check className="w-5 h-5" />}
                {notification.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                {notification.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {notification.type === 'info' && <Clock className="w-5 h-5" />}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="p-1 ml-2 rounded-full hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Header */}
        <header className="border-b border-blue-100 shadow-sm bg-white/80 backdrop-blur-md">
          <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Waves className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">TideTracker Pro</h1>
                
                {/* API Status Indicator */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    apiHealth === 'healthy' ? 'bg-green-500 animate-pulse' :
                    apiHealth === 'error' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-gray-600">
                    {apiHealth === 'healthy' ? 'API Online' :
                     apiHealth === 'error' ? 'API Issues' :
                     'API Offline'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowMap(!showMap)}
                  className={`p-2 transition-colors ${
                    showMap ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600'
                  }`}
                  title="Toggle map view"
                >
                  <MapPin className="w-5 h-5" />
                </button>
                
                <button
                  onClick={refreshData}
                  className="p-2 text-gray-600 transition-colors hover:text-blue-600"
                  title="Refresh data"
                >
                  <Clock className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-600 transition-colors hover:text-blue-600"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Last updated and current time */}
            <div className="flex items-center justify-between mt-2">
              {lastUpdated && (
                <p className="text-sm text-gray-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
              
              <div className="text-sm text-gray-600">
                <span className="font-mono">
                  {currentTime.toLocaleTimeString()}
                </span>
                <span className="ml-2">
                  {currentTime.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <LocationSettings
            location={location}
            onLocationUpdate={updateLocation}
            onClearLocation={() => {
              clearStoredLocation();
              setLocation(null);
              setTideData(null);
              initializeApp();
            }}
            autoRefresh={autoRefresh}
            onAutoRefreshChange={setAutoRefresh}
            refreshInterval={refreshInterval}
            onRefreshIntervalChange={setRefreshInterval}
            onClose={() => setShowSettings(false)}
            onClearCache={clearAPICache}
            onClearLocalStorage={clearAllLocalStorage}
            localStorageInfo={getLocalStorageInfo()}
            backendStatus={backendStatus}
          />
        )}

        <main className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {error && (
            <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-3 text-red-500" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <div className="flex mt-2 space-x-2">
                    <button
                      onClick={initializeApp}
                      className="text-sm text-red-800 underline hover:text-red-900"
                    >
                      Try again
                    </button>
                    <button
                      onClick={checkBackendHealth}
                      className="text-sm text-red-800 underline hover:text-red-900"
                    >
                      Check API status
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Map View */}
          {showMap && location && (
            <div className="mb-6">
              <MapView 
                location={location}
                tideData={tideData}
                onLocationChange={(newCoords) => {
                  setLocation(newCoords);
                  saveLocation(newCoords);
                  fetchTideData(newCoords.lat, newCoords.lon).then(data => {
                    setTideData(data);
                    setLastUpdated(new Date());
                  }).catch(error => handleAPIError(error, error.response));
                }}
              />
            </div>
          )}

          {tideData && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Main Tide Information */}
              <div className="space-y-6 lg:col-span-2">
                {/* Location Card */}
                <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-6 h-6 text-blue-600" />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {tideData.location_name || 'Current Location'}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {tideData.lat.toFixed(4)}°, {tideData.lon.toFixed(4)}°
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowMap(!showMap)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                          showMap 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {showMap ? 'Hide Map' : 'Show Map'}
                        </span>
                      </button>
                      
                      <button
                        onClick={updateLocation}
                        className="flex items-center px-4 py-2 space-x-2 text-blue-700 transition-colors rounded-lg bg-blue-50 hover:bg-blue-100"
                      >
                        <Compass className="w-4 h-4" />
                        <span className="text-sm font-medium">Update Location</span>
                      </button>
                    </div>
                  </div>

                  {/* Current Time Display */}
                  <div className="p-4 mb-6 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50">
                    <div className="text-center">
                      <div className="mb-1 font-mono text-3xl font-bold text-gray-900">
                        {currentTime.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true 
                        })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {currentTime.toLocaleDateString([], { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Next Tides */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {tideData.next_tides.slice(0, 2).map((tide, index) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg border-2 ${
                          tide.type === 'High' 
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">
                            {index === 0 ? 'Next' : 'Following'} {tide.type} Tide
                          </h3>
                          <Waves className={`h-5 w-5 ${
                            tide.type === 'High' ? 'text-blue-600' : 'text-amber-600'
                          }`} />
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-lg font-bold">
                            {formatTime(tide.time)}
                          </p>
                          <p className="text-sm opacity-75">
                            {tide.relative_time}
                          </p>
                          <p className="text-sm">
                            Height: {tide.height}m
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Daily Summary */}
                  {tideData.daily_summary && (
                    <div className="p-4 mt-6 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50">
                      <h3 className="flex items-center mb-3 font-semibold text-gray-900">
                        <Calendar className="w-5 h-5 mr-2" />
                        Today's Summary
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                        <div>
                          <p className="text-gray-600">High Tides</p>
                          <p className="font-semibold">{tideData.daily_summary.high_tides_count}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Low Tides</p>
                          <p className="font-semibold">{tideData.daily_summary.low_tides_count}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Max Height</p>
                          <p className="font-semibold">{tideData.daily_summary.max_height}m</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Min Height</p>
                          <p className="font-semibold">{tideData.daily_summary.min_height}m</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tide Chart */}
                <TideChart tideData={tideData.next_tides} />

                {/* Activity Recommendations */}
                <ActivityRecommendations 
                  recommendations={tideData.recommendations}
                  marineConditions={tideData.marine_conditions}
                />
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Weather Card */}
                <WeatherCard weather={tideData.weather} />

                {/* Marine Conditions */}
                {tideData.marine_conditions && (
                  <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
                    <h3 className="flex items-center mb-4 font-semibold text-gray-900">
                      <Eye className="w-5 h-5 mr-2" />
                      Marine Conditions
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Overall Rating</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          tideData.marine_conditions.overall_rating === 'Excellent' ? 'bg-green-100 text-green-800' :
                          tideData.marine_conditions.overall_rating === 'Good' ? 'bg-blue-100 text-blue-800' :
                          tideData.marine_conditions.overall_rating === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tideData.marine_conditions.overall_rating}
                        </span>
                      </div>

                      {tideData.marine_conditions.suitability && (
                        <div className="space-y-2">
                          {Object.entries(tideData.marine_conditions.suitability).map(([activity, rating]) => (
                            <div key={activity} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 capitalize">{activity}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full">
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
                      )}

                      {tideData.marine_conditions.warnings && tideData.marine_conditions.warnings.length > 0 && (
                        <div className="p-3 mt-4 border rounded-lg bg-amber-50 border-amber-200">
                          <h4 className="mb-2 text-sm font-medium text-amber-800">Warnings</h4>
                          <ul className="space-y-1 text-sm text-amber-700">
                            {tideData.marine_conditions.warnings.map((warning, index) => (
                              <li key={index} className="flex items-start">
                                <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
                  <h3 className="mb-4 font-semibold text-gray-900">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={refreshData}
                      className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Refresh Data</span>
                    </button>
                    
                    <button
                      onClick={clearAPICache}
                      className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-orange-700 transition-colors rounded-lg bg-orange-50 hover:bg-orange-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear API Cache</span>
                    </button>
                    
                    <button
                      onClick={clearAllLocalStorage}
                      className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-red-700 transition-colors rounded-lg bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear All Local Data</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Tide Information',
                            text: `Next ${tideData.next_tides[0]?.type} tide at ${formatTime(tideData.next_tides[0]?.time)}`,
                            url: window.location.href
                          });
                        }
                      }}
                      className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t border-gray-200 bg-white/50 backdrop-blur-sm">
          <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="text-sm text-center text-gray-600">
              <p>TideTracker Pro - Your comprehensive tide and marine conditions companion</p>
              <p className="mt-1">Built with React, FastAPI, and love for the ocean</p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
