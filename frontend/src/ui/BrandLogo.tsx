import { cx } from './Button';

interface BrandLogoProps {
  className?: string;
}

/** The school seal. Size it from outside with a height class, e.g. `h-10`; the width follows. */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src="/normi-logo.jpg"
      alt="Northern Mindanao Colleges, Inc. seal"
      width={187}
      height={148}
      className={cx('w-auto object-contain', className)}
    />
  );
}
