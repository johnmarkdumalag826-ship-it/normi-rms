import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cx } from './Button';
import { toneClasses, type Tone } from './labels';

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle, neutral: Info } as const;

interface AlertProps {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** An in-page message (icon + words, not colour alone). */
export function Alert({ tone = 'info', title, children, action, className }: AlertProps) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('flex items-start gap-3 rounded-lg border p-4 text-sm', toneClasses[tone], className)}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action}
    </div>
  );
}

/** The small pop-up message at the top of the screen ("Saved!"). */
export function Toast({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) {
  const isError = type === 'error';
  const Icon = isError ? XCircle : CheckCircle2;
  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={cx(
        'fixed top-4 left-1/2 z-[80] -translate-x-1/2 flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl',
        isError ? 'bg-rose-800 text-white' : 'bg-slate-900 text-white',
      )}
    >
      <Icon className="h-5 w-5 shrink-0 mt-px" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
