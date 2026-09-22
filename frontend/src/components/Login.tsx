import React, { useState } from 'react';
import { Landmark, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { User, UserRole } from '../types';
import { login as loginRequest, signUp } from '../api/auth';
import { ApiError } from '../api/client';
import { Alert, Button, Card, IconButton, Input, Select, roleDescriptions, roleLabels } from '../ui';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

// Admin accounts are never made here: they are created by the school's technical team.
type SignUpRole = Exclude<UserRole, 'admin'>;
const signUpRoles: SignUpRole[] = ['student', 'adviser', 'panelist', 'coordinator'];

type Screen = 'sign-in' | 'sign-up' | 'sent' | 'forgot';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [screen, setScreen] = useState<Screen>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<SignUpRole>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goTo = (next: Screen) => {
    setScreen(next);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  };

  const networkMessage = 'We could not reach the server. Please check your internet connection and try again.';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { user } = await loginRequest(email.trim().toLowerCase(), password);
      onLoginSuccess(user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 400 || err.status === 401
            ? 'That email or password is not correct. Please check them and try again. If you have not registered yet, choose “Register”.'
            : err.message,
        );
      } else {
        setError(networkMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The two passwords are not the same. Please type them again.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp({ name: name.trim(), email: email.trim().toLowerCase(), password, role });
      setScreen('sent');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : networkMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordToggle = (
    <IconButton
      icon={showPassword ? EyeOff : Eye}
      label={showPassword ? 'Hide password' : 'Show password'}
      onClick={() => setShowPassword(v => !v)}
      aria-pressed={showPassword}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8">
        {/* School name */}
        <div className="text-center space-y-3">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-md">
            <Landmark className="h-8 w-8" aria-hidden="true" />
          </span>
          <div>
            <p className="font-serif text-xl font-bold text-navy-900 sm:text-2xl">Northern Mindanao Colleges, Inc.</p>
            <p className="text-sm text-slate-600">Research Management System</p>
          </div>
        </div>

        <Card className="space-y-6">
          {screen === 'sign-in' && (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Sign in to your account</h1>
                <p className="mt-1 text-sm text-slate-600">Type your email and password.</p>
              </div>

              {error && <Alert tone="danger" title="We could not sign you in">{error}</Alert>}

              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
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
                  adornment={passwordToggle}
                />
                <button
                  type="button"
                  onClick={() => goTo('forgot')}
                  className="min-h-11 text-sm font-semibold text-blue-800 hover:underline cursor-pointer"
                >
                  Forgot your password?
                </button>
              </div>

              <Button type="submit" className="w-full" loading={isSubmitting}>{isSubmitting ? 'Signing In…' : 'Sign In'}</Button>

              <p className="border-t border-slate-200 pt-4 text-center text-sm text-slate-700">
                Not registered yet?{' '}
                <button type="button" onClick={() => goTo('sign-up')} className="min-h-11 font-semibold text-blue-800 hover:underline cursor-pointer">
                  Register
                </button>
              </p>
            </form>
          )}

          {screen === 'sign-up' && (
            <form onSubmit={handleSignUp} className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Register</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Fill in your details. An Admin will check and approve your registration, and then you can sign in.
                </p>
              </div>

              {error && <Alert tone="danger" title="We could not register you">{error}</Alert>}

              <Input
                label="Full name"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Juan Dela Cruz"
                autoComplete="name"
              />
              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="username"
              />
              <Select
                label="I am a…"
                value={role}
                onChange={e => setRole(e.target.value as SignUpRole)}
                hint={roleDescriptions[role]}
              >
                {signUpRoles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
              </Select>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                hint="At least 8 characters."
                autoComplete="new-password"
                adornment={passwordToggle}
              />
              <Input
                label="Type the password again"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />

              <Button type="submit" className="w-full" loading={isSubmitting}>{isSubmitting ? 'Registering…' : 'Register'}</Button>

              <p className="border-t border-slate-200 pt-4 text-center text-sm text-slate-700">
                Already registered?{' '}
                <button type="button" onClick={() => goTo('sign-in')} className="min-h-11 font-semibold text-blue-800 hover:underline cursor-pointer">
                  Sign in
                </button>
              </p>
            </form>
          )}

          {screen === 'sent' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">You are registered</h1>
                <p className="mt-1 text-sm text-slate-600">Thank you, {name.trim() || 'friend'}.</p>
              </div>
              <Alert tone="success" title="What happens next">
                An Admin needs to approve your registration first. When it is approved, come back to this page and sign in with
                the email and password you just chose.
              </Alert>
              <Button className="w-full" onClick={() => goTo('sign-in')}>Go to Sign In</Button>
            </div>
          )}

          {screen === 'forgot' && (
            /* There is no automatic email, so we say who can help. An Admin cannot see or choose your
               password — they can only start a reset, which gives them a one-time code to hand you. */
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Forgot your password?</h1>
                <p className="mt-1 text-sm text-slate-600">An Admin can help you get back in.</p>
              </div>
              <Alert tone="info" title="How to get back in">
                Contact the research office or your Admin and ask for a password reset. They will give you
                a one-time code. Sign in with it here, using your usual email — you will then be asked to
                choose your own new password right away. Nobody else will know it.
              </Alert>
              <Button variant="secondary" icon={ArrowLeft} onClick={() => goTo('sign-in')}>Go Back to Sign In</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
