'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Clock,
  Calendar,
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Database,
  LogOut,
  LogIn,
  UserRound,
} from 'lucide-react';
import { Employee } from '@/lib/types';
import { AttendanceService } from '@/lib/attendance-service';
import { APP_MODE, isDemoMode } from '@/lib/app-mode';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const demoMode = isDemoMode();

  useEffect(() => {
    setCurrentUser(AttendanceService.getCurrentUser());
  }, [pathname]);

  useEffect(() => {
    const refreshProfile = () => setCurrentUser(AttendanceService.getCurrentUser());
    window.addEventListener('safemax-profile-updated', refreshProfile);
    return () => window.removeEventListener('safemax-profile-updated', refreshProfile);
  }, []);

  const handleLogout = () => {
    AttendanceService.logout();
    setCurrentUser(null);
    setIsDropdownOpen(false);
    router.push('/');
  };

  // Check if we are on login page
  const isLoginPage = pathname === '/';

  // Navigation Links based on role
  const employeeLinks = [
    { href: '/absensi', label: 'Presensi', icon: Clock },
    { href: '/riwayat', label: 'Riwayat', icon: Calendar },
  ];

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/rekap', label: 'Rekap Data', icon: FileSpreadsheet },
    { href: '/admin/karyawan', label: 'Karyawan', icon: Users },
    { href: '/absensi', label: 'Presensi Kamera', icon: Clock },
  ];

  const navLinks = currentUser?.role === 'admin' ? adminLinks : employeeLinks;

  return (
    <>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#e2e8f0]/95 backdrop-blur-md border-b border-white/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo Brand */}
            <Link href={currentUser ? (currentUser.role === 'admin' ? '/admin' : '/absensi') : '/'} className="flex items-center gap-2.5 sm:gap-3 group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform bg-white shadow-sm border border-slate-200/60 p-1.5">
                <img
                  src="/logo.png"
                  alt="Company Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <span className="font-extrabold text-slate-800 tracking-tight text-base sm:text-lg block">
                  SAFEMAX
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {!isLoginPage && currentUser && (
              <nav className="hidden md:flex items-center gap-2">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'neu-inset text-blue-600'
                          : 'neu-btn text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Right Side: User Profile or Login CTA */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="neu-btn px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl flex items-center gap-2 sm:gap-3 text-left"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden neu-inset p-0.5">
                    <img
                      src={
                        currentUser.avatar_url ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={currentUser.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {currentUser.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-medium capitalize">
                        {currentUser.role === 'admin' ? '🛡️ Admin HR' : '👤 Karyawan'}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          demoMode ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        title={
                          demoMode ? 'Mode Demo Lokal' : 'Mode Production Supabase'
                        }
                      />
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Profile Switcher & Logout Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-72 neu-card p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-200/50 mb-2">
                      <p className="text-xs font-bold text-slate-700">
                        {currentUser.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {currentUser.email} • {currentUser.employee_code}
                      </p>
                      <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700">
                        {currentUser.role === 'admin' ? 'Administrator HR' : 'Karyawan Staff'}
                      </span>
                    </div>

                    <p className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1">
                      Mode {APP_MODE === 'demo' ? 'Demo Lokal' : 'Production'}
                    </p>

                    <div className="mt-2 pt-2 border-t border-slate-200/60">
                      <Link
                        href="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50/50 transition-colors"
                      >
                        <UserRound className="w-3.5 h-3.5" />
                        <span>Profil Saya</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50/50 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              !isLoginPage && (
                <Link href="/">
                  <button className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-blue-600 flex items-center gap-1.5">
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Masuk</span>
                  </button>
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (App-like UX for Mobile Viewports) */}
      {!isLoginPage && currentUser && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#e2e8f0]/95 backdrop-blur-md border-t border-white/60 py-1.5 px-3 md:hidden shadow-lg">
          <div className="flex items-center justify-around">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'neu-inset text-blue-600 font-extrabold'
                      : 'text-slate-600 font-medium'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-[10px] mt-0.5">{item.label}</span>
                </Link>
              );
            })}

            {/* Mobile Logout Button */}
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl ${pathname === '/profile' ? 'neu-inset text-blue-600 font-extrabold' : 'text-slate-500'}`}
            >
              <UserRound className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Profil</span>
            </Link>

            {/* Mobile Logout Button */}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-rose-600"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Keluar</span>
            </button>
          </div>
        </nav>
      )}
    </>
  );
};
