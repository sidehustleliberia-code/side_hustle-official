'use client';

import React, { useState } from 'react';
import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { providerService } from '@/lib/services/dataService';
import { toast } from 'sonner';

interface AvailabilityToggleProps {
  userId: string;
  /** Current availability state from the provider profile */
  isAvailable: boolean;
  /** Called after a successful toggle so parent can update its state */
  onToggle: (newState: boolean) => void;
  className?: string;
}

/**
 * Provider Online/Offline toggle.
 *
 * Business rules enforced here (frontend layer):
 * - Offline providers are excluded from job matching (DB trigger also enforces this)
 * - Existing active/accepted jobs are NOT affected by going offline
 * - State persists in Supabase provider_profiles.is_available
 * - Realtime subscriptions in the dashboard will reflect the change
 */
export default function AvailabilityToggle({
  userId,
  isAvailable,
  onToggle,
  className = '',
}: AvailabilityToggleProps) {
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    const newState = !isAvailable;
    setSaving(true);

    try {
      const success = await providerService.updateProfile(userId, { isAvailable: newState });

      if (success) {
        onToggle(newState);
        toast.success(
          newState
            ? '🟢 You are now Online — new jobs will be sent to you.' :'🔴 You are now Offline — you will not receive new job offers.'
        );
      } else {
        toast.error('Failed to update availability. Please try again.');
      }
    } catch {
      toast.error('Failed to update availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={saving}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 text-sm font-semibold ${
        isAvailable
          ? 'bg-success/10 border-success/30 text-success hover:bg-success/20' :'bg-muted border-border text-muted-foreground hover:bg-muted/80'
      } ${className}`}
      aria-label={isAvailable ? 'Go Offline' : 'Go Online'}
      title={isAvailable ? 'Click to go Offline' : 'Click to go Online'}
    >
      {saving ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isAvailable ? (
        <Wifi size={14} />
      ) : (
        <WifiOff size={14} />
      )}
      <span>{saving ? 'Saving...' : isAvailable ? 'Online' : 'Offline'}</span>
      {/* Visual toggle indicator */}
      <span
        className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${
          isAvailable ? 'bg-success' : 'bg-border'
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${
            isAvailable ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}
