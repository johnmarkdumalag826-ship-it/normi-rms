import React, { useState } from 'react';
import {
  Landmark, ArrowLeft, ArrowRight, Eye, EyeOff, GraduationCap, Shield, Users, Briefcase, UserCheck, type LucideIcon,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { login as loginRequest } from '../api/auth';
import { ApiError, clearToken } from '../api/client';
import { Alert, Button, Card, IconButton, Input, roleLabels, roleDescriptions } from '../ui';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  users: User[];
  onBackToLanding: () => void;
}

const roleIcons: Record<UserRole, LucideIcon> = {
  student: GraduationCap,
  adviser: Briefcase,
  panelist: Users,
  coordinator: UserCheck,
  admin: Shield,
};

const roleOrder: UserRole[] = ['student', 'adviser', 'panelist', 'coordinator', 'admin'];

export default function Login({ onLoginSuccess, onBackToLanding }: LoginProps) {
  const [step, setStep] = useState<'choose_role' | 'credentials'>('choose_role');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
    setStep('credentials');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { user } = await loginRequest(email.trim().toLowerCase(), password);

      // The person picked a role on the first screen. If the account belongs to another role,
      // do not sign them in as someone else: end the session and explain.
      if (user.role !== selectedRole) {
        clearToken();
        setError(
          `This account is a ${roleLabels[user.role]} account, not a ${roleLabels[selectedRole]} account. ` +
          `Go back and choose “${roleLabels[user.role]}” to sign in.`,
        );
        return;
      }

      onLoginSuccess(user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 400 || err.status === 401
            ? 'That email or password is not correct. Please check them and try again.'
            : err.message,
        );
      } else {
        setError('We could not reach the server. Please check your internet connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const SelectedIcon = roleIcons[selectedRole];
  const stepNumber = step === 'choose_role' ? 1 : 2;
  const stepName = stepNumber === 1 ? 'Choose your role' : 'Sign in';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-8">
        {/* School name */}
        <div className="text-center space-y-3">
          <button
            type="button"
            onClick={onBackToLanding}
            aria-label="Go back to the home page"
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-md cursor-pointer"
          >
            <Landmark className="h-8 w-8" aria-hidden="true" />
          </button>
          <div>
            <p className="font-serif text-xl font-bold text-navy-900 sm:text-2xl">Northern Mindanao Colleges, Inc.</p>
            <p className="text-sm text-slate-600">Research Management System</p>
          </div>
        </div>

        <p className="text-center text-sm font-semibold text-slate-700" aria-live="polite">
          Step {stepNumber} of 2 · {stepName}
        </p>

        {/* STEP 1: choose a role */}
        {step === 'choose_role' && (
          <section aria-labelledby="choose-role-title" className="space-y-6">
            <div className="text-center">
              <h1 id="choose-role-title" className="text-2xl font-bold text-slate-900">Who are you signing in as?</h1>
              <p className="mt-1 text-base text-slate-600">Choose the option that matches your role. You will sign in on the next screen.</p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {roleOrder.map(role => {
                const Icon = roleIcons[role];
                return (
                  <li key={role}>
                    <button
                      type="button"
                      onClick={() => handleRoleSelect(role)}
                      className="group flex h-full w-full items-start gap-4 rounded-xl border border-slate-300 bg-white p-5 text-left shadow-sm transition hover:border-blue-700 hover:shadow-md cursor-pointer"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                          I am {/^[aeiou]/i.test(roleLabels[role]) ? 'an' : 'a'} {roleLabels[role]}
                          <ArrowRight className="h-4 w-4 text-blue-800 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                        </span>
                        <span className="mt-1 block text-sm text-slate-600">{roleDescriptions[role]}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="text-center">
              <Button variant="ghost" icon={ArrowLeft} onClick={onBackToLanding}>Back to Home Page</Button>
            </div>
          </section>
        )}

        {/* STEP 2: sign in */}
        {step === 'credentials' && (
          <Card className="mx-auto max-w-md space-y-6">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                  <SelectedIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-600">Signing in as</p>
                  <p className="text-base font-bold text-slate-900">{roleLabels[selectedRole]}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setStep('choose_role'); setForgotPassword(false); setError(null); }}
              >
                Change Role
              </Button>
            </div>

            {forgotPassword ? (
              /* Forgot password: there is no automatic email, so we say who can help */
              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Forgot your password?</h1>
                  <p className="mt-1 text-sm text-slate-600">An Admin can set a new password for you.</p>
                </div>
                <Alert tone="info" title="How to get a new password">
                  Contact the research office or your Admin and ask for a password reset.
                  They will give you a new password, and you can sign in with it right away.
                </Alert>
                <Button variant="secondary" icon={ArrowLeft} onClick={() => setForgotPassword(false)}>Go Back to Sign In</Button>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Sign in to your account</h1>
                  <p className="mt-1 text-sm text-slate-600">Use the email and password from the school.</p>
                </div>

                {error && <Alert tone="danger" title="We could not sign you in">{error}</Alert>}

                <Input
                  label="School email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@normi.edu.ph"
                  autoComplete="username"
                />

                <div className="space-y-1">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    adornment={
                      <IconButton
                        icon={showPassword ? EyeOff : Eye}
                        label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(v => !v)}
                        aria-pressed={showPassword}
                      />
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setForgotPassword(true)}
                    className="min-h-11 text-sm font-semibold text-blue-800 hover:underline cursor-pointer"
                  >
                    Forgot your password?
                  </button>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep('choose_role')}>Go Back</Button>
                  <Button type="submit" loading={isSubmitting}>{isSubmitting ? 'Signing In…' : 'Sign In'}</Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
