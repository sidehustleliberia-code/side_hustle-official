'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import NotificationBell from '@/components/ui/NotificationBell';
import {
  User, Phone, Mail, MapPin, Lock, Bell, ArrowLeft, Loader2,
  CheckCircle, AlertCircle, Camera, Save, Eye, EyeOff, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ProfileForm {
  fullName: string;
  phone: string;
  area: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function CustomerProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [profileForm, setProfileForm] = useState<ProfileForm>({ fullName: '', phone: '', area: '' });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        area: profile.area || '',
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!profileForm.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: profileForm.fullName.trim(),
          phone: profileForm.phone.trim() || null,
          area: profileForm.area.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        toast.error('Failed to save profile: ' + error.message);
        return;
      }
      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPw(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) {
        toast.error('Failed to update password: ' + error.message);
        return;
      }
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully');
    } catch {
      toast.error('Failed to update password');
    } finally {
      setSavingPw(false);
    }
  };

  const initials = profile?.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-nav">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/customer-dashboard" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft size={20} className="text-muted-foreground" />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <AppLogo size={26} />
              <span className="font-extrabold text-base text-primary hidden sm:block">SideHustle</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10">
        {/* Profile Header */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6 flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-xl font-extrabold text-primary-foreground">
              {initials}
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-secondary flex items-center justify-center shadow-sm">
              <Camera size={12} className="text-secondary-foreground" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold text-foreground">{profile?.fullName || 'Customer'}</h1>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-success bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle size={10} /> Active Account
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
          {[
            { key: 'profile', label: 'Profile', icon: User },
            { key: 'security', label: 'Security', icon: Lock },
            { key: 'notifications', label: 'Notifications', icon: Bell },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-card text-primary shadow-card border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-5">
            <h2 className="text-base font-extrabold text-foreground">Personal Information</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <User size={14} className="text-muted-foreground" /> Full Name
              </label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))}
                className="input-base"
                placeholder="Your full name"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Mail size={14} className="text-muted-foreground" /> Email Address
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="input-base opacity-60 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact support if needed.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Phone size={14} className="text-muted-foreground" /> Phone Number
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                className="input-base"
                placeholder="+231 77 000 0000"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <MapPin size={14} className="text-muted-foreground" /> Default Area / Address
              </label>
              <input
                type="text"
                value={profileForm.area}
                onChange={(e) => setProfileForm((p) => ({ ...p, area: e.target.value }))}
                className="input-base"
                placeholder="e.g. Sinkor, Monrovia"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn-primary flex items-center justify-center gap-2 py-3"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-5">
            <h2 className="text-base font-extrabold text-foreground">Change Password</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Choose a strong password with at least 8 characters.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className="input-base pr-10"
                  placeholder="New password (min 8 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className="input-base pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={savingPw}
              className="btn-primary flex items-center justify-center gap-2 py-3"
            >
              {savingPw ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {savingPw ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <h2 className="text-base font-extrabold text-foreground">Notification Preferences</h2>
            <p className="text-sm text-muted-foreground">Control how you receive updates about your orders.</p>

            {[
              { label: 'Email Notifications', desc: 'Receive order updates via email', value: emailNotifications, onChange: setEmailNotifications },
              { label: 'Push Notifications', desc: 'In-app alerts for real-time updates', value: pushNotifications, onChange: setPushNotifications },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => item.onChange(!item.value)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${item.value ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${item.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}

            <div className="mt-2">
              <Link href="/help-support" className="flex items-center justify-between py-3 hover:bg-muted/40 rounded-xl px-2 -mx-2 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-foreground">Help & Support</p>
                  <p className="text-xs text-muted-foreground">Get help or report a problem</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
