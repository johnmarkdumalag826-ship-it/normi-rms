import React from 'react';
import { cx } from './Button';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article';
  padded?: boolean;
}

/** The one card style used everywhere: white, thin border, soft shadow. */
export function Card({ as: Tag = 'div', padded = true, className, children, ...rest }: CardProps) {
  return (
    <Tag
      className={cx(
        'rounded-xl border shadow-sm',
        // A custom background or border colour (e.g. a tinted "next step" card) replaces the default.
        !className?.includes('bg-') && 'bg-white',
        !className?.includes('border-') && 'border-slate-200',
        padded && 'p-5 sm:p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

/** Section title inside a card (h2). One h1 per page comes from <PageHeader>. */
export function CardHeader({ title, description, action, icon }: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-3 min-w-0">
        {icon && <div className="mt-0.5 text-blue-800 shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-600 mt-0.5">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
