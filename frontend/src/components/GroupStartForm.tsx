import React, { useState } from 'react';
import { Users, LogOut, Send } from 'lucide-react';
import { User } from '../types';
import { Alert, Avatar, Badge, BrandLogo, Button, Card, ConfirmDialog, Input, Select, roleLabels } from '../ui';

interface GroupStartFormProps {
  user: User;
  advisers: User[];
  onSubmit: (data: { groupName: string; adviserId: string; members: string[] }) => void;
  onLogout: () => void;
  onOpenProfile: () => void;
}

/**
 * The first thing a student sees: tell us about your group, choose your adviser and type the
 * names of the other members. The research title, summary and main document come later, as the
 * title proposal, after the title hearing.
 */
export default function GroupStartForm({ user, advisers, onSubmit, onLogout, onOpenProfile }: GroupStartFormProps) {
  const [groupName, setGroupName] = useState('');
  const [adviserId, setAdviserId] = useState('');
  const [memberNames, setMemberNames] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const groupError = attempted && !groupName.trim() ? 'Please type a name for your group.' : undefined;
  const adviserError = attempted && !adviserId ? 'Please choose your adviser.' : undefined;
  const adviserName = advisers.find(a => a.id === adviserId)?.name ?? '—';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (!groupName.trim() || !adviserId) return;
    setConfirming(true);
  };

  const submitConfirmed = () => {
    onSubmit({
      groupName: groupName.trim(),
      adviserId,
      members: memberNames.split(',').map(m => m.trim()).filter(Boolean),
    });
    setConfirming(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo className="h-11 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="font-serif text-lg font-bold text-navy-900">NORMI</p>
              <p className="hidden text-xs text-slate-600 sm:block">Research Management System</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex min-h-11 items-center gap-2 rounded-lg p-1 hover:bg-slate-100 cursor-pointer"
              aria-label={`Open your profile and settings (${user.name}, ${roleLabels[user.role]})`}
            >
              <div className="hidden sm:block text-right min-w-0">
                <p className="max-w-32 truncate text-sm font-semibold text-slate-900">{user.name}</p>
                <Badge tone="info">{roleLabels[user.role]}</Badge>
              </div>
              <Avatar name={user.name} src={user.avatar} size="md" />
            </button>
            <Button variant="ghost" size="sm" icon={LogOut} onClick={onLogout}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Start with your group</h1>
          <p className="text-base text-slate-600">
            Welcome, {user.name}. Tell us about your group and choose your adviser. You will send your prepared titles for the
            title hearing next, and your research title later.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <p className="text-sm text-slate-600">Fields marked with * are required.</p>

            {attempted && (groupError || adviserError) && (
              <Alert tone="danger" title="Please check the form">Some details are missing. Please fix the fields marked in red.</Alert>
            )}

            <Input
              label="Group name"
              required
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              hint="A name for your group, for example “Team Alpha”."
              placeholder="e.g. Team Alpha"
              maxLength={100}
              error={groupError}
            />

            <Select
              label="Your adviser"
              required
              value={adviserId}
              onChange={e => setAdviserId(e.target.value)}
              hint="The teacher who will guide your group."
              error={adviserError}
            >
              <option value="">Choose your adviser…</option>
              {advisers.map(adv => (
                <option key={adv.id} value={adv.id}>{adv.name}</option>
              ))}
            </Select>

            <div className="space-y-2">
              <Input
                label="Other students in your group"
                optional
                value={memberNames}
                onChange={e => setMemberNames(e.target.value)}
                hint="Type their names separated by commas. Do not type your own name."
                placeholder="e.g. Juan dela Cruz, Maria Santos"
              />
              <p className="flex items-start gap-2 text-sm text-slate-700">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                <span>You (<strong>{user.name}</strong>) are added automatically as the group leader.</span>
              </p>
            </div>

            <div className="flex justify-end border-t border-slate-200 pt-5">
              <Button type="submit" icon={Send}>Register My Group</Button>
            </div>
          </form>
        </Card>
      </main>

      <ConfirmDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={submitConfirmed}
        title="Register your group?"
        message={`“${groupName.trim()}” will be registered with ${adviserName} as your adviser.`}
        confirmLabel="Yes, Register My Group"
        cancelLabel="No, Let Me Check"
      />
    </div>
  );
}
