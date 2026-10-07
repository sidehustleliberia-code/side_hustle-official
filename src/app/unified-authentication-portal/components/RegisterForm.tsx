'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/types/database';

type UserRoleLocal = 'customer' | 'provider';

interface RegisterFormData {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
  serviceCategory?: string;
}

interface Props {
  role: UserRoleLocal;
  onRoleChange: (role: UserRoleLocal) => void;
  onGoLogin: () => void;
}

const serviceCategories = [
  { value: 'laundry', label: 'Laundry & Wash' },
  { value: 'trades', label: 'Trades & Repairs' },
  { value: 'cleaning', label: 'Home Cleaning' },
  { value: 'delivery', label: 'Errand & Delivery' },
  { value: 'cooking', label: 'Cooking & Catering' },
];

export default function RegisterForm({ role, onRoleChange, onGoLogin }: Props) {
  const router = useRouter();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({ defaultValues: { agreeTerms: false } });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await signUp(data.email, data.password, {
        fullName: data.fullName,
        phone: `+231${data.phone}`,
        role: role as UserRole,
        serviceCategory: data.serviceCategory,
      });
      toast.success(`Account created! Welcome to SideHustle, ${data.fullName.split(' ')[0]}!`);
      await new Promise((res) => setTimeout(res, 400));
      if (role === 'provider') {
        router.push('/provider-onboarding');
      } else {
        // New customers always start with the booking form (first-time experience)
        // After their first booking, /customer-dashboard will become their home
        router.push('/service-request-order-form');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-foreground mb-1.5">Create your account</h2>
        <p className="text-sm text-muted-foreground">Join SideHustle — it&apos;s free to get started</p>
      </div>

      {/* Role Switcher */}
      <div className="bg-muted rounded-xl p-1 flex gap-1">
        {(['customer', 'provider'] as UserRoleLocal[]).map((r) => (
          <button
            key={`reg-role-tab-${r}`}
            type="button"
            onClick={() => onRoleChange(r)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
              role === r
                ? 'bg-card text-primary shadow-card border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {r === 'customer' ? "I'm a Customer" : "I'm a Provider"}
          </button>
        ))}
      </div>

      {/* Role context */}
      <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
        role === 'customer' ? 'bg-gold-50 text-gold-600 border border-gold-100' : 'bg-navy-50 text-primary border border-navy-100'
      }`}>
        {role === 'customer' ? "📦 You'll be able to book and track local services, pay via mobile money." :"💼 You'll receive job requests, complete them, and get paid to your mobile number."}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-name" className="text-sm font-semibold text-foreground">Full Name</label>
          <input
            id="reg-name"
            type="text"
            placeholder="e.g. Fatu Kamara"
            className={`input-base ${errors.fullName ? 'input-error' : ''}`}
            {...register('fullName', {
              required: 'Full name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
          {errors.fullName && <p className="text-xs text-danger font-medium">{errors.fullName.message}</p>}
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-phone" className="text-sm font-semibold text-foreground">Mobile Money Phone Number</label>
          <p className="text-xs text-muted-foreground -mt-0.5">
            {role === 'provider' ? 'This is the number where your payouts will be sent' : 'Used for job updates and payment confirmations'}
          </p>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2.5 bg-muted border border-border rounded-xl text-sm font-semibold text-foreground flex-shrink-0">
              🇱🇷 +231
            </div>
            <input
              id="reg-phone"
              type="tel"
              placeholder="770 123 456"
              className={`input-base flex-1 ${errors.phone ? 'input-error' : ''}`}
              {...register('phone', {
                required: 'Phone number is required',
                pattern: { value: /^[0-9]{8,9}$/, message: 'Enter a valid Liberian mobile number' },
              })}
            />
          </div>
          {errors.phone && <p className="text-xs text-danger font-medium">{errors.phone.message}</p>}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-email" className="text-sm font-semibold text-foreground">Email Address</label>
          <input
            id="reg-email"
            type="email"
            placeholder="you@example.lr"
            className={`input-base ${errors.email ? 'input-error' : ''}`}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
            })}
          />
          {errors.email && <p className="text-xs text-danger font-medium">{errors.email.message}</p>}
        </div>

        {/* Service Category — Provider only */}
        {role === 'provider' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reg-service" className="text-sm font-semibold text-foreground">Primary Service Category</label>
            <p className="text-xs text-muted-foreground -mt-0.5">You can add more services later from your profile</p>
            <select
              id="reg-service"
              className={`input-base ${errors.serviceCategory ? 'input-error' : ''}`}
              {...register('serviceCategory', {
                required: role === 'provider' ? 'Please select your primary service' : false,
              })}
            >
              <option value="">Select a service category</option>
              {serviceCategories.map((cat) => (
                <option key={`cat-${cat.value}`} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            {errors.serviceCategory && <p className="text-xs text-danger font-medium">{errors.serviceCategory.message}</p>}
          </div>
        )}

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-password" className="text-sm font-semibold text-foreground">Password</label>
          <p className="text-xs text-muted-foreground -mt-0.5">Minimum 8 characters with at least one number</p>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              className={`input-base pr-11 ${errors.password ? 'input-error' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
                pattern: { value: /(?=.*[0-9])/, message: 'Password must contain at least one number' },
              })}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-danger font-medium">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-confirm" className="text-sm font-semibold text-foreground">Confirm Password</label>
          <div className="relative">
            <input
              id="reg-confirm"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Re-enter your password"
              className={`input-base pr-11 ${errors.confirmPassword ? 'input-error' : ''}`}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}>
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-danger font-medium">{errors.confirmPassword.message}</p>}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2.5">
          <input
            id="reg-terms"
            type="checkbox"
            className="w-4 h-4 mt-0.5 rounded border-border accent-primary cursor-pointer flex-shrink-0"
            {...register('agreeTerms', { required: 'You must agree to the terms' })}
          />
          <label htmlFor="reg-terms" className="text-sm text-muted-foreground cursor-pointer select-none leading-relaxed">
            I agree to SideHustle&apos;s{' '}
            <span className="text-primary font-semibold">Terms of Service</span> and{' '}
            <span className="text-primary font-semibold">Privacy Policy</span>
          </label>
        </div>
        {errors.agreeTerms && <p className="text-xs text-danger font-medium -mt-2">{errors.agreeTerms.message}</p>}

        {/* Submit */}
        <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5 text-base mt-1">
          {isLoading ? (
            <><Loader2 size={18} className="animate-spin" /> Creating Account...</>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{' '}
        <button type="button" onClick={onGoLogin} className="text-primary font-semibold hover:underline">
          Sign in
        </button>
      </p>
    </div>
  );
}