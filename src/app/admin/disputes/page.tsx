'use client';
import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Loader2, RefreshCw, X, Camera } from 'lucide-react';
import { disputeService } from '@/lib/services/dataService';
import { createClient } from '@/lib/supabase/client';
import type { AppDispute, DisputeStatus } from '@/lib/types/database';

const STATUS_COLORS: Record<DisputeStatus, string> = {
  open: 'bg-red-100 text-danger',
  under_review: 'bg-amber-100 text-warning',
  resolved: 'bg-green-100 text-success',
  closed: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
  closed: 'Closed',
};

interface EvidencePhoto {
  id: string;
  publicUrl: string;
  fileName: string | null;
}

interface DisputeWithEvidence extends AppDispute {
  evidence?: EvidencePhoto[];
  evidenceLoaded?: boolean;
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<DisputeWithEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<DisputeWithEvidence | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadDisputes = async () => {
    try {
      const data = await disputeService.getAllDisputes(filterStatus !== 'all' ? filterStatus as DisputeStatus : undefined);
      setDisputes(data.map((d) => ({ ...d, evidence: undefined, evidenceLoaded: false })));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDisputes(); }, [filterStatus]);

  // Realtime: new disputes appear instantly
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-disputes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => {
        loadDisputes();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filterStatus]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDisputes();
  };

  const handleUpdateStatus = async (disputeId: string, newStatus: DisputeStatus, note?: string) => {
    setUpdatingId(disputeId);
    try {
      const success = await disputeService.updateDisputeStatus(disputeId, newStatus, note);
      if (success) {
        setDisputes((prev) =>
          prev.map((d) =>
            d.id === disputeId
              ? { ...d, disputeStatus: newStatus, resolutionNote: note ?? d.resolutionNote }
              : d
          )
        );
        if (selectedDispute?.id === disputeId) {
          setSelectedDispute((prev) => prev ? { ...prev, disputeStatus: newStatus, resolutionNote: note ?? prev.resolutionNote } : prev);
        }
        setResolutionNote('');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExpandDispute = async (dispute: DisputeWithEvidence) => {
    const isExpanding = expandedId !== dispute.id;
    setExpandedId(isExpanding ? dispute.id : null);

    // Load evidence photos on first expand
    if (isExpanding && !dispute.evidenceLoaded) {
      try {
        const evidence = await disputeService.getDisputeEvidence(dispute.id);
        setDisputes((prev) =>
          prev.map((d) => d.id === dispute.id ? { ...d, evidence, evidenceLoaded: true } : d)
        );
      } catch {
        // silently fail
      }
    }
  };

  const handleOpenResolve = async (dispute: DisputeWithEvidence) => {
    // Ensure evidence is loaded before opening resolve modal
    let withEvidence = dispute;
    if (!dispute.evidenceLoaded) {
      try {
        const evidence = await disputeService.getDisputeEvidence(dispute.id);
        withEvidence = { ...dispute, evidence, evidenceLoaded: true };
        setDisputes((prev) =>
          prev.map((d) => d.id === dispute.id ? withEvidence : d)
        );
      } catch {
        // silently fail
      }
    }
    setSelectedDispute(withEvidence);
  };

  const openCount = disputes.filter((d) => d.disputeStatus === 'open').length;
  const reviewCount = disputes.filter((d) => d.disputeStatus === 'under_review').length;

  return (
    <div className="p-5 lg:p-8 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Dispute Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {openCount > 0 && <span className="text-danger font-semibold">{openCount} open</span>}
            {openCount > 0 && reviewCount > 0 && ' · '}
            {reviewCount > 0 && <span className="text-warning font-semibold">{reviewCount} under review</span>}
            {openCount === 0 && reviewCount === 0 && 'All disputes resolved'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['all', 'open', 'under_review', 'resolved', 'closed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filterStatus === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s as DisputeStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={26} className="text-success" />
          </div>
          <p className="text-base font-bold text-foreground mb-1">No disputes found</p>
          <p className="text-sm text-muted-foreground">
            {filterStatus === 'all' ? 'No disputes have been filed yet.' : `No ${STATUS_LABELS[filterStatus as DisputeStatus]?.toLowerCase()} disputes.`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              className="bg-card rounded-2xl border border-border shadow-card overflow-hidden"
            >
              <div className="px-5 py-4 flex items-start gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  dispute.disputeStatus === 'open' ? 'bg-red-50' : dispute.disputeStatus === 'under_review' ? 'bg-amber-50' : 'bg-green-50'
                }`}>
                  <AlertTriangle size={18} className={
                    dispute.disputeStatus === 'open' ? 'text-danger' : dispute.disputeStatus === 'under_review' ? 'text-warning' : 'text-success'
                  } />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <p className="text-sm font-extrabold text-foreground">{dispute.reason}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Job: <span className="font-semibold text-primary">{dispute.jobRef || dispute.jobId.slice(0, 8)}</span>
                        {' · '}
                        Filed by: <span className="font-semibold">{dispute.raisedByName || dispute.raisedByRole}</span>
                        {' · '}
                        {new Date(dispute.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[dispute.disputeStatus]}`}>
                      {STATUS_LABELS[dispute.disputeStatus]}
                    </span>
                  </div>

                  {dispute.description && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mt-2 leading-relaxed">
                      {dispute.description}
                    </p>
                  )}

                  {dispute.resolutionNote && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-success mb-0.5">Resolution Note</p>
                      <p className="text-xs text-foreground">{dispute.resolutionNote}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {dispute.disputeStatus === 'open' && (
                      <button
                        onClick={() => handleUpdateStatus(dispute.id, 'under_review')}
                        disabled={updatingId === dispute.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-warning text-xs font-bold hover:bg-amber-200 transition-colors disabled:opacity-50"
                      >
                        {updatingId === dispute.id ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
                        Mark Under Review
                      </button>
                    )}
                    {(dispute.disputeStatus === 'open' || dispute.disputeStatus === 'under_review') && (
                      <button
                        onClick={() => handleOpenResolve(dispute)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-success text-xs font-bold hover:bg-green-200 transition-colors"
                      >
                        <CheckCircle size={12} />
                        Resolve
                      </button>
                    )}
                    {dispute.disputeStatus === 'resolved' && (
                      <button
                        onClick={() => handleUpdateStatus(dispute.id, 'closed')}
                        disabled={updatingId === dispute.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-muted/80 transition-colors disabled:opacity-50"
                      >
                        {updatingId === dispute.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        Close
                      </button>
                    )}
                    {/* View Evidence toggle */}
                    <button
                      onClick={() => handleExpandDispute(dispute)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-muted/80 transition-colors"
                    >
                      <Camera size={12} />
                      {expandedId === dispute.id ? 'Hide Evidence' : 'View Evidence'}
                    </button>
                  </div>

                  {/* Evidence Photos (expanded) */}
                  {expandedId === dispute.id && (
                    <div className="mt-3">
                      {!dispute.evidenceLoaded ? (
                        <div className="flex items-center gap-2 py-2">
                          <Loader2 size={14} className="animate-spin text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Loading evidence…</span>
                        </div>
                      ) : dispute.evidence && dispute.evidence.length > 0 ? (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Camera size={12} /> Photo Evidence ({dispute.evidence.length})
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {dispute.evidence.map((photo) => (
                              <a
                                key={photo.id}
                                href={photo.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative rounded-xl overflow-hidden bg-muted aspect-square block hover:opacity-90 transition-opacity"
                              >
                                <img
                                  src={photo.publicUrl}
                                  alt={photo.fileName || 'Dispute evidence photo'}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-1">No photo evidence submitted for this dispute.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <h2 className="text-base font-extrabold text-foreground">Resolve Dispute</h2>
              <button onClick={() => setSelectedDispute(null)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
            <div className="px-5 py-5 flex flex-col gap-4">
              <div className="bg-muted/50 rounded-xl p-3.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Dispute Reason</p>
                <p className="text-sm font-semibold text-foreground">{selectedDispute.reason}</p>
                {selectedDispute.description && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedDispute.description}</p>
                )}
              </div>

              {/* Evidence Photos in Resolve Modal */}
              {selectedDispute.evidence && selectedDispute.evidence.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Camera size={12} /> Photo Evidence ({selectedDispute.evidence.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedDispute.evidence.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative rounded-xl overflow-hidden bg-muted aspect-square block hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={photo.publicUrl}
                          alt={photo.fileName || 'Dispute evidence photo'}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-foreground">Resolution Note <span className="text-danger">*</span></label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={3}
                  placeholder="Describe how this dispute was resolved…"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="flex-1 py-3 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!resolutionNote.trim()) return;
                    await handleUpdateStatus(selectedDispute.id, 'resolved', resolutionNote.trim());
                    setSelectedDispute(null);
                  }}
                  disabled={!resolutionNote.trim() || updatingId === selectedDispute.id}
                  className="flex-1 py-3 rounded-xl bg-success text-white text-sm font-bold hover:bg-success/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updatingId === selectedDispute.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
