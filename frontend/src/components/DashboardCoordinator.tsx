import React, { useState } from 'react';
import {
  Users, CheckCircle2, Calendar, Megaphone, Trash2, Send, FileText, Compass, Pin,
} from 'lucide-react';
import { User, Research, Announcement, Room } from '../types';
import {
  Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, IconButton, Input, PageHeader, Select, Textarea,
  announcementCategory, cx, formatDateLong,
} from '../ui';

interface DashboardCoordinatorProps {
  user: User;
  researchList: Research[];
  announcements: Announcement[];
  rooms: Room[];
  users: User[];
  onAddAnnouncement: (ann: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onApproveManuscript: (id: string, approve: boolean) => void;
  /** Opens the "Schedule Defenses" page. */
  onGoToSchedule?: () => void;
}

export default function DashboardCoordinator({
  user, researchList, announcements, rooms, users,
  onAddAnnouncement, onDeleteAnnouncement, onApproveManuscript, onGoToSchedule
}: DashboardCoordinatorProps) {

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState<'general' | 'defense' | 'deadline'>('general');
  const [annIsPinned, setAnnIsPinned] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  // Papers approved by an adviser that still need a defense
  const readyPapers = researchList.filter(r => r.status === 'Approved by Adviser' || r.status === 'Pending Coordinator');

  const totalStudents = users.filter(u => u.role === 'student').length;
  const totalApprovedArchives = researchList.filter(r => r.status === 'Completed' || r.status === 'Archived').length;
  const scheduledDefensesCount = researchList.filter(r => r.status === 'Scheduled').length;

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;

    onAddAnnouncement({
      id: `ann-${Date.now()}`,
      title: annTitle,
      content: annContent,
      authorName: user.name,
      isPinned: annIsPinned,
      category: annCategory,
      createdAt: new Date().toISOString()
    });

    setAnnTitle('');
    setAnnContent('');
    setAnnIsPinned(false);
  };

  const getAdviserName = (adviserId: string) => users.find(x => x.id === adviserId)?.name ?? 'No adviser yet';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coordinator Home"
        subtitle="See which papers need a defense date, and post news for students and advisers."
      />

