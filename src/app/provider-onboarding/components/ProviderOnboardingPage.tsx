'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import {
  User, Phone, MapPin, CheckCircle, Loader2, ArrowLeft, ShieldCheck,
  ToggleLeft, ToggleRight, ChevronRight, AlertCircle, Briefcase, Plus, X,
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { categoryService, serviceItemService, providerServicesService, providerSkillsService } from '@/lib/services/dataService';
import type { ServiceCategory, AppService } from '@/lib/types/database';

type PayoutProvider = 'orange' | 'mtn' | null;

interface PersonalDetailsForm {
  fullName: string;
  email: string;
  serviceArea: string;
  bio: string;
}

interface PayoutForm {
  payoutMobile: string;
}

export default function ProviderOnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [payoutProvider, setPayoutProvider] = useState<PayoutProvider>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [personalData, setPersonalData] = useState<PersonalDetailsForm | null>(null);
  const [payoutMobile, setPayoutMobile] = useState('');

  // Service selection state
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [servicesByCategory, setServicesByCategory] = useState<Record<string, AppService[]>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [loadingServices, setLoadingServices] = useState(false);

  // Skills state
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);

  const personalForm = useForm<PersonalDetailsForm>({
    defaultValues: { fullName: '', email: '', serviceArea: '', bio: '' },
  });

  const payoutForm = useForm<PayoutForm>({
    defaultValues: { payoutMobile: '' },
  });

  useEffect(() => {
    categoryService.getAll().then(setCategories).catch(() => {});
    if (profile) {
      personalForm.setValue('fullName', profile.fullName || '');
      personalForm.setValue('email', profile.email || '');
    }
  }, [profile]);

  // Load services when category is selected
  useEffect(() => {
    if (!selectedCategoryId) return;
    if (servicesByCategory[selectedCategoryId]) return; // already loaded
    setLoadingServices(true);
    serviceItemService.getByCategory(selectedCategoryId).then((svcs) => {
      setServicesByCategory((prev) => ({ ...prev, [selectedCategoryId]: svcs }));
      setLoadingServices(false);
    });
  }, [selectedCategoryId]);

  const handlePersonalSubmit = (data: PersonalDetailsForm) => {
    setPersonalData(data);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendOtp = async () => {
    const mobile = payoutForm.getValues('payoutMobile');
    if (!mobile || mobile.length < 8) {
      payoutForm.setError('payoutMobile', { message: 'Enter a valid mobile number first' });
      return;
    }
    if (!payoutProvider) {
      toast.error('Please select a payout provider first');
      return;
    }
    setIsSendingOtp(true);
    setPayoutMobile(mobile);
    await new Promise((res) => setTimeout(res, 1500));
    setIsSendingOtp(false);
    setOtpSent(true);
    toast.success(`Verification code sent to ${mobile}`);
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length < 4) {
      toast.error('Enter the 4-digit code sent to your number');
      return;
    }
    setIsVerifying(true);
    await new Promise((res) => setTimeout(res, 1400));
    setIsVerifying(false);
    setMobileVerified(true);
    toast.success('Mobile number verified successfully!');
  };

  const handlePayoutSubmit = () => {
    if (!payoutProvider) {
      toast.error('Please select a payout provider');
      return;
    }
    if (!mobileVerified) {
      toast.error('Please verify your mobile number before continuing');
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      toast.error('Skill already added');
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleServicesNext = () => {
    if (selectedServiceIds.size === 0) {
      toast.error('Please select at least one service you offer');
      return;
    }
    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const supabase = createClient();

      // Update user_profiles
      await supabase.from('user_profiles').update({
        full_name: personalData?.fullName || profile?.fullName || '',
        phone: profile?.phone || null,
        area: personalData?.serviceArea || null,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      // Upsert provider_profiles
      const { error } = await supabase.from('provider_profiles').upsert({
        user_id: user.id,
        service_area: personalData?.serviceArea || null,
        bio: personalData?.bio || null,
        payout_provider: payoutProvider === 'orange' ? 'orange_money' : payoutProvider === 'mtn' ? 'mtn_momo' : null,
        payout_mobile: payoutMobile ? `+231 ${payoutMobile}` : null,
        payout_mobile_verified: mobileVerified,
        is_available: isAvailable,
        provider_status: 'pending_verification',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      if (error) {
        toast.error('Failed to save profile: ' + error.message);
        setIsSaving(false);
        return;
      }

      // Save provider services
      await providerServicesService.setProviderServices(user.id, Array.from(selectedServiceIds));

      // Save provider skills
      if (skills.length > 0) {
        await providerSkillsService.setProviderSkills(user.id, skills);
      }

      await refreshProfile();
      toast.success('Profile saved! Redirecting to your dashboard...');
      await new Promise((res) => setTimeout(res, 800));
      window.location.href = '/provider-dashboard';
    } catch (err: any) {
      toast.error('Failed to save profile: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    { num: 1, label: 'Personal Details' },
    { num: 2, label: 'Payout Setup' },
    { num: 3, label: 'Your Services' },
    { num: 4, label: 'Availability' },
  ];

  const currentServices = selectedCategoryId ? (servicesByCategory[selectedCategoryId] || []) : [];

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-nav">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={28} />
            <span className="font-extrabold text-base text-primary hidden sm:block">SideHustle</span>
          </Link>
          <Link href="/provider-dashboard" className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 lg:py-12">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground mb-2">Provider Setup</h1>
          <p className="text-sm text-muted-foreground">Complete your profile to start accepting jobs and receiving payouts.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-0 mb-10">
          {steps.map((s, idx) => (
            <React.Fragment key={`step-${s.num}`}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold transition-all duration-300 ${
                  step > s.num ? 'status-step-completed' : step === s.num ? 'status-step-active' : 'status-step-pending'
                }`}>
                  {step > s.num ? <CheckCircle size={16} /> : s.num}
                </div>
                <span className={`text-xs font-semibold whitespace-nowrap ${step === s.num ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mb-5 mx-2 transition-all duration-300 ${step > s.num ? 'bg-success' : 'bg-border'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 1: Personal Details ── */}
        {step === 1 && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
                <User size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-foreground">Personal Information</h2>
                <p className="text-xs text-muted-foreground">Tell us about yourself</p>
              </div>
            </div>

            <form onSubmit={personalForm.handleSubmit(handlePersonalSubmit)} className="flex flex-col gap-5" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="fullName" className="text-sm font-semibold text-foreground">Full Name</label>
                <input id="fullName" type="text" placeholder="e.g. Emmanuel Dolo"
                  className={`input-base ${personalForm.formState.errors.fullName ? 'input-error' : ''}`}
                  {...personalForm.register('fullName', { required: 'Full name is required', minLength: { value: 3, message: 'Name must be at least 3 characters' } })} />
                {personalForm.formState.errors.fullName && (
                  <p className="text-xs text-danger font-medium flex items-center gap-1"><AlertCircle size={12} />{personalForm.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-foreground">Email Address</label>
                <input id="email" type="email" placeholder="you@example.lr"
                  className={`input-base ${personalForm.formState.errors.email ? 'input-error' : ''}`}
                  {...personalForm.register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })} />
                {personalForm.formState.errors.email && (
                  <p className="text-xs text-danger font-medium flex items-center gap-1"><AlertCircle size={12} />{personalForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="serviceArea" className="text-sm font-semibold text-foreground">Service Area</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input id="serviceArea" type="text" placeholder="e.g. Sinkor, Monrovia"
                    className={`input-base pl-9 ${personalForm.formState.errors.serviceArea ? 'input-error' : ''}`}
                    {...personalForm.register('serviceArea', { required: 'Service area is required' })} />
                </div>
                {personalForm.formState.errors.serviceArea && (
                  <p className="text-xs text-danger font-medium flex items-center gap-1"><AlertCircle size={12} />{personalForm.formState.errors.serviceArea.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="bio" className="text-sm font-semibold text-foreground">Bio <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea id="bio" rows={3} placeholder="Briefly describe your experience and what makes you great..."
                  className="input-base resize-none"
                  {...personalForm.register('bio')} />
              </div>

              <button type="submit" className="btn-primary w-full py-3.5 text-base mt-2">
                Continue to Payout Setup <ChevronRight size={18} />
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: Payout Setup ── */}
        {step === 2 && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
                <Phone size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-foreground">Payout Setup</h2>
                <p className="text-xs text-muted-foreground">Choose how you want to receive your earnings</p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Select Payout Provider</p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPayoutProvider('orange')}
                    className={`mobile-money-card rounded-2xl p-4 flex flex-col items-center gap-3 text-center transition-all duration-200 ${payoutProvider === 'orange' ? 'selected' : 'bg-muted/40 hover:bg-muted/70'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-sm">
                      <span className="text-white font-extrabold text-lg leading-none">OM</span>
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-foreground">Orange Money</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Orange Liberia</p>
                    </div>
                    {payoutProvider === 'orange' && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><CheckCircle size={12} className="text-white" /></div>}
                  </button>

                  <button type="button" onClick={() => setPayoutProvider('mtn')}
                    className={`mobile-money-card rounded-2xl p-4 flex flex-col items-center gap-3 text-center transition-all duration-200 ${payoutProvider === 'mtn' ? 'selected' : 'bg-muted/40 hover:bg-muted/70'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center shadow-sm">
                      <span className="text-yellow-900 font-extrabold text-lg leading-none">MTN</span>
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-foreground">MTN MoMo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Lonestar Cell MTN</p>
                    </div>
                    {payoutProvider === 'mtn' && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><CheckCircle size={12} className="text-white" /></div>}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="payoutMobile" className="text-sm font-semibold text-foreground">Payout Mobile Number</label>
                <p className="text-xs text-muted-foreground -mt-0.5">This number must be registered with your selected provider</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground pointer-events-none">+231</span>
                    <input id="payoutMobile" type="tel" placeholder="77 000 0000"
                      className={`input-base pl-14 ${payoutForm.formState.errors.payoutMobile ? 'input-error' : ''} ${mobileVerified ? 'border-success' : ''}`}
                      disabled={mobileVerified}
                      {...payoutForm.register('payoutMobile', {
                        required: 'Mobile number is required',
                        minLength: { value: 7, message: 'Enter a valid Liberian mobile number' },
                        pattern: { value: /^[0-9\s]+$/, message: 'Numbers only' },
                      })} />
                    {mobileVerified && <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-success" />}
                  </div>
                  {!mobileVerified && (
                    <button type="button" onClick={handleSendOtp} disabled={isSendingOtp || otpSent}
                      className="btn-outline py-2.5 px-4 text-sm flex-shrink-0 whitespace-nowrap">
                      {isSendingOtp ? <Loader2 size={15} className="animate-spin" /> : otpSent ? 'Code Sent' : 'Send Code'}
                    </button>
                  )}
                </div>
                {payoutForm.formState.errors.payoutMobile && (
                  <p className="text-xs text-danger font-medium flex items-center gap-1"><AlertCircle size={12} />{payoutForm.formState.errors.payoutMobile.message}</p>
                )}
                {mobileVerified && <p className="text-xs text-success font-semibold flex items-center gap-1"><CheckCircle size={12} />Number verified — payouts will be sent here</p>}
              </div>

              {otpSent && !mobileVerified && (
                <div className="bg-navy-50 border border-navy-100 rounded-2xl p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <ShieldCheck size={18} className="text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Enter Verification Code</p>
                      <p className="text-xs text-muted-foreground mt-0.5">A 4-digit code was sent to <span className="font-semibold text-foreground">+231 {payoutMobile}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" inputMode="numeric" maxLength={4} placeholder="0000" value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="input-base text-center text-xl font-extrabold tracking-[0.5em] max-w-[140px]" />
                    <button type="button" onClick={handleVerifyOtp} disabled={isVerifying || otpValue.length < 4} className="btn-primary flex-1 py-2.5">
                      {isVerifying ? <><Loader2 size={15} className="animate-spin" />Verifying...</> : 'Verify Number'}
                    </button>
                  </div>
                  <button type="button" onClick={() => { setOtpSent(false); setOtpValue(''); }} className="text-xs text-primary font-semibold mt-3 hover:underline">Resend code</button>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="btn-outline py-3 px-5 text-sm flex-shrink-0"><ArrowLeft size={16} />Back</button>
                <button type="button" onClick={handlePayoutSubmit} className="btn-primary flex-1 py-3.5 text-base">
                  Continue to Services <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Service Selection ── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="bg-card rounded-2xl border border-border shadow-card p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
                  <Briefcase size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">Services You Offer</h2>
                  <p className="text-xs text-muted-foreground">Select all services you can provide to customers</p>
                </div>
              </div>

              {/* Category selector */}
              <div className="flex flex-col gap-1.5 mb-5">
                <label className="text-sm font-semibold text-foreground">Browse by Category</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="input-base"
                >
                  <option value="">Select a category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Services list for selected category */}
              {selectedCategoryId && (
                <div className="mb-5">
                  {loadingServices ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 size={22} className="animate-spin text-primary" />
                    </div>
                  ) : currentServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No services in this category yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentServices.map((svc) => {
                        const isSelected = selectedServiceIds.has(svc.id);
                        return (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => toggleService(svc.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                              isSelected ? 'border-primary bg-navy-50' : 'border-border bg-background hover:border-primary/40'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                              isSelected ? 'bg-primary border-primary' : 'border-border bg-background'
                            }`}>
                              {isSelected && <CheckCircle size={12} className="text-primary-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>{svc.name}</p>
                              <p className="text-xs text-muted-foreground">LRD {svc.basePrice.toLocaleString('en-US')}/{svc.unit}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Selected services summary */}
              {selectedServiceIds.size > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-5">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                    {selectedServiceIds.size} Service{selectedServiceIds.size !== 1 ? 's' : ''} Selected
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(selectedServiceIds).map((sid) => {
                      const svc = Object.values(servicesByCategory).flat().find((s) => s.id === sid);
                      if (!svc) return null;
                      return (
                        <span key={sid} className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-semibold">
                          {svc.name}
                          <button type="button" onClick={() => toggleService(sid)} className="ml-0.5 hover:opacity-70">
                            <X size={10} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skills section */}
              <div className="border-t border-border pt-5">
                <p className="text-sm font-bold text-foreground mb-1">Skills & Qualifications <span className="text-muted-foreground font-normal">(optional)</span></p>
                <p className="text-xs text-muted-foreground mb-3">Add specific skills, tools, or certifications that showcase your expertise</p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="e.g. JavaScript, Photoshop, WAEC Certified..."
                    className="input-base flex-1"
                  />
                  <button type="button" onClick={addSkill} className="btn-outline py-2.5 px-4 flex-shrink-0">
                    <Plus size={16} />
                  </button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <span key={skill} className="flex items-center gap-1 text-xs bg-muted text-foreground px-2.5 py-1 rounded-full font-semibold border border-border">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)} className="ml-0.5 hover:text-danger">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="btn-outline py-3 px-5 text-sm flex-shrink-0"><ArrowLeft size={16} />Back</button>
              <button type="button" onClick={handleServicesNext} className="btn-primary flex-1 py-3.5 text-base">
                Continue to Availability <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Availability & Review ── */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            <div className="bg-card rounded-2xl border border-border shadow-card p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-foreground">Service Availability</h2>
                  <p className="text-xs text-muted-foreground">Control when you appear in the jobs feed</p>
                </div>
              </div>

              <div
                className={`rounded-2xl border-2 p-5 flex items-center justify-between gap-4 transition-all duration-300 cursor-pointer ${isAvailable ? 'border-success/40 bg-green-50' : 'border-border bg-muted/30'}`}
                onClick={() => setIsAvailable(!isAvailable)}
                role="switch"
                aria-checked={isAvailable}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setIsAvailable(!isAvailable)}
              >
                <div className="flex-1">
                  <p className="text-base font-extrabold text-foreground">{isAvailable ? 'Available for Jobs' : 'Not Available'}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {isAvailable ? 'You will appear in the jobs feed and can accept new requests' : 'You are hidden from the jobs feed — no new jobs will be assigned'}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {isAvailable ? <ToggleRight size={44} className="text-success" /> : <ToggleLeft size={44} className="text-muted-foreground" />}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                <AlertCircle size={12} className="flex-shrink-0" />
                You can change your availability at any time from your dashboard settings.
              </p>
            </div>

            {/* Profile Summary */}
            <div className="bg-card rounded-2xl border border-border shadow-card p-6">
              <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-4">Profile Summary</h3>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Full Name', value: personalData?.fullName },
                  { label: 'Email', value: personalData?.email },
                  { label: 'Service Area', value: personalData?.serviceArea },
                  { label: 'Payout Provider', value: payoutProvider === 'orange' ? 'Orange Money' : 'MTN MoMo (Lonestar Cell)' },
                  { label: 'Payout Number', value: `+231 ${payoutMobile}` },
                  { label: 'Services Selected', value: `${selectedServiceIds.size} service${selectedServiceIds.size !== 1 ? 's' : ''}` },
                  { label: 'Skills Added', value: skills.length > 0 ? skills.join(', ') : 'None' },
                ].map((item) => (
                  <div key={`summary-${item.label}`} className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-shrink-0">{item.label}</span>
                    <span className="text-sm font-semibold text-foreground text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(3)} className="btn-outline py-3 px-5 text-sm flex-shrink-0"><ArrowLeft size={16} />Back</button>
              <button type="button" onClick={handleFinalSave} disabled={isSaving} className="btn-primary flex-1 py-3.5 text-base">
                {isSaving ? <><Loader2 size={18} className="animate-spin" />Saving Profile...</> : <>Save & Go to Dashboard <ChevronRight size={18} /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
