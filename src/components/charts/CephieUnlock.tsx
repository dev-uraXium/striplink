import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function CephieUnlockStrip({
  count,
  airport,
  className,
}: {
  count?: number;
  airport?: string | null;
  className?: string;
}) {
  const label =
    count && airport
      ? `${count} full-size Cephie ${count === 1 ? 'chart' : 'charts'} for ${airport}`
      : 'Full-size Cephie Charts for every airport';
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border-2 border-zinc-800 bg-zinc-900 px-4 py-3',
        className
      )}
    >
      <p className="text-sm text-zinc-300">
        <span className="font-medium text-white">{label}</span>. Log in to
        open the full-size charts.
      </p>
      <div className="flex items-center justify-between gap-3">
        <Button size="sm" asChild>
          <a
            href={`/login?callback=${encodeURIComponent(window.location.pathname + window.location.search)}`}
          >
            Log in
          </a>
        </Button>
      </div>
    </div>
  );
}
