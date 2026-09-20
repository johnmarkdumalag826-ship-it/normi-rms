import React from 'react';
import { cx } from './Button';

const sizes = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
} as const;

// Titles are skipped so "Dr. Maria Santos" shows "MS", not "DM".
const titles = new Set(['dr', 'prof', 'mr', 'mrs', 'ms', 'engr', 'atty']);

export const initialsOf = (name: string): string => {
  const words = name
    .split(/\s+/)
    .map(w => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(w => w && !titles.has(w.toLowerCase()));
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words.slice(0, 1);
  return picked.map(w => w[0].toUpperCase()).join('') || '?';
};

interface AvatarProps {
  name: string;
  /** The person's own photo, if they have one. Otherwise their initials are shown. */
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}

/** A round picture of a person. No photo? Their initials, drawn here (nothing is loaded from other websites). */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className={cx('shrink-0 rounded-full border border-slate-200 bg-slate-50 object-cover', sizes[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full border border-blue-200 bg-blue-100 font-bold text-blue-900',
        sizes[size], className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
