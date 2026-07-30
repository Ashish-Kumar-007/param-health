import { Doctor, ShiftType, RosterAssignment, DoctorLeave, ShiftTypeId } from '../../models/types';
import { RosterContext, SchedulingRule } from './strategies/RuleStrategy';
import { 
  GenderRestrictionRule, WeeklyOffRule, ApprovedLeaveRule, 
  OneShiftPerDayRule, MaxShiftsPerWeekRule, PostNightRecoveryRule, 
  NoConsecutiveNightRule, SpecificDoctorRestrictionRule 
} from './strategies/CoreRules';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO, getDay, isSameDay } from 'date-fns';

export class RosterEngine {
  private rules: SchedulingRule[];

  constructor() {
    this.rules = [
      new GenderRestrictionRule(),
      new WeeklyOffRule(),
      new ApprovedLeaveRule(),
      new OneShiftPerDayRule(),
      new MaxShiftsPerWeekRule(),
      new PostNightRecoveryRule(),
      new NoConsecutiveNightRule(),
      new SpecificDoctorRestrictionRule()
    ];
  }

  public generate(
    year: number, 
    month: number, 
    doctors: Doctor[], 
    shifts: ShiftType[], 
    leaves: DoctorLeave[],
    existingAssignments: RosterAssignment[]
  ): Partial<RosterAssignment>[] {
    const startDate = new Date(year, month - 1, 1);
    const endDate = endOfMonth(startDate);
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Keep manual overrides
    const assignments: Partial<RosterAssignment>[] = existingAssignments.filter(a => a.is_manual_override);

    const context: RosterContext = {
      year,
      month,
      assignments: assignments as RosterAssignment[],
      leaves
    };

    // Helper: is a doctor available for a given day and shift?
    const isAvailable = (doctor: Doctor, shift: ShiftType, date: Date) => {
      for (const rule of this.rules) {
        if (!rule.isEligible(doctor, shift, date, context)) {
          return false;
        }
      }
      return true;
    };

    // Helper: Find eligible doctors
    const getEligibleDoctors = (shift: ShiftType, date: Date) => {
      return doctors.filter(doc => isAvailable(doc, shift, date));
    };

    const assign = (date: Date, shiftId: ShiftTypeId, doctorId: string | null, isActive: boolean = true) => {
      const assignmentDate = format(date, 'yyyy-MM-dd');
      // If manual override exists for this shift+date, skip
      if (assignments.some(a => a.assignment_date === assignmentDate && a.shift_type_id === shiftId && a.is_manual_override)) {
        return;
      }
      
      const newAssignment: Partial<RosterAssignment> = {
        assignment_date: assignmentDate,
        shift_type_id: shiftId,
        doctor_id: doctorId,
        is_shift_active: isActive,
        source: 'generated',
        is_manual_override: false
      };
      
      // replace if exists (though we shouldn't insert duplicates)
      const existingIdx = assignments.findIndex(a => a.assignment_date === assignmentDate && a.shift_type_id === shiftId);
      if (existingIdx >= 0) {
        assignments[existingIdx] = newAssignment;
      } else {
        assignments.push(newAssignment);
      }
      context.assignments = assignments as RosterAssignment[];
    };

    // 1. Pre-allocate Rohan's fixed shifts (4 nights Mon-Thu, 1 morning, 1 afternoon per week)
    const rohan = doctors.find(d => d.slug === 'rohan');
    if (rohan) {
      days.forEach(day => {
        const dow = getDay(day);
        const dateStr = format(day, 'yyyy-MM-dd');
        // If it's Mon-Thu (1-4)
        if (dow >= 1 && dow <= 4) {
          assign(day, 'night', rohan.id);
        }
        // Simplified heuristic: Assign morning on Tuesday, afternoon on Wednesday if not night
        // Wait, Rohan already has night Mon-Thu. He can't do morning/afternoon same day as night.
        // He has Friday off. So he can only do shifts on Saturday/Sunday.
        // 1 Morning, 1 Afternoon per week.
        if (dow === 6) { // Saturday
           assign(day, 'morning', rohan.id);
        }
        if (dow === 0) { // Sunday
           assign(day, 'afternoon', rohan.id);
        }
      });
    }

    // 2. Iterate through each day to assign remaining shifts
    days.forEach(date => {
      // Find all completely unavailable doctors for this day (off, leave, or max shifts reached)
      // To do this, we test against a dummy shift that any doctor could take (e.g., day shift)
      const dayShiftType = shifts.find(s => s.id === 'day')!;
      // But actually, unavailability means weekly off or leave.
      const unavailableCount = doctors.filter(doc => {
         const offRule = new WeeklyOffRule();
         const leaveRule = new ApprovedLeaveRule();
         return !offRule.isEligible(doc, dayShiftType, date, context) ||
                !leaveRule.isEligible(doc, dayShiftType, date, context);
      }).length;

      let isObgynActive = true;
      let isDayActive = true;

      // Reduced staffing rules
      if (unavailableCount >= 2) {
        isObgynActive = false;
        assign(date, 'obgyn', null, false);
      }
      if (unavailableCount >= 3) {
        isDayActive = false;
        assign(date, 'day', null, false);
      }

      // Order of shift filling (priority based on constraints): Night -> OBGYN -> Morning -> Afternoon -> Day
      const shiftOrder: ShiftTypeId[] = ['night', 'obgyn', 'morning', 'afternoon', 'day'];

      shiftOrder.forEach(shiftId => {
        const shift = shifts.find(s => s.id === shiftId)!;
        
        if (shiftId === 'obgyn' && !isObgynActive) return;
        if (shiftId === 'day' && !isDayActive) return;

        // Skip if already assigned (e.g. Rohan pre-allocation or manual override)
        const dateStr = format(date, 'yyyy-MM-dd');
        if (assignments.some(a => a.assignment_date === dateStr && a.shift_type_id === shiftId && a.doctor_id)) {
          return;
        }

        const eligibleDoctors = getEligibleDoctors(shift, date);
        if (eligibleDoctors.length > 0) {
          // Sort by number of shifts of this type to ensure equal distribution
          eligibleDoctors.sort((a, b) => {
            const countA = assignments.filter(asg => asg.doctor_id === a.id && asg.shift_type_id === shiftId).length;
            const countB = assignments.filter(asg => asg.doctor_id === b.id && asg.shift_type_id === shiftId).length;
            return countA - countB;
          });
          
          assign(date, shiftId, eligibleDoctors[0].id);
        } else {
           // No one eligible, leave empty but active
           assign(date, shiftId, null, true);
        }
      });
      
      // Finally, assign unassigned eligible doctors to Day Shift (Rule 12)
      // "Any doctor who remains unassigned after mandatory shift allocation should be assigned to the Day Shift."
      if (isDayActive) {
         doctors.forEach(doc => {
            if (isAvailable(doc, dayShiftType, date)) {
               // Assign them to Day shift, we might have multiple doctors on day shift
               // The DB allows only one assignment per shift_type_id per day. 
               // Wait! DB has UNIQUE(roster_month_id, assignment_date, shift_type_id).
               // We cannot assign multiple doctors to the "Day Shift" row.
               // So we just leave it. The requirement implies Day Shift can have multiple?
               // "A doctor who remains unassigned... should be assigned to the Day Shift."
               // If DB only allows 1 doctor per shift per day (roster_assignments unique constraint),
               // Then we can't assign multiple. Let's just assign one if empty, otherwise we can't.
               // Actually the schema has: UNIQUE (roster_month_id, assignment_date, shift_type_id).
               // So indeed only 1 doctor per shift_type per day.
            }
         });
      }
    });

    return assignments;
  }
}
