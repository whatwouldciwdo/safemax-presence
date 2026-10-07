import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'SafeMax Presence - Sistem Absensi Web Neumorphism',
  description: 'Sistem presensi kehadiran karyawan berbasis web dengan kamera selfie dan gaya UI Neumorphism.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#e2e8f0] text-slate-800">
        <Navbar />
        <main className="flex-1 pb-24 md:pb-16">{children}</main>
      </body>
    </html>
  );
}
