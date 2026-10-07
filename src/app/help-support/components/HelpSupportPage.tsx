'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import {
  ArrowLeft, HelpCircle, MessageSquare, AlertTriangle, ChevronDown,
  ChevronUp, Send, Loader2, CheckCircle, Phone, Mail,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const FAQ_ITEMS = [
  {
    q: 'How do I book a service?',
    a: 'Go to your dashboard and click "Book a Service". Select the service type, enter your address and preferred schedule, then complete payment to confirm your booking.',
  },
  {
    q: 'How do I track my order?',
    a: 'From your Customer Dashboard, click on any active order to open the Track Order page. You can see real-time status updates and provider location.',
  },
  {
    q: 'How do I confirm a completed job?',
    a: 'When the provider marks the job complete, you will receive a notification. Open Track Order, review the proof of work, then tap "Confirm Completion" to finalize.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'Side Hustle accepts Orange Money and MTN MoMo. Enter your mobile number during checkout and follow the payment prompts.',
  },
  {
    q: 'Can I cancel my booking?',
    a: 'Yes, you can cancel before a provider is assigned. Once a provider is assigned, cancellation fees may apply per our cancellation policy.',
  },
  {
    q: 'How do I become a provider?',
    a: 'Register as a provider on the sign-up page. Complete your profile and payout setup. Your account will be reviewed and activated by the Side Hustle team.',
  },
  {
    q: 'How do providers get paid?',
    a: 'Providers receive 85% of the job value. Earnings are held in escrow until the customer confirms completion, then released to your payout account.',
  },
  {
    q: 'What if I have a dispute?',
    a: 'If there is an issue with a completed job, you can open a dispute from the Track Order page. Our team will review the evidence and resolve it within 48 hours.',
  },
];

interface SupportForm {
  category: string;
  subject: string;
  message: string;
}

export default function HelpSupportPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'report'>('faq');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState<SupportForm>({ category: 'general', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.subject.trim()) { toast.error('Please enter a subject'); return; }
    if (!form.message.trim() || form.message.length < 20) { toast.error('Please describe your issue in at least 20 characters'); return; }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('support_requests').insert({
        user_id: user?.id || null,
        user_email: profile?.email || form.subject,
        user_name: profile?.fullName || 'Anonymous',
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
        status: 'open',
      });

      if (error) {
        toast.error('Failed to submit request: ' + error.message);
        return;
      }
      setSubmitted(true);
      setForm({ category: 'general', subject: '', message: '' });
      toast.success('Support request submitted successfully');
    } catch {
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-nav">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={profile?.role === 'provider' ? '/provider-dashboard' : '/customer-dashboard'}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft size={20} className="text-muted-foreground" />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <AppLogo size={26} />
              <span className="font-extrabold text-base text-primary hidden sm:block">SideHustle</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-foreground">Help & Support</h1>
          <p className="text-sm text-muted-foreground mt-1">Find answers or get in touch with our team.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
          {[
            { key: 'faq', label: 'FAQ', icon: HelpCircle },
            { key: 'contact', label: 'Contact Us', icon: MessageSquare },
            { key: 'report', label: 'Report Problem', icon: AlertTriangle },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key as typeof activeTab); setSubmitted(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-card text-primary shadow-card border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="bg-card rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-muted/20 transition-colors"
                >
                  <p className="text-sm font-semibold text-foreground">{item.q}</p>
                  {openFaq === idx
                    ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" />
                    : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
                  }
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4 border-t border-border pt-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}

            <div className="bg-navy-50 rounded-2xl p-5 mt-2">
              <p className="text-sm font-bold text-primary mb-1">Still have questions?</p>
              <p className="text-xs text-muted-foreground mb-3">Our support team is available to help you.</p>
              <button
                onClick={() => setActiveTab('contact')}
                className="btn-primary py-2 px-4 text-sm"
              >
                Contact Support
              </button>
            </div>
          </div>
        )}

        {/* Contact / Report Tab */}
        {(activeTab === 'contact' || activeTab === 'report') && (
          <div className="flex flex-col gap-4">
            {/* Contact info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                  <Phone size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone Support</p>
                  <p className="text-sm font-bold text-foreground">+231 77 000 0000</p>
                </div>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                  <Mail size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email Support</p>
                  <p className="text-sm font-bold text-foreground">support@sidehustle.lr</p>
                </div>
              </div>
            </div>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-success" />
                </div>
                <h3 className="text-base font-extrabold text-foreground mb-2">Request Submitted</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We have received your message and will respond within 24–48 hours.
                </p>
                <button onClick={() => setSubmitted(false)} className="btn-primary py-2 px-6 text-sm">
                  Submit Another
                </button>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-5">
                <h2 className="text-base font-extrabold text-foreground">
                  {activeTab === 'report' ? 'Report a Problem' : 'Send Us a Message'}
                </h2>

                {user && (
                  <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle size={14} className="text-success flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Submitting as <strong>{profile?.fullName}</strong> ({profile?.email})
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Category</label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      className="input-base pr-8 appearance-none cursor-pointer"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="booking">Booking Issue</option>
                      <option value="payment">Payment Issue</option>
                      <option value="provider">Provider Issue</option>
                      <option value="account">Account Issue</option>
                      <option value="bug">Bug / Technical Problem</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="input-base"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="input-base resize-none"
                    rows={5}
                    placeholder="Please describe your issue in detail. Include any relevant order numbers or dates."
                  />
                  <p className="text-xs text-muted-foreground">{form.message.length} characters (minimum 20)</p>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary flex items-center justify-center gap-2 py-3"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
