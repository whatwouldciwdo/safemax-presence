export type UserRole = 'admin' | 'employee';

export type AttendanceStatus = 'on_time' | 'late' | 'lembur' | 'absent';

export interface Employee {
  id: string;
  auth_user_id?: string | null;
  name: string;
  email: string;
  employee_code: string;
  department: string;
  position: string;
  role: UserRole;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  clock_in?: string | null; // ISO timestamp
  clock_out?: string | null; // ISO timestamp
  selfie_in_url?: string | null;
  selfie_out_url?: string | null;
  status: AttendanceStatus;
  is_overtime: boolean;
  work_hours?: number | null;
  notes?: string | null;
  created_at: string;
  employee?: Employee;
}

export interface WorkSettings {
  id: string;
  work_start_time: string; // "07:00:00"
  tolerance_minutes: number; // 15
  work_end_time: string; // "16:00:00"
  updated_at?: string;
}

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  onTimeCount: number;
  lateCount: number;
  lemburCount: number;
  absentCount: number;
  attendanceRate: number;
}

export interface AttendanceFilter {
  dateFrom?: string;
  dateTo?: string;
  department?: string;
  status?: AttendanceStatus | 'all';
  search?: string;
}

export interface EmployeeMonthlyQuota {
  employee: Employee;
  month: string; // YYYY-MM
  totalPresentDays: number;
  targetDays: number; // 24
  progressPercentage: number;
  remainingDays: number; // Math.max(0, targetDays - totalPresentDays)
  surplusDays: number; // Math.max(0, totalPresentDays - targetDays)
  isTargetMet: boolean;
  onTimeDays: number;
  lateDays: number;
  totalWorkHours: number;
}
