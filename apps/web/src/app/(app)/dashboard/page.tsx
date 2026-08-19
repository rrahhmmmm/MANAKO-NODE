'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCards, type Stats } from '@/components/features/dashboard/StatsCards';
import { YearFilter } from '@/components/features/dashboard/YearFilter';
import { ReminderTabs } from '@/components/features/dashboard/ReminderTabs';
import { ProjectFilters, type ProjectFiltersState } from '@/components/features/dashboard/ProjectFilters';
import { ProjectList } from '@/components/features/dashboard/ProjectList';

export default function DashboardPage() {
  const token = useAuthStore((s) => s.access_token);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [projectFilters, setProjectFilters] = useState<ProjectFiltersState>({
    tab: 'running',
    search: '',
    classification: ['rutin', 'non_rutin'],
  });

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats', year],
    queryFn: () =>
      apiFetch<Stats>(`/dashboard/stats${year ? `?year=${year}` : ''}`, { token: token ?? undefined }),
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Ringkasan project & pengingat dokumen.</p>
        </div>
        <YearFilter year={year} onChange={setYear} />
      </div>

      {isLoading && <div>Loading…</div>}
      {error && <div className="text-destructive text-sm">{(error as Error).message}</div>}
      {stats && <StatsCards data={stats} />}

      <Tabs defaultValue="reminders">
        <TabsList>
          <TabsTrigger value="reminders">🔔 Reminders</TabsTrigger>
          <TabsTrigger value="projects">📁 Projects</TabsTrigger>
        </TabsList>
        <TabsContent value="reminders" className="pt-4">
          <ReminderTabs />
        </TabsContent>
        <TabsContent value="projects" className="pt-4 space-y-4">
          <ProjectFilters value={projectFilters} onChange={setProjectFilters} />
          <ProjectList filters={projectFilters} year={year} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
