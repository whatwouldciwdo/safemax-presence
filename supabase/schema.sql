-- ========================================================
-- SAFEMAX PRESENCE - SUPABASE DATABASE SCHEMA & SEED DATA
-- ========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  employee_code TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL DEFAULT 'General',
  position TEXT NOT NULL DEFAULT 'Staff',
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Attendances Table
CREATE TABLE IF NOT EXISTS public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  selfie_in_url TEXT,
  selfie_out_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('on_time', 'late', 'lembur', 'absent')),
  is_overtime BOOLEAN NOT NULL DEFAULT false,
  work_hours NUMERIC(4,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_employee_date UNIQUE (employee_id, date)
);

-- 4. Create Work Settings Table
CREATE TABLE IF NOT EXISTS public.work_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_start_time TIME NOT NULL DEFAULT '07:00:00',
  tolerance_minutes INT NOT NULL DEFAULT 15,
  work_end_time TIME NOT NULL DEFAULT '16:00:00',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert Default Work Setting if not exists
INSERT INTO public.work_settings (work_start_time, tolerance_minutes, work_end_time)
SELECT '07:00:00', 15, '16:00:00'
WHERE NOT EXISTS (SELECT 1 FROM public.work_settings);

-- 5. Storage Bucket Configuration for Selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-selfies', 'attendance-selfies', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies (Allow public read, allow authenticated / anon upload for attendance selfies)
DROP POLICY IF EXISTS "Public Access Attendance Selfies" ON storage.objects;
CREATE POLICY "Public Access Attendance Selfies"
ON storage.objects FOR SELECT
USING (bucket_id = 'attendance-selfies');

DROP POLICY IF EXISTS "Allow Upload Attendance Selfies" ON storage.objects;
CREATE POLICY "Allow Upload Attendance Selfies"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attendance-selfies');

DROP POLICY IF EXISTS "Allow Update Attendance Selfies" ON storage.objects;
CREATE POLICY "Allow Update Attendance Selfies"
ON storage.objects FOR UPDATE
USING (bucket_id = 'attendance-selfies');

DROP POLICY IF EXISTS "Allow Delete Attendance Selfies" ON storage.objects;
CREATE POLICY "Allow Delete Attendance Selfies"
ON storage.objects FOR DELETE
USING (bucket_id = 'attendance-selfies');

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_settings ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for Web App Access
DROP POLICY IF EXISTS "Allow all access to employees" ON public.employees;
CREATE POLICY "Allow all access to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to attendances" ON public.attendances;
CREATE POLICY "Allow all access to attendances" ON public.attendances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to work_settings" ON public.work_settings;
CREATE POLICY "Allow all access to work_settings" ON public.work_settings FOR ALL USING (true) WITH CHECK (true);

-- 7. Seed Employee Profiles (login credentials remain local in the application)
INSERT INTO public.employees (id, name, email, employee_code, department, position, role, avatar_url)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Administrator', 'admin@safemax.local', 'ADM-001', 'Administrasi', 'Administrator Sistem', 'admin', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'),
  ('11111111-1111-1111-1111-111111111111', 'Alpin Alpiansyah', 'alpin@safemax.local', '021', 'Operasional', 'Supervisor', 'employee', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'),
  ('22222222-2222-2222-2222-222222222222', 'Ricky Hendra Firmansyah', 'ricky@safemax.local', '022', 'Operasional', 'Teknisi', 'employee', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'),
  ('33333333-3333-3333-3333-333333333333', 'Johari', 'johari@safemax.local', '023', 'Operasional', 'Teknisi', 'employee', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'),
  ('44444444-4444-4444-4444-444444444444', 'Agam Fuady', 'agam@safemax.local', '024', 'Operations', 'Helper', 'employee', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
  ('55555555-5555-5555-5555-555555555555', 'Nofiatul Jannah', 'nofiatul@safemax.local', '025', 'Administrasi', 'Staf Administrasi', 'employee', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  employee_code = EXCLUDED.employee_code,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  role = EXCLUDED.role,
  avatar_url = EXCLUDED.avatar_url,
  is_active = true;

