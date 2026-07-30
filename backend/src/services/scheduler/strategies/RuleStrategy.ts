import { Doctor, ShiftType, RosterAssignment, DoctorLeave } from '../../../models/types';
import { isSameDay, subDays } from 'date-fns';

export interface RosterContext {
  year: number;
  month: number;
  assignments: RosterAssignment[];
  leaves: DoctorLeave[];
}

export interface SchedulingRule {
  /**
   * Evaluates whether a doctor is eligible for a specific shift on a specific date.
   * Returns true if eligible, false if blocked by this rule.
   */
  isEligible(
    doctor: Doctor,
    shift: ShiftType,
    date: Date,
    context: RosterContext
  ): boolean;
}
