import { Badge } from '@/components/ui/badge';

export type ProjectStatus = 'inisiasi' | 'running' | 'completed' | 'closed' | 'cancelled';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  inisiasi: 'Inisiasi',
  running: 'Running',
  completed: 'Completed',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const STATUS_VARIANT: Record<ProjectStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  inisiasi: 'secondary',
  running: 'default',
  completed: 'outline',
  closed: 'destructive',
  cancelled: 'destructive',
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
