import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import { SafeLocation, Event } from '../../types';

interface MapLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  type: 'gym' | 'park' | 'studio' | 'field' | 'court' | 'track';
  isActive: boolean;
  currentUsers: number;
  maxCapacity?: number;
  safetyFeatures: string[];
  rating: number;
  totalRatings: number;
  lastCheckIn?: string;
  events: Event[];
}

interface LocalHeatMapData {
  id: string;
  latitude: number;
  longitude: number;
  intensity: number;
  type: 'activity' | 'women-safe' | 'disability-friendly';
  userCount: number;
}

interface MapComponentProps {
  locations: MapLocation[];
  safeLocations: SafeLocation[];
  heatMapData: LocalHeatMapData[];
  userLocation: { lat: number; lng: number; accuracy?: number; timestamp?: number } | null;
  mapType: 'standard' | 'heatmap' | 'safety';
  tileLayer: 'standard' | 'satellite' | 'terrain' | 'dark';
  heatMapType: 'activity' | 'women-safe' | 'disability-friendly';
  onMapClick: (lat: number, lng: number) => void;
  onLocationClick: (location: MapLocation) => void;
  onSafeLocationClick: (location: SafeLocation) => void;
}

// Custom icons for different location types
const createCustomIcon = (type: string, color: string = '#3B82F6') => {
  const iconHtml = `
    <div style="
      background-color: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: white;
    ">
      ${getLocationEmoji(type)}
    </div>
  `;
  
  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

const getLocationEmoji = (type: string): string => {
  switch (type) {
    case 'gym': return '🏋️';
    case 'park': return '🌳';
    case 'studio': return '🧘';
    case 'field': return '⚽';
    case 'court': return '🏀';
    case 'track': return '🏃';
    case 'safe': return '🛡️';
    default: return '📍';
  }
};

// Component to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to handle user location
function UserLocationMarker({ userLocation }: { userLocation: { lat: number; lng: number; accuracy?: number; timestamp?: number } | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation && (!userLocation.accuracy || userLocation.accuracy <= 300)) {
      map.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation, map]);

  if (!userLocation) return null;

  const accuracy = userLocation.accuracy || 0;
  const timestamp = userLocation.timestamp ? new Date(userLocation.timestamp).toLocaleTimeString() : 'Unknown';
  
  // Color code based on accuracy
  const getAccuracyColor = (acc: number) => {
    if (acc <= 10) return '#10B981'; // Green - Very accurate
    if (acc <= 50) return '#F59E0B'; // Yellow - Moderate accuracy
    return '#EF4444'; // Red - Poor accuracy
  };

  const userIcon = L.divIcon({
    html: `
      <div style="
        background-color: ${getAccuracyColor(accuracy)};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>
    `,
    className: 'user-location-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  return (
    <>
      {/* Accuracy circle */}
      {accuracy > 0 && (
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={accuracy}
          pathOptions={{
            color: getAccuracyColor(accuracy),
            fillColor: getAccuracyColor(accuracy),
            fillOpacity: 0.1,
            weight: 2,
            opacity: 0.5
          }}
        />
      )}
      
      {/* User location marker */}
      <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
        <Popup>
          <div className="p-2">
            <h3 className="font-semibold text-lg mb-2">📍 Your Location</h3>
            <div className="space-y-1 text-sm">
              <div><strong>Coordinates:</strong> {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}</div>
              {accuracy > 0 && (
                <div>
                  <strong>Accuracy:</strong> ±{Math.round(accuracy)}m 
                  <span className={`ml-1 px-2 py-1 rounded text-xs ${
                    accuracy <= 10 ? 'bg-green-100 text-green-800' :
                    accuracy <= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {accuracy <= 10 ? 'Very Accurate' : accuracy <= 50 ? 'Moderate' : 'Poor'}
                  </span>
                </div>
              )}
              <div><strong>Last Updated:</strong> {timestamp}</div>
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

// Heatmap overlay component
function HeatmapOverlay({ 
  heatMapData, 
  heatMapType 
}: { 
  heatMapData: LocalHeatMapData[];
  heatMapType: 'activity' | 'women-safe' | 'disability-friendly';
}) {
  const filteredData = heatMapData.filter(data => data.type === heatMapType);
  
  const getHeatmapColor = (intensity: number, type: string) => {
    const normalizedIntensity = Math.min(intensity / 100, 1);
    const alpha = Math.max(normalizedIntensity * 0.7, 0.3); // Ensure minimum visibility
    
    switch (type) {
      case 'activity': 
        return {
          fill: `rgba(59, 130, 246, ${alpha})`, // Blue
          stroke: `rgba(37, 99, 235, ${Math.min(alpha + 0.2, 1)})` // Darker blue
        };
      case 'women-safe': 
        return {
          fill: `rgba(236, 72, 153, ${alpha})`, // Pink
          stroke: `rgba(219, 39, 119, ${Math.min(alpha + 0.2, 1)})` // Darker pink
        };
      case 'disability-friendly': 
        return {
          fill: `rgba(34, 197, 94, ${alpha})`, // Green
          stroke: `rgba(22, 163, 74, ${Math.min(alpha + 0.2, 1)})` // Darker green
        };
      default: 
        return {
          fill: `rgba(59, 130, 246, ${alpha})`,
          stroke: `rgba(37, 99, 235, ${Math.min(alpha + 0.2, 1)})`
        };
    }
  };

  const getHeatmapIcon = (type: string) => {
    switch (type) {
      case 'activity': return '🏃';
      case 'women-safe': return '👩';
      case 'disability-friendly': return '♿';
      default: return '📊';
    }
  };

  return (
    <>
      {filteredData.map((data) => {
        const colors = getHeatmapColor(data.intensity, data.type);
        const radius = Math.max(data.intensity * 15, 50); // Minimum radius of 50m
        
        return (
          <Circle
            key={data.id}
            center={[data.latitude, data.longitude]}
            radius={radius}
            pathOptions={{
              fillColor: colors.fill,
              fillOpacity: 0.4,
              color: colors.stroke,
              weight: 2,
              opacity: 0.8
            }}
          >
            <Popup>
              <div className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{getHeatmapIcon(data.type)}</span>
                  <h4 className="font-semibold capitalize">{data.type.replace('-', ' ')} Hotspot</h4>
                </div>
                <div className="space-y-1 text-sm">
                   <div className="flex justify-between">
                     <span className="text-gray-600">Intensity:</span>
                     <span className="font-medium">{data.intensity}%</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-600">Active Users:</span>
                     <span className="font-medium">{data.userCount}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-600">Coverage:</span>
                     <span className="font-medium">{Math.round(radius)}m radius</span>
                   </div>
                 </div>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}

export function MapComponent({
  locations,
  safeLocations,
  heatMapData,
  userLocation,
  mapType,
  tileLayer,
  heatMapType,
  onMapClick,
  onLocationClick,
  onSafeLocationClick
}: MapComponentProps) {
  // Debug logging for safe locations
  console.log('MapComponent received safeLocations:', safeLocations.length, 'locations');
  console.log('MapComponent mapType:', mapType);
  console.log('Should render safe locations:', mapType === 'safety' || mapType === 'standard');
  console.log('First safe location in MapComponent:', safeLocations[0]);
  console.log('First safe location verifications_count:', (safeLocations[0] as any)?.verifications_count);

  // Debug when safeLocations prop changes
  useEffect(() => {
    console.log('MapComponent safeLocations prop changed:', safeLocations.length, 'locations');
    if (safeLocations.length > 0) {
      console.log('First safe location verifications_count in useEffect:', (safeLocations[0] as any)?.verifications_count);
    }
  }, [safeLocations]);
  const defaultCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : [40.7128, -74.0060]; // Default to NYC

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        {/* Dynamic Tile Layer based on tile layer selection */}
        {tileLayer === 'standard' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        
        {tileLayer === 'satellite' && (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/en-us/home">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        
        {tileLayer === 'terrain' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
        )}
        
        {tileLayer === 'dark' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        )}
        
        <MapClickHandler onMapClick={onMapClick} />
        <UserLocationMarker userLocation={userLocation} />
        
        {/* Regular locations */}
        {(mapType === 'standard' || mapType === 'heatmap') && locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={createCustomIcon(location.type, '#3B82F6')}
            eventHandlers={{
              click: () => onLocationClick(location)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-lg">{location.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium">Type:</span>
                  <span className="text-sm capitalize">{location.type}</span>
                </div>
                {location.currentUsers > 0 && (
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium">Active Users:</span>
                    <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      {location.currentUsers}
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-400">★</span>
                  <span className="text-sm">{(location.rating || 0).toFixed(1)} ({location.totalRatings || 0})</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Safe locations */}
        {(mapType === 'safety' || mapType === 'standard') && (() => {
          console.log('Rendering safe locations:', mapType, 'safeLocations count:', safeLocations.length);
          return safeLocations.map((location) => {
            console.log('Creating marker for safe location:', location.name, 'at', location.latitude, location.longitude);
            return (
          <Marker
            key={`safe-${location.id}`}
            position={[location.latitude, location.longitude]}
            icon={createCustomIcon('safe', location.isVerified ? '#10B981' : '#F59E0B')}
            eventHandlers={{
              click: () => onSafeLocationClick(location)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-lg">{location.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium">Category:</span>
                  <span className="text-sm capitalize">{location.category}</span>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium">Status:</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    location.isVerified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {location.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                {/* Safety Verification Display */}
                <div className="bg-green-50 p-3 rounded-lg mb-2 border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">🛡️</span>
                      <span className="text-sm font-medium text-green-800">Safety Verifications</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xl font-bold text-green-700">{(location as any).verifications_count || 0}</span>
                      <span className="text-sm text-green-600">verified</span>
                    </div>
                  </div>
                  {/* Debug info - remove this later */}
                  <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                    Debug: verifications_count = {(location as any).verifications_count}
                  </div>
                </div>
                {location.safetyFeatures && location.safetyFeatures.length > 0 && (
                  <div className="mb-2">
                    <span className="text-sm font-medium">Safety Features:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {location.safetyFeatures.slice(0, 3).map((feature, index) => (
                        <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Popup>
            </Marker>
            );
          });
        })()}
        
        {/* Heatmap overlay */}
        {mapType === 'heatmap' && (
          <HeatmapOverlay heatMapData={heatMapData} heatMapType={heatMapType} />
        )}
      </MapContainer>
    </div>
  );
}