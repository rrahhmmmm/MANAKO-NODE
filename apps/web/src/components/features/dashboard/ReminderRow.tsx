import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { ReminderItem } from './ReminderTabs';

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

export function ReminderRow({ item }: { item: ReminderItem }) {
  const overdue = item.days_overdue > 0;
  return (
    <div className="flex items-center justify-between gap-4 border rounded-xl p-4">
      <div className="min-w-0">
        <Link href={`/projects/${item.project_id}`} className="font-medium hover:underline">
          {item.project_name}
        </Link>
        {item.project_code && (
          <span className="ml-2 text-xs text-muted-foreground font-mono">{item.project_code}</span>
        )}
        <div className="text-sm text-muted-foreground mt-0.5">
          {item.termin_name ?? `Termin #${item.termin_id}`} — butuh{' '}
          <span className="font-medium text-foreground">{item.doc_label ?? item.doc_type}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <Badge variant={overdue ? 'destructive' : 'secondary'}>
          {overdue ? `Terlambat ${item.days_overdue} hari` : `${item.days_until_due} hari lagi`}
        </Badge>
        <span className="text-xs text-muted-foreground">Jatuh tempo {dateFmt.format(new Date(item.due_date))}</span>
      </div>
    </div>
  );
}
