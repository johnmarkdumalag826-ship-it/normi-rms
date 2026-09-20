import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './Button';
import { toneClasses, getResearchStatus, type Tone, type StatusInfo } from './labels';

interface BadgeProps {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

/** A small label. Never rely on colour alone — pass an icon or use words that carry the meaning. */
export function Badge({ tone = 'neutral', icon: Icon, children, className }: BadgeProps) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none whitespace-nowrap', toneClasses[tone], className)}>
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Status = colour + icon + plain words. Pass the info from labels.ts. */
export function StatusBadge({ info, className }: { info: StatusInfo; className?: string }) {
  return <Badge tone={info.tone} icon={info.icon} className={className}>{info.label}</Badge>;
}

/** Research status by its stored value, with an optional one-line explanation underneath. */
export function ResearchStatusBadge({ status, explain, className }: { status: string; explain?: boolean; className?: string }) {
  const info = getResearchStatus(status);
  if (!explain) return <StatusBadge info={info} className={className} />;
  return (
    <div className={cx('space-y-1.5', className)}>
      <StatusBadge info={info} />
      {(info.meaning || info.next) && (
        <p className="text-xs text-slate-700">
          {info.meaning} {info.next && <span className="font-medium">{info.next}</span>}
        </p>
      )}
    </div>
  );
}
