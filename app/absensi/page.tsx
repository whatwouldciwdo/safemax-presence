'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Target,
  History,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NeuCard } from '@/components/ui/NeuCard';
import { NeuButton } from '@/components/ui/NeuButton';
import { NeuBadge } from '@/components/ui/NeuBadge';
import { SelfieCamera } from '@/components/camera/SelfieCamera';
import { AttendanceService } from '@/lib/attendance-service';
import { Attendance, Employee, EmployeeMonthlyQuota } from '@/lib/types';
import {
  formatIndoDate,
  formatIndoTime,
  evaluateAttendance,
  calculateEmployeeQuota,
  MANDATORY_MONTHLY_DAYS,
} from '@/lib/attendance-utils';

export default function AbsensiPage() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [monthlyQuota, setMonthlyQuota] = useState<EmployeeMonthlyQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState('');

  // Camera Modal State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraType, setCameraType] = useState<'in' | 'out'>('in');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Clock Interval
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load User, Today's Attendance, and Monthly Quota
  useEffect(() => {
    const user = AttendanceService.getCurrentUser();
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    loadData(user);
  }, [router]);

  const loadData = async (user: Employee) => {
    setLoading(true);
    try {
      const att = await AttendanceService.getTodayAttendance(user.id);
      setTodayAttendance(att);

      const history = await AttendanceService.getEmployeeHistory(user.id);
      const currentYearMonth = new Date().toISOString().substring(0, 7);
      const quota = calculateEmployeeQuota(history, user, currentYearMonth, MANDATORY_MONTHLY_DAYS);
      setMonthlyQuota(quota);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCapture = (type: 'in' | 'out') => {
    setCameraType(type);
    setIsCameraOpen(true);
    setErrorMessage(null);
  };

  const handlePhotoCaptured = async (selfieDataUrl: string) => {
    if (!currentUser) return;
    setIsCameraOpen(false);
    setActionLoading(true);
    setErrorMessage(null);

    try {
      if (cameraType === 'in') {
        const result = await AttendanceService.clockIn(currentUser.id, selfieDataUrl, notes);
        setTodayAttendance(result);
        const evalResult = evaluateAttendance(new Date());
        setSuccessMessage(`Berhasil Clock In! ${evalResult.message}`);
      } else {
        const result = await AttendanceService.clockOut(currentUser.id, selfieDataUrl, notes);
        setTodayAttendance(result);
        setSuccessMessage(
          `Berhasil Clock Out! Total jam kerja: ${result.work_hours || 0} jam.`
        );
      }
      setNotes('');
      // Refresh quota progress
      loadData(currentUser);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat absensi.';
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const isClockedIn = Boolean(todayAttendance?.clock_in);
  const isClockedOut = Boolean(todayAttendance?.clock_out);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: Greeting & Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-extrabold tracking-widest text-blue-600 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              Presensi Selfie Digital
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Selamat {currentTime && currentTime.getHours() < 11 ? 'Pagi' : currentTime && currentTime.getHours() < 15 ? 'Siang' : 'Sore'}, {currentUser?.name || 'Karyawan'}!
          </h1>
          <p className="text-sm text-slate-500">
            Jam kerja: <strong>07:00 – 16:00 WIB</strong> (Toleransi keterlambatan hingga 07:15 WIB).
          </p>
        </div>

        <Link href="/riwayat">
          <NeuButton size="sm" variant="default" className="text-slate-700">
            <History className="w-4 h-4 text-blue-600" />
            Lihat Riwayat Saya
          </NeuButton>
        </Link>
      </div>

      {/* Monthly Quota Tracker Card (24 Days / Month) */}
      {monthlyQuota && (
        <NeuCard className="p-5 border-l-4 border-blue-600 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 neu-inset rounded-xl text-blue-600">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  Target Kehadiran Bulan Ini (Wajib 24 Hari)
                </h3>
                <p className="text-xs text-slate-500">
                  {monthlyQuota.isTargetMet
                    ? `🎉 Selamat! Anda telah memenuhi syarat kehadiran minimal (${monthlyQuota.totalPresentDays} hari).`
                    : `Tersisa ${monthlyQuota.remainingDays} hari lagi untuk mencapai kuota 24 hari bulan ini.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  monthlyQuota.isTargetMet
                    ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                }`}
              >
                {monthlyQuota.isTargetMet
                  ? `✓ Target Terpenuhi (${monthlyQuota.totalPresentDays}/24)`
                  : `Kurang ${monthlyQuota.remainingDays} Hari (${monthlyQuota.totalPresentDays}/24)`}
              </span>
            </div>
          </div>

          {/* Neumorphic Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>Progres Kehadiran: {monthlyQuota.totalPresentDays} dari 24 Hari Kerja</span>
              <span>{monthlyQuota.progressPercentage}%</span>
            </div>
            <div className="w-full h-3.5 neu-inset rounded-full p-0.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  monthlyQuota.isTargetMet
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                }`}
                style={{ width: `${Math.min(100, (monthlyQuota.totalPresentDays / 24) * 100)}%` }}
              />
            </div>
          </div>
        </NeuCard>
      )}

      {/* Success / Error Notifications */}
      {successMessage && (
        <div className="neu-card p-4 border-l-4 border-emerald-500 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 neu-btn rounded-lg"
          >
            Tutup
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="neu-card p-4 border-l-4 border-rose-500 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-sm font-semibold text-rose-800">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 neu-btn rounded-lg"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Grid: Clock & Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Real-Time Clock & Rule Explanation */}
        <div className="lg:col-span-5 space-y-6">
          {/* Real-time Neumorphic Clock Card */}
          <NeuCard className="text-center flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 neu-circle flex items-center justify-center text-blue-600 mb-4">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>

            <div className="neu-inset px-6 py-3 rounded-2xl mb-3">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-wider text-slate-800">
                {currentTime
                  ? currentTime.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : '--:--:--'}
              </span>
              <span className="text-xs font-bold text-slate-400 ml-2">WIB</span>
            </div>

            <p className="text-sm font-medium text-slate-600">
              {currentTime ? formatIndoDate(currentTime) : 'Memuat tanggal...'}
            </p>

            <div className="w-full mt-6 pt-5 border-t border-slate-200/50 flex items-center justify-around text-xs text-slate-600">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Jadwal Masuk
                </span>
                <span className="font-bold text-slate-700">07:00 WIB</span>
              </div>
              <div className="w-px h-6 bg-slate-300" />
              <div className="text-center">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Toleransi
                </span>
                <span className="font-bold text-amber-600">07:15 WIB</span>
              </div>
              <div className="w-px h-6 bg-slate-300" />
              <div className="text-center">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                  Jadwal Pulang
                </span>
                <span className="font-bold text-slate-700">16:00 WIB</span>
              </div>
            </div>
          </NeuCard>
        </div>

        {/* Right Column: Clock In/Out Actions & Today's State */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status Today Overview Card */}
          <NeuCard>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-800">Status Presensi Hari Ini</h3>
                <p className="text-xs text-slate-500">
                  {currentTime ? formatIndoDate(currentTime) : '-'}
                </p>
              </div>

              {todayAttendance?.status ? (
                <NeuBadge status={todayAttendance.status} />
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-600">
                  Belum Ada Absen
                </span>
              )}
            </div>

            {/* In / Out Details with Photo Thumbnails */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Clock In Info Card */}
              <div className="neu-inset p-4 rounded-xl flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl overflow-hidden neu-card p-0.5 shrink-0 bg-slate-300">
                  {todayAttendance?.selfie_in_url ? (
                    <img
                      src={todayAttendance.selfie_in_url}
                      alt="Selfie Clock In"
                      className="w-full h-full object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => window.open(todayAttendance.selfie_in_url || '', '_blank')}
                      title="Klik untuk memperbesar"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase">
                    <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                    Clock In (Masuk)
                  </div>
                  <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                    {todayAttendance?.clock_in
                      ? formatIndoTime(todayAttendance.clock_in)
                      : 'Belum Clock In'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {todayAttendance?.clock_in ? 'Selfie berhasil diverifikasi' : 'Jadwal masuk: 07:00 WIB'}
                  </p>
                </div>
              </div>

              {/* Clock Out Info Card */}
              <div className="neu-inset p-4 rounded-xl flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl overflow-hidden neu-card p-0.5 shrink-0 bg-slate-300">
                  {todayAttendance?.selfie_out_url ? (
                    <img
                      src={todayAttendance.selfie_out_url}
                      alt="Selfie Clock Out"
                      className="w-full h-full object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => window.open(todayAttendance.selfie_out_url || '', '_blank')}
                      title="Klik untuk memperbesar"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase">
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    Clock Out (Pulang)
                  </div>
                  <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                    {todayAttendance?.clock_out
                      ? formatIndoTime(todayAttendance.clock_out)
                      : 'Belum Clock Out'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {todayAttendance?.work_hours
                      ? `Total: ${todayAttendance.work_hours} Jam`
                      : 'Jadwal pulang: 16:00 WIB'}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes field */}
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Catatan / Keterangan (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Tugas dinas luar / operational shift"
                className="w-full px-4 py-2.5 neu-input text-sm text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Action Buttons: Clock In & Clock Out */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NeuButton
                variant="success"
                size="lg"
                disabled={isClockedIn || actionLoading}
                isLoading={actionLoading && cameraType === 'in'}
                onClick={() => handleOpenCapture('in')}
                className="w-full h-14"
              >
                <LogIn className="w-5 h-5" />
                <span>{isClockedIn ? 'Sudah Clock In' : 'Clock In (Selfie Masuk)'}</span>
              </NeuButton>

              <NeuButton
                variant="danger"
                size="lg"
                disabled={!isClockedIn || isClockedOut || actionLoading}
                isLoading={actionLoading && cameraType === 'out'}
                onClick={() => handleOpenCapture('out')}
                className="w-full h-14"
              >
                <LogOut className="w-5 h-5" />
                <span>
                  {isClockedOut
                    ? 'Sudah Clock Out'
                    : !isClockedIn
                    ? 'Clock Out (Terkunci)'
                    : 'Clock Out (Selfie Pulang)'}
                </span>
              </NeuButton>
            </div>

            {/* Completion message */}
            {isClockedIn && isClockedOut && (
              <div className="mt-5 p-3 neu-inset rounded-xl text-center text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Presensi hari ini telah lengkap (Masuk & Pulang selesai). Kehadiran tercatat ke kuota 24 hari!
              </div>
            )}
          </NeuCard>

          {/* Quick Stats Summary Card */}
          <div className="grid grid-cols-3 gap-4">
            <NeuCard variant="sm" className="text-center py-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Jam Kerja
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-blue-600">
                07:00 – 16:00
              </span>
            </NeuCard>

            <NeuCard variant="sm" className="text-center py-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Toleransi
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-amber-600">
                07:15 WIB
              </span>
            </NeuCard>

            <NeuCard variant="sm" className="text-center py-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                Target Bulanan
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-600 flex items-center justify-center gap-1">
                <Target className="w-3.5 h-3.5" /> 24 Hari
              </span>
            </NeuCard>
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <SelfieCamera
          title={
            cameraType === 'in'
              ? 'Ambil Selfie Clock In (Masuk 07:00)'
              : 'Ambil Selfie Clock Out (Pulang 16:00)'
          }
          onCapture={handlePhotoCaptured}
          onCancel={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
}
