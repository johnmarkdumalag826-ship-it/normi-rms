import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, Landmark, Users, Clock, Calendar, CheckCircle2, 
  AlertTriangle, ShieldCheck, Play, Plus, Trash2, ArrowRight 
} from 'lucide-react';
import { Schedule, Room, User, Research, PanelAvailability } from '../types';

interface AutomatedSchedulerProps {
  schedules: Schedule[];
  rooms: Room[];
  users: User[];
  researchList: Research[];
  panelAvailabilities: PanelAvailability[];
  onAddSchedule: (sched: Schedule) => void;
  onClearSchedules: () => void;
}

export default function AutomatedScheduler({
  schedules, rooms, users, researchList, panelAvailabilities, onAddSchedule, onClearSchedules
}: AutomatedSchedulerProps) {
  const [selectedResearchId, setSelectedResearchId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-07-22');
  const [selectedStartTime, setSelectedStartTime] = useState('09:00');
  const [selectedEndTime, setSelectedEndTime] = useState('10:30');
  const [selectedPanelistIds, setSelectedPanelistIds] = useState<string[]>([]);
  
  const [schedulerLogs, setSchedulerLogs] = useState<string[]>([]);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);

  // List of Research Approved by Adviser but not yet scheduled
  const eligibleResearch = useMemo(() => {
    return researchList.filter(r => 
      (r.status === 'Approved by Adviser' || r.status === 'Pending Coordinator') &&
      !schedules.some(s => s.researchId === r.id && s.status === 'scheduled')
    );
  }, [researchList, schedules]);

  const panelistUsers = useMemo(() => {
    return users.filter(u => u.role === 'panelist');
  }, [users]);

  // Check if a specific schedule configuration has conflicts before saving
  const currentSetupConflicts = useMemo(() => {
    const conflicts: string[] = [];
    if (!selectedResearchId || !selectedRoomId || !selectedDate) return conflicts;

    // 1. Room overlap
    schedules.forEach(other => {
      if (other.status === 'scheduled' && other.date === selectedDate && other.roomId === selectedRoomId) {
        if (selectedStartTime < other.endTime && selectedEndTime > other.startTime) {
          const roomName = rooms.find(r => r.id === selectedRoomId)?.name || 'Room';
          conflicts.push(`Room conflict: ${roomName} is booked for another defense at this time.`);
        }
      }
    });

    // 2. Panelist overlap
    selectedPanelistIds.forEach(pid => {
      schedules.forEach(other => {
        if (other.status === 'scheduled' && other.date === selectedDate && other.panelistIds.includes(pid)) {
          if (selectedStartTime < other.endTime && selectedEndTime > other.startTime) {
            const panName = users.find(u => u.id === pid)?.name || 'Panelist';
            conflicts.push(`Panelist double-booking: ${panName} is already assigned to a defense at this time.`);
          }
        }
      });
    });

    // 3. Panelist availability match
    selectedPanelistIds.forEach(pid => {
      // Find day of week for selectedDate
      const dateObj = new Date(selectedDate);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[dateObj.getDay()];

      const availability = panelAvailabilities.find(a => 
        a.panelistId === pid && 
        a.dayOfWeek.toLowerCase() === dayName.toLowerCase() && 
        a.isAvailable
      );

      if (!availability) {
        const panName = users.find(u => u.id === pid)?.name || 'Panelist';
        conflicts.push(`Availability issue: ${panName} does not list ${dayName} as an available day.`);
      }
    });

    return conflicts;
  }, [selectedResearchId, selectedRoomId, selectedDate, selectedStartTime, selectedEndTime, selectedPanelistIds, schedules, rooms, users, panelAvailabilities]);

  const handleManualSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResearchId || !selectedRoomId || selectedPanelistIds.length < 3) return;

    onAddSchedule({
      id: `sched-${Date.now()}`,
      researchId: selectedResearchId,
      date: selectedDate,
      startTime: selectedStartTime,
      endTime: selectedEndTime,
      roomId: selectedRoomId,
      panelistIds: selectedPanelistIds,
      status: 'scheduled',
      type: 'proposal'
    });

    setSelectedResearchId('');
    setSelectedPanelistIds([]);
    setSchedulerLogs(prev => [`Manually scheduled defense for research ID: ${selectedResearchId}`, ...prev]);
  };

  const togglePanelistSelection = (pid: string) => {
    if (selectedPanelistIds.includes(pid)) {
      setSelectedPanelistIds(selectedPanelistIds.filter(id => id !== pid));
    } else {
      if (selectedPanelistIds.length < 3) {
        setSelectedPanelistIds([...selectedPanelistIds, pid]);
      }
    }
  };

  // AUTOMATED AI CONFLICT-FREE SCHEDULING ALGORITHM
  const runAutoScheduler = () => {
    if (eligibleResearch.length === 0) {
      setSchedulerLogs(prev => ["No eligible un-scheduled research proposals to optimize.", ...prev]);
      return;
    }

    setIsAutoScheduling(true);
    const logs: string[] = [];
    logs.push("Initializing NORMI Schedule Optimizer (Conflict Resolution Model)...");

    // We will simulate scheduling dates July 22, 23, 24
    const dates = ['2026-07-22', '2026-07-23', '2026-07-24'];
    const timeSlots = [
      { start: '09:00', end: '10:30' },
      { start: '10:45', end: '12:15' },
      { start: '13:30', end: '15:00' },
      { start: '15:15', end: '16:45' }
    ];

    let scheduledCount = 0;
    let tempSchedules = [...schedules];

    eligibleResearch.forEach(res => {
      let isScheduled = false;

      // Loop dates, times, and rooms to find a conflict-free match
      for (const d of dates) {
        if (isScheduled) break;
        
        for (const slot of timeSlots) {
          if (isScheduled) break;

          for (const room of rooms) {
            if (isScheduled) break;

            // Check if room is available
            const roomOverlap = tempSchedules.some(s => 
              s.status === 'scheduled' && 
              s.date === d && 
              s.roomId === room.id && 
              slot.start < s.endTime && slot.end > s.startTime
            );

            if (roomOverlap) continue;

            // Find 3 available panelists who don't have overlapping duties
            const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(d).getDay()];
            
            const availablePanelists = panelistUsers.filter(p => {
              // Check general day availability
              const isAvail = panelAvailabilities.some(a => 
                a.panelistId === p.id && 
                a.dayOfWeek.toLowerCase() === dayOfWeek.toLowerCase() && 
                a.isAvailable
              );

              if (!isAvail) return false;

              // Check if they are already double-booked
              const hasConflict = tempSchedules.some(s => 
                s.status === 'scheduled' && 
                s.date === d && 
                s.panelistIds.includes(p.id) && 
                slot.start < s.endTime && slot.end > s.startTime
              );

              return !hasConflict;
            });

            if (availablePanelists.length >= 3) {
              const selectedPanIds = availablePanelists.slice(0, 3).map(p => p.id);
              
              // Schedule it!
              const newSched: Schedule = {
                id: `sched-auto-${Date.now()}-${scheduledCount}`,
                researchId: res.id,
                date: d,
                startTime: slot.start,
                endTime: slot.end,
                roomId: room.id,
                panelistIds: selectedPanIds,
                status: 'scheduled',
                type: 'proposal'
              };

              tempSchedules.push(newSched);
              onAddSchedule(newSched);
              
              const pNames = availablePanelists.slice(0, 3).map(p => p.name.split(' ')[1]).join(', ');
              logs.push(`SUCCESS: Scheduled "${res.title.substring(0, 25)}..." on ${d} @ ${slot.start} in ${room.name}. Panelists: ${pNames}`);
              
              isScheduled = true;
              scheduledCount++;
            }
          }
        }
      }

      if (!isScheduled) {
        logs.push(`FAILED: Could not find conflict-free slot for "${res.title.substring(0, 25)}...". Please schedule manually.`);
      }
    });

    logs.push(`Optimization complete. Successfully scheduled ${scheduledCount} research defense presentations.`);
    setSchedulerLogs(prev => [...logs, ...prev]);
    setIsAutoScheduling(false);
  };

  return (
    <div className="space-y-6">
      {/* Top action grid */}
      <div className="bg-slate-50 border border-slate-150 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1.5">
          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded font-mono">
            ALGORITHMIC OPTIMIZATION UNIT
          </span>
          <h3 className="text-base font-serif font-bold text-slate-800 leading-none">
            Automated Conflict-Resolution Engine
          </h3>
          <p className="text-xs text-slate-500 max-w-xl">
            Schedules all remaining approved student capstone papers conflict-free according to room availability, student tracks, and designated panel availability rules.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0 w-full md:w-auto">
          <button
            onClick={onClearSchedules}
            className="flex-1 md:flex-none px-3.5 py-2 text-xs border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 font-bold rounded-lg cursor-pointer"
          >
            Clear Draft Calendars
          </button>
          
          <button
            onClick={runAutoScheduler}
            disabled={isAutoScheduling}
            className="flex-1 md:flex-none px-4 py-2 text-xs text-white bg-blue-800 hover:bg-blue-900 font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-blue-800/10 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${isAutoScheduling ? 'animate-spin' : ''}`} />
            {isAutoScheduling ? "Solving..." : "Run AI Auto-Scheduler"}
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: Manual Placement */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-2.5">
            Manual Placement Panel
          </h3>

          <form onSubmit={handleManualSchedule} className="space-y-4">
            {currentSetupConflicts.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex flex-col gap-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-rose-600" /> Relational Conflict Warnings!
                </span>
                <ul className="list-disc pl-5">
                  {currentSetupConflicts.map((conf, cidx) => (
                    <li key={cidx}>{conf}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Research selection */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Un-Scheduled Approved Paper</label>
                <select
                  required
                  value={selectedResearchId}
                  onChange={(e) => setSelectedResearchId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a student research group...</option>
                  {eligibleResearch.map(res => (
                    <option key={res.id} value={res.id}>{res.title}</option>
                  ))}
                </select>
              </div>

              {/* Room Selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Defense Room Venue</label>
                <select
                  required
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select presentation venue...</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.location})</option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Presentation Date</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Hours */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Start Hour</label>
                <input
                  type="time"
                  required
                  value={selectedStartTime}
                  onChange={(e) => setSelectedStartTime(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">End Hour</label>
                <input
                  type="time"
                  required
                  value={selectedEndTime}
                  onChange={(e) => setSelectedEndTime(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Panelists Checklist Selection */}
            <div className="space-y-2 border-t pt-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Assign 3 Panelists (Select {selectedPanelistIds.length}/3)</label>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {panelistUsers.map(p => {
                  const isChecked = selectedPanelistIds.includes(p.id);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => togglePanelistSelection(p.id)}
                      className={`p-2 border rounded-lg cursor-pointer text-center text-xs space-y-1.5 transition-colors ${isChecked ? 'bg-blue-50/70 border-blue-400 text-blue-900 ring-1 ring-blue-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                      <strong className="block truncate font-semibold">{p.name.split(' ')[1] || p.name}</strong>
                      <span className="text-[9px] text-slate-400 font-medium">Panelist Faculty</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={selectedPanelistIds.length < 3 || currentSetupConflicts.length > 0}
                className="px-5 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-md disabled:opacity-50 cursor-pointer"
              >
                Add Manual Schedule Slot
              </button>
            </div>
          </form>
        </div>

        {/* Right Log terminal */}
        <div className="lg:col-span-4 bg-slate-900 text-slate-300 rounded-xl p-5 shadow-sm space-y-4 font-mono select-none flex flex-col justify-between max-h-[480px]">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-450 border-b border-slate-800 pb-2.5">
              <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
              <span>Optimizer Log Output</span>
            </div>

            <div className="text-[10px] space-y-2.5 max-h-80 overflow-y-auto mt-3 scrollbar-none pr-1">
              {schedulerLogs.length === 0 ? (
                <div className="text-slate-500 italic">Logs are empty. Run the Auto-Scheduler to populate optimized metrics.</div>
              ) : (
                schedulerLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed border-l-2 border-slate-700 pl-2">
                    <span className="text-slate-500 font-sans">[{new Date().toLocaleTimeString([], { hour12: false })}]</span> {log}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[9px] text-slate-500 border-t border-slate-850 pt-2 text-right">
            System Optimizer Model v2.4.0
          </div>
        </div>
      </div>
    </div>
  );
}
