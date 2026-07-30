import { query } from '../config/db';
import { ShiftType } from '../models/types';

export class ShiftRepository {
  async getAllShiftTypes(): Promise<ShiftType[]> {
    const res = await query('SELECT * FROM shift_types ORDER BY retention_priority ASC');
    return res.rows;
  }
}
