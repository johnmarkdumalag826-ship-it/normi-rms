import React from 'react';
import { cx } from './Button';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
  /** On phones the row becomes a card; set true to make this column the card's title (no label). */
  primary?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Screen-reader name for the table, e.g. "Defense schedules". */
  caption: string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
}

/**
 * A table on tablets and laptops. On phones (under 768px) each row turns into a
 * stacked card so nothing needs sideways scrolling.
 */
export function Table<T>({ columns, rows, rowKey, caption, onRowClick, empty }: TableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  const primary = columns.find(c => c.primary) ?? columns[0];
  const rest = columns.filter(c => c !== primary);

  return (
    <>
      {/* Tablet and laptop */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50 text-xs font-bold text-slate-700 border-b border-slate-200">
            <tr>
              {columns.map(c => (
                <th key={c.key} scope="col" className={cx('px-4 py-3', c.className)}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx('align-top', onRowClick && 'cursor-pointer hover:bg-blue-50/50')}
              >
                {columns.map(c => (
                  <td key={c.key} className={cx('px-4 py-3 text-slate-800', c.className)}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone */}
      <ul className="md:hidden space-y-3" aria-label={caption}>
        {rows.map(row => (
          <li
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cx('rounded-xl border border-slate-200 bg-white p-4 space-y-3', onRowClick && 'cursor-pointer')}
          >
            <div className="font-semibold text-slate-900">{primary.render(row)}</div>
            <dl className="space-y-2 text-sm">
              {rest.map(c => (
                <div key={c.key} className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <dt className="w-28 shrink-0 text-slate-600">{c.header}</dt>
                  <dd className="min-w-0 flex-1 text-slate-900">{c.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
