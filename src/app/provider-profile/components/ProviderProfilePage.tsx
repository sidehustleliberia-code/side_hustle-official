'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import NotificationBell from '@/components/ui/NotificationBell';
import {
  User, Phone, Mail, MapPin, Lock, ArrowLeft, Loader2,
  CheckCircle, AlertCircle, Save, Eye, EyeOff, Briefcase,
  CreditCard, ChevronDown, Clock, XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { providerService, categoryService } from '@/lib/services/dataService';
import { paymentProviderService } from '@/lib/services/paymentProviderService';
import type { AppProviderProfile, ServiceCategory } from '@/lib/types/database';
import { toast } from 'sonner';

interface ProfileForm {
  fullName: string;
  phone: string;
  area: string;
  serviceArea: string;
  bio: string;
  serviceCategoryId: string;
  payoutProvider: string;
  payoutMobile: string;
}

const PROVIDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending_verification: { label: 'Pending Verification', color: 'text-warning', bg: 'bg-amber-50', icon: Clock },
  active: { label: 'Active & Verified', color: 'text-success', bg: 'bg-green-50', icon: CheckCircle },
  suspended: { label: 'Suspended', color: 'text-danger', bg: 'bg-red-50', icon: XCircle },
  inactive: { label: 'Inactive / Rejected', color: 'text-muted-foreground', bg: 'bg-muted', icon: XCircle },
};

