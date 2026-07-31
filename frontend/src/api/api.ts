const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/rosters';

export const getRoster = async (year: number, month: number) => {
  const res = await fetch(`${API_URL}/${year}/${month}`);
  if (!res.ok) throw new Error('Failed to fetch roster');
  return res.json();
};

export const generateRoster = async (year: number, month: number) => {
  const res = await fetch(`${API_URL}/${year}/${month}/generate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to generate roster');
  return res.json();
};

export const updateAssignment = async (
  year: number,
  month: number,
  assignment_date: string,
  shift_type_id: string,
  doctor_id: string | null,
  is_shift_active: boolean,
  override_note: string | null
) => {
  const res = await fetch(`${API_URL}/${year}/${month}/assignment`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assignment_date,
      shift_type_id,
      doctor_id,
      is_shift_active,
      override_note
    })
  });
  if (!res.ok) throw new Error('Failed to update assignment');
  return res.json();
};

export const checkHealth = async () => {
  try {
    const baseUrl = API_URL.replace('/api/rosters', '');
    const res = await fetch(`${baseUrl}/health`, { method: 'GET', cache: 'no-store' });
    if (!res.ok) return false;
    return true;
  } catch (e) {
    return false;
  }
};
