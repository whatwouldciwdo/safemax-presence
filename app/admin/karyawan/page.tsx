'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  ArrowLeft,
  Mail,
  Shield,
  Briefcase,
  Building,
  CheckCircle,
  XCircle,
  Plus,
} from 'lucide-react';
import { NeuCard } from '@/components/ui/NeuCard';
import { NeuButton } from '@/components/ui/NeuButton';
import { NeuInput } from '@/components/ui/NeuInput';
import { AttendanceService } from '@/lib/attendance-service';
import { Employee, UserRole } from '@/lib/types';

export default function AdminKaryawanPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Employee Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [position, setPosition] = useState('Staff');
  const [role, setRole] = useState<UserRole>('employee');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    loadEmployees();
  }, [router]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await AttendanceService.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !employeeCode) {
      alert('Mohon lengkapi nama, email, dan kode NIK.');
      return;
    }

    setSubmitting(true);
    try {
      await AttendanceService.addEmployee({
        name,
        email,
        employee_code: employeeCode,
        department,
        position,
        role,
        is_active: true,
        avatar_url: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      });

      setMessage('Karyawan berhasil ditambahkan!');
      setIsModalOpen(false);
      // Reset form
      setName('');
      setEmail('');
      setEmployeeCode('');
      loadEmployees();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Dashboard Admin
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Manajemen Karyawan
          </h1>
          <p className="text-sm text-slate-500">
            Daftar karyawan yang memiliki hak akses sistem absensi.
          </p>
        </div>

        <NeuButton variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
          <UserPlus className="w-4 h-4" />
          <span>Tambah Karyawan Baru</span>
        </NeuButton>
      </div>

      {message && (
        <div className="neu-card p-3.5 border-l-4 border-emerald-500 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
      )}

      {/* Employee List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {employees.map((emp) => (
          <NeuCard key={emp.id} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      emp.avatar_url ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={emp.name}
                    className="w-12 h-12 rounded-full object-cover neu-inset p-0.5"
                  />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">{emp.name}</h3>
                    <p className="text-xs text-blue-600 font-semibold">{emp.position}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    emp.role === 'admin'
                      ? 'bg-purple-500/10 text-purple-700 border border-purple-500/20'
                      : 'bg-blue-500/10 text-blue-700 border border-blue-500/20'
                  }`}
                >
                  {emp.role === 'admin' ? 'ADMIN' : 'STAFF'}
                </span>
              </div>

              <div className="space-y-2 neu-inset p-3 rounded-xl text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">NIK / ID:</span>
                  <span className="font-mono font-bold text-slate-700">{emp.employee_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-medium text-slate-700">{emp.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Departemen:</span>
                  <span className="font-medium text-slate-700">{emp.department}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                Status Aktif
              </span>
              <span className="text-slate-400">
                Bergabung {new Date(emp.created_at).toLocaleDateString('id-ID')}
              </span>
            </div>
          </NeuCard>
        ))}
      </div>

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="neu-card w-full max-w-lg p-6 relative">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Tambah Karyawan Baru</h3>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <NeuInput
                label="Nama Lengkap"
                placeholder="Contoh: Rian Ramadhan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <NeuInput
                  label="Email Perusahaan"
                  type="email"
                  placeholder="rian@safemax.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <NeuInput
                  label="Kode NIK / ID Karyawan"
                  placeholder="EMP-005"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                    Departemen
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 neu-input text-slate-800 text-sm"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Human Resources">Human Resources</option>
                  </select>
                </div>

                <NeuInput
                  label="Posisi / Jabatan"
                  placeholder="Mobile Developer"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                  Peran Akun
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('employee')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      role === 'employee' ? 'neu-inset text-blue-600' : 'neu-btn text-slate-600'
                    }`}
                  >
                    Karyawan Biasa
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                      role === 'admin' ? 'neu-inset text-purple-600' : 'neu-btn text-slate-600'
                    }`}
                  >
                    Administrator HR
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60">
                <NeuButton
                  type="button"
                  variant="default"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </NeuButton>
                <NeuButton type="submit" variant="primary" isLoading={submitting}>
                  Simpan Karyawan
                </NeuButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
