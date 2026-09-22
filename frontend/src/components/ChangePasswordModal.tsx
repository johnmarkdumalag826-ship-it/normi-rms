import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { changePassword } from '../api/auth';
import { ApiError } from '../api/client';
import { Alert, Button, IconButton, Input, Modal } from '../ui';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onChanged: (user: User) => void;
}

/** Anyone signed in can open this from the header to change their own password whenever they like. */
export function ChangePasswordModal({ open, onClose, onChanged }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswords(false);
    setError(null);
  };

  const close = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

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
      reset();
      onClose();
      onChanged(updated);
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
    <Modal
      open={open}
      onClose={close}
      title="Change My Password"
      description="Type your current password, then choose a new one. Fields marked with * are required."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="change-my-password-form" loading={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save New Password'}
          </Button>
        </>
      }
    >
      <form id="change-my-password-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert tone="danger" title="We could not change your password">{error}</Alert>}
        <Input
          label="Current password"
          type={showPasswords ? 'text' : 'password'}
          required
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          adornment={toggle}
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
      </form>
    </Modal>
  );
}
