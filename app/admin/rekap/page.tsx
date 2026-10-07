'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Calendar,
  RefreshCw,
  ArrowLeft,
  Building,
  CheckCircle2,
  Clock,
  ExternalLink,
  X,
  FileDown,
  Target,
  Users,
  AlertCircle,
  TrendingUp,
  Sparkles,
  FileText,
} from 'lucide-react';
import { NeuCard } from '@/components/ui/NeuCard';
import { NeuButton } from '@/components/ui/NeuButton';
import { NeuBadge } from '@/components/ui/NeuBadge';
import { AttendanceService } from '@/lib/attendance-service';
import {
  Attendance,
  AttendanceFilter,
  Employee,
  EmployeeMonthlyQuota,
} from '@/lib/types';
import {
  formatIndoDate,
  formatIndoTime,
  calculateEmployeeQuota,
  MANDATORY_MONTHLY_DAYS,
  addDaysToDateKey,
  getJakartaDateKey,
  getJakartaMonthKey,
} from '@/lib/attendance-utils';

export default function RekapAbsensiPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'quota' | 'daily'>('quota');
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

  // Filters State for Daily Log
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [department, setDepartment] = useState('all');
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Filters State for Monthly Quota (Target 24 Hari)
  const [selectedMonth, setSelectedMonth] = useState('');
  const [quotaStatusFilter, setQuotaStatusFilter] = useState<'all' | 'met' | 'pending' | 'surplus'>('all');

  useEffect(() => {
    const user = AttendanceService.getCurrentUser();
    if (!user) {
      router.push('/');
      return;
    }
    if (user.role !== 'admin') {
      router.push('/absensi');
      return;
    }

    const toStr = getJakartaDateKey();
    const fromStr = addDaysToDateKey(toStr, -30);
    const monthStr = getJakartaMonthKey();

    setDateFrom(fromStr);
    setDateTo(toStr);
    setSelectedMonth(monthStr);

    AttendanceService.getEmployees().then(setEmployees);
    fetchData({ dateFrom: fromStr, dateTo: toStr });
  }, [router]);

  const fetchData = async (overrideFilter?: Partial<AttendanceFilter>) => {
    setLoading(true);
    try {
      const filter: AttendanceFilter = {
        dateFrom: overrideFilter?.dateFrom ?? (dateFrom || undefined),
        dateTo: overrideFilter?.dateTo ?? (dateTo || undefined),
        department: department === 'all' ? undefined : department,
        status: status === 'all' ? undefined : (status as any),
        search: search || undefined,
      };
      const data = await AttendanceService.getAllAttendances(filter);
      setAttendances(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Monthly Quota for each employee
  const activeStaff = employees.filter((e) => e.role === 'employee' && e.is_active);
  const monthToUse = selectedMonth;

  const quotasList: EmployeeMonthlyQuota[] = monthToUse
    ? activeStaff.map((emp) =>
        calculateEmployeeQuota(attendances, emp, monthToUse, MANDATORY_MONTHLY_DAYS)
      )
    : [];

  // Filtered Quota List
  const filteredQuotas = quotasList.filter((item) => {
    if (department !== 'all' && item.employee.department !== department) {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const matchName = item.employee.name.toLowerCase().includes(q);
      const matchCode = item.employee.employee_code.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    if (quotaStatusFilter === 'met' && item.totalPresentDays < MANDATORY_MONTHLY_DAYS) {
      return false;
    }
    if (quotaStatusFilter === 'pending' && item.totalPresentDays >= MANDATORY_MONTHLY_DAYS) {
      return false;
    }
    if (quotaStatusFilter === 'surplus' && item.surplusDays <= 0) {
      return false;
    }
    return true;
  });

  // Summary Metrics for Monthly Quota
  const totalEmployeesInQuota = quotasList.length;
  const metTargetCount = quotasList.filter((q) => q.isTargetMet).length;
  const pendingTargetCount = quotasList.filter((q) => !q.isTargetMet).length;
  const complianceRate =
    totalEmployeesInQuota > 0
      ? Math.round((metTargetCount / totalEmployeesInQuota) * 100)
      : 0;

  // Export CSV for Monthly Quota (Target 24 Hari)
  const handleExportQuotaCSV = () => {
    if (filteredQuotas.length === 0) {
      alert('Tidak ada data kuota untuk diexport.');
      return;
    }

    const headers = [
      'NIK / ID',
      'Nama Karyawan',
      'Departemen',
      'Bulan Periode',
      'Total Hari Masuk',
      'Target Wajib (Hari)',
      'Status Capaian Target',
      'Kekurangan Hari',
      'Surplus Hari',
      'Persentase Capaian (%)',
      'Jumlah Tepat Waktu',
      'Jumlah Terlambat',
      'Total Jam Kerja',
    ];

    const rows = filteredQuotas.map((q) => [
      `"${q.employee.employee_code}"`,
      `"${q.employee.name}"`,
      `"${q.employee.department}"`,
      `"${q.month}"`,
      `"${q.totalPresentDays}"`,
      `"${q.targetDays}"`,
      `"${q.isTargetMet ? 'Tercapai (Memenuhi Syarat)' : 'Kurang / Belum Capai'}"`,
      `"${q.remainingDays}"`,
      `"${q.surplusDays}"`,
      `"${q.progressPercentage}%"`,
      `"${q.onTimeDays}"`,
      `"${q.lateDays}"`,
      `"${q.totalWorkHours}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_kuota_24hari_${monthToUse}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMonthlyWord = async () => {
    const currentUser = AttendanceService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Ekspor Word hanya dapat dilakukan oleh administrator.');
      router.push('/');
      return;
    }
    if (!monthToUse) {
      alert('Pilih bulan rekap terlebih dahulu.');
      return;
    }

    setExportingWord(true);
    try {
      const [year, month] = monthToUse.split('-').map(Number);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const monthlyAttendances = await AttendanceService.getAllAttendances({
        dateFrom: `${monthToUse}-01`,
        dateTo: `${monthToUse}-${String(lastDay).padStart(2, '0')}`,
      });
      const monthlyQuotas = activeStaff
        .map((employee) =>
          calculateEmployeeQuota(monthlyAttendances, employee, monthToUse, MANDATORY_MONTHLY_DAYS)
        )
        .sort((a, b) => a.employee.name.localeCompare(b.employee.name));
      const logoResponse = await fetch('/logo.png');
      if (!logoResponse.ok) throw new Error('Logo perusahaan tidak dapat dimuat.');

      const { createMonthlyAttendanceDocx, getMonthlyAttendanceFilename } = await import(
        '@/lib/monthly-attendance-docx'
      );
      const blob = await createMonthlyAttendanceDocx({
        month: monthToUse,
        attendances: monthlyAttendances,
        quotas: monthlyQuotas,
        generatedBy: currentUser.name,
        logo: await logoResponse.arrayBuffer(),
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getMonthlyAttendanceFilename(monthToUse);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Gagal membuat dokumen Word.');
    } finally {
      setExportingWord(false);
    }
  };

  // Export Daily Log CSV
  const handleExportDailyCSV = () => {
    if (attendances.length === 0) {
      alert('Tidak ada data untuk diexport.');
      return;
    }

    const headers = [
      'NIK / Kode',
      'Nama Karyawan',
      'Departemen',
      'Tanggal',
      'Hari',
      'Jam Masuk (Clock In)',
      'Jam Pulang (Clock Out)',
      'Total Jam Kerja',
      'Status Kehadiran',
      'Catatan',
      'Link Selfie Masuk',
      'Link Selfie Pulang',
    ];

    const rows = attendances.map((item) => {
      const dayName = new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long' });
      const clockInStr = item.clock_in ? new Date(item.clock_in).toLocaleTimeString('id-ID') : '-';
      const clockOutStr = item.clock_out ? new Date(item.clock_out).toLocaleTimeString('id-ID') : '-';

      return [
        `"${item.employee?.employee_code || '-'}"`,
        `"${item.employee?.name || '-'}"`,
        `"${item.employee?.department || '-'}"`,
        `"${item.date}"`,
        `"${dayName}"`,
        `"${clockInStr}"`,
        `"${clockOutStr}"`,
        `"${item.work_hours || 0}"`,
        `"${item.status === 'on_time' ? 'Tepat Waktu' : 'Terlambat'}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        `"${item.selfie_in_url || '-'}"`,
        `"${item.selfie_out_url || '-'}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_presensi_harian_${dateFrom}_sd_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Dashboard Admin
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              Tarik & Rekap Presensi Pegawai
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Pantau pemenuhan <strong>target minimal 24 hari masuk per bulan</strong> dan tarik data rekap absensi.
          </p>
        </div>

        {/* Export actions are available only inside this admin-protected page. */}
        {activeTab === 'quota' ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <NeuButton
              variant="primary"
              size="md"
              onClick={handleExportMonthlyWord}
              disabled={!monthToUse || activeStaff.length === 0}
              isLoading={exportingWord}
              className="shadow-md"
            >
              <FileText className="w-4 h-4" />
              <span>Unduh Rekap Bulanan (Word)</span>
            </NeuButton>
            <NeuButton
              variant="success"
              size="md"
              onClick={handleExportQuotaCSV}
              disabled={filteredQuotas.length === 0}
              className="shadow-md"
            >
              <FileDown className="w-4 h-4" />
              <span>Export CSV</span>
            </NeuButton>
          </div>
        ) : (
          <NeuButton
            variant="primary"
            size="md"
            onClick={handleExportDailyCSV}
            disabled={attendances.length === 0}
            className="shadow-md"
          >
            <FileDown className="w-4 h-4" />
            <span>Export Log Harian (CSV)</span>
          </NeuButton>
        )}
      </div>

      {/* Tabs Selector: Rekap Kuota 24 Hari vs Log Harian */}
      <div className="flex items-center gap-2 border-b border-slate-200/60 pb-1">
        <button
          onClick={() => setActiveTab('quota')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'quota'
              ? 'neu-inset text-blue-600'
              : 'neu-btn text-slate-600 hover:text-slate-900'
          }`}
        >
          <Target className="w-4 h-4 text-emerald-600" />
          <span>Rekap Kuota Bulanan (Target 24 Hari)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 font-extrabold">
            Wajib 24 Hari
          </span>
        </button>

        <button
          onClick={() => setActiveTab('daily')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'daily'
              ? 'neu-inset text-blue-600'
              : 'neu-btn text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Log Harian & Foto Selfie</span>
        </button>
      </div>

      {/* TAB 1: REKAP KUOTA 24 HARI BULANAN */}
      {activeTab === 'quota' && (
        <div className="space-y-6">
          {/* Summary Stat Pills for 24-day Quota */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NeuCard variant="sm" className="py-3 px-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Pegawai
              </span>
              <span className="text-xl font-black text-slate-800">
                {totalEmployeesInQuota} Orang
              </span>
            </NeuCard>

            <NeuCard variant="sm" className="py-3 px-4">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                ✓ Capai Target (≥ 24 Hari)
              </span>
              <span className="text-xl font-black text-emerald-700">
                {metTargetCount} Pegawai
              </span>
            </NeuCard>

            <NeuCard variant="sm" className="py-3 px-4">
              <span className="text-[10px] uppercase font-bold text-rose-500 block">
                ⚠️ Kurang (&lt; 24 Hari)
              </span>
              <span className="text-xl font-black text-rose-700">
                {pendingTargetCount} Pegawai
              </span>
            </NeuCard>

            <NeuCard variant="sm" className="py-3 px-4">
              <span className="text-[10px] uppercase font-bold text-blue-500 block">
                Tingkat Kepatuhan
              </span>
              <span className="text-xl font-black text-blue-600">
                {complianceRate}%
              </span>
            </NeuCard>
          </div>

          {/* Quota Filter Bar */}
          <NeuCard className="space-y-3 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Bulan Periode */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Bulan Periode
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 neu-input text-xs font-semibold text-slate-800"
                />
              </div>

              {/* Status Kuota Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Status Capaian 24 Hari
                </label>
                <select
                  value={quotaStatusFilter}
                  onChange={(e) => setQuotaStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 neu-input text-xs font-semibold text-slate-800"
                >
                  <option value="all">Semua Status Capaian</option>
                  <option value="met">🟢 Memenuhi Target (≥ 24 Hari)</option>
                  <option value="pending">🔴 Kurang dari Target (&lt; 24 Hari)</option>
                  <option value="surplus">🔵 Surplus / Lebih (&gt; 24 Hari)</option>
                </select>
              </div>

              {/* Departemen */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Departemen
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 neu-input text-xs font-semibold text-slate-800"
                >
                  <option value="all">Semua Departemen</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Cari Nama / NIK
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nama / NIK..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 neu-input text-xs"
                  />
                </div>
              </div>
            </div>
          </NeuCard>

          {/* Quota Table & Cards */}
          <NeuCard>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  Tabel Capaian Kuota Minimal 24 Hari Kerja (Periode: {monthToUse})
                </h3>
                <p className="text-xs text-slate-500">
                  Sabtu dan Minggu terhitung sebagai hari kerja reguler penambah target kuota.
                </p>
              </div>
            </div>

            {/* Mobile View: Quota Cards */}
            <div className="block sm:hidden space-y-3">
              {filteredQuotas.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada data pegawai yang sesuai filter.
                </div>
              ) : (
                filteredQuotas.map((item) => (
                  <div key={item.employee.id} className="neu-card p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.employee.avatar_url || ''}
                          alt={item.employee.name}
                          className="w-8 h-8 rounded-full object-cover neu-inset p-0.5"
                        />
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{item.employee.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {item.employee.employee_code} • {item.employee.department}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          item.isTargetMet
                            ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-700 border border-rose-500/30'
                        }`}
                      >
                        {item.isTargetMet ? '✓ TARGET TERCAPAI' : `KURANG ${item.remainingDays} HARI`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>Hadir: {item.totalPresentDays} / 24 Hari</span>
                        <span>{item.progressPercentage}%</span>
                      </div>
                      <div className="w-full h-2.5 neu-inset rounded-full p-0.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.isTargetMet ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{
                            width: `${Math.min(100, (item.totalPresentDays / 24) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/50">
                      <span>Tepat Waktu: <strong>{item.onTimeDays}</strong></span>
                      <span>Terlambat: <strong>{item.lateDays}</strong></span>
                      <span>Total: <strong>{item.totalWorkHours} Jam</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View: Quota Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">NIK</th>
                    <th className="py-3 px-3">Pegawai</th>
                    <th className="py-3 px-3">Departemen</th>
                    <th className="py-3 px-3">Kehadiran (Target 24)</th>
                    <th className="py-3 px-3 w-48">Progres Kuota</th>
                    <th className="py-3 px-3">Status Capaian</th>
                    <th className="py-3 px-3">Keterangan</th>
                    <th className="py-3 px-3">Total Jam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40">
                  {filteredQuotas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tidak ada data pegawai yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotas.map((item) => (
                      <tr key={item.employee.id} className="hover:bg-slate-200/40 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-600">
                          {item.employee.employee_code}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={item.employee.avatar_url || ''}
                              alt={item.employee.name}
                              className="w-7 h-7 rounded-full object-cover neu-inset p-0.5"
                            />
                            <span className="font-bold text-slate-800">{item.employee.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-600">{item.employee.department}</td>
                        <td className="py-3.5 px-3 font-bold text-slate-800">
                          <span className="text-sm font-black text-blue-700">
                            {item.totalPresentDays}
                          </span>{' '}
                          / 24 Hari
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                              <span>{item.progressPercentage}%</span>
                            </div>
                            <div className="w-full h-2.5 neu-inset rounded-full p-0.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  item.isTargetMet
                                    ? 'bg-emerald-500'
                                    : 'bg-blue-600'
                                }`}
                                style={{
                                  width: `${Math.min(100, (item.totalPresentDays / 24) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {item.isTargetMet ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/30">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Target Tercapai ({item.totalPresentDays}/24)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-800 border border-rose-500/30">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                              Kurang {item.remainingDays} Hari ({item.totalPresentDays}/24)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {item.surplusDays > 0 ? (
                            <span className="text-blue-600 font-bold">
                              Surplus +{item.surplusDays} Hari Ekstra
                            </span>
                          ) : item.isTargetMet ? (
                            <span className="text-emerald-600 font-semibold">Syarat Terpenuhi</span>
                          ) : (
                            <span className="text-amber-700">Perlu {item.remainingDays} Hari Lagi</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-slate-700">
                          {item.totalWorkHours} Jam
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </NeuCard>
        </div>
      )}

      {/* TAB 2: LOG HARIAN & FOTO SELFIE */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Filter Panel */}
          <NeuCard className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Filter className="w-4 h-4 text-blue-600" />
                Parameter Penarikan Log Harian
              </div>
              <button
                onClick={() => {
                  const today = getJakartaDateKey();
                  setDateFrom(addDaysToDateKey(today, -30));
                  setDateTo(today);
                  setDepartment('all');
                  setStatus('all');
                  setSearch('');
                }}
                className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
              >
                Reset Filter
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 neu-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 neu-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Departemen
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 neu-input text-xs"
                >
                  <option value="all">Semua Departemen</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Status Kehadiran
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 neu-input text-xs"
                >
                  <option value="all">Semua Status</option>
                  <option value="on_time">Tepat Waktu (≤ 07:15 WIB)</option>
                  <option value="late">Terlambat (&gt; 07:15 WIB)</option>
                </select>
              </div>

              <div className="flex items-end">
                <NeuButton
                  variant="primary"
                  size="md"
                  onClick={() => fetchData()}
                  isLoading={loading}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tarik Data</span>
                </NeuButton>
              </div>
            </div>

            <div className="pt-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama karyawan atau kode NIK..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                  className="w-full pl-9 pr-4 py-2.5 neu-input text-xs"
                />
              </div>
            </div>
          </NeuCard>

          {/* Daily Records Display */}
          <NeuCard>
            {/* Mobile View: Cards */}
            <div className="block sm:hidden space-y-3">
              {loading ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  Menarik data presensi...
                </div>
              ) : attendances.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada data presensi yang sesuai filter.
                </div>
              ) : (
                attendances.map((item) => (
                  <div key={item.id} className="neu-card p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{item.employee?.name || '-'}</p>
                        <p className="text-[10px] text-slate-500">
                          {item.employee?.employee_code} • {item.employee?.department}
                        </p>
                      </div>
                      <NeuBadge status={item.status} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 px-0.5">
                      <span>{formatIndoDate(item.date)}</span>
                      <span className="font-bold text-slate-700 bg-slate-200/50 px-2 py-0.5 rounded">
                        {item.work_hours || 0} Jam
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50">
                      <div className="neu-inset p-2 rounded-xl flex items-center gap-2">
                        {item.selfie_in_url ? (
                          <div
                            onClick={() =>
                              setSelectedPhoto({
                                url: item.selfie_in_url!,
                                title: `Selfie Masuk - ${item.employee?.name}`,
                              })
                            }
                            className="w-8 h-8 rounded-lg overflow-hidden neu-card p-0.5 cursor-pointer shrink-0"
                          >
                            <img src={item.selfie_in_url} alt="In" className="w-full h-full object-cover rounded" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                            -
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Masuk (07:00)</span>
                          <p className="text-[10px] font-bold text-slate-800 truncate">
                            {item.clock_in ? formatIndoTime(item.clock_in) : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="neu-inset p-2 rounded-xl flex items-center gap-2">
                        {item.selfie_out_url ? (
                          <div
                            onClick={() =>
                              setSelectedPhoto({
                                url: item.selfie_out_url!,
                                title: `Selfie Pulang - ${item.employee?.name}`,
                              })
                            }
                            className="w-8 h-8 rounded-lg overflow-hidden neu-card p-0.5 cursor-pointer shrink-0"
                          >
                            <img src={item.selfie_out_url} alt="Out" className="w-full h-full object-cover rounded" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                            -
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Pulang (16:00)</span>
                          <p className="text-[10px] font-bold text-slate-800 truncate">
                            {item.clock_out ? formatIndoTime(item.clock_out) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">NIK</th>
                    <th className="py-3 px-3">Nama Karyawan</th>
                    <th className="py-3 px-3">Departemen</th>
                    <th className="py-3 px-3">Tanggal</th>
                    <th className="py-3 px-3">Clock In (07:00)</th>
                    <th className="py-3 px-3">Clock Out (16:00)</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Selfie In</th>
                    <th className="py-3 px-3">Selfie Out</th>
                    <th className="py-3 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        Menarik data presensi...
                      </td>
                    </tr>
                  ) : attendances.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        Tidak ada data presensi yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    attendances.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-200/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-600">
                          {item.employee?.employee_code || '-'}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          {item.employee?.name || 'Karyawan'}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {item.employee?.department || '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                          {formatIndoDate(item.date)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {item.clock_in ? formatIndoTime(item.clock_in) : '-'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {item.clock_out ? formatIndoTime(item.clock_out) : '-'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <NeuBadge status={item.status} size="sm" />
                        </td>
                        <td className="py-3 px-3">
                          {item.selfie_in_url ? (
                            <div
                              onClick={() =>
                                setSelectedPhoto({
                                  url: item.selfie_in_url!,
                                  title: `Selfie Masuk - ${item.employee?.name}`,
                                })
                              }
                              className="w-8 h-8 rounded-lg overflow-hidden neu-card p-0.5 cursor-pointer hover:scale-105 transition-transform"
                            >
                              <img
                                src={item.selfie_in_url}
                                alt="Selfie In"
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.selfie_out_url ? (
                            <div
                              onClick={() =>
                                setSelectedPhoto({
                                  url: item.selfie_out_url!,
                                  title: `Selfie Pulang - ${item.employee?.name}`,
                                })
                              }
                              className="w-8 h-8 rounded-lg overflow-hidden neu-card p-0.5 cursor-pointer hover:scale-105 transition-transform"
                            >
                              <img
                                src={item.selfie_out_url}
                                alt="Selfie Out"
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-[150px] truncate" title={item.notes || ''}>
                          {item.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </NeuCard>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="neu-card w-full max-w-md p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-800 text-sm truncate">{selectedPhoto.title}</h4>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 neu-btn rounded-full text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="neu-inset-deep p-2 rounded-xl overflow-hidden aspect-square flex items-center justify-center">
              <img
                src={selectedPhoto.url}
                alt="Foto Selfie"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
