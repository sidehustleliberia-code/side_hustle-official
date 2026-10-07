'use client';
import React, { useState, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ChevronRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/lib/services/dataService';
import type { AppDisbursement, AppPayment, DisbursementStatus } from '@/lib/types/database';

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  customer_payment: { label: 'Customer Payment', icon: ArrowDownCircle, color: 'text-success', bg: 'bg-green-50' },
  provider_disbursement: { label: 'Provider Payout', icon: ArrowUpCircle, color: 'text-primary', bg: 'bg-navy-50' },
  platform_fee: { label: 'Platform Fee', icon: TrendingUp, color: 'text-warning', bg: 'bg-amber-50' },
  refund: { label: 'Refund', icon: AlertCircle, color: 'text-danger', bg: 'bg-red-50' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'badge-success' },
  pending: { label: 'Pending', className: 'badge-warning' },
  processing: { label: 'Processing', className: 'badge-primary' },
  failed: { label: 'Failed', className: 'badge-danger' },
  refunded: { label: 'Refunded', className: 'badge-danger' },
  under_review: { label: 'Under Review', className: 'badge-warning' },
  approved: { label: 'Approved', className: 'badge-success' },
  rejected: { label: 'Rejected', className: 'badge-danger' },
};

const WITHDRAWAL_STATUS_OPTIONS: DisbursementStatus[] = [
  'pending',
  'under_review',
  'approved',
  'processing',
  'completed',
  'rejected',
  'failed',
];

