import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { User } from '../types';
import { changePassword } from '../api/auth';
import { ApiError } from '../api/client';
import { Alert, Avatar, Badge, Button, IconButton, Input, Modal, roleLabels, userStatus, StatusBadge } from '../ui';

interface MyProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
  departments: { id: string; name: string; code: string }[];
  courses: { id: string; name: string; code: string }[];
  onPasswordChanged: (user: User) => void;
}

/**
 * "Who am I" plus account settings, opened from the header for anyone, in any role.
 * Changing your password lives here too — nobody else can ever set it for you.
 */
export function MyProfileModal({ open, onClose, user, departments, courses, onPasswordChanged }: MyProfileModalProps) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const department = departments.find(d => d.id === user.departmentId)?.name;
  const course = courses.find(c => c.id === user.courseId)?.name;

  const rows: [string, React.ReactNode][] = [
    ['Role', <Badge key="role" tone="info">{roleLabels[user.role]}</Badge>],
    ...(department ? ([['Department', department]] as [string, React.ReactNode][]) : []),
    ...(course ? ([['Course', course]] as [string, React.ReactNode][]) : []),
    ...(user.phone ? ([['Phone', user.phone]] as [string, React.ReactNode][]) : []),
    ['Account', <StatusBadge key="status" info={userStatus[user.status] ?? userStatus.active} />],
  ];

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswords(false);
    setPasswordError(null);
  };

  const close = () => {
    if (isSubmitting) return;
    setShowPasswordForm(false);
    resetPasswordForm();
    onClose();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('Your new password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The two new passwords are not the same. Please type them again.');
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await changePassword(currentPassword, newPassword);
      resetPasswordForm();
      setShowPasswordForm(false);
      onPasswordChanged(updated);
    } catch (err) {
      setPasswordError(
        err instanceof ApiError
          ? err.message
          : 'We could not reach the server. Please check your internet connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordToggle = (
    <IconButton
      icon={showPasswords ? EyeOff : Eye}
      label={showPasswords ? 'Hide passwords' : 'Show passwords'}
      onClick={() => setShowPasswords(v => !v)}
      aria-pressed={showPasswords}
    />
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title="Profile & Settings"
      size="sm"
      footer={<Button variant="secondary" onClick={close} disabled={isSubmitting}>Close</Button>}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <Avatar name={user.name} src={user.avatar} size="lg" />
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900">{user.name}</p>
            <p className="break-all text-sm text-slate-700">{user.email}</p>
          </div>
        </div>

        <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 p-3">
              <dt className="text-slate-600">{label}</dt>
              <dd className="text-right font-semibold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        {!showPasswordForm ? (
          <Button variant="secondary" icon={KeyRound} fullWidth onClick={() => setShowPasswordForm(true)}>
            Change Password
          </Button>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <KeyRound className="h-4 w-4 text-blue-800" aria-hidden="true" />
              Change Password
            </h3>
            {passwordError && <Alert tone="danger" title="We could not change your password">{passwordError}</Alert>}
            <Input
              label="Current password"
              type={showPasswords ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              adornment={passwordToggle}
            />
            <Input
              label="New password"
              type={showPasswords ? 'text' : 'password'}
              required
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              hint="At least 8 characters."
              autoComplete="new-password"
            />
            <Input
              label="Type the new password again"
              type={showPasswords ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => { setShowPasswordForm(false); resetPasswordForm(); }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save New Password'}</Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
