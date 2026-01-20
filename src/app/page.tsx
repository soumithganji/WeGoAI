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
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 relative overflow-hidden">
      {/* Decorative floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-7xl font-bold text-white mb-4 tracking-tight">
            🌍 WeGo<span className="gradient-text">AI</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Plan your perfect group trip with AI-powered suggestions, real-time collaboration, and smart itinerary management.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Create Trip Card */}
          <div className="glass-card rounded-3xl p-8 shadow-2xl animate-slide-up hover-lift" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-lg">✨</span>
              Create New Trip
            </h2>

            <form onSubmit={handleCreateTrip} className="space-y-5">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus-glow transition-smooth hover:border-violet-500/50"
                  placeholder="Enter your name"
                  value={formData.creatorName}
                  onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">Trip Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus-glow transition-smooth hover:border-violet-500/50"
                  placeholder="Summer Europe Adventure"
                  value={formData.tripName}
                  onChange={(e) => setFormData({ ...formData, tripName: e.target.value })}
                />
              </div>

              {/* Destination with Autocomplete */}
              <div className="relative">
                <label className="block text-slate-300 text-sm font-medium mb-2">Destination</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus-glow transition-smooth hover:border-violet-500/50"
                  placeholder="Start typing a city..."
                  value={formData.destination}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => setActiveField('destination')}
                  onBlur={() => setTimeout(() => activeField === 'destination' && setActiveField(null), 200)}
                />
                {activeField === 'destination' && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        className="w-full px-4 py-3 text-left text-white hover:bg-violet-500/20 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        onClick={() => selectSuggestion(place)}
                      >
                        <div className="font-medium">{place.name}</div>
                        <div className="text-xs text-slate-400 truncate">{place.displayName}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>



              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Group Size</label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus-glow transition-smooth hover:border-violet-500/50"
                    value={formData.groupSize}
                    onChange={(e) => setFormData({ ...formData, groupSize: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Age Group</label>
                  <select
                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus-glow transition-smooth hover:border-violet-500/50 appearance-none cursor-pointer"
                    value={formData.ageGroup}
                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value as any })}
                  >
                    <option value="kids" className="bg-slate-900 text-white">Kids</option>
                    <option value="teens" className="bg-slate-900 text-white">Teens</option>
                    <option value="adults" className="bg-slate-900 text-white">Adults</option>
                    <option value="seniors" className="bg-slate-900 text-white">Seniors</option>
                    <option value="mixed" className="bg-slate-900 text-white">Mixed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Days</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus-glow transition-smooth hover:border-violet-500/50"
                    value={formData.daysCount}
                    onChange={(e) => setFormData({ ...formData, daysCount: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">Nights</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white focus-glow transition-smooth hover:border-violet-500/50"
                    value={formData.nightsCount}
                    onChange={(e) => setFormData({ ...formData, nightsCount: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-pink-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-pink-500 transition-smooth transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </span>
                ) : '🚀 Create Trip'}
              </button>
            </form>
          </div>

          {/* Join Trip Card */}
          <div className="glass-card rounded-3xl p-8 shadow-2xl flex flex-col animate-slide-up hover-lift" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-lg">🔗</span>
              Join Existing Trip
            </h2>

            <p className="text-slate-300 mb-8">
              Have an invite code? Enter it below to join your friends' trip.
            </p>

            <div className="flex-1 flex flex-col justify-center">
              <div className="space-y-4">
                <input
                  type="text"
                  className="w-full px-6 py-5 rounded-2xl bg-white/5 border border-white/10 text-white text-center text-2xl tracking-[0.3em] uppercase placeholder-slate-600 focus-glow transition-smooth hover:border-cyan-500/50 font-mono"
                  placeholder="ABC12345"
                  maxLength={8}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />

                <button
                  onClick={handleJoinTrip}
                  disabled={joinCode.length < 6}
                  className="w-full py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-smooth disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 hover:border-cyan-500/50"
                >
                  Join Trip →
                </button>
              </div>
            </div>

            <div className="mt-8 p-5 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-2xl border border-white/5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="gradient-text">✨</span> Features
              </h3>
              <ul className="text-slate-400 text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-violet-400">•</span> AI-powered suggestions with @weai mentions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span> Real-time group chat & collaboration
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-pink-400">•</span> Democratic voting on activities
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">•</span> Smart clash detection
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">•</span> Auto travel time calculations
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
