import { createClient, isSupabaseEnabled } from './supabase/client';
import { Attendance, AttendanceFilter, DashboardStats, Employee } from './types';
import { INITIAL_EMPLOYEES, INITIAL_ATTENDANCES } from './mock-data';
import { calculateWorkHours, evaluateAttendance } from './attendance-utils';
import { findLocalAccount, updateLocalPassword } from './local-accounts';

const STORAGE_KEY_ATTENDANCES = 'safemax_attendances_v2';
const STORAGE_KEY_EMPLOYEES = 'safemax_employees_v3';
const STORAGE_KEY_CURRENT_USER = 'safemax_current_user_v2';

// Helper for local storage persistence (demo mode)
function getLocalData<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export class AttendanceService {
  /**
   * Get list of employees
   */
  static async getEmployees(): Promise<Employee[]> {
    if (isSupabaseEnabled()) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(`Gagal memuat karyawan dari Supabase: ${error.message}`);
      return (data || []) as Employee[];
    }
    return getLocalData<Employee[]>(STORAGE_KEY_EMPLOYEES, INITIAL_EMPLOYEES);
  }

  /**
   * Get current active user (returns null if logged out)
   */
  static getCurrentUser(): Employee | null {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set current active user
   */
  static setCurrentUser(employee: Employee | null): void {
    if (typeof window === 'undefined') return;
    if (employee) {
      setLocalData(STORAGE_KEY_CURRENT_USER, employee);
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  }

  /**
   * Logout user
   */
  static logout(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
  }

  /**
   * Authenticate an employee using local credentials.
   */
  static async login(
    identifier: string,
    password?: string
  ): Promise<{ success: boolean; user?: Employee; message?: string }> {
    const localAccount = findLocalAccount(identifier);

    if (!localAccount) {
      return {
        success: false,
        message: 'Akun tidak ditemukan. Gunakan username atau NIP yang terdaftar.',
      };
    }

    if (password !== localAccount.password) {
      return {
        success: false,
        message: 'Password salah.',
      };
    }

    const employees = await this.getEmployees();
    const matched = employees.find((employee) => employee.employee_code === localAccount.employeeCode);

    if (!matched) {
      return {
        success: false,
        message: 'Profil karyawan tidak ditemukan. Hubungi Administrator.',
      };
    }

    if (!matched.is_active) {
      return {
        success: false,
        message: 'Akun ini sedang dinonaktifkan. Hubungi Administrator HR.',
      };
    }

    this.setCurrentUser(matched);
    return {
      success: true,
      user: matched,
    };
  }

  /** Update the signed-in user's editable profile fields. */
  static async updateProfile(
    employeeId: string,
    updates: { name: string; avatarDataUrl?: string; newPassword?: string }
  ): Promise<Employee> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.id !== employeeId) {
      throw new Error('Sesi tidak valid. Silakan login kembali.');
    }

    let avatarUrl = currentUser.avatar_url;
    if (updates.avatarDataUrl) {
      avatarUrl = await this.uploadProfilePhoto(updates.avatarDataUrl, employeeId);
    }

    let updated: Employee;
    if (isSupabaseEnabled()) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employees')
        .update({ name: updates.name.trim(), avatar_url: avatarUrl })
        .eq('id', employeeId)
        .select('*')
        .single();
      if (error) throw new Error(`Gagal memperbarui profil: ${error.message}`);
      updated = data as Employee;
    } else {
      const employees = getLocalData<Employee[]>(STORAGE_KEY_EMPLOYEES, INITIAL_EMPLOYEES);
      const index = employees.findIndex((employee) => employee.id === employeeId);
      if (index < 0) throw new Error('Profil karyawan tidak ditemukan.');
      updated = { ...employees[index], name: updates.name.trim(), avatar_url: avatarUrl };
      employees[index] = updated;
      setLocalData(STORAGE_KEY_EMPLOYEES, employees);
    }

    if (updates.newPassword) updateLocalPassword(updated.employee_code, updates.newPassword);
    this.setCurrentUser(updated);
    return updated;
  }

  private static async uploadProfilePhoto(dataUrl: string, employeeId: string): Promise<string> {
    if (!isSupabaseEnabled()) return dataUrl;
    const supabase = createClient();
    const blob = await (await fetch(dataUrl)).blob();
    const fileName = `profiles/${employeeId}-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from('attendance-selfies')
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw new Error(`Gagal mengunggah foto profil: ${error.message}`);
    const { data } = supabase.storage.from('attendance-selfies').getPublicUrl(fileName);
    if (!data.publicUrl) throw new Error('URL foto profil tidak tersedia.');
    return data.publicUrl;
  }

  /**
   * Get today's attendance for a specific employee
   */
  static async getTodayAttendance(employeeId: string): Promise<Attendance | null> {
    const todayStr = new Date().toISOString().split('T')[0];

    if (isSupabaseEnabled()) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', todayStr)
        .maybeSingle();
      if (error) throw new Error(`Gagal memuat presensi hari ini: ${error.message}`);
      return data ? (data as Attendance) : null;
    }

    const attendances = getLocalData<Attendance[]>(STORAGE_KEY_ATTENDANCES, INITIAL_ATTENDANCES);
    const found = attendances.find((a) => a.employee_id === employeeId && a.date === todayStr);
    return found || null;
  }

  /**
   * Upload selfie photo to Supabase Storage or return data URL
   */
  static async uploadSelfie(dataUrl: string, employeeId: string, type: 'in' | 'out'): Promise<string> {
    if (isSupabaseEnabled()) {
        const supabase = createClient();
        // Convert data URL to Blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `${employeeId}/${dateStr}-${type}-${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('attendance-selfies')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Gagal mengunggah selfie: ${uploadError.message}`);
        }
        const { data: urlData } = supabase.storage
          .from('attendance-selfies')
          .getPublicUrl(fileName);
        if (!urlData?.publicUrl) throw new Error('URL publik selfie tidak tersedia.');
        return urlData.publicUrl;
    }
    // Fallback: return data URL directly
    return dataUrl;
  }

  /**
   * Record Clock In
   */
  static async clockIn(employeeId: string, selfieDataUrl: string, notes?: string): Promise<Attendance> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const selfieUrl = await this.uploadSelfie(selfieDataUrl, employeeId, 'in');
    const evaluation = evaluateAttendance(now);

    const newRecord: Attendance = {
      id: 'att-' + Date.now(),
      employee_id: employeeId,
      date: todayStr,
      clock_in: now.toISOString(),
      clock_out: null,
      selfie_in_url: selfieUrl,
      selfie_out_url: null,
      status: evaluation.status,
      is_overtime: evaluation.isOvertime,
      work_hours: 0,
      notes: notes || evaluation.message,
      created_at: now.toISOString(),
    };

    if (isSupabaseEnabled()) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('attendances')
          .insert([
            {
              employee_id: employeeId,
              date: todayStr,
              clock_in: now.toISOString(),
              selfie_in_url: selfieUrl,
              status: evaluation.status,
              is_overtime: evaluation.isOvertime,
              notes: notes || evaluation.message,
            },
          ])
          .select()
          .single();
        if (error) throw new Error(`Gagal menyimpan Clock In: ${error.message}`);
        return data as Attendance;
    }

    // Save to local storage
    const list = getLocalData<Attendance[]>(STORAGE_KEY_ATTENDANCES, INITIAL_ATTENDANCES);
    const existingIndex = list.findIndex((a) => a.employee_id === employeeId && a.date === todayStr);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newRecord };
    } else {
      list.unshift(newRecord);
    }
    setLocalData(STORAGE_KEY_ATTENDANCES, list);
    return newRecord;
  }

  /**
   * Record Clock Out
   */
  static async clockOut(employeeId: string, selfieDataUrl: string, notes?: string): Promise<Attendance> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const selfieUrl = await this.uploadSelfie(selfieDataUrl, employeeId, 'out');

    const currentAttendance = await this.getTodayAttendance(employeeId);
    if (!currentAttendance) {
      throw new Error('Belum melakukan Clock In hari ini!');
    }

    const clockInIso = currentAttendance.clock_in || now.toISOString();
    const workHours = calculateWorkHours(clockInIso, now.toISOString());

    if (isSupabaseEnabled()) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('attendances')
          .update({
            clock_out: now.toISOString(),
            selfie_out_url: selfieUrl,
            work_hours: workHours,
            notes: notes || currentAttendance.notes,
          })
          .eq('employee_id', employeeId)
          .eq('date', todayStr)
          .select()
          .single();
        if (error) throw new Error(`Gagal menyimpan Clock Out: ${error.message}`);
        return data as Attendance;
    }

    const list = getLocalData<Attendance[]>(STORAGE_KEY_ATTENDANCES, INITIAL_ATTENDANCES);
    const index = list.findIndex((a) => a.employee_id === employeeId && a.date === todayStr);
    const updated: Attendance = {
      ...currentAttendance,
      clock_out: now.toISOString(),
      selfie_out_url: selfieUrl,
      work_hours: workHours,
      notes: notes || currentAttendance.notes,
    };

    if (index >= 0) {
      list[index] = updated;
    } else {
      list.unshift(updated);
    }
    setLocalData(STORAGE_KEY_ATTENDANCES, list);
    return updated;
  }

  /**
   * Get employee's personal attendance history
   */
  static async getEmployeeHistory(employeeId: string): Promise<Attendance[]> {
    if (isSupabaseEnabled()) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('employee_id', employeeId)
        .order('date', { ascending: false });
      if (error) throw new Error(`Gagal memuat riwayat presensi: ${error.message}`);
      return (data || []) as Attendance[];
    }

    const list = getLocalData<Attendance[]>(STORAGE_KEY_ATTENDANCES, INITIAL_ATTENDANCES);
    return list.filter((a) => a.employee_id === employeeId).sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get all attendances with employee info (for Admin)
   */
  static async getAllAttendances(filter?: AttendanceFilter): Promise<Attendance[]> {
    const employees = await this.getEmployees();
    const empMap = new Map<string, Employee>();
    employees.forEach((emp) => empMap.set(emp.id, emp));

    let results: Attendance[] = [];

    if (isSupabaseEnabled()) {
        const supabase = createClient();
        let query = supabase.from('attendances').select('*');
        if (filter?.dateFrom) query = query.gte('date', filter.dateFrom);
        if (filter?.dateTo) query = query.lte('date', filter.dateTo);
        if (filter?.status && filter.status !== 'all') query = query.eq('status', filter.status);

        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw new Error(`Gagal memuat rekap presensi: ${error.message}`);
        results = (data || []) as Attendance[];
    }

    if (!isSupabaseEnabled()) {
      results = getLocalData<Attendance[]>(STORAGE_KEY_ATTENDANCES, INITIAL_ATTENDANCES);
      // Filter locally
      if (filter?.dateFrom) results = results.filter((a) => a.date >= filter.dateFrom!);
      if (filter?.dateTo) results = results.filter((a) => a.date <= filter.dateTo!);
      if (filter?.status && filter.status !== 'all') results = results.filter((a) => a.status === filter.status);
    }

    // Attach employee info
    const enriched = results.map((att) => ({
      ...att,
      employee: empMap.get(att.employee_id),
    }));

    // Filter by search / department if provided
    return enriched.filter((item) => {
      if (filter?.department && item.employee?.department !== filter.department) {
        return false;
      }
      if (filter?.search) {
        const query = filter.search.toLowerCase();
        const matchName = item.employee?.name.toLowerCase().includes(query);
        const matchCode = item.employee?.employee_code.toLowerCase().includes(query);
        if (!matchName && !matchCode) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const employees = await this.getEmployees();
    const activeEmployees = employees.filter((e) => e.is_active && e.role === 'employee');
    const totalEmployees = activeEmployees.length;

    const todayStr = new Date().toISOString().split('T')[0];
    const attendances = await this.getAllAttendances({ dateFrom: todayStr, dateTo: todayStr });

    const presentToday = attendances.length;
    const onTimeCount = attendances.filter((a) => a.status === 'on_time').length;
    const lateCount = attendances.filter((a) => a.status === 'late').length;
    const lemburCount = attendances.filter((a) => a.status === 'lembur').length;
    const absentCount = Math.max(0, totalEmployees - presentToday);
    const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    return {
      totalEmployees,
      presentToday,
      onTimeCount,
      lateCount,
      lemburCount,
      absentCount,
      attendanceRate,
    };
  }

  /**
   * Add a new employee
   */
  static async addEmployee(emp: Omit<Employee, 'id' | 'created_at'>): Promise<Employee> {
    const newEmp: Employee = {
      ...emp,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled()) {
      const supabase = createClient();
      const { data, error } = await supabase.from('employees').insert([newEmp]).select().single();
      if (error) throw new Error(`Gagal menambahkan karyawan: ${error.message}`);
      return data as Employee;
    }

    const list = getLocalData<Employee[]>(STORAGE_KEY_EMPLOYEES, INITIAL_EMPLOYEES);
    list.push(newEmp);
    setLocalData(STORAGE_KEY_EMPLOYEES, list);
    return newEmp;
  }
}
