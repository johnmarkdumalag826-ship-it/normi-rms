import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Pencil } from 'lucide-react';
import { User } from '../types';
import { changePassword, updateMyProfile } from '../api/auth';
import { ApiError } from '../api/client';
import { Alert, Avatar, Badge, Button, IconButton, Input, Modal, roleLabels, userStatus, StatusBadge } from '../ui';

interface MyProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
  departments: { id: string; name: string; code: string }[];
  courses: { id: string; name: string; code: string }[];
  onProfileUpdated: (user: User) => void;
  onPasswordChanged: (user: User) => void;
}

/**
 * "Who am I" plus account settings, opened from the header for anyone, in any role.
 * You can edit your own name and phone number here, and change your password — nobody
 * else, not even an Admin, can do either of those for you. Email, role, department,
 * course and account status stay admin-only (Manage Accounts).
 */
export function MyProfileModal({
  open, onClose, user, departments, courses, onProfileUpdated, onPasswordChanged,
}: MyProfileModalProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const department = departments.find(d => d.id === user.departmentId)?.name;
  const course = courses.find(c => c.id === user.courseId)?.name;

  const rows: [string, React.ReactNode][] = [
    ['Role', <Badge key="role" tone="info">{roleLabels[user.role]}</Badge>],
    ...(department ? ([['Department', department]] as [string, React.ReactNode][]) : []),
    ...(course ? ([['Course', course]] as [string, React.ReactNode][]) : []),
    ...(user.phone ? ([['Phone', user.phone]] as [string, React.ReactNode][]) : []),
    ['Account', <StatusBadge key="status" info={userStatus[user.status] ?? userStatus.active} />],
  ];

  const startEditingProfile = () => {
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setProfileError(null);
    setIsEditingProfile(true);
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
    setProfileError(null);
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswords(false);
    setPasswordError(null);
  };

  const isBusy = isSavingProfile || isSavingPassword;

  const close = () => {
    if (isBusy) return;
    setIsEditingProfile(false);
    setShowPasswordForm(false);
    resetPasswordForm();
    onClose();
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    if (!editName.trim()) {
      setProfileError('Please enter your name.');
      return;
    }
    setIsSavingProfile(true);
    try {
      const updated = await updateMyProfile({ name: editName.trim(), phone: editPhone.trim() });
      setIsEditingProfile(false);
      onProfileUpdated(updated);
    } catch (err) {
      setProfileError(
        err instanceof ApiError
          ? err.message
          : 'We could not reach the server. Please check your internet connection and try again.',
      );
    } finally {
      setIsSavingProfile(false);
    }
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
    setIsSavingPassword(true);
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
      setIsSavingPassword(false);
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
      footer={<Button variant="secondary" onClick={close} disabled={isBusy}>Close</Button>}
    >
      <div className="space-y-5">
        {!isEditingProfile ? (
          <>
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Avatar name={user.name} src={user.avatar} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-slate-900">{user.name}</p>
                <p className="break-all text-sm text-slate-700">{user.email}</p>
              </div>
              <IconButton icon={Pencil} label="Edit my profile" onClick={startEditingProfile} />
            </div>

            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 p-3">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="text-right font-semibold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <form onSubmit={handleProfileSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Pencil className="h-4 w-4 text-blue-800" aria-hidden="true" />
              Edit My Profile
            </h3>
            {profileError && <Alert tone="danger" title="We could not save your profile">{profileError}</Alert>}
            <Input
              label="Full name"
              required
              value={editName}
              onChange={e => setEditName(e.target.value)}
              autoComplete="name"
            />
            <Input
              label="Phone"
              type="tel"
              optional
              value={editPhone}
              onChange={e => setEditPhone(e.target.value)}
              placeholder="e.g. 0917 123 4567"
              autoComplete="tel"
            />
            <p className="text-xs text-slate-600">
              Your email, role, department and course are set by an Admin, not from here.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" disabled={isSavingProfile} onClick={cancelEditingProfile}>
                Cancel
              </Button>
              <Button type="submit" loading={isSavingProfile}>{isSavingProfile ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </form>
        )}

        {!isEditingProfile && (
          !showPasswordForm ? (
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
                  disabled={isSavingPassword}
                  onClick={() => { setShowPasswordForm(false); resetPasswordForm(); }}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={isSavingPassword}>{isSavingPassword ? 'Saving…' : 'Save New Password'}</Button>
              </div>
            </form>
          )
        )}
      </div>
    </Modal>
  );
}
