import React, { useState } from 'react';
import { ClipboardList, CheckCircle2, FileText, Award, Calendar, Compass, Clock, Play } from 'lucide-react';
import { User, Schedule, Research, Evaluation } from '../types';
import {
  Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, StatusBadge, Textarea,
  cx, defenseTypeLabels, formatDateAndTime, formatDateLong, formatTime, recommendationLabels, scheduleStatus,
} from '../ui';

interface DashboardPanelistProps {
  user: User;
  schedules: Schedule[];
  researchList: Research[];
  evaluations: Evaluation[];
  users: User[];
  onAddEvaluation: (evaluation: Evaluation) => void;
  onSelectResearch: (id: string) => void;
}

export default function DashboardPanelist({
  user, schedules, researchList, evaluations, users, onAddEvaluation, onSelectResearch
}: DashboardPanelistProps) {
  const [selectedSchedId, setSelectedSchedId] = useState('');
  const [score1, setScore1] = useState(18); // starting values
  const [score2, setScore2] = useState(25);
  const [score3, setScore3] = useState(25);
  const [score4, setScore4] = useState(18);
  const [comments, setComments] = useState('');
  const [recommendation, setRecommendation] = useState<'Passed' | 'Minor Revision' | 'Major Revision' | 'Failed'>('Passed');
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  // Saving scores is final, so we ask "are you sure?" first.
  const [confirmingScores, setConfirmingScores] = useState(false);

  // Defenses this panel member is part of, soonest first
  const assignedDefenses = schedules
    .filter(s => s.panelistIds.includes(user.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const isEvaluated = (schedId: string) => evaluations.some(e => e.scheduleId === schedId && e.panelistId === user.id);

  const pendingDefenses = assignedDefenses.filter(s => s.status === 'scheduled' && !isEvaluated(s.id));
  const myEvaluations = evaluations.filter(e => e.panelistId === user.id);

  const getResearchTitle = (researchId: string) => researchList.find(x => x.id === researchId)?.title ?? 'Research paper';

  const getStudentNames = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    if (!res) return 'Unknown students';
    return res.studentIds.map(sid => users.find(x => x.id === sid)?.name ?? 'Student').join(', ');
  };

  const handleOpenEvaluation = (schedId: string) => {
    setSelectedSchedId(schedId);
    setShowEvaluationForm(true);
    setComments('');
    setScore1(18);
    setScore2(25);
    setScore3(25);
    setScore4(18);
  };

  const total = Number(score1) + Number(score2) + Number(score3) + Number(score4);

  // Step 1: the form is filled in and sent -> ask "are you sure?"
  const handleEvaluationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedId) return;
    setConfirmingScores(true);
  };

  // Step 2: the panel member confirms -> save
  const saveEvaluation = () => {
    if (!selectedSchedId) return;

    onAddEvaluation({
      id: `eval-${Date.now()}`,
      scheduleId: selectedSchedId,
      panelistId: user.id,
      panelistName: user.name,
      score1: Number(score1),
      score2: Number(score2),
      score3: Number(score3),
      score4: Number(score4),
      totalScore: total,
      comment: comments,
      recommendation,
      evaluatedAt: new Date().toISOString()
    });

    setConfirmingScores(false);
    setShowEvaluationForm(false);
    setSelectedSchedId('');
  };

  const selectedSched = schedules.find(s => s.id === selectedSchedId);

  // The four score boxes share one layout
  const scoreFields: { label: string; hint: string; max: number; value: number; set: (n: number) => void }[] = [
    { label: '1. Problem and background', hint: 'Is the problem clear and important? Up to 20 points.', max: 20, value: score1, set: setScore1 },
    { label: '2. Related studies and method', hint: 'Are the reading and the method sound? Up to 30 points.', max: 30, value: score2, set: setScore2 },
    { label: '3. System design and database', hint: 'Is the system well designed and built? Up to 30 points.', max: 30, value: score3, set: setScore3 },
    { label: '4. Questions and presentation', hint: 'Did they present well and answer questions? Up to 20 points.', max: 20, value: score4, set: setScore4 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel Member Home"
        subtitle="See the defenses you will attend, read each paper, and record your scores."
      />

      {/* What should I do next? */}
      <section aria-labelledby="panel-next">
        <Card className={cx(pendingDefenses.length > 0 ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50')}>
          <p id="panel-next" className="flex items-center gap-2 text-sm font-bold text-blue-900">
            <Compass className="h-5 w-5" aria-hidden="true" />
            What should I do next?
          </p>
          {pendingDefenses.length === 0 ? (
            <div className="mt-2">
              <h2 className="text-xl font-bold text-slate-900">You have no scores to enter</h2>
              <p className="mt-1 text-base text-slate-700">When a defense you are on the panel for is scheduled, it will show here.</p>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <h2 className="text-xl font-bold text-slate-900">
                {pendingDefenses.length === 1 ? '1 defense needs your scores' : `${pendingDefenses.length} defenses need your scores`}
              </h2>
              <ul className="divide-y divide-blue-100 rounded-xl border border-blue-100 bg-white">
                {pendingDefenses.map(sched => (
                  <li key={sched.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-blue-900">{formatDateAndTime(sched.date, sched.startTime)}</p>
                      <p className="text-base font-semibold text-slate-900">{getResearchTitle(sched.researchId)}</p>
                    </div>
                    <Button size="sm" icon={Play} onClick={() => handleOpenEvaluation(sched.id)} className="shrink-0">
                      Score This Defense
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </section>

      {/* Numbers */}
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex items-start gap-3 !p-4">
          <ClipboardList className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <dd className="text-2xl font-bold text-slate-900">{pendingDefenses.length}</dd>
            <dt className="text-sm text-slate-600">Defenses waiting for your scores</dt>
          </div>
        </Card>
        <Card className="flex items-start gap-3 !p-4">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
          <div>
            <dd className="text-2xl font-bold text-slate-900">{myEvaluations.length}</dd>
            <dt className="text-sm text-slate-600">Defenses you have scored</dt>
          </div>
        </Card>
      </dl>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Your defenses */}
        <Card as="section" padded={false} className="lg:col-span-8" aria-labelledby="my-defenses">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 id="my-defenses" className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Calendar className="h-5 w-5 text-blue-800" aria-hidden="true" />
              Your defenses
            </h2>
            <Badge tone="neutral">{assignedDefenses.length}</Badge>
          </div>

          {assignedDefenses.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No defenses yet"
              description="You are not on any panel right now. The coordinator will assign you, and you will get a notification."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {assignedDefenses.map(sched => {
                const done = isEvaluated(sched.id);
                return (
                  <li key={sched.id} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="info">{defenseTypeLabels[sched.type] ?? sched.type}</Badge>
                      <StatusBadge info={scheduleStatus[sched.status]} />
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <Clock className="h-4 w-4 text-blue-800" aria-hidden="true" />
                        {formatDateLong(sched.date)}, {formatTime(sched.startTime)} to {formatTime(sched.endTime)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold leading-snug text-slate-900">{getResearchTitle(sched.researchId)}</h3>
                      <p className="mt-0.5 text-sm text-slate-700">Students: {getStudentNames(sched.researchId)}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" icon={FileText} onClick={() => onSelectResearch(sched.researchId)}>
                        Read Paper
                      </Button>
                      {done ? (
                        <Badge tone="success" icon={CheckCircle2}>You have scored this defense</Badge>
                      ) : (
                        <Button size="sm" icon={Award} onClick={() => handleOpenEvaluation(sched.id)}>
                          Score This Defense
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Past scores */}
        <Card as="section" className="lg:col-span-4" aria-labelledby="past-scores">
          <CardHeader title="Your past scores" icon={<Award className="h-5 w-5" aria-hidden="true" />} />
          {myEvaluations.length === 0 ? (
            <p className="text-sm text-slate-600">You have not scored any defense yet. Your scores will show here.</p>
          ) : (
            <ul className="max-h-96 space-y-3 overflow-y-auto">
              {myEvaluations.map(e => {
                const sched = schedules.find(s => s.id === e.scheduleId);
                const rec = recommendationLabels[e.recommendation];
                return (
                  <li key={e.id} className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {sched ? getResearchTitle(sched.researchId) : 'Research paper'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={rec?.tone ?? 'neutral'}>{rec?.label ?? e.recommendation}</Badge>
                      <span className="text-sm font-bold text-blue-900">{e.totalScore} out of 100</span>
                    </div>
                    <p className="text-sm italic text-slate-700 line-clamp-2">“{e.comment}”</p>
                    <p className="text-xs text-slate-600">Scored on {formatDateLong(e.evaluatedAt)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Score sheet */}
      <Modal
        open={showEvaluationForm}
        onClose={() => { if (!confirmingScores) setShowEvaluationForm(false); }}
        title="Score this defense"
        description={selectedSched ? getResearchTitle(selectedSched.researchId) : 'Give points for each part. The total is 100 points.'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEvaluationForm(false)}>Cancel</Button>
            <Button type="submit" form="score-form">Review and Save Scores</Button>
          </>
        }
      >
        <form id="score-form" onSubmit={handleEvaluationSubmit} className="space-y-5">
          <p className="text-sm text-slate-700">
            Give points for each part. Fields marked with * are required. You will be able to check everything before it is saved.
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {scoreFields.map(f => (
              <Input
                key={f.label}
                label={f.label}
                hint={f.hint}
                type="number"
                inputMode="numeric"
                min={0}
                max={f.max}
                required
                value={f.value}
                onChange={e => f.set(Math.min(f.max, Math.max(0, Number(e.target.value))))}
              />
            ))}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center text-base font-bold text-blue-900" aria-live="polite">
            Total score: {total} out of 100
          </div>

          <Select
            label="Your recommendation"
            required
            value={recommendation}
            onChange={e => setRecommendation(e.target.value as typeof recommendation)}
            hint="What should happen to this paper next?"
          >
            <option value="Passed">Passed (no changes needed)</option>
            <option value="Minor Revision">Passed with small changes</option>
            <option value="Major Revision">Needs big changes</option>
            <option value="Failed">Did not pass (must defend again)</option>
          </Select>

          <Textarea
            label="Your comments for the students"
            required
            rows={4}
            value={comments}
            onChange={e => setComments(e.target.value)}
            hint="Say what was good and what must be improved."
          />
        </form>
      </Modal>

      {/* Are you sure? */}
      <ConfirmDialog
        open={confirmingScores}
        onCancel={() => setConfirmingScores(false)}
        onConfirm={saveEvaluation}
        title="Save these scores?"
        message={`Total: ${total} out of 100. Recommendation: ${recommendationLabels[recommendation].label}. You cannot change your scores after saving.`}
        confirmLabel="Yes, Save My Scores"
        cancelLabel="No, Go Back and Check"
      />
    </div>
  );
}
