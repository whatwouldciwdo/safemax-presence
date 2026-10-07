'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Calendar,
  ExternalLink,
  Search,
  Filter,
  Eye,
  X,
  Target,
} from 'lucide-react';
import { NeuCard } from '@/components/ui/NeuCard';
import { NeuButton } from '@/components/ui/NeuButton';
import { NeuBadge } from '@/components/ui/NeuBadge';
import { AttendanceService } from '@/lib/attendance-service';
import { Attendance, DashboardStats, Employee } from '@/lib/types';
import { formatIndoDate, formatIndoTime, getJakartaDateKey } from '@/lib/attendance-utils';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);

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
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const statsData = await AttendanceService.getDashboardStats();
      setStats(statsData);

      const todayStr = getJakartaDateKey();
      const list = await AttendanceService.getAllAttendances({
        dateFrom: todayStr,
        dateTo: todayStr,
      });
      // If today is empty in demo, fetch all to display live previews
      if (list.length === 0) {
        const all = await AttendanceService.getAllAttendances();
        setAttendances(all);
      } else {
        setAttendances(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendances = attendances.filter((att) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = att.employee?.name.toLowerCase() || '';
    const dept = att.employee?.department.toLowerCase() || '';
    const code = att.employee?.employee_code.toLowerCase() || '';
    return name.includes(q) || dept.includes(q) || code.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-extrabold tracking-widest text-purple-600 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              Panel Pengelola
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Data Real-time Presensi
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Dashboard Admin Presensi
          </h1>
          <p className="text-sm text-slate-500">
            Pantau kehadiran karyawan, validasi foto selfie, dan tarik rekap data absensi.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3">
          <Link href="/admin/rekap">
            <NeuButton variant="primary" size="md">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Tarik Data & Rekap Lengkap</span>
            </NeuButton>
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Karyawan */}
        <NeuCard variant="sm" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Karyawan</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">
              {stats?.totalEmployees || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Total terdaftar</p>
          </div>
        </NeuCard>

        {/* Hadir Hari Ini */}
        <NeuCard variant="sm" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Hadir</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">
              {stats?.presentToday || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tingkat: {stats?.attendanceRate || 0}%
            </p>
          </div>
        </NeuCard>

        {/* Tepat Waktu */}
        <NeuCard variant="sm" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tepat Waktu</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">
              {stats?.onTimeCount || 0}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">≤ 07:15 WIB</p>
          </div>
        </NeuCard>

        {/* Terlambat */}
        <NeuCard variant="sm" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Terlambat</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700">
              {stats?.lateCount || 0}
            </div>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">&gt; 07:15 WIB</p>
          </div>
        </NeuCard>

        {/* Target Kuota Bulanan (24 Hari) */}
        <NeuCard variant="sm" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Target Kuota</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">
              24 Hari
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Minimal / Bulan</p>
          </div>
        </NeuCard>

        {/* Belum Absen */}
        <NeuCard variant="sm" className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Belum Masuk</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-700">
              {stats?.absentCount || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Hari ini</p>
          </div>
        </NeuCard>
      </div>

      {/* Main Table: Today's Feed & Verifications */}
      <NeuCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/50 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Daftar Presensi & Verifikasi Selfie
            </h2>
            <p className="text-xs text-slate-500">
              Verifikasi visual foto selfie karyawan saat Clock In dan Clock Out.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama karyawan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 neu-input text-xs"
              />
            </div>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="block sm:hidden space-y-3">
          {filteredAttendances.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              Tidak ada data presensi yang ditemukan.
            </div>
          ) : (
            filteredAttendances.map((item) => (
              <div key={item.id} className="neu-card p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={
                        item.employee?.avatar_url ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={item.employee?.name || 'Staff'}
                      className="w-8 h-8 rounded-full object-cover neu-inset p-0.5"
                    />
                    <div>
                      <p className="font-bold text-slate-800 text-xs">
                        {item.employee?.name || 'Karyawan'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {item.employee?.department || '-'}
                      </p>
                    </div>
                  </div>
                  <NeuBadge status={item.status} size="sm" />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>{formatIndoDate(item.date)}</span>
                  {item.work_hours ? (
                    <span className="font-bold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded-md">
                      {item.work_hours} Jam
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50">
                  {/* Selfie & Clock In */}
                  <div className="neu-inset p-2 rounded-xl flex items-center gap-2">
                    {item.selfie_in_url ? (
                      <div
                        onClick={() =>
                          setSelectedPhoto({
                            url: item.selfie_in_url!,
                            title: `Selfie Masuk - ${item.employee?.name}`,
                          })
                        }
                        className="w-9 h-9 rounded-lg overflow-hidden neu-card p-0.5 cursor-pointer shrink-0"
                      >
                        <img
                          src={item.selfie_in_url}
                          alt="In"
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0 text-[10px]">
                        -
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        Masuk
                      </span>
                      <p className="text-[11px] font-bold text-slate-800 truncate">
                        {item.clock_in ? formatIndoTime(item.clock_in) : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Selfie & Clock Out */}
                  <div className="neu-inset p-2 rounded-xl flex items-center gap-2">
                    {item.selfie_out_url ? (
                      <div
                        onClick={() =>
                          setSelectedPhoto({
                            url: item.selfie_out_url!,
                            title: `Selfie Pulang - ${item.employee?.name}`,
                          })
                        }
                        className="w-9 h-9 rounded-lg overflow-hidden neu-card p-0.5 cursor-pointer shrink-0"
                      >
                        <img
                          src={item.selfie_out_url}
                          alt="Out"
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0 text-[10px]">
                        -
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        Pulang
                      </span>
                      <p className="text-[11px] font-bold text-slate-800 truncate">
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
                <th className="py-3 px-3">Karyawan</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Selfie Masuk</th>
                <th className="py-3 px-3">Selfie Pulang</th>
                <th className="py-3 px-3">Jam Masuk</th>
                <th className="py-3 px-3">Jam Pulang</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Durasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40">
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    Tidak ada data presensi yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-200/40 transition-colors">
                    {/* Employee Profile */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            item.employee?.avatar_url ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                          }
                          alt={item.employee?.name || 'Staff'}
                          className="w-8 h-8 rounded-full object-cover neu-inset p-0.5 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-800 text-xs">
                            {item.employee?.name || 'Karyawan'}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {item.employee?.employee_code || '-'} •{' '}
                            {item.employee?.department || '-'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                      {formatIndoDate(item.date)}
                    </td>

                    {/* Selfie In */}
                    <td className="py-3.5 px-3">
                      {item.selfie_in_url ? (
                        <div
                          onClick={() =>
                            setSelectedPhoto({
                              url: item.selfie_in_url!,
                              title: `Selfie Masuk - ${item.employee?.name}`,
                            })
                          }
                          className="w-10 h-10 rounded-lg overflow-hidden neu-card p-0.5 cursor-pointer hover:scale-105 transition-transform"
                        >
                          <img
                            src={item.selfie_in_url}
                            alt="Selfie In"
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* Selfie Out */}
                    <td className="py-3.5 px-3">
                      {item.selfie_out_url ? (
                        <div
                          onClick={() =>
                            setSelectedPhoto({
                              url: item.selfie_out_url!,
                              title: `Selfie Pulang - ${item.employee?.name}`,
                            })
                          }
                          className="w-10 h-10 rounded-lg overflow-hidden neu-card p-0.5 cursor-pointer hover:scale-105 transition-transform"
                        >
                          <img
                            src={item.selfie_out_url}
                            alt="Selfie Out"
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* Clock In */}
                    <td className="py-3.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {item.clock_in ? formatIndoTime(item.clock_in) : '-'}
                    </td>

                    {/* Clock Out */}
                    <td className="py-3.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {item.clock_out ? formatIndoTime(item.clock_out) : '-'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <NeuBadge status={item.status} size="sm" />
                    </td>

                    {/* Work Hours */}
                    <td className="py-3.5 px-3 font-bold text-slate-700 whitespace-nowrap">
                      {item.work_hours ? `${item.work_hours} Jam` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </NeuCard>

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
