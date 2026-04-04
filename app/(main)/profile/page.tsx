'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Drama } from '@/types';
import { FiUser, FiSettings, FiEdit2, FiX, FiFilm, FiPlay, FiCalendar, FiCreditCard } from 'react-icons/fi';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

interface Subscription {
  type: string;
  status: string;
  expires_at: string;
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const router = useRouter();
  const [purchases, setPurchases] = useState<Drama[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
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

      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

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
        setEditForm({
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
          phone: '',
          avatar_url: '',
        });
      }

      const { data: subRow } = await supabase
        .from('subscriptions')
        .select('type, status, expires_at')
        .eq('user_id', authUser.id)
        .single();

      if (subRow) {
        const expiresAt = new Date(subRow.expires_at);
        const isActive = subRow.status === 'active' && expiresAt > new Date();
        if (isActive) {
          setSubscription({
            type: subRow.type,
            status: subRow.status,
            expires_at: subRow.expires_at,
          });
        }
      }

      const { data: purchaseRows, error: purchasesError } = await supabase
        .from('purchases')
        .select('content_id, purchased_at')
        .eq('user_id', authUser.id)
        .eq('content_type', 'movie')
        .order('purchased_at', { ascending: false });

      if (purchasesError) {
        console.error('Profile: failed to load purchases', purchasesError);
      }

      if (purchaseRows && purchaseRows.length > 0) {
        try {
          const res = await fetch('/api/profile/library', { credentials: 'include' });
          const json = await res.json().catch(() => ({}));
          const library = Array.isArray(json.library) ? json.library : [];
          setPurchases(library);
        } catch {
          setPurchases([]);
        }
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
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">{t('loading')}</div>
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
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-8 mb-8 border border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              {profile?.avatar_url ? (
                // avatar_url is user-provided and may be any domain; keep <img> to avoid next/image domain restrictions.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-28 h-28 rounded-2xl object-cover shadow-md"
                />
              ) : (
                <div className="w-28 h-28 bg-gradient-to-br from-brand-red to-brand-red rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-md">
                  <FiUser className="text-5xl" />
                </div>
              )}
              <button
                onClick={openEditModal}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                aria-label={t('editProfileLabel')}
              >
                <FiEdit2 className="text-sm" />
              </button>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{displayName}</h1>
              {user.email && (
                <p className="text-gray-500 mb-1">{user.email}</p>
              )}
              {profile?.phone && (
                <p className="text-gray-500 mb-2">{profile.phone}</p>
              )}
              <p className="text-gray-400 mb-4">{t('memberSince', { year: memberSince })}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="bg-gray-100 rounded-xl px-4 py-2 border border-gray-200">
                  <span className="text-brand-red font-bold">{purchases.length}</span>
                  <span className="text-gray-500 ml-2">{t('purchased')}</span>
                </div>
              </div>
              {/* Subscription: plan + expiry or CTA */}
              <div className="mt-4">
                {subscription ? (
                  <div className="inline-flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl border border-brand-red/20 bg-brand-red/5">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-red text-white">
                        <FiCreditCard className="text-lg" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('subscription')}</p>
                        <p className="font-semibold text-gray-900">{t('planSeries')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiCalendar className="text-brand-red shrink-0" />
                      <span className="text-sm">
                        {t('expiresOn', {
                          date: new Date(subscription.expires_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }),
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="inline-flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700">{t('noActiveSubscription')}</p>
                    <p className="text-xs text-gray-500">{t('noActiveSubscriptionDesc')}</p>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-brand-red hover:text-brand-red-dark transition-colors"
                    >
                      {t('viewPlans')} →
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <Button variant="secondary" className="flex items-center gap-2">
              <FiSettings className="text-lg" />
              {t('settings')}
            </Button>
          </div>
        </div>

        {/* My Library */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('myLibrary')}</h2>
            {purchases.length > 0 && (
              <span className="text-sm text-gray-400">
                {purchases.length === 1
                  ? t('moviesPurchased', { count: purchases.length })
                  : t('moviesPurchasedPlural', { count: purchases.length })}
              </span>
            )}
          </div>
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4 border border-gray-200">
                <FiFilm className="text-3xl text-gray-400" />
              </div>
              <p className="text-xl text-gray-900 font-semibold mb-2">{t('noPurchases')}</p>
              <p className="text-gray-400 text-sm max-w-xs mb-6">
                {t('noPurchasesDesc')}
              </p>
              <Link
                href="/movies"
                className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-red-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <FiPlay className="text-lg" />
                {t('browseMovies')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {purchases.map((drama) => (
                <Link key={drama.id} href={`/drama/${drama.id}/watch`} className="group">
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-brand-red/50 transition-all duration-200 shadow-sm">
                    <div className="relative aspect-2/3">
                      <Image
                        src={drama.posterUrl}
                        alt={drama.title}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="w-14 h-14 rounded-full bg-brand-red flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                          <FiPlay className="text-white text-xl ml-1" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 bg-brand-red text-white text-xs font-bold px-2 py-0.5 rounded-md">
                        {t('owned')}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-brand-red transition-colors">
                        {drama.title}
                      </h3>
                      {drama.titleKh && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1" lang="km">{drama.titleKh}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{drama.releaseYear}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('editProfile')}</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
                aria-label={t('closeModal')}
              >
                <FiX className="text-xl" />
              </button>
            </div>
            {editError && (
              <p className="mb-4 text-sm text-brand-red">{editError}</p>
            )}
            <div className="space-y-4">
              <Input
                label={t('fullName')}
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, full_name: e.target.value }))
                }
                placeholder={t('yourName')}
              />
              <Input
                label={t('phone')}
                type="tel"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder={t('optional')}
              />
              <Input
                label={t('avatarUrl')}
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
                {t('cancel')}
              </Button>
              <Button className="flex-1" onClick={handleSaveProfile} disabled={saving}>
                {saving ? t('saving') : t('save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
