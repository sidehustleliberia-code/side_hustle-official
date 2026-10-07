'use client';
import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, User, Star, MapPin, Phone, CheckCircle, XCircle, AlertCircle, ChevronRight, Loader2, Shield, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { AppUser, AppProviderProfile } from '@/lib/types/database';

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  active: { label: 'Active', className: 'badge-success', icon: CheckCircle },
  suspended: { label: 'Suspended', className: 'badge-danger', icon: XCircle },
  pending_verification: { label: 'Pending Verification', className: 'badge-warning', icon: AlertCircle },
};

const PROVIDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_verification: { label: 'Pending Verification', color: 'text-warning' },
  active: { label: 'Active', color: 'text-success' },
  suspended: { label: 'Suspended', color: 'text-danger' },
  inactive: { label: 'Inactive', color: 'text-muted-foreground' },
};

type AppUserWithProfile = AppUser & { providerProfile?: AppProviderProfile };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUserWithProfile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('user_profiles')
        .select('*, provider_profiles(*)')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (roleFilter !== 'all') query = query.eq('role', roleFilter);
      if (statusFilter !== 'all') query = query.eq('account_status', statusFilter);

      const { data, error } = await query;
      if (error) { toast.error('Failed to load users: ' + error.message); return; }

      const mapped: AppUserWithProfile[] = (data || []).map((row: any) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
        avatarUrl: row.avatar_url,
        role: row.role,
        accountStatus: row.account_status,
        isVerified: row.is_verified,
        area: row.area,
        createdAt: row.created_at,
        providerProfile: row.provider_profiles ? {
          id: row.provider_profiles.id,
          userId: row.provider_profiles.user_id,
          serviceArea: row.provider_profiles.service_area,
          payoutProvider: row.provider_profiles.payout_provider,
          payoutMobile: row.provider_profiles.payout_mobile,
          payoutMobileVerified: row.provider_profiles.payout_mobile_verified,
          isAvailable: row.provider_profiles.is_available,
          providerStatus: row.provider_profiles.provider_status,
          rating: row.provider_profiles.rating,
          totalJobs: row.provider_profiles.total_jobs,
          totalEarned: row.provider_profiles.total_earned,
          currentBalance: row.provider_profiles.current_balance,
          escrowBalance: row.provider_profiles.escrow_balance,
          bio: row.provider_profiles.bio,
          serviceCategoryId: row.provider_profiles.service_category_id,
        } : undefined,
      }));

      setUsers(mapped);
    } catch (err: any) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [roleFilter, statusFilter]);

  const handleToggleStatus = async (user: AppUserWithProfile) => {
    setTogglingId(user.id);
    const newStatus = user.accountStatus === 'active' ? 'suspended' : 'active';
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_profiles')
        .update({ account_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) { toast.error('Could not update user status: ' + error.message); return; }

      // Also update provider_profiles status if applicable
      if (user.role === 'provider') {
        await supabase
          .from('provider_profiles')
          .update({ provider_status: newStatus === 'active' ? 'active' : 'suspended', updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }

      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, accountStatus: newStatus as any } : u));
      toast.success(`${user.fullName} is now ${newStatus}`);
    } catch {
      toast.error('Status update failed.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleProviderAction = async (user: AppUserWithProfile, action: 'approve' | 'reject' | 'suspend' | 'reactivate') => {
    setTogglingId(user.id);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('admin_verify_provider', {
        p_provider_user_id: user.id,
        p_action: action,
      });

      if (error) { toast.error('Action failed: ' + error.message); return; }

      const result = data as { success: boolean; error?: string };
      if (!result.success) { toast.error(result.error || 'Action failed'); return; }

      const actionLabels: Record<string, string> = {
        approve: 'approved and activated',
        reject: 'rejected',
        suspend: 'suspended',
        reactivate: 'reactivated',
      };
      toast.success(`${user.fullName} has been ${actionLabels[action]}`);
      await loadUsers();
    } catch {
      toast.error('Action failed.');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredUsers = search
    ? users.filter((u) =>
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search) ||
        u.area?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const pendingVerificationCount = users.filter(
    (u) => u.role === 'provider' && u.providerProfile?.providerStatus === 'pending_verification'
  ).length;

  return (
    <div className="p-5 lg:p-8 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">User Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage customers, providers, and platform users</p>
        </div>
        <button onClick={loadUsers} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Refresh">
          <RefreshCw size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Pending verification alert */}
      {pendingVerificationCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 mb-5">
          <AlertCircle size={18} className="text-warning flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">
              {pendingVerificationCount} provider{pendingVerificationCount > 1 ? 's' : ''} awaiting verification
            </p>
            <p className="text-xs text-amber-700 mt-0.5">Review and approve or reject pending provider accounts.</p>
          </div>
          <button
            onClick={() => { setRoleFilter('provider'); setStatusFilter('pending_verification'); }}
            className="text-xs font-bold text-amber-800 underline"
          >
            View
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, phone, area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10 w-full"
          />
        </div>
        <div className="relative">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-base pr-8 appearance-none cursor-pointer min-w-[140px]">
            <option value="all">All Roles</option>
            <option value="customer">Customers</option>
            <option value="provider">Providers</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-base pr-8 appearance-none cursor-pointer min-w-[160px]">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending_verification">Pending Verification</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No users found matching your filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredUsers.map((user) => {
            const statusCfg = STATUS_CONFIG[user.accountStatus] || STATUS_CONFIG.active;
            const StatusIcon = statusCfg.icon;
            const initials = user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
            const isExpanded = expandedId === user.id;
            const providerStatusCfg = user.providerProfile
              ? PROVIDER_STATUS_CONFIG[user.providerProfile.providerStatus] || PROVIDER_STATUS_CONFIG.pending_verification
              : null;

            return (
              <div key={user.id} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : user.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/20 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold flex-shrink-0 ${user.role === 'provider' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{user.fullName}</p>
                      {user.isVerified && <Shield size={12} className="text-success" />}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${user.role === 'provider' ? 'bg-navy-50 text-primary' : 'bg-secondary/20 text-gold-600'}`}>
                        {user.role === 'provider' ? 'Provider' : 'Customer'}
                      </span>
                      {user.role === 'provider' && providerStatusCfg && (
                        <span className={`text-xs font-semibold ${providerStatusCfg.color}`}>
                          · {providerStatusCfg.label}
                        </span>
                      )}
                      {user.area && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin size={10} /> {user.area}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full hidden sm:inline-flex items-center gap-1 ${statusCfg.className}`}>
                      <StatusIcon size={11} /> {statusCfg.label}
                    </span>
                    <ChevronRight size={16} className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border pt-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                      <div className="bg-muted/40 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                        <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
                      </div>
                      <div className="bg-muted/40 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                        <p className="text-xs font-semibold text-foreground">{user.phone || '—'}</p>
                      </div>
                      <div className="bg-muted/40 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Joined</p>
                        <p className="text-xs font-semibold text-foreground">{new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                      {user.role === 'provider' && user.providerProfile && (
                        <div className="bg-muted/40 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-0.5">Rating</p>
                          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                            <Star size={11} className="text-secondary fill-secondary" />
                            {Number(user.providerProfile.rating).toFixed(1)} · {user.providerProfile.totalJobs} jobs
                          </p>
                        </div>
                      )}
                    </div>

                    {user.role === 'provider' && user.providerProfile && (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-muted/40 rounded-xl p-3">
                            <p className="text-xs text-muted-foreground mb-0.5">Total Earned</p>
                            <p className="text-sm font-extrabold text-success">LRD {user.providerProfile.totalEarned.toLocaleString()}</p>
                          </div>
                          <div className="bg-muted/40 rounded-xl p-3">
                            <p className="text-xs text-muted-foreground mb-0.5">Provider Status</p>
                            <p className={`text-sm font-extrabold ${providerStatusCfg?.color || 'text-foreground'}`}>
                              {providerStatusCfg?.label || user.providerProfile.providerStatus}
                            </p>
                          </div>
                        </div>

                        {/* Provider Verification Actions */}
                        <div className="bg-muted/30 rounded-xl p-4 mb-4">
                          <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                            <Shield size={12} className="text-primary" /> Provider Verification Actions
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {user.providerProfile.providerStatus === 'pending_verification' && (
                              <>
                                <button
                                  onClick={() => handleProviderAction(user, 'approve')}
                                  disabled={togglingId === user.id}
                                  className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                                >
                                  {togglingId === user.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleProviderAction(user, 'reject')}
                                  disabled={togglingId === user.id}
                                  className="py-1.5 px-3 text-xs rounded-xl font-semibold border border-danger text-danger hover:bg-danger/10 flex items-center gap-1.5"
                                >
                                  {togglingId === user.id ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                                  Reject
                                </button>
                              </>
                            )}
                            {user.providerProfile.providerStatus === 'active' && (
                              <button
                                onClick={() => handleProviderAction(user, 'suspend')}
                                disabled={togglingId === user.id}
                                className="py-1.5 px-3 text-xs rounded-xl font-semibold border border-warning text-warning hover:bg-amber-50 flex items-center gap-1.5"
                              >
                                {togglingId === user.id ? <Loader2 size={11} className="animate-spin" /> : <Clock size={11} />}
                                Suspend Provider
                              </button>
                            )}
                            {(user.providerProfile.providerStatus === 'suspended' || user.providerProfile.providerStatus === 'inactive') && (
                              <button
                                onClick={() => handleProviderAction(user, 'reactivate')}
                                disabled={togglingId === user.id}
                                className="py-1.5 px-3 text-xs rounded-xl font-semibold border border-success text-success hover:bg-green-50 flex items-center gap-1.5"
                              >
                                {togglingId === user.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                                Reactivate
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Account Status Toggle */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={togglingId === user.id}
                        className={`py-2 px-4 text-xs rounded-xl font-semibold border transition-colors flex items-center gap-1.5 ${
                          user.accountStatus === 'active' ?'border-danger text-danger hover:bg-danger/10' :'border-success text-success hover:bg-success/10'
                        }`}
                      >
                        {togglingId === user.id ? <Loader2 size={12} className="animate-spin" /> : user.accountStatus === 'active' ? <XCircle size={12} /> : <CheckCircle size={12} />}
                        {user.accountStatus === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
