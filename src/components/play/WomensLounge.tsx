import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Heart, Star, Calendar, MapPin, Clock, Video, BookOpen, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import toast from 'react-hot-toast';

interface WomensEvent {
  id: string;
  title: string;
  description: string;
  organizer: {
    id: string;
    name: string;
    avatar_url?: string;
    profileImage?: string; // legacy field
    isVerified: boolean;
  };
  location: string;
  date: string;
  time: string;
  maxParticipants: number;
  currentParticipants: number;
  category: string;
  isOnline: boolean;
  tokenCost: number;
  features: string[];
  rating: number;
  totalRatings: number;
}

interface WomensCoach {
  id: string;
  name: string;
  avatar_url?: string;
  profileImage?: string; // legacy field
  bio: string;
  specialty: string;
  rating: number;
  totalRatings: number;
  followers: number | { count: number };
  isVerified: boolean;
  isOnline: boolean;
}

interface WomensContent {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'article' | 'workout';
  thumbnail?: string;
  duration?: string;
  author: {
    name: string;
    avatar_url?: string;
    profileImage?: string; // legacy field
  };
  views: number;
  likes: number;
  category: string;
  isPremium: boolean;
  tokenCost: number;
}

export function WomensLounge() {
  const { user } = useAuthStore();
  const { getUserTokens, spendTokens } = useAppStore();
  const [activeTab, setActiveTab] = useState<'events' | 'coaches' | 'content'>('events');
  const [events, setEvents] = useState<WomensEvent[]>([]);
  const [coaches, setCoaches] = useState<WomensCoach[]>([]);
  const [content, setContent] = useState<WomensContent[]>([]);

  // Helper function to extract numeric count from various formats
  const getNumericCount = (count: any): number => {
    if (typeof count === 'number') return count;
    if (typeof count === 'object' && count !== null) {
      if (Array.isArray(count)) {
        return count.length;
      }
      if (count.count !== undefined) {
        return count.count;
      }
    }
    return 0;
  };

  // Check if user is female
  const isFemale = user?.gender === 'female';

  useEffect(() => {
    // TODO: Fetch women's events, coaches, and content from API
    const fetchWomensData = async () => {
      try {
        // Replace with actual API calls
        // const eventsData = await apiService.getWomensEvents();
        // const coachesData = await apiService.getWomensCoaches();
        // const contentData = await apiService.getWomensContent();
        // setEvents(eventsData.events || []);
        // setCoaches(coachesData.coaches || []);
        // setContent(contentData.content || []);
        setEvents([]);
        setCoaches([]);
        setContent([]);
      } catch (error) {
        console.error('Error fetching women\'s data:', error);
        setEvents([]);
        setCoaches([]);
        setContent([]);
      }
    };

    fetchWomensData();
  }, []);

  const handleJoinEvent = async (event: WomensEvent) => {
    if (!user) return;
    
    const userTokens = getUserTokens(user.id);
    if (userTokens.balance < event.tokenCost) {
      toast.error('Insufficient tokens. Please purchase more tokens to join this event.');
      return;
    }

    const success = spendTokens(user.id, event.tokenCost, 'event', `Joined ${event.title}`);
    if (success) {
      toast.success(`Successfully joined ${event.title}!`);
      // Update event participants
      setEvents(prev => prev.map(e => 
        e.id === event.id 
          ? { ...e, currentParticipants: e.currentParticipants + 1 }
          : e
      ));
    } else {
      toast.error('Failed to join event. Please try again.');
    }
  };

  const handleAccessContent = async (contentItem: WomensContent) => {
    if (!user) return;
    
    if (contentItem.isPremium) {
      const userTokens = getUserTokens(user.id);
      if (userTokens.balance < contentItem.tokenCost) {
        toast.error('Insufficient tokens. Please purchase more tokens to access this content.');
        return;
      }

      const success = spendTokens(user.id, contentItem.tokenCost, 'content', `Accessed ${contentItem.title}`);
      if (!success) {
        toast.error('Failed to access content. Please try again.');
        return;
      }
    }

    toast.success(`Accessing ${contentItem.title}...`);
    // Here you would typically open the content in a modal or navigate to a content page
  };

  if (!isFemale) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-2xl p-8 text-center shadow-lg">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-full p-4 w-20 h-20 mx-auto mb-6">
            <Shield className="h-12 w-12 text-white mx-auto" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Women's Lounge</h2>
          <p className="text-gray-600 mb-8 text-lg leading-relaxed">
            This space is exclusively for women athletes and organizers. It provides a safe, supportive environment 
            for women to connect, learn, and grow together in sports.
          </p>
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Why Women's Lounge?</h3>
            <ul className="text-left text-gray-600 space-y-3">
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                <span>Safe space for women to share experiences</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Female-focused coaching and mentorship</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Events designed specifically for women's needs</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                <span>Supportive community of women athletes</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 rounded-2xl p-8 mb-8 shadow-lg">
        <div className="flex items-center space-x-6">
          <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4 rounded-2xl">
            <Heart className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Women's Lounge</h1>
            <p className="text-gray-600 text-lg">A safe space for women athletes to connect, learn, and grow together</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 bg-gray-100 rounded-xl p-2 mb-8">
        {[
          { id: 'events', label: 'Events', icon: Calendar },
          { id: 'coaches', label: 'Coaches', icon: Users },
          { id: 'content', label: 'Content', icon: BookOpen },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-3 px-6 py-3 rounded-lg transition-all duration-300 font-semibold ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
          <div className="grid gap-6">
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{event.title}</h3>
                    <p className="text-gray-600 mb-4">{event.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {event.features.map((feature, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-pink-100 text-pink-700 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-1 mb-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{event.rating}</span>
                      <span className="text-sm text-gray-500">({event.totalRatings})</span>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      {event.currentParticipants}/{event.maxParticipants} participants
                    </div>
                    <div className="text-lg font-bold text-pink-600 mb-3">
                      {event.tokenCost} tokens
                    </div>
                    <Button
                      onClick={() => handleJoinEvent(event)}
                      disabled={event.currentParticipants >= event.maxParticipants}
                      size="sm"
                    >
                      {event.currentParticipants >= event.maxParticipants ? 'Full' : 'Join Event'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Coaches Tab */}
      {activeTab === 'coaches' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured Women Coaches</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {coaches.map((coach) => (
              <motion.div
                key={coach.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-start space-x-4">
                  <div className="relative">
                    <Avatar
                      src={coach.avatar_url || coach.profileImage}
                      alt={coach.name}
                      name={coach.name}
                      size="lg"
                    />
                    {coach.isOnline && (
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{coach.name}</h3>
                      {coach.isVerified && (
                        <Shield className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{coach.bio}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span>{coach.rating}</span>
                        <span>({coach.totalRatings})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{getNumericCount(coach.followers)} followers</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                      <Button size="sm">
                        Follow
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Women's Content</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                {item.thumbnail && (
                  <div className="relative">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-48 object-cover"
                    />
                    {item.duration && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        {item.duration}
                      </div>
                    )}
                    {item.isPremium && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                        Premium
                      </div>
                    )}
                  </div>
                )}
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <Video className="h-4 w-4" />
                      <span>{item.views} views</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4" />
                      <span>{item.likes} likes</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      by {item.author.name}
                    </div>
                    <Button
                      onClick={() => handleAccessContent(item)}
                      size="sm"
                      variant={item.isPremium ? "primary" : "outline"}
                    >
                      {item.isPremium ? `${item.tokenCost} tokens` : 'Free'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
