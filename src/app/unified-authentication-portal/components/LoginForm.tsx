'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type UserRole = 'customer' | 'provider';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const demoCredentials = [
  {
    role: 'customer' as UserRole,
    roleLabel: 'Customer',
    email: 'fatu.kamara@sidehustle.lr',
    password: 'Customer@2026',
  },
  {
    role: 'provider' as UserRole,
    roleLabel: 'Provider',
    email: 'emmanuel.dolo@sidehustle.lr',
    password: 'Provider@2026',
  },
];

interface Props {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  onForgotPassword: () => void;
  onGoRegister: () => void;
}

export default function LoginForm({ role, onRoleChange, onForgotPassword, onGoRegister }: Props) {
  const router = useRouter();
  const { signIn, profile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUseCredential = (cred: typeof demoCredentials[0]) => {
    onRoleChange(cred.role);
    setValue('email', cred.email);
    setValue('password', cred.password);
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await signIn(data.email, data.password);
      const userRole = result?.user?.user_metadata?.role || 'customer';
      toast.success('Welcome back! Signing you in...');

      // Check for a redirect parameter (set by middleware when unauthenticated user
      // tries to access a protected route like /customer-dashboard)
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect');

      if (userRole === 'admin') {
        router.push('/admin');
      } else if (userRole === 'provider') {
        router.push('/provider-dashboard');
      } else if (redirectTo && redirectTo.startsWith('/')) {
        // Honor the original destination (e.g., /customer-dashboard)
        router.push(redirectTo);
      } else {
        // Customer routing: returning customers go to their dashboard,
        // first-time customers go to the booking form.
        // We check order history after login to determine the right destination.
        router.push('/customer-dashboard');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-foreground mb-1.5">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Sign in to your SideHustle account</p>
      </div>

      {/* Role Switcher */}
      <div className="bg-muted rounded-xl p-1 flex gap-1">
        {(['customer', 'provider'] as UserRole[]).map((r) => (
          <button
            key={`role-tab-${r}`}
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

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-sm font-semibold text-foreground">
            Email Address
          </label>
          <p className="text-xs text-muted-foreground -mt-0.5">
            {role === 'customer' ? 'The email you registered with' : 'Your provider account email'}
          </p>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.lr"
            className={`input-base ${errors.email ? 'input-error' : ''}`}
            {...register('email', {
              required: 'Email is required',
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

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-semibold text-foreground">
              Password
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              className={`input-base pr-11 ${errors.password ? 'input-error' : ''}`}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-danger font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-2.5">
          <input
            id="login-remember"
            type="checkbox"
            className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
            {...register('rememberMe')}
          />
          <label htmlFor="login-remember" className="text-sm text-muted-foreground cursor-pointer select-none">
            Remember me for 30 days
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3.5 text-base mt-1"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Demo Credentials */}
      <div className="bg-navy-50 border border-navy-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
          ⚠️ TEST ACCOUNTS ONLY
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          These are development test accounts. Do not use in production.
        </p>
        <div className="flex flex-col gap-2">
          {demoCredentials.map((cred) => (
            <div
              key={`demo-cred-${cred.role}`}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                role === cred.role
                  ? 'bg-card border-primary/30 shadow-sm'
                  : 'bg-white/60 border-border hover:border-primary/20'
              }`}
              onClick={() => handleUseCredential(cred)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleUseCredential(cred)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    cred.role === 'customer' ? 'bg-secondary/20 text-gold-600' : 'bg-navy-100 text-primary'
                  }`}>
                    {cred.roleLabel}
                  </span>
                </div>
                <p className="text-xs text-foreground font-medium truncate">{cred.email}</p>
                <p className="text-xs text-muted-foreground">{cred.password}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0 ml-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleCopy(cred.email, `${cred.role}-email`); }}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Copy email"
                >
                  {copiedField === `${cred.role}-email` ? (
                    <Check size={13} className="text-success" />
                  ) : (
                    <Copy size={13} className="text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Admin: admin@sidehustle.lr / Admin@2026
        </p>
      </div>

      {/* Register link */}
      <p className="text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onGoRegister}
          className="text-primary font-semibold hover:underline"
        >
          Create one
        </button>
      </p>
    </div>
  );
}