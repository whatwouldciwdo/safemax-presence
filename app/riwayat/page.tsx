'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  ArrowLeft,
  Camera,
  LogIn,
  LogOut,
  Sparkles,
  Search,
  ExternalLink,
  X,
} from 'lucide-react';
import { NeuCard } from '@/components/ui/NeuCard';
import { NeuButton } from '@/components/ui/NeuButton';
import { NeuBadge } from '@/components/ui/NeuBadge';
import { AttendanceService } from '@/lib/attendance-service';
import { Attendance, Employee } from '@/lib/types';
import { formatIndoDate, formatIndoTime } from '@/lib/attendance-utils';

export default function RiwayatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const user = AttendanceService.getCurrentUser();
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    loadHistory(user.id);
  }, [router]);

  const loadHistory = async (empId: string) => {
    setLoading(true);
    try {
      const data = await AttendanceService.getEmployeeHistory(empId);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/absensi"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Presensi
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Riwayat Presensi Saya
          </h1>
          <p className="text-sm text-slate-500">
            Daftar lengkap kehadiran, catatan lembur, dan foto selfie Anda.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['all', 'on_time', 'late', 'lembur'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                statusFilter === st ? 'neu-inset text-blue-600' : 'neu-btn text-slate-600'
              }`}
            >
              {st === 'all'
                ? 'Semua'
                : st === 'on_time'
                ? 'Tepat Waktu'
                : st === 'late'
                ? 'Terlambat'
                : 'Lembur'}
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      {loading ? (
        <div className="neu-card p-12 text-center text-slate-500">
          <Clock className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
          <p className="text-sm font-semibold">Memuat riwayat kehadiran...</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="neu-card p-12 text-center text-slate-500">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-bold text-slate-700">Belum ada riwayat absensi</p>
          <p className="text-xs text-slate-400 mt-1">
            Data absensi akan muncul setelah Anda melakukan Clock In pertama kali.
          </p>
          <Link href="/absensi" className="inline-block mt-4">
            <NeuButton variant="primary" size="sm">
              Lakukan Presensi Sekarang
            </NeuButton>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <NeuCard key={item.id} className="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 neu-circle flex items-center justify-center text-blue-600 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">
                      {formatIndoDate(item.date)}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {item.is_overtime ? 'Lembur Akhir Pekan (Sabtu/Minggu)' : 'Hari Kerja Reguler'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <NeuBadge status={item.status} />
                  {item.work_hours ? (
                    <span className="neu-inset px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700">
                      {item.work_hours} Jam
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Time and Selfie details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* Clock In */}
                <div className="neu-inset p-3.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden neu-card p-0.5 shrink-0 bg-slate-300">
                      {item.selfie_in_url ? (
                        <img
                          src={item.selfie_in_url}
                          alt="Selfie Masuk"
                          className="w-full h-full object-cover rounded cursor-pointer hover:opacity-90"
                          onClick={() =>
                            setSelectedPhoto({
                              url: item.selfie_in_url!,
                              title: `Selfie Masuk - ${formatIndoDate(item.date)}`,
                            })
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <LogIn className="w-3 h-3 text-emerald-600" />
                        Clock In
                      </span>
                      <p className="text-sm font-extrabold text-slate-800">
                        {item.clock_in ? formatIndoTime(item.clock_in) : '-'}
                      </p>
                    </div>
                  </div>
                  {item.selfie_in_url && (
                    <button
                      onClick={() =>
                        setSelectedPhoto({
                          url: item.selfie_in_url!,
                          title: `Selfie Masuk - ${formatIndoDate(item.date)}`,
                        })
                      }
                      className="text-xs text-blue-600 font-semibold p-1 neu-btn rounded-lg"
                      title="Lihat foto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Clock Out */}
                <div className="neu-inset p-3.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden neu-card p-0.5 shrink-0 bg-slate-300">
                      {item.selfie_out_url ? (
                        <img
                          src={item.selfie_out_url}
                          alt="Selfie Keluar"
                          className="w-full h-full object-cover rounded cursor-pointer hover:opacity-90"
                          onClick={() =>
                            setSelectedPhoto({
                              url: item.selfie_out_url!,
                              title: `Selfie Keluar - ${formatIndoDate(item.date)}`,
                            })
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <LogOut className="w-3 h-3 text-rose-600" />
                        Clock Out
                      </span>
                      <p className="text-sm font-extrabold text-slate-800">
                        {item.clock_out ? formatIndoTime(item.clock_out) : 'Belum Keluar'}
                      </p>
                    </div>
                  </div>
                  {item.selfie_out_url && (
                    <button
                      onClick={() =>
                        setSelectedPhoto({
                          url: item.selfie_out_url!,
                          title: `Selfie Keluar - ${formatIndoDate(item.date)}`,
                        })
                      }
                      className="text-xs text-blue-600 font-semibold p-1 neu-btn rounded-lg"
                      title="Lihat foto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {item.notes && (
                <div className="mt-3 text-xs text-slate-500 italic px-2">
                  Catatan: {item.notes}
                </div>
              )}
            </NeuCard>
          ))}
        </div>
      )}

      {/* Photo Modal Preview */}
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
