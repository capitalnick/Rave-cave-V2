import { isDev, FIREBASE_ENV } from '@/config/firebaseConfig';
import { cn } from '@/lib/utils';

interface EnvBadgeProps {
  className?: string;
}

export function EnvBadge({ className }: EnvBadgeProps) {
  if (!isDev) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-2 py-0.5 rounded-full',
        'bg-[var(--rc-accent-acid)] text-[var(--rc-ink-primary)]',
        'font-[var(--rc-font-mono)] text-[10px] uppercase tracking-widest leading-none',
        'select-none pointer-events-none',
        className
      )}
    >
      DEV
    </span>
  );
}
