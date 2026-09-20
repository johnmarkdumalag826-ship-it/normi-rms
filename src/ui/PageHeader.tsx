import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface PageHeaderProps {
  /** The one main heading of the page. */
  title: string;
  /** One short sentence: what is this page for? */
  subtitle?: string;
  /** The single primary action of the page (a <Button>). */
  action?: React.ReactNode;
  /** Shows a "Back" button. Give the label of where it goes, e.g. "Back to Home". */
  onBack?: () => void;
  backLabel?: string;
}

export function PageHeader({ title, subtitle, action, onBack, backLabel = 'Back' }: PageHeaderProps) {
  return (
    <header className="space-y-3">
      {onBack && (
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack} className="-ml-3">
          {backLabel}
        </Button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-base text-slate-600 max-w-2xl">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
