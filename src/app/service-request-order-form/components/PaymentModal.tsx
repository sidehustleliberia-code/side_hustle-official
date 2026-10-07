'use client';
import React, { useState } from 'react';
import { X, Shield, Loader2, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { OrderFormData } from './ServiceRequestPage';
import { useAuth } from '@/contexts/AuthContext';
import { jobService, paymentService } from '@/lib/services/dataService';
import type { PaymentChannel as DBPaymentChannel } from '@/lib/types/database';

type PaymentChannel = 'orange' | 'mtn';
type PaymentStep = 'select' | 'confirm' | 'processing' | 'success' | 'failed';

interface PaymentFormData {
  mobileNumber: string;
}

interface Props {
  formData: OrderFormData;
  onClose: () => void;
  onComplete: (jobRef: string, jobId: string) => void;
}

const channelConfig = {
  orange: {
    id: 'orange',
    name: 'Orange Money',
    shortName: 'Orange',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    selectedBg: 'bg-orange-50',
    selectedBorder: 'border-orange-500',
    prefix: '+231 77',
    placeholder: '0 123 456',
    emoji: '🟠',
    dbChannel: 'orange_money' as DBPaymentChannel,
    instructions: 'You will receive an Orange Money USSD prompt on your phone to authorize this payment.',
  },
  mtn: {
    id: 'mtn',
    name: 'Lonestar Cell MTN',
    shortName: 'MTN',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    selectedBg: 'bg-yellow-50',
    selectedBorder: 'border-yellow-500',
    prefix: '+231 88',
    placeholder: '0 123 456',
    emoji: '🟡',
    dbChannel: 'mtn_momo' as DBPaymentChannel,
    instructions: 'You will receive an MTN Mobile Money prompt to confirm this payment on your registered number.',
  },
};

export default function PaymentModal({ formData, onClose, onComplete }: Props) {
  const { user } = useAuth();
  const [channel, setChannel] = useState<PaymentChannel>('orange');
  const [step, setStep] = useState<PaymentStep>('select');
  const [createdJobId, setCreatedJobId] = useState<string>('');
  const [createdJobRef, setCreatedJobRef] = useState<string>('');

  const { category, service, quantity } = formData;
  // Use service pricing if a specific service is selected, otherwise fall back to category pricing
  const activePricing = service || category;
  const baseTotal = activePricing ? activePricing.basePrice * quantity : 0;
  const platformFee = activePricing ? activePricing.platformFee * quantity : 0;
  const grandTotal = baseTotal + platformFee;
  // Label for display: prefer service name, fall back to category label
  const serviceDisplayLabel = service ? service.name : category?.label || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PaymentFormData>();

  const mobileNumber = watch('mobileNumber', '');
  const cfg = channelConfig[channel];

  const handleProceedToConfirm = handleSubmit(() => {
    setStep('confirm');
  });

  const handleConfirmPayment = async () => {
    if (!category || !user) return;
    setStep('processing');

    try {
      // 1. Create the job record
      const job = await jobService.createJob({
        serviceCategoryId: category.id,
        serviceId: service?.id || undefined,
        serviceLabel: service ? service.name : category.label,
        address: formData.address,
        area: formData.area,
        landmark: formData.landmark || undefined,
        scheduledDate: formData.date,
        scheduledTime: formData.time,
        notes: formData.notes || undefined,
        quantity: formData.quantity,
        grossAmount: baseTotal,
        platformFee: platformFee,
        netPayout: baseTotal,
        paymentChannel: cfg.dbChannel,
        paymentMobile: `${cfg.prefix}${mobileNumber}`,
      });

      if (!job) {
        setStep('failed');
        return;
      }

      setCreatedJobId(job.id);
      setCreatedJobRef(job.ref);

      // 2. Process payment (placeholder — no real API call)
      const paymentResult = await paymentService.initiatePayment({
        jobId: job.id,
        channel: cfg.dbChannel,
        mobileNumber: `${cfg.prefix}${mobileNumber}`,
        amount: grandTotal,
        platformFee: platformFee,
        netAmount: baseTotal,
      });

      if (paymentResult.success) {
        setStep('success');
        toast.success(`Payment confirmed! Job ${job.ref} is now active.`);
        await new Promise((res) => setTimeout(res, 1800));
        onComplete(job.ref, job.id);
      } else {
        setStep('failed');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setStep('failed');
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <div className="modal-content scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 id="payment-modal-title" className="text-lg font-extrabold text-foreground">
              {step === 'select' && 'Choose Payment Method'}
              {step === 'confirm' && 'Confirm Payment'}
              {step === 'processing' && 'Processing Payment'}
              {step === 'success' && 'Payment Confirmed!'}
              {step === 'failed' && 'Payment Failed'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === 'select' && 'Select your mobile money provider'}
              {step === 'confirm' && 'Review and authorize your payment'}
              {step === 'processing' && 'Please wait — do not close this window'}
              {step === 'success' && 'Your job has been submitted'}
              {step === 'failed' && 'There was a problem processing your payment'}
            </p>
          </div>
          {step !== 'processing' && step !== 'success' && (
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Close payment modal">
              <X size={20} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* STEP: SELECT */}
          {step === 'select' && (
            <form onSubmit={handleProceedToConfirm} className="flex flex-col gap-5" noValidate>
              <div className="bg-navy-50 border border-navy-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-muted-foreground">Amount to Pay</span>
                  <span className="text-2xl font-extrabold text-primary tabular-nums">LRD {grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{serviceDisplayLabel} × {quantity}</span>
                    <span className="font-medium text-foreground tabular-nums">LRD {baseTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <span className="font-medium text-foreground tabular-nums">LRD {platformFee.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-foreground">Payment Channel</label>
                {(['orange', 'mtn'] as PaymentChannel[]).map((ch) => {
                  const c = channelConfig[ch];
                  return (
                    <button key={`channel-${ch}`} type="button" onClick={() => setChannel(ch)}
                      className={`mobile-money-card w-full flex items-center gap-4 p-4 rounded-xl ${channel === ch ? 'selected' : 'border-border bg-background hover:bg-muted/50'}`}>
                      <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center text-xl flex-shrink-0`}>{c.emoji}</div>
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-bold ${channel === ch ? 'text-primary' : 'text-foreground'}`}>{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.instructions.slice(0, 50)}...</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${channel === ch ? 'border-primary bg-primary' : 'border-border bg-background'}`}>
                        {channel === ch && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="pay-mobile" className="text-sm font-semibold text-foreground">{cfg.name} Mobile Number</label>
                <p className="text-xs text-muted-foreground -mt-0.5">Enter the number registered with {cfg.shortName}</p>
                <div className="flex gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-2.5 ${cfg.bg} border ${cfg.border} rounded-xl text-sm font-bold ${cfg.color} flex-shrink-0`}>
                    {cfg.emoji} {cfg.prefix}
                  </div>
                  <input id="pay-mobile" type="tel" placeholder={cfg.placeholder}
                    className={`input-base flex-1 ${errors.mobileNumber ? 'input-error' : ''}`}
                    {...register('mobileNumber', {
                      required: 'Mobile number is required',
                      pattern: { value: /^[0-9\s]{7,9}$/, message: 'Enter a valid mobile number' },
                    })} />
                </div>
                {errors.mobileNumber && <p className="text-xs text-danger font-medium">{errors.mobileNumber.message}</p>}
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-gold-50 border border-gold-100 rounded-xl">
                <Shield size={15} className="text-gold-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gold-600 leading-relaxed">
                  <span className="font-bold">Funds Held in Escrow:</span> Your payment is secured and only released to the provider after you confirm job completion.
                </p>
              </div>

              <button type="submit" className="btn-primary w-full py-3.5 text-base font-bold">
                Continue to Confirm <ChevronRight size={18} />
              </button>
            </form>
          )}

          {/* STEP: CONFIRM */}
          {step === 'confirm' && (
            <div className="flex flex-col gap-5">
              <div className="bg-muted/60 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-semibold text-foreground">{serviceDisplayLabel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-extrabold text-primary">LRD {grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment via</span>
                  <span className="font-semibold text-foreground">{cfg.emoji} {cfg.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mobile</span>
                  <span className="font-semibold text-foreground">{cfg.prefix} {mobileNumber}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">{cfg.instructions}</p>
              <button onClick={handleConfirmPayment} className="btn-primary w-full py-3.5 text-base font-bold">
                Confirm & Pay LRD {grandTotal.toLocaleString()}
              </button>
              <button onClick={() => setStep('select')} className="btn-outline w-full py-3 text-sm">
                ← Change Payment Method
              </button>
            </div>
          )}

          {/* STEP: PROCESSING */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-foreground mb-1">Processing Payment</p>
                <p className="text-sm text-muted-foreground">Creating your job and confirming payment...</p>
              </div>
            </div>
          )}

          {/* STEP: SUCCESS */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle size={32} className="text-success" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-foreground mb-1">Payment Confirmed!</p>
                <p className="text-sm text-muted-foreground">Your job is now live and a provider will be assigned shortly.</p>
              </div>
            </div>
          )}

          {/* STEP: FAILED */}
          {step === 'failed' && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
                <AlertCircle size={32} className="text-danger" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-foreground mb-1">Payment Failed</p>
                <p className="text-sm text-muted-foreground">There was a problem processing your payment. Please try again.</p>
              </div>
              <button onClick={() => setStep('select')} className="btn-primary w-full py-3.5">Try Again</button>
              <button onClick={onClose} className="btn-outline w-full py-3 text-sm">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}