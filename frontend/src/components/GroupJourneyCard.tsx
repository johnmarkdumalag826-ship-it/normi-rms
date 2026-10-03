import { Compass } from 'lucide-react';
import { Research, Schedule, User } from '../types';
import { Card, CardHeader, EmptyState, ResearchStatusBadge, cx, journeyProgress, journeySteps, researchTitle } from '../ui';
import { groupPeople } from './ResearchGroupCard';

interface GroupJourneyCardProps {
  researchList: Research[];
  schedules: Schedule[];
  users: User[];
  /** Show who each group's adviser is (not needed on an adviser's own page). */
  showAdviser?: boolean;
}

/** Where every student group is on its journey: Title Hearing, then Title Proposal, then Final Defense. */
export function GroupJourneyCard({ researchList, schedules, users, showAdviser = false }: GroupJourneyCardProps) {
  return (
    <Card as="section" aria-label="Where each group is on its journey">
      <CardHeader
        title="Where each group is on its journey"
        description="Every student group goes through three steps: Title Hearing, Title Proposal, then Final Defense."
        icon={<Compass className="h-5 w-5" aria-hidden="true" />}
      />

      {researchList.length === 0 ? (
        <EmptyState icon={Compass} title="No student groups yet" description="When a student group registers, its journey will show here." />
      ) : (
        <ul className="max-h-[32rem] space-y-3 overflow-y-auto">
          {researchList.map(research => {
            const { activeIdx } = journeyProgress(research, schedules);
            const { leader } = groupPeople(research, users);
            const adviser = users.find(u => u.id === research.adviserId)?.name;
            return (
              <li key={research.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold text-slate-900">{researchTitle(research)}</p>
                    <p className="text-sm text-slate-600">
                      {leader ? `${leader} (group leader)` : 'No group leader'}
                      {showAdviser && adviser ? ` · Adviser: ${adviser}` : ''}
                    </p>
                  </div>
                  <ResearchStatusBadge status={research.status} />
                </div>
                <ol className="grid grid-cols-3 gap-2" aria-label="Journey steps">
                  {journeySteps.map((name, idx) => {
                    const state = idx < activeIdx ? 'done' : idx === activeIdx ? 'now' : 'later';
                    return (
                      <li
                        key={name}
                        className={cx(
                          'rounded-lg border px-2 py-2 text-center text-xs font-semibold',
                          state === 'done' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
                          state === 'now' && 'border-amber-300 bg-amber-50 text-amber-900',
                          state === 'later' && 'border-slate-200 bg-slate-50 text-slate-600',
                        )}
                      >
                        <span className="block break-words">{name}</span>
                        <span className="block font-normal">{state === 'done' ? 'Done' : state === 'now' ? 'You are here' : 'Later'}</span>
                      </li>
                    );
                  })}
                </ol>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
