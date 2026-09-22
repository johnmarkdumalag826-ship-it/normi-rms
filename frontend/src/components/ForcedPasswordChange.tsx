import React, { useState } from 'react';
import { Landmark, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { changePassword } from '../api/auth';
import { ApiError } from '../api/client';
import { Alert, Button, Card, IconButton, Input } from '../ui';

interface ForcedPasswordChangeProps {
  user: User;
  onDone: (user: User) => void;
  onSignOut: () => void;
}

/**
 * Shown instead of the whole app right after an Admin starts a password reset for this account
 * (see userController.forcePasswordReset). The one-time code the Admin gave them works as their
 * "current password" here, and this is the only place they can pick their own new one.
 */
export default function ForcedPasswordChange({ user, onDone, onSignOut }: ForcedPasswordChangeProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('Your new password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two new passwords are not the same. Please type them again.');
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await changePassword(currentPassword, newPassword);
      onDone(updated);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'We could not reach the server. Please check your internet connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggle = (
    <IconButton
      icon={showPasswords ? EyeOff : Eye}
      label={showPasswords ? 'Hide passwords' : 'Show passwords'}
      onClick={() => setShowPasswords(v => !v)}
      aria-pressed={showPasswords}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8">
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
          <div>
            <h1 className="text-xl font-bold text-slate-900">Set a new password</h1>
            <p className="mt-1 text-sm text-slate-600">
              Hi {user.name}. An Admin started a password reset for your account. Enter the one-time code
              they gave you, then choose your own new password. Nobody else will know it.
            </p>
          </div>

          {error && <Alert tone="danger" title="We could not save your new password">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="One-time code from your Admin"
              type={showPasswords ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              adornment={toggle}
            />
            <Input
              label="Your new password"
              type={showPasswords ? 'text' : 'password'}
              required
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              hint="At least 8 characters."
              autoComplete="new-password"
            />
            <Input
              label="Type it again"
              type={showPasswords ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Button type="submit" className="w-full" loading={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save My New Password'}
            </Button>
          </form>

          <button
            type="button"
            onClick={onSignOut}
            className="mx-auto block min-h-11 text-sm font-semibold text-slate-600 hover:underline cursor-pointer"
          >
            Sign out instead
          </button>
        </Card>
      </div>
    </div>
  );
}
