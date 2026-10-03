import { cx } from './Button';

interface BrandLogoProps {
  className?: string;
}

/** The school seal. Size it from outside with a height class, e.g. `h-10`; the width follows. */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src="/normi-logo.png"
      alt="Northern Mindanao Colleges, Inc. seal"
      width={320}
      height={320}
      className={cx('w-auto rounded-full object-contain', className)}
    />
  );
}
