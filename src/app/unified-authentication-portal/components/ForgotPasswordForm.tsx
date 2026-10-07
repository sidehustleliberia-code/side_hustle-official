'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ForgotFormData {
  email: string;
}

interface Props {
  onGoLogin: () => void;
}

export default function ForgotPasswordForm({ onGoLogin }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>();

  const onSubmit = async (data: ForgotFormData) => {
    setIsLoading(true);
    // BACKEND INTEGRATION: POST /api/auth/forgot-password with { email }
    await new Promise((res) => setTimeout(res, 1200));
    setSubmittedEmail(data.email);
    setSubmitted(true);
    setIsLoading(false);
    toast.success('Reset link sent! Check your email.');
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-6 text-center py-4">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle size={32} className="text-success" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We&apos;ve sent a password reset link to{' '}
            <span className="font-semibold text-foreground">{submittedEmail}</span>.
            The link expires in 30 minutes.
          </p>
        </div>
        <div className="w-full p-4 bg-muted/60 rounded-xl text-sm text-muted-foreground text-left">
          <p className="font-semibold text-foreground mb-1">Didn&apos;t receive it?</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the correct email</li>
            <li>Allow up to 5 minutes for delivery</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={onGoLogin}
          className="btn-primary w-full py-3.5"
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back button */}
      <button
        type="button"
        onClick={onGoLogin}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors self-start"
      >
        <ArrowLeft size={16} />
        Back to Sign In
      </button>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-foreground mb-1.5">Reset your password</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Enter the email address on your SideHustle account and we&apos;ll send you a secure reset link.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="forgot-email" className="text-sm font-semibold text-foreground">
            Email Address
          </label>
          <input
            id="forgot-email"
            type="email"
            placeholder="you@example.lr"
            className={`input-base ${errors.email ? 'input-error' : ''}`}
            {...register('email', {
              required: 'Email address is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Enter a valid email address',
              },
            })}
          />
          {errors.email && (
            <p className="text-xs text-danger font-medium">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3.5 text-base"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Sending Reset Link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>
    </div>
  );
}