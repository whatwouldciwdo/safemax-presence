'use client';

import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, Eye, EyeOff, Lock, Save, UserRound } from 'lucide-react';
import { AttendanceService } from '@/lib/attendance-service';
import { findLocalAccount } from '@/lib/local-accounts';
import { Employee } from '@/lib/types';
import { NeuCard } from '@/components/ui/NeuCard';
import { NeuButton } from '@/components/ui/NeuButton';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

async function resizeImage(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Format foto tidak didukung.'));
    element.src = source;
  });
  const scale = Math.min(1, 600 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<Employee | null>(null);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const current = AttendanceService.getCurrentUser();
    if (!current) {
      router.replace('/');
      return;
    }
    setUser(current);
    setName(current.name);
  }, [router]);

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) return setError('Pilih file gambar yang valid.');
    if (file.size > MAX_FILE_SIZE) return setError('Ukuran foto maksimal 2 MB.');
    try {
      setPhoto(await resizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Foto gagal diproses.');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setError('');
    setSuccess('');
    if (name.trim().length < 2) return setError('Nama minimal 2 karakter.');
    if (newPassword) {
      const account = findLocalAccount(user.employee_code);
      if (!oldPassword) return setError('Masukkan password lama untuk mengganti password.');
      if (oldPassword !== account?.password) return setError('Password lama salah.');
      if (newPassword.length < 6) return setError('Password baru minimal 6 karakter.');
      if (newPassword !== confirmPassword) return setError('Konfirmasi password baru tidak cocok.');
    }
    setSaving(true);
    try {
      const updated = await AttendanceService.updateProfile(user.id, {
        name,
        avatarDataUrl: photo,
        newPassword: newPassword || undefined,
      });
      setUser(updated);
      setPhoto(undefined);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Profil berhasil diperbarui.');
      window.dispatchEvent(new Event('safemax-profile-updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil gagal diperbarui.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  const preview = photo || user.avatar_url || '';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-7">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800">Profil Saya</h1>
        <p className="text-sm text-slate-500 mt-1">Perbarui nama, password, dan foto profil Anda.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <NeuCard className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-28 h-28 rounded-full neu-inset p-1 overflow-hidden flex items-center justify-center">
            {preview ? <img src={preview} alt={name} className="w-full h-full rounded-full object-cover" /> : <UserRound className="w-12 h-12 text-slate-400" />}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="font-extrabold text-slate-800">Foto Profil</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4">JPG, PNG, atau WebP. Maksimal 2 MB.</p>
            <label className="neu-btn inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 cursor-pointer">
              <Camera className="w-4 h-4" /> Pilih Foto
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
            </label>
          </div>
        </NeuCard>

        <NeuCard>
          <h2 className="font-extrabold text-slate-800 mb-5">Informasi Pribadi</h2>
          <label className="block text-xs font-bold text-slate-600 mb-2">Nama Lengkap</label>
          <input value={name} onChange={(event) => setName(event.target.value)} className="w-full px-4 py-3 neu-input text-sm" maxLength={80} required />
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div><p className="text-xs font-bold text-slate-500">NIP</p><p className="text-sm mt-1">{user.employee_code}</p></div>
            <div><p className="text-xs font-bold text-slate-500">Jabatan</p><p className="text-sm mt-1">{user.position}</p></div>
          </div>
        </NeuCard>

        <NeuCard>
          <div className="flex items-center gap-2 mb-1"><Lock className="w-4 h-4 text-blue-600" /><h2 className="font-extrabold text-slate-800">Ubah Password</h2></div>
          <p className="text-xs text-slate-500 mb-5">Kosongkan bagian ini jika tidak ingin mengubah password.</p>
          <div className="space-y-4">
            {['Password lama', 'Password baru', 'Konfirmasi password baru'].map((label, index) => {
              const values = [oldPassword, newPassword, confirmPassword];
              const setters = [setOldPassword, setNewPassword, setConfirmPassword];
              return <div key={label}><label className="block text-xs font-bold text-slate-600 mb-2">{label}</label><div className="relative"><input type={showPasswords ? 'text' : 'password'} value={values[index]} onChange={(event) => setters[index](event.target.value)} className="w-full px-4 pr-11 py-3 neu-input text-sm" /><button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-3 text-slate-500">{showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div></div>;
            })}
          </div>
        </NeuCard>

        {error && <div className="rounded-xl bg-rose-100 text-rose-700 px-4 py-3 text-sm font-semibold">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-100 text-emerald-700 px-4 py-3 text-sm font-semibold flex gap-2"><CheckCircle2 className="w-5 h-5" />{success}</div>}
        <NeuButton type="submit" variant="primary" isLoading={saving} className="w-full sm:w-auto"><Save className="w-4 h-4" /> Simpan Perubahan</NeuButton>
      </form>
    </div>
  );
}