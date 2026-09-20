import React from 'react';
import { AlertTriangle, Inbox, type LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  /** What is empty, e.g. "No papers to review yet". */
  title: string;
  /** Why it is empty and what the person can do next. */
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10 gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-800">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-600 max-w-md">{description}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/** Says what went wrong and offers a way to try again. */
export function ErrorState({
  title = 'We could not load this page',
  description = 'Please check your internet connection and try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center text-center px-6 py-10 gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-700">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-600 max-w-md">{description}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try Again</Button>}
    </div>
  );
}
