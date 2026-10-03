import { Users } from 'lucide-react';
import { Research, User } from '../types';
import { Avatar, Badge, Card, CardHeader } from '../ui';

interface ResearchGroupCardProps {
  research: Research;
  users: User[];
  /** The signed-in person, so their own row can say "You". */
  currentUserId?: string;
}

/** Who is in a research group: the leader first, then the other members. */
export function groupPeople(research: Research, users: User[]): { leader: string | null; leaderId?: string; members: string[] } {
  const accounts = research.studentIds
    .map(id => users.find(u => u.id === id))
    .filter((u): u is User => !!u);
  const leader = accounts[0];
  const members = [...accounts.slice(1).map(u => u.name), ...(research.memberNames ?? [])];
  const seen = new Set<string>();
  return {
    leader: leader?.name ?? null,
    leaderId: leader?.id,
    members: members.filter(name => {
      const key = name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}

export function ResearchGroupCard({ research, users, currentUserId }: ResearchGroupCardProps) {
  const { leader, leaderId, members } = groupPeople(research, users);

  return (
    <Card>
      <CardHeader
        title="Your research group"
        description={research.groupName}
        icon={<Users className="h-5 w-5" aria-hidden="true" />}
      />
      <ul className="space-y-3">
        <li className="flex items-center gap-3">
          <Avatar name={leader ?? 'Leader'} />
          <div className="min-w-0 flex-1">
            <p className="break-words text-base font-bold text-slate-900">
              {leader ?? 'Group leader'}
              {leaderId && leaderId === currentUserId && <span className="font-normal text-slate-600"> (you)</span>}
            </p>
          </div>
          <Badge tone="info">Group leader</Badge>
        </li>
        {members.map(name => (
          <li key={name} className="flex items-center gap-3">
            <Avatar name={name} />
            <p className="min-w-0 flex-1 break-words text-base text-slate-900">{name}</p>
            <Badge tone="neutral">Member</Badge>
          </li>
        ))}
      </ul>
      {members.length === 0 && (
        <p className="mt-3 text-sm text-slate-600">No other group members were listed when this paper was sent.</p>
      )}
    </Card>
  );
}