const WITHDRAWAL_STATUS_LABELS: Record<DisbursementStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  processing: 'Processing',
  completed: 'Completed',
  rejected: 'Rejected',
  failed: 'Failed',
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AppPayment[]>([]);
  const [withdrawals, setWithdrawals] = useState<AppDisbursement[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [withdrawalFilter, setWithdrawalFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPayments = async () => {
    try {
      const data = await adminService.getAllPayments({ type: typeFilter, status: statusFilter, search });
      setPayments(data);
    } catch {
      // silently fail
    }
  };

  const loadWithdrawals = async () => {
    try {
      const data = await adminService.getWithdrawalRequests({
        status: withdrawalFilter === 'all' ? undefined : (withdrawalFilter as DisbursementStatus),
      });
      setWithdrawals(data);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await Promise.all([loadPayments(), loadWithdrawals()]);
      setLoading(false);
    };
    run();
  }, [typeFilter, statusFilter, withdrawalFilter]);

  const handleApprove = async (payment: AppPayment) => {
    setProcessingId(payment.id);
    try {
      const success = await adminService.approvePayment(payment.id);
      if (success) {
        toast.success(`${payment.ref} approved and processing`);
        await loadPayments();
      } else {
        toast.error('Could not approve payment.');
      }
    } catch {
      toast.error('Approval failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleWithdrawalAction = async (
    withdrawal: AppDisbursement,
    nextStatus: DisbursementStatus,
    actionLabel: string,
    confirmationText: string
  ) => {
    const confirmed = window.confirm(`${confirmationText} (${withdrawal.ref})`);
    if (!confirmed) return;

    setProcessingId(withdrawal.id);
    try {
      const success = await adminService.updateWithdrawalStatus(withdrawal.id, nextStatus, `${actionLabel} by admin review.`);
      if (success) {
        toast.success(`${withdrawal.ref} moved to ${WITHDRAWAL_STATUS_LABELS[nextStatus]}`);
        await loadWithdrawals();
      } else {
        toast.error('Could not update withdrawal status.');
      }
    } catch {
      toast.error('Withdrawal update failed.');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredPayments = search
    ? payments.filter((p) =>
        p.ref.toLowerCase().includes(search.toLowerCase()) ||
        p.jobRef.toLowerCase().includes(search.toLowerCase()) ||
        p.party?.toLowerCase().includes(search.toLowerCase())
      )
    : payments;

  const totalRevenue = payments.filter((t) => t.paymentType === 'customer_payment' && t.paymentStatus === 'completed').reduce((s, t) => s + t.amount, 0);
  const totalDisbursed = payments.filter((t) => t.paymentType === 'provider_disbursement' && t.paymentStatus === 'completed').reduce((s, t) => s + t.amount, 0);
  const totalPlatformFees = payments
    .filter((t) => t.paymentType === 'customer_payment' && t.paymentStatus === 'completed')
    .reduce((s, t) => s + t.platformFee, 0);
  const pendingCount = payments.filter((t) => t.paymentStatus === 'pending').length;
  const pendingWithdrawalTotal = withdrawals
    .filter((d) => ['pending', 'under_review', 'approved', 'processing'].includes(d.disbursementStatus))
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="p-5 lg:p-8 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-foreground">Payment & Disbursement Ledger</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All financial transactions and payout review queues on the platform</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Gross Transaction Value', value: `LRD ${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-success', bg: 'bg-green-50' },
          { label: 'Total Disbursed', value: `LRD ${totalDisbursed.toLocaleString()}`, icon: ArrowUpCircle, color: 'text-primary', bg: 'bg-navy-50' },
          { label: 'Platform Fees (15%)', value: `LRD ${totalPlatformFees.toLocaleString()}`, icon: TrendingUp, color: 'text-warning', bg: 'bg-amber-50' },
          { label: 'Pending', value: String(pendingCount), icon: Clock, color: 'text-danger', bg: 'bg-red-50' },
          { label: 'Pending Withdrawals', value: `LRD ${pendingWithdrawalTotal.toLocaleString()}`, icon: ShieldCheck, color: 'text-primary', bg: 'bg-navy-50' },
        ].map((kpi) => (
          <div key={`kpi-${kpi.label}`} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
              <kpi.icon size={20} className={kpi.color} />
            </div>
            <div>
              <p className="text-lg font-extrabold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Withdrawal Review Queue</h2>
            <p className="text-xs text-muted-foreground">Review, approve, process, and complete provider payouts.</p>
          </div>
          <div className="relative">
            <select
              value={withdrawalFilter}
              onChange={(e) => setWithdrawalFilter(e.target.value)}
              className="input-base pr-8 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="all">All States</option>
              {WITHDRAWAL_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{WITHDRAWAL_STATUS_LABELS[status]}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {withdrawals.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No withdrawal requests in this queue.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {withdrawals.map((withdrawal) => {
              const status = STATUS_CONFIG[withdrawal.disbursementStatus] || {
                label: WITHDRAWAL_STATUS_LABELS[withdrawal.disbursementStatus],
                className: 'badge-primary',
              };
              return (
                <div key={withdrawal.id} className="px-5 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-primary">{withdrawal.ref}</span>
                      <span className="text-xs text-muted-foreground">· {withdrawal.providerName || withdrawal.providerId}</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {withdrawal.amount.toLocaleString()} · {withdrawal.channel === 'orange_money' ? 'Orange Money' : withdrawal.channel === 'mtn_momo' ? 'MTN MoMo' : 'Internal'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {withdrawal.mobileNumber} · {new Date(withdrawal.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                    {withdrawal.disbursementStatus === 'pending' && (
                      <button
                        onClick={() => handleWithdrawalAction(withdrawal, 'under_review', 'Review started', 'Move this withdrawal into review before approval?')}
                        disabled={processingId === withdrawal.id}
                        className="btn-secondary py-2 px-3 text-xs"
                      >
                        Review
                      </button>
                    )}
                    {withdrawal.disbursementStatus === 'under_review' && (
                      <button
                        onClick={() => handleWithdrawalAction(withdrawal, 'approved', 'Approved', 'Confirm approval and move this withdrawal to processing?')}
                        disabled={processingId === withdrawal.id}
                        className="btn-primary py-2 px-3 text-xs"
                      >
                        Approve
                      </button>
                    )}
                    {withdrawal.disbursementStatus === 'approved' && (
                      <button
                        onClick={() => handleWithdrawalAction(withdrawal, 'processing', 'Processing', 'Start payout processing for this approved withdrawal?')}
                        disabled={processingId === withdrawal.id}
                        className="btn-primary py-2 px-3 text-xs"
                      >
                        Process
                      </button>
                    )}
                    {withdrawal.disbursementStatus === 'processing' && (
                      <>
                        <button
                          onClick={() => handleWithdrawalAction(withdrawal, 'completed', 'Completed', 'Mark this payout as completed?')}
                          disabled={processingId === withdrawal.id}
                          className="btn-primary py-2 px-3 text-xs"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleWithdrawalAction(withdrawal, 'failed', 'Failed', 'Mark this payout as failed and record the reason?')}
                          disabled={processingId === withdrawal.id}
                          className="btn-danger py-2 px-3 text-xs"
                        >
                          Fail
                        </button>
                      </>
                    )}
                    {withdrawal.disbursementStatus === 'pending' && (
                      <button
                        onClick={() => handleWithdrawalAction(withdrawal, 'rejected', 'Rejected', 'Reject this withdrawal request?')}
                        disabled={processingId === withdrawal.id}
                        className="btn-danger py-2 px-3 text-xs"
                      >
                        Reject
                      </button>
                    )}
                    {withdrawal.disbursementStatus === 'under_review' && (
                      <button
                        onClick={() => handleWithdrawalAction(withdrawal, 'rejected', 'Rejected', 'Reject this withdrawal after review?')}
                        disabled={processingId === withdrawal.id}
                        className="btn-danger py-2 px-3 text-xs"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ref, job ref, party..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10 w-full"
          />
        </div>
        <div className="relative">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-base pr-8 appearance-none cursor-pointer min-w-[160px]">
            <option value="all">All Types</option>
            <option value="customer_payment">Customer Payment</option>
            <option value="provider_disbursement">Provider Payout</option>
            <option value="platform_fee">Platform Fee</option>
            <option value="refund">Refund</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-base pr-8 appearance-none cursor-pointer min-w-[140px]">
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">No transactions found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPayments.map((txn) => {
                const typeCfg = TYPE_CONFIG[txn.paymentType] || TYPE_CONFIG.customer_payment;
                const statusCfg = STATUS_CONFIG[txn.paymentStatus] || { label: txn.paymentStatus, className: 'badge-primary' };
                const TypeIcon = typeCfg.icon;
                return (
                  <div key={txn.id}>
                    <button
                      onClick={() => setExpandedId(expandedId === txn.id ? null : txn.id)}
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/20 transition-colors text-left"
                    >
                      <div className={`w-9 h-9 rounded-xl ${typeCfg.bg} flex items-center justify-center flex-shrink-0`}>
                        <TypeIcon size={16} className={typeCfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-primary">{txn.ref}</span>
                          <span className="text-xs text-muted-foreground">· {txn.jobRef}</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{typeCfg.label}</p>
                        <p className="text-xs text-muted-foreground">{txn.party || '—'} · {new Date(txn.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-extrabold text-foreground">LRD {txn.amount.toLocaleString()}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusCfg.className}`}>{statusCfg.label}</span>
                      </div>
                      <ChevronRight size={16} className={`text-muted-foreground transition-transform flex-shrink-0 ${expandedId === txn.id ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedId === txn.id && (
                      <div className="px-5 pb-4 bg-muted/20 flex flex-col gap-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Channel</span>
                          <span className="font-semibold">{txn.channel === 'orange_money' ? '🟠 Orange Money' : txn.channel === 'mtn_momo' ? '🟡 MTN MoMo' : 'Internal'}</span>
                        </div>
                        {txn.mobileNumber && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Mobile</span>
                            <span className="font-semibold">{txn.mobileNumber}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Platform Fee</span>
                          <span className="font-semibold">LRD {txn.platformFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Net Amount</span>
                          <span className="font-semibold">LRD {txn.netAmount.toLocaleString()}</span>
                        </div>
                        {txn.paymentStatus === 'pending' && (
                          <button
                            onClick={() => handleApprove(txn)}
                            disabled={processingId === txn.id}
                            className="mt-2 btn-primary py-2 text-xs"
                          >
                            {processingId === txn.id ? <><Loader2 size={12} className="animate-spin" /> Processing...</> : <><CheckCircle size={12} /> Approve Payment</>}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