export default function ProviderProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [providerProfile, setProviderProfile] = useState<AppProviderProfile | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [paymentProviders] = useState(paymentProviderService.listProviders());
  const [activeTab, setActiveTab] = useState<'profile' | 'payout' | 'security'>('profile');
  const [form, setForm] = useState<ProfileForm>({
    fullName: '', phone: '', area: '', serviceArea: '', bio: '',
    serviceCategoryId: '', payoutProvider: '', payoutMobile: '',
  });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const [pp, cats] = await Promise.all([
          providerService.getProfile(user.id),
          categoryService.getAll(),
        ]);
        setProviderProfile(pp);
        setCategories(cats);
        setForm({
          fullName: profile?.fullName || '',
          phone: profile?.phone || '',
          area: profile?.area || '',
          serviceArea: pp?.serviceArea || '',
          bio: pp?.bio || '',
          serviceCategoryId: pp?.serviceCategoryId || '',
          payoutProvider: pp?.payoutProvider || '',
          payoutMobile: pp?.payoutMobile || '',
        });
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!form.fullName.trim()) { toast.error('Full name is required'); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      // Update user_profiles (safe fields only)
      const { error: upErr } = await supabase
        .from('user_profiles')
        .update({
          full_name: form.fullName.trim(),
          phone: form.phone.trim() || null,
          area: form.area.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (upErr) { toast.error('Failed to save: ' + upErr.message); return; }

      // Update provider_profiles (safe fields — NOT provider_status, NOT is_verified)
      const ppUpdates: Record<string, any> = {
        service_area: form.serviceArea.trim() || null,
        bio: form.bio.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (form.serviceCategoryId) ppUpdates.service_category_id = form.serviceCategoryId;

      await supabase.from('provider_profiles').update(ppUpdates).eq('user_id', user.id);

      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayout = async () => {
    if (!user) return;
    if (!form.payoutProvider) { toast.error('Please select a payout method'); return; }
    if (!form.payoutMobile.trim()) { toast.error('Payout mobile number is required'); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('provider_profiles')
        .update({
          payout_provider: form.payoutProvider,
          payout_mobile: form.payoutMobile.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) { toast.error('Failed to save payout info: ' + error.message); return; }
      toast.success('Payout information saved');
    } catch {
      toast.error('Failed to save payout info');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    setSavingPw(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) { toast.error('Failed to update password: ' + error.message); return; }
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully');
    } catch {
      toast.error('Failed to update password');
    } finally {
      setSavingPw(false);
    }
  };

  const statusCfg = PROVIDER_STATUS_CONFIG[providerProfile?.providerStatus || 'pending_verification'];
  const StatusIcon = statusCfg.icon;
  const initials = profile?.fullName
    ? profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'P';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-nav">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/provider-dashboard" className="p-2 rounded-lg hover:bg-muted transition-colors">
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
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-xl font-extrabold text-primary-foreground flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold text-foreground">{profile?.fullName || 'Provider'}</h1>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <span className={`inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
              <StatusIcon size={10} /> {statusCfg.label}
            </span>
          </div>
          {providerProfile?.providerStatus === 'pending_verification' && (
            <div className="hidden sm:block text-right flex-shrink-0">
              <p className="text-xs text-muted-foreground">Verification</p>
              <p className="text-xs font-semibold text-warning">Under Review</p>
            </div>
          )}
        </div>

        {/* Pending verification notice */}
        {providerProfile?.providerStatus === 'pending_verification' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6">
            <AlertCircle size={18} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Account Pending Verification</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Your provider account is being reviewed by the Side Hustle team. You will be notified once approved. You cannot accept jobs until your account is verified.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
          {[
            { key: 'profile', label: 'Profile', icon: User },
            { key: 'payout', label: 'Payout', icon: CreditCard },
            { key: 'security', label: 'Security', icon: Lock },
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
            <h2 className="text-base font-extrabold text-foreground">Personal & Service Information</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <User size={14} className="text-muted-foreground" /> Full Name
              </label>
              <input type="text" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="input-base" placeholder="Your full name" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Mail size={14} className="text-muted-foreground" /> Email Address
              </label>
              <input type="email" value={profile?.email || ''} disabled className="input-base opacity-60 cursor-not-allowed" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Phone size={14} className="text-muted-foreground" /> Phone Number
              </label>
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input-base" placeholder="+231 77 000 0000" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <MapPin size={14} className="text-muted-foreground" /> Service Area
              </label>
              <input type="text" value={form.serviceArea} onChange={(e) => setForm((f) => ({ ...f, serviceArea: e.target.value }))} className="input-base" placeholder="e.g. Sinkor, Monrovia" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Briefcase size={14} className="text-muted-foreground" /> Service Category
              </label>
              <div className="relative">
                <select
                  value={form.serviceCategoryId}
                  onChange={(e) => setForm((f) => ({ ...f, serviceCategoryId: e.target.value }))}
                  className="input-base pr-8 appearance-none cursor-pointer"
                >
                  <option value="">Select a service category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Bio / About</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                className="input-base resize-none"
                rows={3}
                placeholder="Tell customers about your experience and skills..."
              />
            </div>

            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center justify-center gap-2 py-3">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}

        {/* Payout Tab */}
        {activeTab === 'payout' && (
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-5">
            <h2 className="text-base font-extrabold text-foreground">Payout Method</h2>
            <p className="text-sm text-muted-foreground">Set up how you receive your earnings from completed jobs.</p>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Payout Provider</label>
              <div className="grid grid-cols-2 gap-3">
                {paymentProviders.map((provider) => (
                  <button
                    key={provider.key}
                    onClick={() => setForm((f) => ({ ...f, payoutProvider: provider.key }))}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.payoutProvider === provider.key
                        ? 'border-primary bg-navy-50 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {provider.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Phone size={14} className="text-muted-foreground" /> Payout Mobile Number
              </label>
              <input
                type="tel"
                value={form.payoutMobile}
                onChange={(e) => setForm((f) => ({ ...f, payoutMobile: e.target.value }))}
                className="input-base"
                placeholder="+231 77 000 0000"
              />
            </div>

            {providerProfile?.payoutMobile && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle size={14} className="text-success flex-shrink-0" />
                <p className="text-xs text-green-800">Current payout number: <strong>{providerProfile.payoutMobile}</strong></p>
              </div>
            )}

            <button onClick={handleSavePayout} disabled={saving} className="btn-primary flex items-center justify-center gap-2 py-3">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Payout Info'}
            </button>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-5">
            <h2 className="text-base font-extrabold text-foreground">Change Password</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className="input-base pr-10"
                  placeholder="New password (min 8 characters)"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="input-base"
                placeholder="Confirm new password"
              />
            </div>

            <button onClick={handleChangePassword} disabled={savingPw} className="btn-primary flex items-center justify-center gap-2 py-3">
              {savingPw ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {savingPw ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
