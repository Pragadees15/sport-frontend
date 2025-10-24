import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  CheckCircle, 
  Shield, 
  Heart, 
  Users, 
  Star, 
  Filter, 
  Plus, 
  AlertCircle,
  Zap,
  RotateCcw,
  Search,
  TrendingUp,
  Map,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  WifiOff
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import { LocationCheckIn, SafeLocation, Event } from '../../types';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { MapComponent } from './MapComponent';

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

export function MapPage() {
  const { user } = useAuthStore();
  const { addTokens } = useAppStore();
  
  // Debug authentication state (only log once when component mounts)
  useEffect(() => {
    if (user) {
      console.log('MapPage - User authenticated:', {
        id: user.id,
        name: user.name || user.fullName,
        email: user.email
      });
    }
  }, []); // Empty dependency array to run only once

  // Clean up location when component unmounts
  useEffect(() => {
    return () => {
      // Clean up location tracking when component unmounts
      if (socketService.getCurrentLocationId()) {
        socketService.leaveLocation(socketService.getCurrentLocationId()!);
      }
    };
  }, []);
  const [activeTab, setActiveTab] = useState<'map' | 'checkins' | 'safety'>('map');
  const [mapType, setMapType] = useState<'standard' | 'heatmap' | 'safety'>('standard');
  const [tileLayer, setTileLayer] = useState<'standard' | 'satellite' | 'terrain' | 'dark'>('standard');
  const [heatMapType] = useState<'activity' | 'women-safe' | 'disability-friendly'>('activity');
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [safeLocations, setSafeLocations] = useState<SafeLocation[]>([]);
  const [userCheckIns, setUserCheckIns] = useState<LocationCheckIn[]>([]);
  const [heatMapData, setHeatMapData] = useState<LocalHeatMapData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocationCoords, setNewLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number; timestamp?: number; method?: 'gps' | 'network' | 'fallback' } | null>(null);
  const [recentCheckedLocationIds, setRecentCheckedLocationIds] = useState<Set<string>>(new Set());
  const [selectedSafetyFeatures, setSelectedSafetyFeatures] = useState<string[]>([]);
  const [selectedSafeLocation, setSelectedSafeLocation] = useState<SafeLocation | null>(null);
  
  // New UI state variables
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMapControls, setShowMapControls] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [locationAccuracy, setLocationAccuracy] = useState<'high' | 'medium' | 'low' | 'unknown'>('unknown');
  
  const geolocationWatchIdRef = useRef<number | null>(null);
  const bestLocationRef = useRef<{ lat: number; lng: number; accuracy?: number; timestamp?: number; method?: 'gps' | 'network' | 'fallback' } | null>(null);

  // Improved location acquisition with better error handling and fallback strategies
  const getUserLocation = async (showLoading = false): Promise<{ lat: number; lng: number; accuracy?: number; timestamp?: number; method?: 'gps' | 'network' | 'fallback' }> => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return {
        lat: 40.7128, // New York City as fallback
        lng: -74.0060,
        method: 'fallback'
      };
    }

    // Check permission state to provide better guidance
    try {
      // @ts-ignore - permissions API type
      if (navigator.permissions && navigator.permissions.query) {
        // @ts-ignore
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        
        if (perm.state === 'denied') {
          toast.error('Location permission denied. Please enable it in your browser settings and refresh the page.');
          return {
            lat: 40.7128,
            lng: -74.0060,
            method: 'fallback'
          };
        } else if (perm.state === 'prompt') {
          toast.loading('Please allow location access when prompted...', { id: 'location-permission' });
        }
      }
    } catch (error) {
      console.warn('Could not check permission state:', error);
    }

    if (showLoading) {
      toast.loading('Getting your location...', { id: 'location-loading' });
    }

    // Strategy 1: Try high accuracy GPS first (single attempt with reasonable timeout)
    const tryHighAccuracy = (): Promise<{ lat: number; lng: number; accuracy?: number; timestamp?: number; method?: 'gps' | 'network' | 'fallback' }> => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const result = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              method: (position.coords.accuracy || 999) <= 20 ? 'gps' as const : 'network' as const
            };
            resolve(result);
          },
          (error) => {
            console.warn('High accuracy location failed:', error);
            resolve({ lat: 40.7128, lng: -74.0060, accuracy: 9999, method: 'fallback' });
          },
          { 
            enableHighAccuracy: true, 
            timeout: 10000, // 10 seconds is reasonable
            maximumAge: 30000 // Allow 30-second old data if available
          }
        );
      });
    };

    // Strategy 2: Try network-based location if GPS fails
    const tryNetworkLocation = (): Promise<{ lat: number; lng: number; accuracy?: number; timestamp?: number; method?: 'gps' | 'network' | 'fallback' }> => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const result = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              method: 'network' as const
            };
            resolve(result);
          },
          (error) => {
            console.warn('Network location failed:', error);
            resolve({ lat: 40.7128, lng: -74.0060, accuracy: 9999, method: 'fallback' });
          },
          { 
            enableHighAccuracy: false, 
            timeout: 8000,
            maximumAge: 60000 // Allow 1-minute old data
          }
        );
      });
    };

    // Try high accuracy first
    const highAccuracyResult = await tryHighAccuracy();
    
    // If high accuracy worked and is reasonably accurate, use it
    if (highAccuracyResult.accuracy && highAccuracyResult.accuracy <= 100) {
      if (showLoading) {
        toast.success('Accurate location found!', { id: 'location-loading' });
      }
      return highAccuracyResult;
    }

    // If high accuracy failed or is poor, try network location
    const networkResult = await tryNetworkLocation();
    
    // If network location worked, use it
    if (networkResult.accuracy && networkResult.accuracy < 9999) {
      if (showLoading) {
        toast.success('Approximate location found', { id: 'location-loading' });
      }
      return networkResult;
    }

    // If both failed, return fallback
    if (showLoading) {
      toast.error('Could not get your location. Using default location.', { id: 'location-loading' });
    }
    
    return {
      lat: 40.7128,
      lng: -74.0060,
      accuracy: 9999,
      method: 'fallback'
    };
  };

  // Improved refinement watch with better accuracy tracking and shorter duration
  const startRefinementWatch = (initial?: { lat: number; lng: number; accuracy?: number; timestamp?: number; method?: 'gps' | 'network' | 'fallback' }) => {
    if (!navigator.geolocation) return;
    
    // Clear any prior watch
    if (geolocationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
      geolocationWatchIdRef.current = null;
    }

    bestLocationRef.current = initial || null;
    const startedAt = Date.now();
    const maxDurationMs = 15000; // Reduced from 30s to 15s
    const targetAccuracyM = 20; // Slightly more lenient threshold
    const maxAcceptableAccuracyM = 200; // Reduced from 300m to 200m
    let improvementCount = 0;
    const maxImprovements = 3; // Stop after 3 improvements

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const candidate = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          method: (position.coords.accuracy || 999) <= 20 ? 'gps' as const : 'network' as const
        };

        // Discard extremely imprecise readings
        if (candidate.accuracy && candidate.accuracy > maxAcceptableAccuracyM) {
          return;
        }

        const pickBetter = () => {
          const current = bestLocationRef.current;
          if (!current || typeof current.accuracy !== 'number') return true;
          if (typeof candidate.accuracy !== 'number') return false;
          // Require at least 5m improvement (reduced from 3m)
          return candidate.accuracy < current.accuracy - 5;
        };

        if (pickBetter()) {
          bestLocationRef.current = candidate;
          setUserLocation(candidate);
          improvementCount++;
          
          // Update location accuracy state with more granular levels
          if (candidate.accuracy && candidate.accuracy <= 5) {
            setLocationAccuracy('high');
          } else if (candidate.accuracy && candidate.accuracy <= 25) {
            setLocationAccuracy('high');
          } else if (candidate.accuracy && candidate.accuracy <= 50) {
            setLocationAccuracy('medium');
          } else {
            setLocationAccuracy('low');
          }
        }

        const elapsed = Date.now() - startedAt;
        // Stop if we've reached target accuracy, max duration, or max improvements
        if ((candidate.accuracy || 999) <= targetAccuracyM || 
            elapsed >= maxDurationMs || 
            improvementCount >= maxImprovements) {
          if (geolocationWatchIdRef.current !== null) {
            navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
            geolocationWatchIdRef.current = null;
          }
        }
      },
      (error) => {
        console.warn('Refinement watch error:', error);
        if (geolocationWatchIdRef.current !== null) {
          navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
          geolocationWatchIdRef.current = null;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Reduced timeout
        maximumAge: 10000 // Allow 10-second old data
      }
    );
    geolocationWatchIdRef.current = watchId as unknown as number;
  };

  useEffect(() => {
    const loadMapData = async () => {
      try {
        // Load safe locations
        const safeLocationsResponse = await apiService.getSafeLocations({
          page: 1,
          limit: 100
        });
        console.log('Safe locations loaded:', safeLocationsResponse.locations?.length || 0, 'locations');
        console.log('First safe location sample:', safeLocationsResponse.locations?.[0]);
        console.log('First safe location verifications_count:', safeLocationsResponse.locations?.[0]?.verifications_count);
        setSafeLocations(safeLocationsResponse.locations || []);

        // Note: Safe locations are now handled separately in the UI
        // We don't convert them to regular locations anymore
        setLocations([]);

        // Load user check-ins
        const checkInsResponse = await apiService.getUserCheckIns({
          page: 1,
          limit: 50
        });
        setUserCheckIns(checkInsResponse.checkIns || []);

        // Load heatmap data when available
        if (userLocation) {
          const delta = 0.1; // ~11km
          const { heatMapData: backendHeat } = await apiService.getHeatMapData({
            bounds: {
              north: userLocation.lat + delta,
              south: userLocation.lat - delta,
              east: userLocation.lng + delta,
              west: userLocation.lng - delta
            }
          });
          const transformed = (backendHeat || []).map((h: any) => ({
            id: h.id,
            latitude: h.grid_lat,
            longitude: h.grid_lng,
            intensity: Math.min(Math.max(Math.round((h.intensity || 1) * 10), 1), 100),
            type: 'activity' as const,
            userCount: h.intensity || 1
          }));
          setHeatMapData(transformed);
        } else {
          setHeatMapData([]);
        }

      } catch (error) {
        console.error('Failed to load map data:', error);
        toast.error('Failed to load map data. Please try again.');
      }
    };

    loadMapData();

    // Get user's current location with improved error handling
    const initializeUserLocation = async () => {
      const location = await getUserLocation(true);
      setUserLocation({
        ...location,
        method: (location.accuracy || 999) <= 20 ? 'gps' : 'network'
      });
      startRefinementWatch(location);
    };

    initializeUserLocation();

    // Set up socket event listeners for real-time updates
    const handleLocationUserCountUpdate = (event: CustomEvent) => {
      const { locationId, userCount } = event.detail;
      setLocations(prev => prev.map(loc => 
        loc.id === locationId 
          ? { ...loc, currentUsers: userCount }
          : loc
      ));
    };

    const handleUserJoinedLocation = (event: CustomEvent) => {
      const { locationId, user } = event.detail;
      console.log(`User ${user.name} joined location ${locationId}`);
      // The user count will be updated by locationUserCountUpdate event
    };

    const handleUserLeftLocation = (event: CustomEvent) => {
      const { locationId, userId } = event.detail;
      console.log(`User ${userId} left location ${locationId}`);
      // The user count will be updated by locationUserCountUpdate event
    };

    const handleUserCheckedIn = (event: CustomEvent) => {
      const { user, tokensEarned } = event.detail;
      toast.success(`${user.name} checked in nearby! They earned ${tokensEarned} tokens`);
    };

    // Add event listeners
    window.addEventListener('locationUserCountUpdate', handleLocationUserCountUpdate as EventListener);
    window.addEventListener('userJoinedLocation', handleUserJoinedLocation as EventListener);
    window.addEventListener('userLeftLocation', handleUserLeftLocation as EventListener);
    window.addEventListener('userCheckedIn', handleUserCheckedIn as EventListener);

    // Cleanup event listeners and any geolocation watchers
    return () => {
      window.removeEventListener('locationUserCountUpdate', handleLocationUserCountUpdate as EventListener);
      window.removeEventListener('userJoinedLocation', handleUserJoinedLocation as EventListener);
      window.removeEventListener('userLeftLocation', handleUserLeftLocation as EventListener);
      window.removeEventListener('userCheckedIn', handleUserCheckedIn as EventListener);
      if (geolocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
        geolocationWatchIdRef.current = null;
      }
    };
  }, []);

  // Compute recent check-ins and map them to nearby locations to disable button
  useEffect(() => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const now = Date.now();
    const recentThresholdMs = 90 * 60 * 1000; // 90 minutes window
    const proximityKm = 0.15; // 150 meters
    const ids = new Set<string>();

    if (!userCheckIns || userCheckIns.length === 0 || locations.length === 0) {
      setRecentCheckedLocationIds(ids);
      return;
    }

    for (const checkIn of userCheckIns) {
      const ts = (checkIn as any).checked_in_at || (checkIn as any).createdAt;
      const t = ts ? new Date(ts).getTime() : 0;
      if (!t || now - t > recentThresholdMs) continue;
      const clat = (checkIn as any).latitude;
      const clng = (checkIn as any).longitude;
      if (typeof clat !== 'number' || typeof clng !== 'number') continue;
      for (const loc of locations) {
        const distKm = haversineKm(clat, clng, loc.latitude, loc.longitude);
        if (distKm <= proximityKm) ids.add(loc.id);
      }
    }
    setRecentCheckedLocationIds(ids);
  }, [userCheckIns, locations]);

  // Debug logging for map data
  useEffect(() => {
    console.log('Map data debug:', {
      mapType,
      safeLocationsCount: safeLocations.length,
      locationsCount: locations.length,
      firstSafeLocation: safeLocations[0],
      safeLocationsWithVerifications: safeLocations.filter(loc => (loc as any).verifications_count > 0)
    });
  }, [mapType, safeLocations, locations]);

  // Fetch heatmap data when switching to Heat Map or when user location changes
  useEffect(() => {
    const fetchHeatmap = async () => {
      if (mapType !== 'heatmap' || !userLocation) {
        return;
      }
      try {
        const delta = 0.1;
        const { heatMapData: backendHeat } = await apiService.getHeatMapData({
          bounds: {
            north: userLocation.lat + delta,
            south: userLocation.lat - delta,
            east: userLocation.lng + delta,
            west: userLocation.lng - delta
          }
        });
        const transformed = (backendHeat || []).map((h: any) => ({
          id: h.id,
          latitude: h.grid_lat,
          longitude: h.grid_lng,
          intensity: Math.min(Math.max(Math.round((h.intensity || 1) * 10), 1), 100),
          type: 'activity' as const,
          userCount: h.intensity || 1
        }));
        setHeatMapData(transformed);
      } catch (e) {
        console.error('Failed to load heatmap data:', e);
      }
    };
    fetchHeatmap();
  }, [mapType, userLocation]);

  const handleCheckIn = async (location: MapLocation) => {
    if (!user) {
      toast.error('Please log in to check in.');
      return;
    }

    try {
      // Join the location room for real-time updates with coordinates
      socketService.joinLocation(location.id, location.latitude, location.longitude, location.name);

      // Map user's sports category to valid activity values
      const mapSportsCategoryToActivity = (category?: string): string => {
        if (!category) return 'coco';
        
        const categoryMap: { [key: string]: string } = {
          'coco': 'coco',
          'Coco': 'coco',
          'martial-arts': 'martial-arts',
          'Martial Arts': 'martial-arts',
          'Boxing': 'martial-arts',
          'calorie-fight': 'calorie-fight',
          'Calorie Fight': 'calorie-fight',
          'Gym': 'calorie-fight',
          'Fitness & Training': 'calorie-fight'
        };
        
        return categoryMap[category] || 'coco';
      };

      // Get user's sports category from either legacy field or new sports_categories array
      const getUserSportsCategory = (): string => {
        // Check legacy sportsCategory field first
        if (user.sportsCategory) {
          return user.sportsCategory;
        }
        
        // Check new sports_categories array
        if (user.sports_categories && user.sports_categories.length > 0) {
          return user.sports_categories[0];
        }
        
        // Default fallback
        return 'coco';
      };

      const userSportsCategory = getUserSportsCategory();
      const checkInData = {
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: location.name,
        activity: mapSportsCategoryToActivity(userSportsCategory),
        duration: 60, // Default 1 hour
        notes: `Checked in at ${location.name}`
      };

      console.log('User sports category:', userSportsCategory);
      console.log('Mapped activity:', mapSportsCategoryToActivity(userSportsCategory));

      console.log('Sending check-in data:', checkInData);
      const response = await apiService.checkInToLocation(checkInData);
      console.log('Check-in response:', response);
      
      // Refresh check-ins list
      const checkInsResponse = await apiService.getUserCheckIns({
        page: 1,
        limit: 50
      });
      setUserCheckIns(checkInsResponse.checkIns || []);
      
      // Award tokens
      const tokensEarned = response.tokensEarned || 5;
      addTokens(user.id, tokensEarned, 'earned', `Checked in at ${location.name}`);
      
      // Update heat map data
      setHeatMapData(prev => prev.map(data => 
        Math.abs(data.latitude - location.latitude) < 0.001 && Math.abs(data.longitude - location.longitude) < 0.001
          ? { ...data, userCount: data.userCount + 1, intensity: Math.min(1, data.intensity + 0.1) }
          : data
      ));
      
      // Update location user count
      setLocations(prev => prev.map(loc => 
        loc.id === location.id 
          ? { ...loc, currentUsers: loc.currentUsers + 1, lastCheckIn: new Date().toISOString() }
          : loc
      ));
      
      toast.success(`Checked in at ${location.name}! +${tokensEarned} tokens earned`);
      setShowCheckInModal(false);
    } catch (error) {
      console.error('Check-in failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to check in. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleMarkSafe = async (location: MapLocation, safetyFeatures: string[]) => {
    if (!user) return;

    try {
      let response: any;
      if (selectedSafeLocation && selectedSafeLocation.id) {
        // Update existing safe location via dedicated endpoint (merge + conditional reward)
        response = await apiService.markSafeLocation(selectedSafeLocation.id, safetyFeatures);
      } else {
        const locationData = {
          name: location.name,
          description: `Marked as safe by ${user.name || user.fullName}`,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          category: location.type === 'gym' ? 'gym' : 
                   location.type === 'park' ? 'park' :
                   location.type === 'studio' ? 'sports-center' : 'other',
          safetyFeatures,
          amenities: [],
          operatingHours: {},
          contactInfo: {},
          imageUrls: []
        };
        response = await apiService.createSafeLocation(locationData);
      }
      
      // Refresh safe locations list
      const safeLocationsResponse = await apiService.getSafeLocations({
        page: 1,
        limit: 100
      });
      setSafeLocations(safeLocationsResponse.locations || []);
      
      // Award tokens for marking safety
      const earned = response.tokensEarned || 0;
      if (earned > 0) {
        addTokens(user.id, earned, 'earned', `Marked ${location.name} as safe`);
      }
      
      toast.success(`Location marked as safe! +${response.tokensEarned || 10} tokens earned`);
      setSelectedSafeLocation(null);
      setShowSafetyModal(false);
    } catch (error) {
      console.error('Failed to mark location as safe:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      toast.error('Failed to mark location as safe. Please try again.');
    }
  };

  // Helper to resolve a target location for marking safety
  const getSafetyTargetLocation = (): MapLocation | null => {
    if (selectedLocation) return selectedLocation;
    if (newLocationCoords) {
      return {
        id: 'temp',
        name: 'Pinned location',
        latitude: newLocationCoords.lat,
        longitude: newLocationCoords.lng,
        address: `${newLocationCoords.lat.toFixed(4)}, ${newLocationCoords.lng.toFixed(4)}`,
        type: 'park',
        isActive: true,
        currentUsers: 0,
        safetyFeatures: [],
        rating: 0,
        totalRatings: 0,
        events: []
      };
    }
    if (userLocation) {
      return {
        id: 'temp',
        name: 'Current location',
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        address: `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`,
        type: 'park',
        isActive: true,
        currentUsers: 0,
        safetyFeatures: [],
        rating: 0,
        totalRatings: 0,
        events: []
      };
    }
    return null;
  };

  const handleAddNewLocation = async (locationData: {
    name: string;
    description: string;
    category: string;
    safetyFeatures: string[];
    amenities: string[];
  }) => {
    console.log('handleAddNewLocation called with:', locationData);
    console.log('User state:', user ? { id: user.id, name: user.name } : 'No user');
    console.log('New location coords:', newLocationCoords);
    
    if (!user) {
      console.error('No user found - user must be logged in to add locations');
      toast.error('You must be logged in to add locations');
      return;
    }
    
    if (!newLocationCoords) {
      console.error('No coordinates found for new location');
      toast.error('Location coordinates are missing');
      return;
    }

    try {
      const newLocationData = {
        name: locationData.name.trim(),
        description: locationData.description?.trim() || '',
        category: locationData.category,
        latitude: newLocationCoords.lat,
        longitude: newLocationCoords.lng,
        address: `${newLocationCoords.lat.toFixed(4)}, ${newLocationCoords.lng.toFixed(4)}`,
        amenities: locationData.amenities || [],
        safetyFeatures: locationData.safetyFeatures || [],
        operatingHours: {},
        contactInfo: {},
        imageUrls: []
      };

      console.log('Attempting to create location with data:', newLocationData);
      console.log('API Base URL:', import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
      console.log('Auth token exists:', !!localStorage.getItem('auth_token'));
      
      const response = await apiService.createSafeLocation(newLocationData);
      console.log('Location creation response:', response);
      
      // Refresh locations
      const safeLocationsResponse = await apiService.getSafeLocations({
        page: 1,
        limit: 100
      });
      setSafeLocations(safeLocationsResponse.locations || []);
      
      // Convert to map locations format and update
      const mapLocations: MapLocation[] = safeLocationsResponse.locations?.map((location: any) => ({
        id: location.id,
        name: location.name,
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        address: location.address || '',
        type: location.category === 'gym' ? 'gym' : 
              location.category === 'park' ? 'park' :
              location.category === 'sports-center' ? 'studio' :
              location.category === 'martial-arts-dojo' ? 'studio' : 'field',
        isActive: location.is_active !== false,
        currentUsers: Math.floor(Math.random() * 20),
        maxCapacity: 50,
        safetyFeatures: location.safety_features || [],
        rating: location.average_rating || 0,
        totalRatings: location.total_ratings || 0,
        events: []
      })) || [];
      setLocations(mapLocations);
      
      // Award tokens
      addTokens(user.id, response.tokensEarned || 15, 'earned', `Added new location: ${locationData.name}`);
      
      toast.success(`Location added successfully! +${response.tokensEarned || 15} tokens earned`);
      setShowAddLocationModal(false);
      setNewLocationCoords(null);
    } catch (error: any) {
      console.error('Failed to add location:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        response: error.response,
        status: error.status
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to add location. ';
      if (error.message?.includes('fetch')) {
        errorMessage += 'Unable to connect to server. Please check if the backend is running.';
      } else if (error.message?.includes('Network')) {
        errorMessage += 'Network error. Please check your internet connection.';
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      toast.error(errorMessage);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!user) return;
    
    setNewLocationCoords({ lat, lng });
    // If user is on Safety tab, use map click to select target for safety marking
    if (activeTab === 'safety') {
      setShowSafetyModal(true);
      return;
    }
    setShowAddLocationModal(true);
  };

  const handleLocationClick = (location: MapLocation) => {
    // Leave previous location if any
    const currentLocationId = socketService.getCurrentLocationId();
    if (currentLocationId && currentLocationId !== location.id) {
      socketService.leaveLocation(currentLocationId);
    }
    
    // Join new location for real-time updates with coordinates
    socketService.joinLocation(location.id, location.latitude, location.longitude, location.name);
    
    setSelectedLocation(location);
  };

  const handleSafeLocationClick = (location: SafeLocation) => {
    // Handle safe location click if needed
    console.log('Safe location clicked:', location);
  };

  const refreshUserLocation = async () => {
    // Clear any existing watch before getting fresh location
    if (geolocationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
      geolocationWatchIdRef.current = null;
    }

    // Get fresh location with improved strategy
    const location = await getUserLocation(true);
    setUserLocation(location);
    startRefinementWatch(location);
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'gym': return '🏋️';
      case 'park': return '🌳';
      case 'studio': return '🎭';
      case 'field': return '⚽';
      case 'court': return '🏀';
      case 'track': return '🏃';
      default: return '📍';
    }
  };

  const getSafetyIcon = (feature: string) => {
    switch (feature) {
      case 'women-safe': return <Heart className="h-4 w-4 text-pink-500" />;
      case 'disability-friendly': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'accessible-parking': return <MapPin className="h-4 w-4 text-green-500" />;
      case 'accessible-entrance': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'well-lit': return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'security-present': return <Shield className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                  <Map className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Sports Map</h1>
                  <p className="text-xs text-gray-500">Discover & Connect</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Location Status */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-full">
                {userLocation ? (
                  <>
                    <div className={`w-2 h-2 rounded-full ${
                      locationAccuracy === 'high' ? 'bg-green-500' :
                      locationAccuracy === 'medium' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-700">
                      {locationAccuracy === 'high' ? 'High Accuracy' :
                       locationAccuracy === 'medium' ? 'Medium Accuracy' :
                       'Low Accuracy'}
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Location Off</span>
                  </>
                )}
              </div>
              
              {/* Stats */}
              <div className="hidden md:flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-gray-600">{userCheckIns.length} check-ins</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">{safeLocations.length} safe spots</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Modern Navigation */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-80 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {[
                  { id: 'map', label: 'Map', icon: MapPin, color: 'blue' },
                  { id: 'checkins', label: 'Check-ins', icon: CheckCircle, color: 'green' },
                  { id: 'safety', label: 'Safety', icon: Shield, color: 'purple' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                      activeTab === tab.id
                        ? `bg-white text-${tab.color}-600 shadow-sm border border-${tab.color}-200`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Quick Filters */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Filters</span>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Filter className="w-4 h-4" />
                    <span>{showFilters ? 'Hide' : 'Show'}</span>
                    {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      {/* Category Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="all">All Categories</option>
                          <option value="gym">Gym</option>
                          <option value="park">Park</option>
                          <option value="studio">Studio</option>
                          <option value="field">Field</option>
                          <option value="court">Court</option>
                          <option value="track">Track</option>
                        </select>
                      </div>

                      {/* Map Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Map Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'standard', label: 'Standard', icon: Map },
                            { id: 'heatmap', label: 'Heat Map', icon: TrendingUp },
                            { id: 'safety', label: 'Safety', icon: Shield }
                          ].map((type) => (
                            <button
                              key={type.id}
                              onClick={() => setMapType(type.id as any)}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                mapType === type.id
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <type.icon className="w-4 h-4" />
                              <span>{type.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tile Layer */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Map Style</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'standard', label: 'Standard', icon: '🗺️' },
                            { id: 'satellite', label: 'Satellite', icon: '🛰️' },
                            { id: 'terrain', label: 'Terrain', icon: '🏔️' },
                            { id: 'dark', label: 'Dark', icon: '🌙' }
                          ].map((layer) => (
                            <button
                              key={layer.id}
                              onClick={() => setTileLayer(layer.id as any)}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                tileLayer === layer.id
                                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              <span>{layer.icon}</span>
                              <span>{layer.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Map View */}
            {activeTab === 'map' && (
              <div className="space-y-6">
                {/* Map Container */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                  <div className="h-[600px] w-full">
                    <MapComponent
                      locations={locations}
                      safeLocations={safeLocations}
                      heatMapData={heatMapData}
                      userLocation={userLocation}
                      mapType={mapType}
                      tileLayer={tileLayer}
                      heatMapType={heatMapType}
                      onMapClick={handleMapClick}
                      onLocationClick={handleLocationClick}
                      onSafeLocationClick={handleSafeLocationClick}
                    />
                  </div>
                  
                  {/* Floating Map Controls */}
                  <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
                    {/* Location Status */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${
                          locationAccuracy === 'high' ? 'bg-green-500' :
                          locationAccuracy === 'medium' ? 'bg-yellow-500' :
                          locationAccuracy === 'low' ? 'bg-red-500' :
                          'bg-gray-400'
                        }`} />
                        <span className="text-sm font-medium text-gray-700">
                          {userLocation ? 'Location Active' : 'Location Off'}
                        </span>
                      </div>
                      
                      {userLocation && userLocation.accuracy && (
                        <div className="text-xs text-gray-600">
                          <div>Accuracy: ±{Math.round(userLocation.accuracy)}m</div>
                          <div className="flex items-center space-x-1 mt-1">
                            {userLocation.method === 'gps' && <span>🛰️ GPS</span>}
                            {userLocation.method === 'network' && <span>📶 Network</span>}
                            <span className="capitalize">{locationAccuracy} accuracy</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2">
                      <Button
                        onClick={refreshUserLocation}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button
                        onClick={() => {
                          if (userLocation) {
                            setNewLocationCoords({ lat: userLocation.lat, lng: userLocation.lng });
                            setShowAddLocationModal(true);
                          } else {
                            toast.error('Please enable location access to add a location at your current position');
                          }
                        }}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Location
                      </Button>
                    </div>

                    {/* Map Controls Toggle */}
                    <Button
                      onClick={() => setShowMapControls(!showMapControls)}
                      size="sm"
                      variant="outline"
                      className="bg-white/90 backdrop-blur-sm"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Heatmap Legend */}
                  {mapType === 'heatmap' && (
                    <div className="absolute bottom-4 left-4 z-10">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-gray-700">Heat Map</span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span>High Activity</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            <span>Medium Activity</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span>Low Activity</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Location Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Regular Locations */}
                  {locations.map((location) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-300"
                      onClick={() => setSelectedLocation(location)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-lg">
                            {getLocationIcon(location.type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm">{location.name}</h3>
                            <p className="text-xs text-gray-600 mt-1">{location.address}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs font-medium">{location.rating}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{location.currentUsers} active</span>
                        </div>
                        {location.maxCapacity && (
                          <span>Max: {location.maxCapacity}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {location.safetyFeatures && location.safetyFeatures.slice(0, 2).map((feature, index) => (
                          <div key={index} className="flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded-full text-xs">
                            {getSafetyIcon(feature)}
                            <span className="capitalize text-blue-700">{feature.replace('-', ' ')}</span>
                          </div>
                        ))}
                        {location.safetyFeatures && location.safetyFeatures.length > 2 && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            +{location.safetyFeatures.length - 2} more
                          </span>
                        )}
                      </div>

                      <Button
                        onClick={() => {
                          if (recentCheckedLocationIds.has(location.id)) return;
                          setSelectedLocation(location);
                          setShowCheckInModal(true);
                        }}
                        size="sm"
                        className={`w-full text-xs ${
                          recentCheckedLocationIds.has(location.id) 
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        disabled={recentCheckedLocationIds.has(location.id)}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {recentCheckedLocationIds.has(location.id) ? 'Checked in' : 'Check In'}
                      </Button>
                    </motion.div>
                  ))}
                  
                  {/* Safe Locations */}
                  {safeLocations.map((location) => (
                    <motion.div
                      key={`safe-${location.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-green-300 border-l-4 border-l-green-500"
                      onClick={() => setSelectedLocation({
                        id: location.id,
                        name: location.name,
                        latitude: location.latitude,
                        longitude: location.longitude,
                        address: location.address,
                        type: 'safe' as any,
                        isActive: true,
                        currentUsers: 0,
                        safetyFeatures: location.safetyFeatures || [],
                        rating: 0,
                        totalRatings: 0,
                        events: []
                      })}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-lg">
                            🛡️
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm">{location.name}</h3>
                            <p className="text-xs text-gray-600 mt-1">{location.address}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Shield className="h-3 w-3 text-green-600" />
                          <span className="text-xs font-medium">{(location as any).verifications_count ?? 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <Shield className="h-3 w-3 text-green-600" />
                          <span>{(location as any).verifications_count || 0} verifications</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Safety Verified
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {(((location as any).safetyFeatures || (location as any).safety_features || []) as string[]).slice(0, 2).map((feature, index) => (
                          <div key={index} className="flex items-center space-x-1 bg-green-50 px-2 py-1 rounded-full text-xs">
                            {getSafetyIcon(feature)}
                            <span className="capitalize text-green-700">{feature.replace('-', ' ')}</span>
                          </div>
                        ))}
                        {(((location as any).safetyFeatures || (location as any).safety_features || []) as string[]).length > 2 && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            +{(((location as any).safetyFeatures || (location as any).safety_features || []) as string[]).length - 2} more
                          </span>
                        )}
                      </div>

                        <Button
                          onClick={() => {
                            const isVerified = Boolean((location as any).userHasVerified);
                            if (isVerified) {
                              // Handle unmark as safe
                            } else {
                              setSelectedSafeLocation(location as any);
                              setSelectedLocation(null);
                              setNewLocationCoords({ lat: parseFloat(String((location as any).latitude)), lng: parseFloat(String((location as any).longitude)) });
                              setSelectedSafetyFeatures((location as any).safetyFeatures || (location as any).safety_features || []);
                              setShowSafetyModal(true);
                            }
                          }}
                          size="sm"
                          className={`w-full text-xs ${
                            (location as any).userHasVerified 
                              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {(location as any).userHasVerified ? 'Mark Unsafe' : 'Mark Safe'}
                        </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Check-ins Tab */}
            {activeTab === 'checkins' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">My Check-ins</h2>
                      <p className="text-gray-600 mt-1">Track your activity and earn tokens</p>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">{userCheckIns.length} total check-ins</span>
                      </div>
                    </div>
                  </div>
                  
                  {userCheckIns.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No check-ins yet</h3>
                      <p className="text-gray-600 mb-6">Start exploring and check in at sports locations to earn tokens!</p>
                      <Button onClick={() => setActiveTab('map')} className="bg-blue-600 hover:bg-blue-700">
                        <MapPin className="h-4 w-4 mr-2" />
                        Explore Map
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userCheckIns.map((checkIn) => (
                        <motion.div
                          key={checkIn.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{checkIn.locationName}</h3>
                                <p className="text-sm text-gray-600">
                                  {new Date(checkIn.checked_in_at || checkIn.createdAt).toLocaleDateString()} at{' '}
                                  {new Date(checkIn.checked_in_at || checkIn.createdAt).toLocaleTimeString()}
                                </p>
                                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                  <span>Duration: {checkIn.duration || 60} min</span>
                                  <span>Activity: {(checkIn as any).activity || 'General'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-sm text-green-600 font-medium">+{Math.min((checkIn.duration || 60) * 0.5, 50)} tokens</div>
                              <div className="text-xs text-gray-500">Check-in reward</div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Safety Map Tab */}
            {activeTab === 'safety' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Safe Locations</h2>
                      <p className="text-gray-600 mt-1">Community-verified safe spaces</p>
                    </div>
                    <Button
                      onClick={() => setShowSafetyModal(true)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Mark Safe Location
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {safeLocations.map((location) => {
                      console.log('Safety Map card rendering for:', location.name, 'verifications_count:', (location as any).verifications_count);
                      return (
                      <motion.div
                        key={location.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-white text-lg">
                              🛡️
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 text-sm">{location.name}</h3>
                              <p className="text-xs text-gray-600 mt-1">{location.address}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Shield className="h-3 w-3 text-green-600" />
                            <span className="text-xs font-medium">{(location as any).verifications_count ?? 0}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                          <div className="flex items-center space-x-1">
                            <Shield className="h-3 w-3 text-green-600" />
                            <span>{(location as any).verifications_count || 0} verifications</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Safety Verified
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {(((location as any).safetyFeatures || (location as any).safety_features || []) as string[]).slice(0, 2).map((feature, index) => (
                            <div key={index} className="flex items-center space-x-1 bg-green-50 px-2 py-1 rounded-full text-xs">
                              {getSafetyIcon(feature)}
                              <span className="capitalize text-green-700">{feature.replace('-', ' ')}</span>
                            </div>
                          ))}
                          {(((location as any).safetyFeatures || (location as any).safety_features || []) as string[]).length > 2 && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              +{(((location as any).safetyFeatures || (location as any).safety_features || []) as string[]).length - 2} more
                            </span>
                          )}
                        </div>

                        <Button
                          onClick={async () => {
                            const isVerified = Boolean((location as any).userHasVerified);
                            if (isVerified) {
                              try {
                                await apiService.markUnsafeLocation((location as any).id);
                                setSafeLocations((prev) => prev.map((l: any) => l.id === (location as any).id ? { ...l, userHasVerified: false, verifications_count: Math.max(((l as any).verifications_count || 1) - 1, 0) } : l));
                              } catch {}
                            } else {
                              setSelectedSafeLocation(location as any);
                              setSelectedLocation(null);
                              setNewLocationCoords({ lat: parseFloat(String((location as any).latitude)), lng: parseFloat(String((location as any).longitude)) });
                              setSelectedSafetyFeatures((location as any).safetyFeatures || (location as any).safety_features || []);
                              setShowSafetyModal(true);
                            }
                          }}
                          size="sm"
                          className={`w-full text-xs ${
                            (location as any).userHasVerified 
                              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {(location as any).userHasVerified ? 'Mark Unsafe' : 'Mark Safe'}
                        </Button>
                      </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Check-in Modal */}
        {showCheckInModal && selectedLocation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl">
                      {getLocationIcon(selectedLocation.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Check in at {selectedLocation.name}</h3>
                      <p className="text-sm text-gray-600">Earn tokens for your activity</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCheckInModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>{selectedLocation.address}</span>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <Users className="h-4 w-4 text-green-600" />
                    <span>{selectedLocation.currentUsers} people currently here</span>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-xl border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="h-5 w-5 text-yellow-600" />
                      <span className="font-semibold text-gray-900">Reward Available!</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Earn <span className="font-bold text-green-600">5 tokens</span> for checking in at this location
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <Button
                    onClick={() => handleCheckIn(selectedLocation)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check In
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCheckInModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Safety Modal */}
        {showSafetyModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-xl">
                      🛡️
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Mark Location as Safe</h3>
                      <p className="text-sm text-gray-600">Help the community by verifying safety</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSafetyModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Select the safety features available at this location:
                  </p>
                  
                  <div className="space-y-3">
                    {[
                      'women-safe',
                      'disability-friendly',
                      'accessible-parking',
                      'accessible-entrance',
                      'accessible-restrooms',
                      'well-lit',
                      'security-present'
                    ].map((feature) => (
                      <label key={feature} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          checked={selectedSafetyFeatures.includes(feature)}
                          onChange={(e) => {
                            setSelectedSafetyFeatures((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(feature);
                              else next.delete(feature);
                              return Array.from(next);
                            });
                          }}
                        />
                        <div className="flex items-center space-x-2">
                          {getSafetyIcon(feature)}
                          <span className="text-sm text-gray-700 capitalize">
                            {feature.replace('-', ' ')}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-gray-900">Community Contribution!</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Earn <span className="font-bold text-green-600">10 tokens</span> for marking a safe location and helping others
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <Button
                    onClick={() => {
                      const target = getSafetyTargetLocation();
                      if (!target) {
                        toast.error('Pick a point on the map or select a location first');
                        return;
                      }
                      handleMarkSafe(target, selectedSafetyFeatures);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Mark Safe
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowSafetyModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Location Modal */}
        {showAddLocationModal && newLocationCoords && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-xl">
                      <Plus className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Add New Location</h3>
                      <p className="text-sm text-gray-600">Help others discover this place</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddLocationModal(false);
                      setNewLocationCoords(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const safetyFeatures = Array.from(e.currentTarget.querySelectorAll('input[name="safetyFeatures"]:checked'))
                    .map((input: any) => input.value);
                  const amenities = Array.from(e.currentTarget.querySelectorAll('input[name="amenities"]:checked'))
                    .map((input: any) => input.value);
                  
                  handleAddNewLocation({
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    category: formData.get('category') as string,
                    safetyFeatures,
                    amenities
                  });
                }}>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter location name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Describe this location"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        name="category"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">Select category</option>
                        <option value="gym">Gym</option>
                        <option value="park">Park</option>
                        <option value="sports-center">Sports Center</option>
                        <option value="martial-arts-dojo">Martial Arts Dojo</option>
                        <option value="community-center">Community Center</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Safety Features
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          'women-safe',
                          'disability-friendly',
                          'accessible-parking',
                          'accessible-entrance',
                          'accessible-restrooms',
                          'well-lit',
                          'security-present'
                        ].map((feature) => (
                          <label key={feature} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <input
                              type="checkbox"
                              name="safetyFeatures"
                              value={feature}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <div className="flex items-center space-x-2">
                              {getSafetyIcon(feature)}
                              <span className="text-sm text-gray-700 capitalize">
                                {feature.replace('-', ' ')}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Amenities
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          'parking',
                          'changing-rooms',
                          'showers',
                          'equipment-rental',
                          'water-fountain',
                          'first-aid',
                          'wifi',
                          'cafe'
                        ].map((amenity) => (
                          <label key={amenity} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <input
                              type="checkbox"
                              name="amenities"
                              value={amenity}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700 capitalize">
                              {amenity.replace('-', ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">Location Coordinates</span>
                        </div>
                        {userLocation && userLocation.method && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            userLocation.method === 'gps' ? 'bg-green-100 text-green-700' :
                            userLocation.method === 'network' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {userLocation.method === 'gps' ? '🛰️ GPS' :
                             userLocation.method === 'network' ? '📶 Network' : '📍 Default'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {newLocationCoords.lat.toFixed(4)}, {newLocationCoords.lng.toFixed(4)}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-gray-700">
                          Earn <span className="font-bold text-green-600">15 tokens</span> for adding this location!
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 mt-8">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddLocationModal(false);
                        setNewLocationCoords(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
