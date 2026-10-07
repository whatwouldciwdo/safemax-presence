import React from 'react';
import { AttendanceStatus } from '@/lib/types';

interface NeuBadgeProps {
  status: AttendanceStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const NeuBadge: React.FC<NeuBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const configs: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    on_time: {
      label: 'Tepat Waktu',
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    late: {
      label: 'Terlambat',
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    },
    lembur: {
      label: 'Lembur',
      bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500',
    },
    absent: {
      label: 'Tidak Hadir',
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-700',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
    },
  };

  const current = configs[status] || {
    label: status,
    bg: 'bg-slate-500/10 border-slate-500/30 text-slate-700',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs md:text-sm font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${current.bg} ${sizeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
};
