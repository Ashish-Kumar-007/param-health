import { SchedulingRule, RosterContext } from './RuleStrategy';
import { Doctor, ShiftType, Weekday } from '../../../models/types';
import { isSameDay, subDays, startOfWeek, endOfWeek } from 'date-fns';

const weekdays: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export class GenderRestrictionRule implements SchedulingRule {
  isEligible(doctor: Doctor, shift: ShiftType, date: Date, context: RosterContext): boolean {
    if (shift.female_only && doctor.gender !== 'female') {
      return false;
    }
    return true;
  }
}

export class WeeklyOffRule implements SchedulingRule {
  isEligible(doctor: Doctor, shift: ShiftType, date: Date, context: RosterContext): boolean {
    const dayOfWeek = weekdays[date.getDay()];
    if (doctor.weekly_off === dayOfWeek) {
      return false;
    }
    return true;
  }
}

export class ApprovedLeaveRule implements SchedulingRule {
  isEligible(doctor: Doctor, shift: ShiftType, date: Date, context: RosterContext): boolean {
    const isLeave = context.leaves.some(leave => 
      leave.doctor_id === doctor.id && 
      isSameDay(new Date(leave.leave_date), date)
    );
    return !isLeave;
  }
}

export class OneShiftPerDayRule implements SchedulingRule {
  isEligible(doctor: Doctor, shift: ShiftType, date: Date, context: RosterContext): boolean {
    const hasShiftToday = context.assignments.some(a => 
      a.doctor_id === doctor.id && 
      isSameDay(new Date(a.assignment_date), date)
    );
    return !hasShiftToday;
  }
}

export class MaxShiftsPerWeekRule implements SchedulingRule {
  isEligible(doctor: Doctor, shift: ShiftType, date: Date, context: RosterContext): boolean {
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(date, { weekStartsOn: 1 });
    
    const shiftsThisWeek = context.assignments.filter(a => {
      if (a.doctor_id !== doctor.id) return false;
      const assignmentDate = new Date(a.assignment_date);
      return assignmentDate >= start && assignmentDate <= end;
    }).length;

    return shiftsThisWeek < 6;
  }
}

export class PostNightRecoveryRule implements SchedulingRule {
  isEligible(doctor: Doctor, shift: ShiftType, date: Date, context: RosterContext): boolean {
    if (doctor.slug === 'rohan') return true; // Rohan is exempt

    const yesterday = subDays(date, 1);
    const workedNightYesterday = context.assignments.some(a => 
      a.doctor_id === doctor.id &&
      a.shift_type_id === 'night' &&
      isSameDay(new Date(a.assignment_date), yesterday)
    );

    if (workedNightYesterday) {
      // Can only work afternoon or off
      if (shift.id !== 'afternoon') {
        return false;
      }
    }
    return true;
  }
}

export class NoConsecutiveNightRule implements SchedulingRule {
  isEligible(doctor: Doctor, shift: ShiftType, date: Date, context: RosterContext): boolean {
    if (shift.id !== 'night') return true;
    if (doctor.slug === 'rohan') return true; // Rohan can do consecutive nights

    const yesterday = subDays(date, 1);
    const workedNightYesterday = context.assignments.some(a => 
      a.doctor_id === doctor.id &&
      a.shift_type_id === 'night' &&
      isSameDay(new Date(a.assignment_date), yesterday)
    );

    return !workedNightYesterday;
  }
}

export class SpecificDoctorRestrictionRule implements SchedulingRule {
  isEligible(doctor: Doctor, shift: ShiftType, date: Date, context: RosterContext): boolean {
    // Check if shift is in allowed_shifts
    if (!doctor.allowed_shifts.includes(shift.id)) {
      return false;
    }

    // Imran specific: max 2 nights per month
    if (doctor.slug === 'imran' && shift.id === 'night') {
      const nightShiftsThisMonth = context.assignments.filter(a => 
        a.doctor_id === doctor.id && a.shift_type_id === 'night'
      ).length;
      if (nightShiftsThisMonth >= (doctor.max_nights_per_month || 2)) {
        return false;
      }
    }

    // Rohan specific: Mon-Thu only for nights (already enforced by engine pre-allocation, but good to double check)
    if (doctor.slug === 'rohan' && shift.id === 'night') {
      const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday... 4 is Thursday
      if (dayOfWeek < 1 || dayOfWeek > 4) {
        return false;
      }
    }

    return true;
  }
}
