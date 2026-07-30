import { Router } from 'express';
import { DoctorRepository } from '../repositories/DoctorRepository';
import { ShiftRepository } from '../repositories/ShiftRepository';
import { RosterRepository } from '../repositories/RosterRepository';
import { RosterEngine } from '../services/scheduler/engine';

const router = Router();
const docRepo = new DoctorRepository();
const shiftRepo = new ShiftRepository();
const rosterRepo = new RosterRepository();
const engine = new RosterEngine();

router.get('/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    
    let roster = await rosterRepo.getRosterMonth(year, month);
    if (!roster) {
      roster = await rosterRepo.createRosterMonth(year, month);
    }
    
    const assignments = await rosterRepo.getAssignments(roster.id);
    const doctors = await docRepo.getAllDoctors();
    const shifts = await shiftRepo.getAllShiftTypes();
    const leaves = await docRepo.getLeavesForMonth(year, month);
    
    res.json({ roster, assignments, doctors, shifts, leaves });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:year/:month/generate', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    
    let roster = await rosterRepo.getRosterMonth(year, month);
    if (!roster) {
      roster = await rosterRepo.createRosterMonth(year, month);
    }
    
    const doctors = await docRepo.getAllDoctors();
    const shifts = await shiftRepo.getAllShiftTypes();
    const leaves = await docRepo.getLeavesForMonth(year, month);
    const existingAssignments = await rosterRepo.getAssignments(roster.id);
    
    const newAssignments = engine.generate(year, month, doctors, shifts, leaves, existingAssignments);
    
    await rosterRepo.saveAssignments(roster.id, newAssignments);
    const savedAssignments = await rosterRepo.getAssignments(roster.id);
    
    res.json({ assignments: savedAssignments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:year/:month/assignment', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    const month = parseInt(req.params.month, 10);
    const { assignment_date, shift_type_id, doctor_id, is_shift_active, override_note } = req.body;
    
    const roster = await rosterRepo.getRosterMonth(year, month);
    if (!roster) {
       return res.status(404).json({ error: 'Roster month not found' });
    }
    
    await rosterRepo.updateAssignmentManual(
      roster.id,
      assignment_date,
      shift_type_id,
      doctor_id,
      is_shift_active,
      override_note
    );
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
