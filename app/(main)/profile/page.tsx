'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DramaGrid from '@/components/drama/DramaGrid';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Drama } from '@/types';
import { FiUser, FiHeart, FiClock, FiSettings, FiEdit2, FiX } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('favorites');
  const [favorites, setFavorites] = useState<Drama[]>([]);
  const [history, setHistory] = useState<Drama[]>([]);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', avatar_url: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.replace('/login');
        return;
      }

      setUser({ id: authUser.id, email: authUser.email });

      // Fetch profile from profiles table
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // Create profile if it doesn't exist (for users created before trigger)
      if (!profileData) {
        const fullName =
          authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert(
            { id: authUser.id, full_name: fullName },
            { onConflict: 'id' }
          )
          .select()
          .single();
        profileData = newProfile;
      }

      if (profileData) {
        setProfile(profileData);
        setEditForm({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          avatar_url: profileData.avatar_url || '',
        });
      } else {
        // Fallback: show auth data even without profile row
        setEditForm({
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
          phone: '',
          avatar_url: '',
        });
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setEditError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: editForm.full_name || null,
          phone: editForm.phone || null,
          avatar_url: editForm.avatar_url || null,
        },
        { onConflict: 'id' }
      );

    if (error) {
      setEditError(error.message);
      setSaving(false);
      return;
    }

    setProfile(prev =>
      prev
        ? {
            ...prev,
            full_name: editForm.full_name || null,
            phone: editForm.phone || null,
            avatar_url: editForm.avatar_url || null,
          }
        : null
    );
    setIsEditOpen(false);
    setSaving(false);
  };

  const openEditModal = () => {
    setEditForm({
      full_name: profile?.full_name || user?.email?.split('@')[0] || '',
      phone: profile?.phone || '',
      avatar_url: profile?.avatar_url || '',
    });
    setEditError(null);
    setIsEditOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] pt-24 flex items-center justify-center">
        <div className="animate-pulse text-[#808080]">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName =
    profile?.full_name || user.email?.split('@')[0] || 'User';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#0F0F0F] pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-[#1A1A1A] rounded-2xl p-8 mb-8 border border-[#333333]/50">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-28 h-28 rounded-2xl object-cover shadow-xl"
                />
              ) : (
                <div className="w-28 h-28 bg-gradient-to-br from-[#E31837] to-[#E31837] rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-xl">
                  <FiUser className="text-5xl" />
                </div>
              )}
              <button
                onClick={openEditModal}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#252525] border border-[#333333] rounded-lg flex items-center justify-center text-white hover:bg-[#333333] transition-colors"
                aria-label="Edit profile"
              >
                <FiEdit2 className="text-sm" />
              </button>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-white mb-2">{displayName}</h1>
              {user.email && (
                <p className="text-[#B3B3B3] mb-1">{user.email}</p>
              )}
              {profile?.phone && (
                <p className="text-[#B3B3B3] mb-2">{profile.phone}</p>
              )}
              <p className="text-[#808080] mb-4">Member since {memberSince}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="bg-[#252525] rounded-xl px-4 py-2 border border-[#333333]/50">
                  <span className="text-[#E31837] font-bold">{favorites.length}</span>
                  <span className="text-[#B3B3B3] ml-2">Favorites</span>
                </div>
                <div className="bg-[#252525] rounded-xl px-4 py-2 border border-[#333333]/50">
                  <span className="text-[#E31837] font-bold">{history.length}</span>
                  <span className="text-[#B3B3B3] ml-2">Watched</span>
                </div>
              </div>
            </div>
            <Button variant="secondary" className="flex items-center gap-2">
              <FiSettings className="text-lg" />
              Settings
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-[#333333]">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex items-center gap-2 pb-4 px-2 font-semibold transition-all ${
                  activeTab === 'favorites'
                    ? 'border-b-2 border-[#E31837] text-[#E31837]'
                    : 'text-[#808080] hover:text-white'
                }`}
              >
                <FiHeart />
                Favorites ({favorites.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 pb-4 px-2 font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'border-b-2 border-[#E31837] text-[#E31837]'
                    : 'text-[#808080] hover:text-white'
                }`}
              >
                <FiClock />
                Watch History ({history.length})
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'favorites' ? (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">My Favorites</h2>
            <DramaGrid
              dramas={favorites}
              emptyMessage="No favorites yet. Start adding movies and series to your favorites!"
            />
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Watch History</h2>
            <DramaGrid
              dramas={history}
              emptyMessage="No watch history yet. Start streaming to track your progress!"
            />
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#333333] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Edit Profile</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-2 text-[#808080] hover:text-white transition-colors"
                aria-label="Close"
              >
                <FiX className="text-xl" />
              </button>
            </div>
            {editError && (
              <p className="mb-4 text-sm text-[#E31837]">{editError}</p>
            )}
            <div className="space-y-4">
              <Input
                label="Full Name"
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, full_name: e.target.value }))
                }
                placeholder="Your name"
              />
              <Input
                label="Phone"
                type="tel"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="Optional"
              />
              <Input
                label="Avatar URL"
                value={editForm.avatar_url}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, avatar_url: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setIsEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
