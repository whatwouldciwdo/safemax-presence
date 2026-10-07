'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { NeuCard } from '@/components/ui/NeuCard';
import { NeuButton } from '@/components/ui/NeuButton';
import { NeuInput } from '@/components/ui/NeuInput';
import { AttendanceService } from '@/lib/attendance-service';
import { Employee } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  useEffect(() => {
    const user = AttendanceService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent, customUser?: { id: string; pass: string }) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const loginId = customUser ? customUser.id : identifier;
    const loginPass = customUser ? customUser.pass : password;

    if (!loginId) {
        setErrorMessage('Harap masukkan username atau NIP.');
      setIsLoading(false);
      return;
    }

    try {
      const result = await AttendanceService.login(loginId, loginPass);
      if (result.success && result.user) {
        if (result.user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/absensi');
        }
      } else {
        setErrorMessage(result.message || 'Gagal masuk. Periksa kembali kredensial Anda.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    AttendanceService.logout();
    setCurrentUser(null);
    setIdentifier('');
    setPassword('');
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 p-2.5 rounded-2xl mx-auto flex items-center justify-center bg-white shadow-md border border-slate-200/60">
            <img
              src="/logo.png"
              alt="Company Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              SAFEMAX
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Sistem Presensi Karyawan
            </p>
          </div>
        </div>

        {/* Existing Session Card (If Already Logged In) */}
        {currentUser && (
          <NeuCard className="p-4 border-l-4 border-blue-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={
                  currentUser.avatar_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover neu-inset p-0.5"
              />
              <div>
                <p className="text-xs text-slate-500 font-medium">Sedang masuk sebagai:</p>
                <p className="text-sm font-extrabold text-slate-800">{currentUser.name}</p>
                <span className="text-[10px] font-bold text-blue-600 uppercase">
                  {currentUser.role === 'admin' ? '🛡️ Administrator HR' : '👤 Karyawan'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <NeuButton
                size="sm"
                variant="primary"
                onClick={() =>
                  router.push(currentUser.role === 'admin' ? '/admin' : '/absensi')
                }
              >
                <span>Buka</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NeuButton>
              <button
                onClick={handleLogout}
                className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold"
              >
                Ganti Akun
              </button>
            </div>
          </NeuCard>
        )}

        {/* Login Form Card */}
        <NeuCard className="p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-200/60 pb-3">
            <h2 className="text-base font-bold text-slate-800">Masuk ke Akun Anda</h2>
            <p className="text-xs text-slate-500">
              Gunakan username atau NIP Anda untuk login.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 neu-inset rounded-xl border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 ml-1">
                Username atau NIP
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Masukkan username atau NIP"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 neu-input text-sm text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 ml-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 neu-input text-sm text-slate-800"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <NeuButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full h-12 mt-2"
            >
              <span>Masuk Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </NeuButton>
          </form>
        </NeuCard>

      </div>
    </div>
  );
}
