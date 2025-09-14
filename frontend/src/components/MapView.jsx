import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Waves, MapPin, Clock } from 'lucide-react';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom tide marker icon
const tideIcon = new L.DivIcon({
  html: `<div class="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>`,
  className: 'custom-tide-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Component to handle map clicks
function MapClickHandler({ onLocationChange }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationChange({ lat, lon: lng });
    },
  });
  return null;
}

const MapView = ({ location, tideData, onLocationChange }) => {
  const [mapKey, setMapKey] = useState(0);

  // Force re-render when location changes
  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [location]);

  if (!location) {
    return (
      <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="text-center text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Location not available</p>
        </div>
      </div>
    );
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center font-semibold text-gray-900">
            <MapPin className="w-5 h-5 mr-2" />
            Location Map
          </h3>
          <p className="text-sm text-gray-600">
            Click on the map to change location
          </p>
        </div>
      </div>
      
      <div className="relative h-96">
        <MapContainer
          key={mapKey}
          center={[location.lat, location.lon]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler onLocationChange={onLocationChange} />
          
          <Marker 
            position={[location.lat, location.lon]}
            icon={tideIcon}
          >
            <Popup>
              <div className="p-2 min-w-48">
                <div className="flex items-center mb-2 space-x-2">
                  <Waves className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">
                    {tideData?.location_name || 'Current Location'}
                  </span>
                </div>
                
                <div className="mb-3 text-sm text-gray-600">
                  <p>{location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°</p>
                  {location.accuracy && (
                    <p className="text-xs">Accuracy: ±{Math.round(location.accuracy)}m</p>
                  )}
                </div>

                {tideData?.next_tides && tideData.next_tides.length > 0 && (
                  <div className="space-y-2">
                    <div className="pb-1 text-xs font-medium text-gray-700 border-b">
                      Next Tides:
                    </div>
                    {tideData.next_tides.slice(0, 2).map((tide, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className={tide.type === 'High' ? 'text-blue-600' : 'text-amber-600'}>
                          {tide.type}
                        </span>
                        <div className="text-right">
                          <div className="font-medium">{formatTime(tide.time)}</div>
                          <div className="text-gray-500">{tide.relative_time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tideData?.weather?.current && (
                  <div className="pt-2 mt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Weather:</span>
                        <span>{tideData.weather.current.temperature}°C</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {tideData.weather.current.condition}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