      {/* What should I do next? */}
      <section aria-labelledby="coord-next">
        <Card className={cx(readyPapers.length > 0 ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50')}>
          <p id="coord-next" className="flex items-center gap-2 text-sm font-bold text-blue-900">
            <Compass className="h-5 w-5" aria-hidden="true" />
            What should I do next?
          </p>
          {readyPapers.length === 0 ? (
            <div className="mt-2">
              <h2 className="text-xl font-bold text-slate-900">Nothing needs a defense date right now</h2>
              <p className="mt-1 text-base text-slate-700">When an adviser approves a paper, it will show here so you can set its defense.</p>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <h2 className="text-xl font-bold text-slate-900">
                {readyPapers.length === 1 ? '1 paper needs a defense date' : `${readyPapers.length} papers need a defense date`}
              </h2>
              <ul className="divide-y divide-blue-100 rounded-xl border border-blue-100 bg-white">
                {readyPapers.map(res => (
                  <li key={res.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <Badge tone="success" icon={CheckCircle2}>Approved by Adviser</Badge>
                      <p className="text-base font-semibold text-slate-900">{res.title}</p>
                      <p className="text-sm text-slate-600">
                        Adviser: {getAdviserName(res.adviserId)}
                        {res.keywords.length > 0 && ` · Keywords: ${res.keywords.slice(0, 3).join(', ')}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {onGoToSchedule && (
                        <Button size="sm" icon={Calendar} onClick={onGoToSchedule}>Schedule Defense</Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onApproveManuscript(res.id, true)}
                        title="Confirms the adviser’s approval again. It does not set a defense date."
                      >
                        Confirm Adviser Approval
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-slate-700">
                A paper only becomes “Defense scheduled” after you save its date, room and panel on the Schedule Defenses page.
              </p>
            </div>
          )}
        </Card>
      </section>

      {/* Numbers */}
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Users, tone: 'text-blue-800', label: 'Students in the system', value: totalStudents },
          { icon: FileText, tone: 'text-amber-700', label: 'Papers waiting for a defense date', value: readyPapers.length },
          { icon: Calendar, tone: 'text-indigo-700', label: 'Defenses scheduled', value: scheduledDefensesCount },
          { icon: CheckCircle2, tone: 'text-emerald-700', label: 'Papers in the Repository', value: totalApprovedArchives },
        ].map(({ icon: Icon, tone, label, value }) => (
          <Card key={label} className="flex items-start gap-3 !p-4">
            <Icon className={cx('mt-0.5 h-6 w-6 shrink-0', tone)} aria-hidden="true" />
            <div>
              <dd className="text-2xl font-bold text-slate-900">{value}</dd>
              <dt className="text-sm text-slate-600">{label}</dt>
            </div>
          </Card>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Posted announcements */}
        <Card as="section" aria-labelledby="posted-title" className="lg:col-span-7">
          <CardHeader
            title="Announcements you have posted"
            description="Everyone can see these, even before they sign in."
            icon={<Megaphone className="h-5 w-5" aria-hidden="true" />}
          />
          {announcements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No announcements yet"
              description="Use the form to post your first one."
            />
          ) : (
            <ul className="max-h-[28rem] space-y-3 overflow-y-auto">
              {announcements.map(ann => (
                <li key={ann.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="info">{announcementCategory[ann.category] ?? ann.category}</Badge>
                      {ann.isPinned && <Badge tone="warning" icon={Pin}>Shown at the top</Badge>}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                    <p className="text-sm text-slate-700 line-clamp-3">{ann.content}</p>
                    <p className="text-xs text-slate-600">{formatDateLong(ann.createdAt)} · {ann.authorName}</p>
                  </div>
                  <IconButton
                    icon={Trash2}
                    variant="danger"
                    label={`Delete announcement: ${ann.title}`}
                    onClick={() => setAnnouncementToDelete(ann)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* New announcement */}
        <Card as="section" aria-labelledby="post-title" className="lg:col-span-5">
          <CardHeader
            title="Post a new announcement"
            description="Fields marked with * are required."
            icon={<Send className="h-5 w-5" aria-hidden="true" />}
          />
          <form onSubmit={handlePostAnnouncement} className="space-y-5">
            <Input
              label="Title"
              required
              value={annTitle}
              onChange={e => setAnnTitle(e.target.value)}
              placeholder="e.g. Proposal defense schedule"
            />
            <Textarea
              label="Message"
              required
              rows={4}
              value={annContent}
              onChange={e => setAnnContent(e.target.value)}
              hint="Write short, clear sentences. Include dates and places."
            />
            <Select label="Topic" value={annCategory} onChange={e => setAnnCategory(e.target.value as typeof annCategory)}>
              <option value="general">General</option>
              <option value="defense">Defense</option>
              <option value="deadline">Deadline</option>
            </Select>

            <label htmlFor="pin" className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-slate-800">
              <input
                id="pin"
                type="checkbox"
                checked={annIsPinned}
                onChange={e => setAnnIsPinned(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-blue-800"
              />
              <span>
                <span className="font-semibold">Show this at the top</span>
                <span className="block text-xs text-slate-600">Use this for important news people should not miss.</span>
              </span>
            </label>

            <Button type="submit" icon={Send} fullWidth>Post Announcement</Button>
          </form>
        </Card>
      </div>

      <ConfirmDialog
        open={!!announcementToDelete}
        onCancel={() => setAnnouncementToDelete(null)}
        onConfirm={() => {
          if (announcementToDelete) onDeleteAnnouncement(announcementToDelete.id);
          setAnnouncementToDelete(null);
        }}
        title="Delete this announcement?"
        message={`“${announcementToDelete?.title ?? 'This announcement'}” will be removed for everyone. This cannot be undone.`}
        confirmLabel="Yes, Delete Announcement"
        cancelLabel="No, Keep It"
        destructive
      />
    </div>
  );
}
