import { useState, useEffect } from 'react';
import { getRoster, generateRoster, updateAssignment } from './api/api';
import { eachDayOfInterval, endOfMonth, startOfMonth, startOfWeek, endOfWeek, format, isSameDay, parseISO, isSameMonth } from 'date-fns';
import { RefreshCw, Stethoscope, Save, AlertCircle, Wand2, Activity, Users, CalendarDays, UserPlus } from 'lucide-react';

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

function App() {
  const [year] = useState(2026);
  const [month] = useState(6);
  const [data, setData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [editDoctorId, setEditDoctorId] = useState<string>('');

  const loadData = async () => {
    try {
      const res = await getRoster(year, month);
      setData(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const confirmGenerate = async () => {
    setShowConfirmDialog(false);
    setGenerating(true);
    try {
      await generateRoster(year, month);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateClick = () => {
    setShowConfirmDialog(true);
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

  // Calendar calculations
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Metrics calculations
  // Estimate total required shifts (some days have 5, some have 4 if 2 doctors on leave, etc, but we'll use actual count)
  let totalShifts = 0;
  let unassignedShifts = 0;
  
  // Calculate exact required shifts based on reduced staffing logic for metrics
  eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach(day => {
    const leavesOnDay = data.leaves.filter((l: any) => isSameDay(parseISO(l.leave_date), day)).length;
    let expectedShifts = 5;
    if (leavesOnDay >= 2) expectedShifts = 4;
    if (leavesOnDay >= 3) expectedShifts = 3;
    totalShifts += expectedShifts;
  });

  const actualAssigned = data.assignments.filter((a:any) => isSameMonth(parseISO(a.assignment_date), monthStart) && a.doctor_id).length;
  unassignedShifts = Math.max(0, totalShifts - actualAssigned);

  const getShiftColorClass = (shiftId: string) => {
    switch(shiftId) {
      case 'morning': return 'gradient-bg-amber text-amber-50';
      case 'day': return 'gradient-bg-emerald text-emerald-50';
      case 'afternoon': return 'gradient-bg-sky text-sky-50';
      case 'night': return 'gradient-bg-indigo text-indigo-50';
      case 'obgyn': return 'gradient-bg-rose text-rose-50';
      default: return 'gradient-bg-blue text-blue-50';
    }
  };

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden selection:bg-blue-500/30 selection:text-white pb-20 font-sans">
      {/* Dynamic Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]"></div>
      </div>

      <header className="sticky top-0 z-40 glass-panel border-b border-border/10 py-4 px-4 sm:px-6 mb-6 shadow-xl">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-extrabold gradient-text flex items-center gap-2 sm:gap-3 tracking-tight">
              <Stethoscope className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" strokeWidth={2.5} />
              Emergency Department Roster
            </h1>
            <p className="text-muted-foreground mt-1 font-medium tracking-wide text-xs sm:text-sm sm:ml-11 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span>{format(monthStart, 'MMMM yyyy')}</span>
              <span className="hidden sm:inline mx-2 opacity-50">•</span>
              <span className="hidden sm:inline">Automated scheduling for ER doctors</span>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Button 
              onClick={handleGenerateClick}
              disabled={generating}
              className="w-full sm:w-auto group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-full font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-105 cursor-pointer"
            >
              <Wand2 className="w-5 h-5 group-hover:scale-110 transition-transform cursor-pointer" />
              Auto Generate Roster
            </Button>
          </div>
        </div>
      </header>

      {/* Generation Full Screen Loader Overlay */}
      {generating && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="p-4 bg-blue-500/10 rounded-full mb-6 relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground mb-2 tracking-tight">Generating Schedule...</h2>
          <p className="text-muted-foreground font-medium">Running constraint algorithms & balancing shifts</p>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6">
        
        {/* At-a-Glance Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Shifts</p>
              <p className="text-2xl font-bold text-foreground">{totalShifts}</p>
            </div>
          </div>
          <div className={`glass-panel p-4 rounded-2xl border flex items-center gap-4 ${unassignedShifts > 0 ? 'border-red-500/30' : 'border-white/10'}`}>
            <div className={`p-3 rounded-xl ${unassignedShifts > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
              <AlertCircle className={`w-6 h-6 ${unassignedShifts > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Unassigned</p>
              <p className={`text-2xl font-bold ${unassignedShifts > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{unassignedShifts}</p>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Doctors</p>
              <p className="text-2xl font-bold text-foreground">{data.doctors.length}</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mb-4 px-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-2">Legend:</span>
          <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300">Night</Badge>
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">Morning</Badge>
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Day</Badge>
          <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-300">Afternoon</Badge>
          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-300">OBGYN</Badge>
          <span className="text-muted-foreground opacity-50 mx-2">|</span>
          <Badge variant="outline" className="border-orange-500/50 bg-orange-500/20 text-orange-400"><AlertCircle className="w-3 h-3 mr-1 inline"/> Overridden</Badge>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          
          {/* Calendar Header Row (Desktop Only) */}
          <div className="hidden xl:grid grid-cols-7 bg-white/5 border-b border-white/10">
            {weekDays.map(day => (
              <div key={day} className="py-3 px-2 text-center text-sm font-bold text-muted-foreground uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-px bg-white/10">
            {calendarDays.map((day, i) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isLeaveDay = data.leaves.some((l: any) => isSameDay(parseISO(l.leave_date), day));
              
              const mobileVisibilityClass = !isCurrentMonth ? "hidden xl:flex" : "flex";

              return (
                <div 
                  key={i} 
                  className={`${mobileVisibilityClass} flex-col min-h-[160px] p-3 xl:p-2 gap-2 xl:gap-1 transition-colors ${
                    isCurrentMonth ? 'bg-zinc-950/80 hover:bg-zinc-900/90' : 'bg-zinc-950/40'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex justify-between items-center mb-1 px-1">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-lg xl:text-sm font-bold ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                        {format(day, 'd')}
                      </span>
                      <span className="xl:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {format(day, 'EEEE')}
                      </span>
                    </div>
                    {isLeaveDay && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px] bg-red-500/20 text-red-400 border-red-500/30">
                        Leave
                      </Badge>
                    )}
                  </div>

                  {/* Shifts list */}
                  <div className="flex flex-col gap-1.5 xl:gap-1 flex-1">
                    {data.shifts.map((shift: any) => {
                      const assignment = data.assignments.find((a: any) => isSameDay(parseISO(a.assignment_date), day) && a.shift_type_id === shift.id);
                      const doctor = assignment?.doctor_id ? data.doctors.find((d: any) => d.id === assignment.doctor_id) : null;
                      
                      const isAssigned = !!doctor;
                      const isOverridden = assignment?.is_manual_override;

                      const baseColorClass = getShiftColorClass(shift.id);

                      return (
                        <div 
                          key={shift.id}
                          onClick={() => {
                            setSelectedCell({ dateStr, shift, assignment, doctor });
                            setEditDoctorId(doctor?.id || 'unassigned');
                          }}
                          className={`
                            group cursor-pointer rounded-md p-2 xl:p-1.5 text-xs flex justify-between items-center transition-all border
                            ${!isCurrentMonth ? 'opacity-50 hover:opacity-100' : ''}
                            ${isOverridden 
                              ? 'gradient-bg-orange text-orange-50 ring-1 ring-orange-500/50' 
                              : isAssigned 
                                ? `${baseColorClass} opacity-90 hover:opacity-100` 
                                : 'bg-white/5 border-white/10 text-muted-foreground/60 border-dashed hover:border-white/30 hover:bg-white/10 hover:text-white'}
                          `}
                          title={shift.name}
                        >
                          <div className="flex flex-col overflow-hidden w-full">
                            <span className="text-[10px] xl:text-[9px] uppercase tracking-wider opacity-75 font-bold truncate mb-0.5">
                              {shift.name}
                            </span>
                            
                            {isAssigned ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-current opacity-70"></div>
                                <span className="truncate font-semibold tracking-tight text-sm xl:text-xs">
                                  {doctor.name}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-blue-400 group-hover:text-blue-300">
                                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate font-semibold tracking-tight text-sm xl:text-xs">
                                  Assign Doctor
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {isOverridden && (
                            <AlertCircle className="w-4 h-4 xl:w-3.5 xl:h-3.5 shrink-0 text-orange-200 ml-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Confirm Generate Modal */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="glass-panel border-red-500/20 shadow-2xl sm:max-w-md bg-zinc-950/95 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight text-red-400 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Confirm Generation
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to run the auto-generator? This will overwrite all non-manual assignments for the month. 
              <br/><br/>
              <strong className="text-foreground">Manual overrides will be preserved.</strong>
            </p>
          </div>
          <div className="flex gap-4 justify-end">
            <Button variant="ghost" onClick={() => setShowConfirmDialog(false)} className="rounded-xl hover:bg-white/10">Cancel</Button>
            <Button onClick={confirmGenerate} className="bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/20">Generate Roster</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal (Preserved exactly as is) */}
      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="glass-panel border-white/10 shadow-2xl sm:max-w-md bg-zinc-950/90 text-foreground">
          <DialogHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 shrink-0">
              <Stethoscope className="w-6 h-6 text-blue-500" />
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
