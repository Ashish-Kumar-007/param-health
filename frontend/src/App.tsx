import { useState, useEffect } from 'react';
import { getRoster, generateRoster, updateAssignment } from './api/api';
import { eachDayOfInterval, endOfMonth, format, isSameDay, parseISO } from 'date-fns';
import { RefreshCw, Calendar as CalendarIcon, User, Save, AlertCircle, Sparkles } from 'lucide-react';

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function App() {
  const [year] = useState(2026);
  const [month] = useState(6);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [editDoctorId, setEditDoctorId] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getRoster(year, month);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  const handleGenerate = async () => {
    if (confirm('Are you sure? This will overwrite all non-manual assignments.')) {
      setGenerating(true);
      try {
        await generateRoster(year, month);
        await loadData();
      } catch (e) {
        console.error(e);
      } finally {
        setGenerating(false);
      }
    }
  };

  const handleSaveOverride = async () => {
    if (!selectedCell) return;
    try {
      await updateAssignment(
        year, 
        month, 
        selectedCell.dateStr, 
        selectedCell.shift.id, 
        editDoctorId || null, 
        true, 
        'Manual override from UI'
      );
      setSelectedCell(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-muted-foreground font-medium tracking-wide">Loading Roster Data...</span>
      </div>
    </div>
  );

  const startDate = new Date(year, month - 1, 1);
  const days = eachDayOfInterval({ start: startDate, end: endOfMonth(startDate) });

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden selection:bg-blue-500/30 selection:text-white pb-20 font-sans">
      {/* Dynamic Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]"></div>
      </div>

      <header className="sticky top-0 z-40 glass-panel border-b border-border/10 py-4 px-6 mb-8">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold gradient-text flex items-center gap-3 tracking-tight">
              <CalendarIcon className="w-8 h-8 text-blue-500" strokeWidth={2.5} />
              Duty Doctor Roster
            </h1>
            <p className="text-muted-foreground mt-1 font-medium tracking-wider uppercase text-sm ml-11">June 2026</p>
          </div>
          <Button 
            onClick={handleGenerate}
            disabled={generating}
            className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-full font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
          >
            <Sparkles className={`w-5 h-5 ${generating ? 'animate-spin' : 'group-hover:animate-pulse'}`} />
            {generating ? 'Generating...' : 'Auto Generate'}
          </Button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6">
        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/5 hover:bg-transparent">
                  <TableHead className="p-5 font-bold text-foreground tracking-wide sticky left-0 glass-panel z-10 w-40 min-w-[160px]">
                    Date
                  </TableHead>
                  {data.shifts.map((shift: any) => (
                    <TableHead key={shift.id} className="p-5 font-bold text-muted-foreground tracking-wide min-w-[200px]">
                      {shift.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isLeaveDay = data.leaves.some((l: any) => isSameDay(parseISO(l.leave_date), day));
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  
                  return (
                    <TableRow key={dateStr} className={`border-b border-white/5 transition-colors ${isWeekend ? 'bg-white/[0.01]' : 'hover:bg-white/[0.02]'}`}>
                      <TableCell className={`p-5 whitespace-nowrap sticky left-0 z-10 ${isWeekend ? 'glass-panel' : 'bg-transparent backdrop-blur-md'}`}>
                        <div className="font-semibold text-lg text-foreground">{format(day, 'MMM d, yyyy')}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">{format(day, 'EEEE')}</div>
                        {isLeaveDay && (
                          <Badge variant="destructive" className="mt-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30">
                            Leave Day
                          </Badge>
                        )}
                      </TableCell>
                      
                      {data.shifts.map((shift: any) => {
                        const assignment = data.assignments.find((a: any) => isSameDay(parseISO(a.assignment_date), day) && a.shift_type_id === shift.id);
                        const doctor = assignment?.doctor_id ? data.doctors.find((d: any) => d.id === assignment.doctor_id) : null;
                        
                        return (
                          <TableCell key={shift.id} className="p-4 align-top">
                            <div 
                              onClick={() => {
                                setSelectedCell({ dateStr, shift, assignment, doctor });
                                setEditDoctorId(doctor?.id || 'unassigned');
                              }}
                              className={`
                                cursor-pointer rounded-xl p-4 transition-all duration-300 min-h-[90px] flex flex-col justify-center border
                                ${assignment?.is_manual_override 
                                  ? 'gradient-bg-orange' 
                                  : doctor 
                                    ? 'gradient-bg-blue' 
                                    : 'glass-cell pulse-subtle'}
                              `}
                            >
                              {doctor ? (
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${assignment?.is_manual_override ? 'bg-orange-500/20' : 'bg-blue-500/20'}`}>
                                    <User className={`w-5 h-5 ${assignment?.is_manual_override ? 'text-orange-400' : 'text-blue-400'}`} />
                                  </div>
                                  <span className={`font-semibold ${assignment?.is_manual_override ? 'text-orange-100' : 'text-blue-50'}`}>
                                    {doctor.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/70 italic text-sm text-center flex items-center justify-center h-full">
                                  Click to assign
                                </span>
                              )}
                              
                              {assignment?.is_manual_override && (
                                <div className="mt-3 text-xs font-medium text-orange-300 flex items-center gap-1.5 bg-orange-950/40 w-max px-2 py-1 rounded-md border border-orange-500/30">
                                  <AlertCircle className="w-3.5 h-3.5" /> Overridden
                                </div>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="glass-panel border-white/10 shadow-2xl sm:max-w-md bg-zinc-950/90 text-foreground">
          <DialogHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 shrink-0">
              <CalendarIcon className="w-6 h-6 text-blue-500" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight">Edit Assignment</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Date</p>
              <p className="font-semibold">{selectedCell?.dateStr}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Shift</p>
              <p className="font-semibold">{selectedCell?.shift.name}</p>
            </div>
          </div>
          
          <div className="mb-8">
            <label className="block text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Assign Doctor
            </label>
            <Select value={editDoctorId} onValueChange={setEditDoctorId}>
              <SelectTrigger className="w-full bg-[#18181b] border-white/10 h-14 rounded-xl text-md focus:ring-blue-500/50">
                <SelectValue placeholder="-- Unassigned --">
                  {editDoctorId && editDoctorId !== 'unassigned'
                    ? data?.doctors.find((d: any) => d.id === editDoctorId)?.name || editDoctorId
                    : '-- Unassigned --'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-foreground">
                <SelectItem value="unassigned" className="focus:bg-white/5">-- Unassigned --</SelectItem>
                {data?.doctors.map((doc: any) => (
                  <SelectItem key={doc.id} value={doc.id} className="focus:bg-white/5">
                    {doc.name} ({doc.gender})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4 justify-end">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedCell(null)}
              className="rounded-xl font-semibold hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const finalId = editDoctorId === 'unassigned' ? '' : editDoctorId;
                // Temporarily set it back to the original editDoctorId logic before the call
                setEditDoctorId(finalId);
                handleSaveOverride();
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all"
            >
              <Save className="w-5 h-5" />
              Save Override
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
