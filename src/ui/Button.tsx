import React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'md' | 'sm';

const variants: Record<Variant, string> = {
  primary: 'bg-blue-800 text-white hover:bg-blue-900 border border-blue-800 shadow-sm',
  secondary: 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-300',
  danger: 'bg-rose-700 text-white hover:bg-rose-800 border border-rose-700 shadow-sm',
  ghost: 'bg-transparent text-blue-900 hover:bg-blue-50 border border-transparent',
};

// Every size keeps a 44px-tall touch area (min-h-11) so it is easy to tap on a phone.
const sizes: Record<Size, string> = {
  md: 'min-h-11 px-5 text-sm',
  sm: 'min-h-11 px-4 text-xs',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
}

/** Use verb + result for the label: "Submit for Review", "Download Paper". */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, loading, fullWidth, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], fullWidth && 'w-full', className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
});

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Required: screen readers announce this because the button has no visible text. */
  label: string;
  variant?: 'secondary' | 'ghost' | 'danger';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = 'ghost', className, type = 'button', ...rest },
  ref,
) {
  const styles = {
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'text-rose-700 hover:bg-rose-50',
  }[variant];
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx('inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors cursor-pointer shrink-0', styles, className)}
      {...rest}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
});
