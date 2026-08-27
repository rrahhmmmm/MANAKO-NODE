import { ReportGenerateForm } from '@/components/features/reports/ReportGenerateForm';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate laporan rekap termin & dokumen per tahun.</p>
      </div>
      <ReportGenerateForm />
    </div>
  );
}
