# Duty Doctor Roster Scheduling System

A full-stack constraint-based scheduling application for a hospital emergency department. This system automatically generates monthly duty rosters based on complex business rules and allows administrative manual overrides.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS v4, Shadcn UI, `date-fns`.
- **Backend**: Node.js, Express, TypeScript, `pg` (Raw SQL queries).
- **Database**: Supabase / PostgreSQL.

---

## 🚀 Setup Instructions

### 1. Database (Supabase)
1. Create a new project in [Supabase](https://supabase.com/).
2. Navigate to the SQL Editor in your Supabase dashboard.
3. Copy the contents of `duty-doctor-roster-schema.sql` and run it to create all tables and insert the required seed data (doctors, shift types, leaves).
4. Go to **Settings > Database** and copy the **Connection string (URI)**.

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` directory and add your Supabase URI (ensure you add `?sslmode=require` if required):
   ```env
   DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server will run on http://localhost:3001*

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The UI will be available at http://localhost:5173*

---

## ⚙️ Scheduling Algorithm

The scheduling engine uses a strict **Priority-based Strategy Pattern** to ensure all constraints are met before assigning shifts. 

The algorithm executes in the following sequence for every day in the month:
1. **Pre-filters Availability**: It filters out doctors who are on a weekly off or have an approved leave on that specific date.
2. **Fixed Assignments**: It assigns Dr. Rohan Khanna his mandatory Night Shifts (Mon-Thu) first.
3. **Restricted Assignments**: It ensures Dr. Imran Siddiqui does not exceed 2 Night Shifts per month.
4. **OBGYN Shift**: It checks eligible female doctors (Dr. Meera, Dr. Priya, Dr. Kavya) and rotates them through the OBGYN shift.
5. **Standard Shifts**: It distributes Night, Morning, and Afternoon shifts amongst remaining available doctors, strictly checking:
   - **Post-Night Recovery**: If a doctor worked a Night shift yesterday, they can only work an Afternoon shift (or take the day off) today.
   - **Max Limits**: No doctor exceeds 1 shift per day or 6 shifts per week.
6. **Day Shift Fallback**: Finally, any doctor who remains available and unassigned after all mandatory shifts are covered is automatically assigned to the **Day Shift**.

### Reduced Staffing
The system dynamically scales down operations if doctors are unavailable (e.g., due to leaves or weekly offs overlapping):
- If 2 doctors are unavailable: The OBGYN shift is dropped for that day.
- If 3 doctors are unavailable: Both OBGYN and Day shifts are dropped.

---

## ✍️ Manual Overrides & Re-generation

The frontend provides an interactive calendar to handle real-world operational changes.

- **Manual Assignment**: Admins can click on any shift cell in the grid to manually assign a doctor or clear a slot.
- **Visual Feedback**: Manual overrides are distinctly highlighted in the UI (Orange gradient) compared to auto-generated slots (Blue gradient).
- **Database Persistence**: When an override is made, it is instantly saved to the database with a specific flag (`is_manual_override = true`) and a source note.
- **Re-generation Behavior**: If the admin clicks **"Auto Generate"** to recalculate the month's roster, the backend engine pulls all existing assignments first. It strictly ignores and preserves any assignments marked as `is_manual_override = true`. **Manual edits will never be silently overwritten by the auto-generator.**
