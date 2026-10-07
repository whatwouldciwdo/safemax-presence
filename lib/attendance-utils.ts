import { Attendance, AttendanceStatus, Employee, EmployeeMonthlyQuota } from './types';

export const MANDATORY_MONTHLY_DAYS = 24;
export const WORK_START_HOUR = 7; // Jam 07:00 WIB
export const WORK_START_MINUTE = 0;
export const WORK_TOLERANCE_MINUTES = 15; // Hingga 07:15 WIB
export const WORK_END_HOUR = 16; // Jam 16:00 WIB (Jam 4 sore)

export interface AttendanceEvaluation {
  status: AttendanceStatus;
  isOvertime: boolean;
  message: string;
}

/**
 * Checks if a date is on the weekend (Sabtu / Minggu)
 */
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  return day === 0 || day === 6;
}

/**
 * Evaluates attendance status for clock-in:
 * Jam masuk: 07:00 WIB
 * Toleransi: 15 menit (sampai 07:15 WIB)
 * Jam pulang: 16:00 WIB
 * Catatan: Sabtu & Minggu BUKAN lembur, melainkan hari kerja reguler penambah target 24 hari/bulan!
 */
export function evaluateAttendance(
  clockInDate: Date = new Date(),
  startHour: number = WORK_START_HOUR,
  startMinute: number = WORK_START_MINUTE,
  toleranceMinutes: number = WORK_TOLERANCE_MINUTES
): AttendanceEvaluation {
  const clockInMinutes = clockInDate.getHours() * 60 + clockInDate.getMinutes();
  const scheduledMinutes = startHour * 60 + startMinute;
  const cutoffMinutes = scheduledMinutes + toleranceMinutes;

  if (clockInMinutes <= cutoffMinutes) {
    return {
      status: 'on_time',
      isOvertime: false,
      message: 'Presensi Tepat Waktu (≤ 07:15 WIB). Selamat bekerja!',
    };
  } else {
    const diffMinutes = clockInMinutes - cutoffMinutes;
    return {
      status: 'late',
      isOvertime: false,
      message: `Terlambat ${diffMinutes} menit dari batas toleransi (07:15 WIB).`,
    };
  }
}

/**
 * Calculates work hours between clock-in and clock-out
 */
export function calculateWorkHours(clockInIso: string, clockOutIso: string): number {
  try {
    const start = new Date(clockInIso).getTime();
    const end = new Date(clockOutIso).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    const diffHours = (end - start) / (1000 * 60 * 60);
    return Math.round(diffHours * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * Calculates monthly quota summary for a specific employee
 */
export function calculateEmployeeQuota(
  attendances: Attendance[],
  employee: Employee,
  yearMonth: string, // "YYYY-MM" e.g. "2026-10"
  targetDays: number = MANDATORY_MONTHLY_DAYS
): EmployeeMonthlyQuota {
  const monthAttendances = attendances.filter(
    (att) => att.employee_id === employee.id && att.date.startsWith(yearMonth)
  );

  const totalPresentDays = monthAttendances.length;
  const onTimeDays = monthAttendances.filter((a) => a.status === 'on_time').length;
  const lateDays = monthAttendances.filter((a) => a.status === 'late').length;
  const totalWorkHours = monthAttendances.reduce((acc, cur) => acc + (cur.work_hours || 0), 0);

  const progressPercentage = Math.min(100, Math.round((totalPresentDays / targetDays) * 100));
  const remainingDays = Math.max(0, targetDays - totalPresentDays);
  const surplusDays = Math.max(0, totalPresentDays - targetDays);
  const isTargetMet = totalPresentDays >= targetDays;

  return {
    employee,
    month: yearMonth,
    totalPresentDays,
    targetDays,
    progressPercentage,
    remainingDays,
    surplusDays,
    isTargetMet,
    onTimeDays,
    lateDays,
    totalWorkHours: Math.round(totalWorkHours * 100) / 100,
  };
}

/**
 * Formats date to Indonesian readable string: "Senin, 7 Oktober 2026"
 */
export function formatIndoDate(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats time to "07:15 WIB"
 */
export function formatIndoTime(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return (
      d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB'
    );
  } catch {
    return '-';
  }
}
