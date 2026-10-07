'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, ChevronDown, CheckCircle, Loader2, X, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { jobService, userService } from '@/lib/services/dataService';
import { createClient } from '@/lib/supabase/client';
import type { AppJob, AppUser } from '@/lib/types/database';

type AdminJobStatus = 'pending_payment' | 'ready_for_assignment' | 'assigned' | 'in_progress' | 'completed' | 'disputed' | 'all';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  requested: { label: 'Requested', className: 'badge-warning' },
  payment_confirmed: { label: 'Payment Confirmed', className: 'badge-primary' },
  pending_payment: { label: 'Pending Payment', className: 'badge-warning' },
  ready_for_assignment: { label: 'Ready to Assign', className: 'badge-primary' },
  assigned: { label: 'Assigned', className: 'bg-blue-50 text-blue-700 badge-primary' },
  in_progress: { label: 'In Progress', className: 'bg-primary/10 text-primary badge-primary' },
  awaiting_customer_confirmation: { label: 'Awaiting Confirmation', className: 'bg-blue-50 text-blue-700' },
  completed: { label: 'Completed', className: 'badge-success' },
  cancelled: { label: 'Cancelled', className: 'badge-danger' },
  disputed: { label: 'Disputed', className: 'badge-danger' },
};

export default function AdminJobBoardPage() {
  const [jobs, setJobs] = useState<AppJob[]>([]);
  const [providers, setProviders] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignModal, setAssignModal] = useState<AppJob | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [allJobs, allProviders] = await Promise.all([
        jobService.getAllJobs({ status: statusFilter, search }),
        userService.getAllUsers({ role: 'provider', status: 'active' }),
      ]);
      setJobs(allJobs);
      setProviders(allProviders);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { loadData(); }, [statusFilter]);

  // Realtime: reload job board when any job changes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-job-board-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          // Reload the full list to get updated joins (customer/provider names)
          loadData();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const handleSearch = () => loadData();

  const handleAssign = async () => {
    if (!assignModal || !selectedProvider) return;
    setAssigning(true);
    try {
      const success = await jobService.assignProvider(assignModal.id, selectedProvider);
      if (success) {
        toast.success(`Provider assigned to ${assignModal.ref}`);
        await loadData();
        setAssignModal(null);
        setSelectedProvider('');
      } else {
        toast.error('Could not assign provider. Please try again.');
      }
    } catch {
      toast.error('Assignment failed.');
    } finally {
      setAssigning(false);
    }
  };

  const filteredJobs = search
    ? jobs.filter((j) =>
        j.ref.toLowerCase().includes(search.toLowerCase()) ||
        j.serviceLabel.toLowerCase().includes(search.toLowerCase()) ||
        j.area.toLowerCase().includes(search.toLowerCase()) ||
        j.customer?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        j.provider?.fullName?.toLowerCase().includes(search.toLowerCase())
      )
    : jobs;

  return (
    <div className="p-5 lg:p-8 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-foreground">Job Dispatch Board</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage and assign all platform jobs</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ref, customer, service, area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="input-base pl-10 w-full"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base pr-8 appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="all">All Statuses</option>
            <option value="requested">Requested</option>
            <option value="payment_confirmed">Payment Confirmed</option>
            <option value="ready_for_assignment">Ready to Assign</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="disputed">Disputed</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No jobs found matching your filters.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Job Ref</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Provider</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredJobs.map((job) => {
                  const statusCfg = STATUS_CONFIG[job.jobStatus] || { label: job.jobStatus, className: 'badge-primary' };
                  return (
                    <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-primary bg-navy-50 px-2 py-1 rounded-full">{job.ref}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground text-xs">{job.serviceLabel}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-foreground">{job.customer?.fullName || '—'}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">{job.area}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusCfg.className}`}>{statusCfg.label}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-foreground">{job.provider?.fullName || <span className="text-muted-foreground italic">Unassigned</span>}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-foreground">LRD {job.grossAmount.toLocaleString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        {(job.jobStatus === 'ready_for_assignment' || job.jobStatus === 'assigned') && (
                          <button
                            onClick={() => { setAssignModal(job); setSelectedProvider(job.providerId || ''); }}
                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                          >
                            <UserCheck size={13} />
                            {job.providerId ? 'Reassign' : 'Assign'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-extrabold text-foreground">Assign Provider</h3>
              <button onClick={() => setAssignModal(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
            <div className="bg-muted/60 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-primary">{assignModal.ref}</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{assignModal.serviceLabel}</p>
              <p className="text-xs text-muted-foreground">{assignModal.area}</p>
            </div>
            <div className="flex flex-col gap-2 mb-5">
              <label className="text-sm font-semibold text-foreground">Select Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="input-base"
              >
                <option value="">Choose a provider...</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName} — {p.area || 'Monrovia'}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAssignModal(null)} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
              <button onClick={handleAssign} disabled={!selectedProvider || assigning} className="btn-primary flex-1 py-2.5 text-sm">
                {assigning ? <><Loader2 size={14} className="animate-spin" /> Assigning...</> : <><CheckCircle size={14} /> Assign</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
