import { query } from '../config/db';
import { Doctor, DoctorLeave } from '../models/types';

export class DoctorRepository {
  async getAllDoctors(): Promise<Doctor[]> {
    const res = await query('SELECT * FROM doctors ORDER BY name ASC');
    return res.rows;
  }

  async getDoctorBySlug(slug: string): Promise<Doctor | null> {
    const res = await query('SELECT * FROM doctors WHERE slug = $1', [slug]);
    return res.rows.length > 0 ? res.rows[0] : null;
  }

  async getLeavesForMonth(year: number, month: number): Promise<DoctorLeave[]> {
    const res = await query(
      `SELECT * FROM doctor_leaves 
       WHERE EXTRACT(YEAR FROM leave_date) = $1 
         AND EXTRACT(MONTH FROM leave_date) = $2`,
      [year, month]
    );
    return res.rows;
  }
}
