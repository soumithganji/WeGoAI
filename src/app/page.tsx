'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface PlaceResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  type: string;
}

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [formData, setFormData] = useState({
    tripName: '',
    creatorName: '',
    destination: '',
    destinationCoords: null as { lat: number; lon: number } | null,
    groupSize: 4,
    daysCount: 3,
    nightsCount: 2,
    ageGroup: 'mixed' as 'kids' | 'teens' | 'adults' | 'seniors' | 'mixed',
  });

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [activeField, setActiveField] = useState<'destination' | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions from places API
  const fetchSuggestions = async (query: string, type: 'city' | 'hotel' | 'airport', near?: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const params = new URLSearchParams({ q: query, type });
      if (near) params.set('near', near);

      const response = await fetch(`/api/places?${params.toString()}`);
      const data = await response.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Debounced input handler for destination
  const handleInputChange = (value: string) => {
    setFormData(prev => ({ ...prev, destination: value }));
    setActiveField('destination');

    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Debounce the API call
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value, 'city');
    }, 300);
  };

  // Select a destination suggestion
  const selectSuggestion = (place: PlaceResult) => {
    setFormData(prev => ({
      ...prev,
      destination: place.name,
      destinationCoords: { lat: place.lat, lon: place.lon },
    }));
    setSuggestions([]);
    setActiveField(null);
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.tripName,
          creatorName: formData.creatorName,
          settings: {
            destination: formData.destination,
            groupSize: formData.groupSize,
            daysCount: formData.daysCount,
            nightsCount: formData.nightsCount,
            ageGroup: formData.ageGroup,
          },
        }),
      });

      const data = await response.json();
      if (data.id) {
        localStorage.setItem(`trip_${data.id}_user`, JSON.stringify({
          id: data.creatorId,
          name: formData.creatorName,
        }));
        router.push(`/trip/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating trip:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinTrip = async () => {
    if (!joinCode.trim()) return;

    try {
      const response = await fetch(`/api/trips?inviteCode=${joinCode.toUpperCase()}`);
      const trip = await response.json();

      if (trip._id) {
        router.push(`/trip/${trip._id}/join`);
      } else {
        alert('Trip not found. Check your invite code.');
      }
    } catch (error) {
      console.error('Error joining trip:', error);
    }
  };

  return (
    <main className="min-h-screen bg-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/5 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-black/5 to-transparent" />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-7xl font-bold text-black mb-4 tracking-tight flex items-center justify-center gap-4">
            <svg className="w-20 h-20 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            WeGo<span className="font-light">AI</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Plan your perfect group trip with AI-powered suggestions, real-time collaboration, and smart itinerary management.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Create Trip Card */}
          <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 animate-slide-up hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center text-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </span>
              Create New Trip
            </h2>

            <form onSubmit={handleCreateTrip} className="space-y-5">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  placeholder="Enter your name"
                  value={formData.creatorName}
                  onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">Trip Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  placeholder="Summer Europe Adventure"
                  value={formData.tripName}
                  onChange={(e) => setFormData({ ...formData, tripName: e.target.value })}
                />
              </div>

              {/* Destination with Autocomplete */}
              <div className="relative">
                <label className="block text-gray-700 text-sm font-medium mb-2">Destination</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  placeholder="Start typing a city..."
                  value={formData.destination}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => setActiveField('destination')}
                  onBlur={() => setTimeout(() => activeField === 'destination' && setActiveField(null), 200)}
                />
                {activeField === 'destination' && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        className="w-full px-4 py-3 text-left text-black hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        onClick={() => selectSuggestion(place)}
                      >
                        <div className="font-medium">{place.name}</div>
                        <div className="text-xs text-gray-500 truncate">{place.displayName}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Group Size</label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                    value={formData.groupSize || ''}
                    onChange={(e) => setFormData({ ...formData, groupSize: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Age Group</label>
                  <select
                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-black focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all appearance-none cursor-pointer"
                    value={formData.ageGroup}
                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value as any })}
                  >
                    <option value="kids" className="bg-white text-black">Kids</option>
                    <option value="teens" className="bg-white text-black">Teens</option>
                    <option value="adults" className="bg-white text-black">Adults</option>
                    <option value="seniors" className="bg-white text-black">Seniors</option>
                    <option value="mixed" className="bg-white text-black">Mixed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Days</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                    value={formData.daysCount || ''}
                    onChange={(e) => setFormData({ ...formData, daysCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Nights</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-black placeholder-gray-400 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                    value={formData.nightsCount || ''}
                    onChange={(e) => setFormData({ ...formData, nightsCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-4 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Create Trip
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Join Trip Card */}
          <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col animate-slide-up hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center text-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </span>
              Join Existing Trip
            </h2>

            <p className="text-gray-500 mb-8">
              Have an invite code? Enter it below to join your friends' trip.
            </p>

            <div className="flex-1 flex flex-col justify-center">
              <div className="space-y-4">
                <input
                  type="text"
                  className="w-full px-6 py-5 rounded-2xl bg-gray-50 border border-gray-200 text-black text-center text-2xl tracking-[0.3em] uppercase placeholder-gray-300 focus:bg-white focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-mono"
                  placeholder="ABC12345"
                  maxLength={8}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />

                <button
                  onClick={handleJoinTrip}
                  disabled={joinCode.length < 6}
                  className="w-full py-4 bg-gray-100 text-black font-semibold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-transparent"
                >
                  Join Trip →
                </button>
              </div>
            </div>

            <div className="mt-8 p-5 bg-gray-50 rounded-2xl border border-gray-100">
              <h3 className="text-black font-semibold mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Features
              </h3>
              <ul className="text-gray-600 text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-black">•</span> AI-powered suggestions with @weai mentions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-black">•</span> Real-time group chat & collaboration
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-black">•</span> Democratic voting on activities
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-black">•</span> Smart clash detection
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-black">•</span> Auto travel time calculations
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>);
}
