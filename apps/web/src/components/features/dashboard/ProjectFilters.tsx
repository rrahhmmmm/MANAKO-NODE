'use client';

import { InfoIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ClassificationType } from '@/components/forms/ProjectForm';

export type DashboardProjectTab = 'running' | 'inisiasi' | 'completed';

export type ProjectFiltersState = {
  tab: DashboardProjectTab;
  search: string;
  classification: ClassificationType[];
};

const TAB_OPTIONS: DashboardProjectTab[] = ['running', 'inisiasi', 'completed'];
const TAB_LABEL: Record<DashboardProjectTab, string> = {
  running: 'Running',
  inisiasi: 'Inisiasi',
  completed: 'Completed',
};

export function ProjectFilters({
  value,
  onChange,
}: {
  value: ProjectFiltersState;
  onChange: (next: ProjectFiltersState) => void;
}) {
  function toggleClassification(c: ClassificationType) {
    const has = value.classification.includes(c);
    onChange({
      ...value,
      classification: has ? value.classification.filter((x) => x !== c) : [...value.classification, c],
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={value.tab} onValueChange={(v) => onChange({ ...value, tab: v as DashboardProjectTab })}>
        <SelectTrigger className="w-36">
          <SelectValue>{(v: DashboardProjectTab) => TAB_LABEL[v]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TAB_OPTIONS.map((t) => (
            <SelectItem key={t} value={t}>
              {TAB_LABEL[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Cari kode / nama project…"
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="max-w-xs"
      />

      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <Switch
            checked={value.classification.includes('rutin')}
            onCheckedChange={() => toggleClassification('rutin')}
          />
          Rutin
        </label>
        <label className="flex items-center gap-1.5">
          <Switch
            checked={value.classification.includes('non_rutin')}
            onCheckedChange={() => toggleClassification('non_rutin')}
          />
          Non Rutin
        </label>
        <Tooltip>
          <TooltipTrigger className="text-muted-foreground">
            <InfoIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent>
            Kalau kedua opsi klasifikasi ini nonaktif, daftar project akan kosong (bukan menampilkan semua).
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
