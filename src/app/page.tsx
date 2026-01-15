'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [formData, setFormData] = useState({
    tripName: '',
    creatorName: '',
    destination: '',
    groupSize: 4,
    daysCount: 3,
    nightsCount: 2,
    ageGroup: 'mixed' as 'kids' | 'teens' | 'adults' | 'seniors' | 'mixed',
  });

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
        // Store user info in localStorage
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
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
            🌍 Trip<span className="text-pink-400">AI</span>
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            Plan your perfect group trip with AI-powered suggestions, real-time collaboration, and smart itinerary management.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Create Trip Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              ✨ Create New Trip
            </h2>

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter your name"
                  value={formData.creatorName}
                  onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-1">Trip Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Summer Europe Adventure"
                  value={formData.tripName}
                  onChange={(e) => setFormData({ ...formData, tripName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-1">Destination</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Paris, France"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-200 text-sm mb-1">Group Size</label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    value={formData.groupSize}
                    onChange={(e) => setFormData({ ...formData, groupSize: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-purple-200 text-sm mb-1">Age Group</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    value={formData.ageGroup}
                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value as any })}
                  >
                    <option value="kids" className="bg-gray-800">Kids</option>
                    <option value="teens" className="bg-gray-800">Teens</option>
                    <option value="adults" className="bg-gray-800">Adults</option>
                    <option value="seniors" className="bg-gray-800">Seniors</option>
                    <option value="mixed" className="bg-gray-800">Mixed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-200 text-sm mb-1">Days</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    value={formData.daysCount}
                    onChange={(e) => setFormData({ ...formData, daysCount: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-purple-200 text-sm mb-1">Nights</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    value={formData.nightsCount}
                    onChange={(e) => setFormData({ ...formData, nightsCount: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isCreating ? 'Creating...' : '🚀 Create Trip'}
              </button>
            </form>
          </div>

          {/* Join Trip Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl flex flex-col">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              🔗 Join Existing Trip
            </h2>

            <p className="text-purple-200 mb-6">
              Have an invite code? Enter it below to join your friends' trip.
            </p>

            <div className="flex-1 flex flex-col justify-center">
              <div className="space-y-4">
                <input
                  type="text"
                  className="w-full px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white text-center text-2xl tracking-widest uppercase placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="ABC12345"
                  maxLength={8}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />

                <button
                  onClick={handleJoinTrip}
                  disabled={joinCode.length < 6}
                  className="w-full py-4 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
                >
                  Join Trip →
                </button>
              </div>
            </div>

            <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-white font-semibold mb-2">✨ Features</h3>
              <ul className="text-purple-200 text-sm space-y-1">
                <li>• AI-powered suggestions with @AI mentions</li>
                <li>• Real-time group chat & collaboration</li>
                <li>• Democratic voting on activities</li>
                <li>• Smart clash detection</li>
                <li>• Auto travel time calculations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
