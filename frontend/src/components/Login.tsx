import React, { useState } from 'react';
import {
  Landmark, ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle2, GraduationCap, Shield, Users,
  Briefcase, UserCheck, type LucideIcon,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { login as loginRequest } from '../api/auth';
import { ApiError } from '../api/client';
import { Alert, Button, Card, IconButton, Input, roleLabels, roleDescriptions } from '../ui';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  users: User[];
  onBackToLanding: () => void;
}

interface RoleConfig {
  role: UserRole;
  email: string;
  password: string;
  icon: LucideIcon;
}

const rolesConfig: RoleConfig[] = [
  { role: 'student', email: 'student@normi.edu.ph', password: 'student123', icon: GraduationCap },
  { role: 'adviser', email: 'adviser@normi.edu.ph', password: 'adviser123', icon: Briefcase },
  { role: 'panelist', email: 'panel@normi.edu.ph', password: 'panel123', icon: Users },
  { role: 'coordinator', email: 'coordinator@normi.edu.ph', password: 'coord123', icon: UserCheck },
  { role: 'admin', email: 'admin@normi.edu.ph', password: 'admin123', icon: Shield },
];

export default function Login({ onLoginSuccess, users, onBackToLanding }: LoginProps) {
  const [step, setStep] = useState<'choose_role' | 'credentials'>('choose_role');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('student@normi.edu.ph');
  const [password, setPassword] = useState('student123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Confirmation-code step
  const [otpStage, setOtpStage] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleRoleSelect = (role: UserRole) => {
    const config = rolesConfig.find(r => r.role === role);
    if (config) {
      setSelectedRole(role);
      setEmail(config.email);
      setPassword(config.password);
      setError(null);
      setStep('credentials');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { user } = await loginRequest(email.trim().toLowerCase(), password);
      // The confirmation step below is a screen-only gate: the real sign-in (password
      // check and session) already happened in loginRequest() above.
      setPendingUser(user);
      setOtpStage(true);
      setOtpError(false);
      setOtpCode(['', '', '', '']);
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

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otpCode.join('');

    if (fullCode.length < 4) {
      setOtpError(true);
      return;
    }

    setOtpVerified(true);
    setTimeout(() => {
      if (pendingUser) {
        onLoginSuccess(pendingUser);
      }
    }, 1000);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1);
    setOtpCode(newOtp);
    setOtpError(false);

    // Move to the next box automatically
    if (value !== '' && index < 3) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otpCode[index] === '' && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetSent(true);
    setTimeout(() => {
      setResetSent(false);
      setForgotPassword(false);
    }, 4000);
  };

  const currentRoleConfig = rolesConfig.find(r => r.role === selectedRole) || rolesConfig[0];
  const SelectedIcon = currentRoleConfig.icon;

  // "Step 1 of 3" etc. so people always know where they are.
  const stepNumber = step === 'choose_role' ? 1 : otpStage ? 3 : 2;
  const stepName = stepNumber === 1 ? 'Choose your role' : stepNumber === 2 ? 'Sign in' : 'Confirm it is you';

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
          Step {stepNumber} of 3 · {stepName}
        </p>

        {/* STEP 1: choose a role */}
        {step === 'choose_role' && (
          <section aria-labelledby="choose-role-title" className="space-y-6">
            <div className="text-center">
              <h1 id="choose-role-title" className="text-2xl font-bold text-slate-900">Who are you signing in as?</h1>
              <p className="mt-1 text-base text-slate-600">Choose the option that matches your role. You will sign in on the next screen.</p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {rolesConfig.map(item => {
                const Icon = item.icon;
                return (
                  <li key={item.role}>
                    <button
                      type="button"
                      onClick={() => handleRoleSelect(item.role)}
                      className="group flex h-full w-full items-start gap-4 rounded-xl border border-slate-300 bg-white p-5 text-left shadow-sm transition hover:border-blue-700 hover:shadow-md cursor-pointer"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                          I am {/^[aeiou]/i.test(roleLabels[item.role]) ? 'an' : 'a'} {roleLabels[item.role]}
                          <ArrowRight className="h-4 w-4 text-blue-800 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                        </span>
                        <span className="mt-1 block text-sm text-slate-600">{roleDescriptions[item.role]}</span>
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

        {/* STEP 2 and 3 */}
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
              <Button variant="secondary" size="sm" onClick={() => { setStep('choose_role'); setOtpStage(false); setForgotPassword(false); }}>
                Change Role
              </Button>
            </div>

            {forgotPassword ? (
              /* Forgot password */
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Forgot your password?</h1>
                  <p className="mt-1 text-sm text-slate-600">Enter your school email so the office knows who needs help.</p>
                </div>

                {resetSent ? (
                  <Alert tone="info" title="Your request is noted">
                    In this demo version, no email is sent. Please ask your Admin to reset your password for you.
                  </Alert>
                ) : (
                  <>
                    <Input label="School email" type="email" required placeholder="name@normi.edu.ph" autoComplete="email" />
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <Button variant="secondary" onClick={() => setForgotPassword(false)}>Go Back to Sign In</Button>
                      <Button type="submit">Ask for Password Help</Button>
                    </div>
                  </>
                )}
              </form>
            ) : otpStage ? (
              /* Step 3: confirm it is you */
              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div className="space-y-2 text-center">
                  <h1 className="text-xl font-bold text-slate-900">Confirm it is you</h1>
                  <p className="text-sm text-slate-700">
                    Enter a 4-digit code to finish signing in as <strong>{pendingUser?.email}</strong>.
                  </p>
                </div>

                <Alert tone="info" title="Demo mode">
                  No email is sent in this version. Type any 4 digits, for example 1234.
                </Alert>

                {otpVerified ? (
                  <div role="status" className="space-y-2 py-4 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" aria-hidden="true" />
                    <p className="text-lg font-bold text-emerald-800">You are signed in</p>
                    <p className="text-sm text-slate-600">Opening your page…</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <fieldset>
                      <legend className="sr-only">4-digit code</legend>
                      <div className="flex justify-center gap-3">
                        {otpCode.map((val, idx) => (
                          <input
                            key={idx}
                            id={`otp-${idx}`}
                            type="text"
                            maxLength={1}
                            pattern="[0-9]*"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            aria-label={`Digit ${idx + 1} of 4`}
                            aria-invalid={otpError || undefined}
                            value={val}
                            onChange={e => handleOtpChange(idx, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(idx, e)}
                            className={`h-14 w-14 rounded-xl border-2 text-center text-2xl font-bold text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30 ${otpError ? 'border-rose-600' : 'border-slate-300'}`}
                          />
                        ))}
                      </div>
                    </fieldset>

                    {otpError && (
                      <p role="alert" className="text-center text-sm font-medium text-rose-800">
                        Please fill in all 4 digits.
                      </p>
                    )}

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                      <Button variant="secondary" onClick={() => setOtpStage(false)}>Go Back</Button>
                      <Button type="submit">Confirm and Continue</Button>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              /* Step 2: email and password */
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
                  placeholder={`${selectedRole}@normi.edu.ph`}
                  autoComplete="email"
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

                <Alert tone="info" title="Demo account">
                  We filled in a sample {roleLabels[selectedRole]} account for you ({currentRoleConfig.email}).
                  Just press “Sign In”.
                </Alert>

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
