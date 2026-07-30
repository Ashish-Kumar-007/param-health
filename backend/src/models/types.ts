export type Weekday = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
export type Gender = 'male' | 'female';
export type ShiftTypeId = 'morning' | 'day' | 'obgyn' | 'afternoon' | 'night';

export interface Doctor {
  id: string;
  slug: string;
  name: string;
  gender: Gender;
  weekly_off: Weekday;
  allowed_shifts: ShiftTypeId[];
  max_nights_per_month: number | null;
  notes: string | null;
}

export interface ShiftType {
  id: ShiftTypeId;
  name: string;
  starts_at: string;
  ends_at: string;
  min_doctors: number;
  female_only: boolean;
  retention_priority: number;
}

export interface RosterMonth {
  id: string;
  year: number;
  month: number;
  generated_at: Date | null;
}

export interface DoctorLeave {
  id: string;
  doctor_id: string;
  leave_date: string;
  reason: string | null;
}

export interface RosterAssignment {
  id: string;
  roster_month_id: string;
  assignment_date: string;
  shift_type_id: ShiftTypeId;
  doctor_id: string | null;
  is_shift_active: boolean;
  source: 'generated' | 'manual' | 'cleared';
  is_manual_override: boolean;
  override_note: string | null;
}
