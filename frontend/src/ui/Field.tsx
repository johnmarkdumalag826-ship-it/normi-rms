import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cx } from './Button';

interface FieldShellProps {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Show a small "(optional)" note. Use it on forms that mix required and optional fields. */
  optional?: boolean;
  children: React.ReactNode;
}

/** Label above the field, short helper text under it, and an inline error that says how to fix it. */
function FieldShell({ label, id, hint, error, required, optional, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}
        {required ? (
          <span className="text-rose-700 ml-1" aria-hidden="true">*</span>
        ) : optional ? (
          <span className="ml-1.5 text-xs font-normal text-slate-600">(optional)</span>
        ) : null}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {hint && <p id={`${id}-hint`} className="text-xs text-slate-600">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-xs font-medium text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-px" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

const controlBase =
  'w-full min-h-11 rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-500 ' +
  'transition-colors focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/30 ' +
  'disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed';

const controlState = (error?: string) => (error ? 'border-rose-600' : 'border-slate-300');

const describedBy = (id: string, hint?: string, error?: string) =>
  [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

interface CommonProps {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<
  HTMLInputElement,
  CommonProps & { adornment?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ label, hint, error, required, optional, className, id, adornment, ...rest }, ref) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell label={label} id={fieldId} hint={hint} error={error} required={required} optional={optional}>
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          className={cx(controlBase, controlState(error), adornment && 'pr-14', className)}
          {...rest}
        />
        {/* Optional control shown inside the right edge of the field (e.g. show/hide password). */}
        {adornment && <div className="absolute inset-y-0 right-1 flex items-center">{adornment}</div>}
      </div>
    </FieldShell>
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  CommonProps & React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ label, hint, error, required, optional, className, id, children, ...rest }, ref) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell label={label} id={fieldId} hint={hint} error={error} required={required} optional={optional}>
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={cx(controlBase, controlState(error), 'cursor-pointer', className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  CommonProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ label, hint, error, required, optional, className, id, rows = 4, ...rest }, ref) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell label={label} id={fieldId} hint={hint} error={error} required={required} optional={optional}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={cx(controlBase, controlState(error), 'resize-y', className)}
        {...rest}
      />
    </FieldShell>
  );
});
