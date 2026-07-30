import { query, getClient } from '../config/db';
import { RosterMonth, RosterAssignment } from '../models/types';

export class RosterRepository {
  async getRosterMonth(year: number, month: number): Promise<RosterMonth | null> {
    const res = await query(
      'SELECT * FROM roster_months WHERE year = $1 AND month = $2',
      [year, month]
    );
    return res.rows.length > 0 ? res.rows[0] : null;
  }

  async createRosterMonth(year: number, month: number): Promise<RosterMonth> {
    const res = await query(
      'INSERT INTO roster_months (year, month, generated_at) VALUES ($1, $2, NOW()) RETURNING *',
      [year, month]
    );
    return res.rows[0];
  }

  async getAssignments(rosterMonthId: string): Promise<RosterAssignment[]> {
    const res = await query(
      'SELECT * FROM roster_assignments WHERE roster_month_id = $1 ORDER BY assignment_date ASC',
      [rosterMonthId]
    );
    return res.rows;
  }

  async saveAssignments(rosterMonthId: string, assignments: Partial<RosterAssignment>[]): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      // Delete existing non-manual assignments
      await client.query(
        'DELETE FROM roster_assignments WHERE roster_month_id = $1 AND is_manual_override = FALSE',
        [rosterMonthId]
      );

      // Insert new assignments
      for (const assignment of assignments) {
        if (!assignment.is_manual_override) {
          await client.query(
            `INSERT INTO roster_assignments 
             (roster_month_id, assignment_date, shift_type_id, doctor_id, is_shift_active, source, is_manual_override, override_note)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (roster_month_id, assignment_date, shift_type_id) 
             DO UPDATE SET 
               doctor_id = EXCLUDED.doctor_id, 
               is_shift_active = EXCLUDED.is_shift_active,
               source = EXCLUDED.source
             WHERE roster_assignments.is_manual_override = FALSE`,
            [
              rosterMonthId,
              assignment.assignment_date,
              assignment.shift_type_id,
              assignment.doctor_id,
              assignment.is_shift_active,
              assignment.source,
              false,
              null
            ]
          );
        }
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
  
  async updateAssignmentManual(
    rosterMonthId: string,
    assignmentDate: string,
    shiftTypeId: string,
    doctorId: string | null,
    isShiftActive: boolean,
    overrideNote: string | null
  ): Promise<void> {
    await query(
      `INSERT INTO roster_assignments 
       (roster_month_id, assignment_date, shift_type_id, doctor_id, is_shift_active, source, is_manual_override, override_note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (roster_month_id, assignment_date, shift_type_id) 
       DO UPDATE SET 
         doctor_id = EXCLUDED.doctor_id, 
         is_shift_active = EXCLUDED.is_shift_active,
         source = 'manual',
         is_manual_override = TRUE,
         override_note = EXCLUDED.override_note`,
      [
        rosterMonthId,
        assignmentDate,
        shiftTypeId,
        doctorId,
        isShiftActive,
        'manual',
        true,
        overrideNote
      ]
    );
  }
}
