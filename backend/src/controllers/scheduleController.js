const Schedule = require('../models/Schedule');
const Research = require('../models/Research');
const Room = require('../models/Room');
const User = require('../models/User');
const PanelAvailability = require('../models/PanelAvailability');
const AppError = require('../utils/AppError');
const { logAction } = require('../utils/audit');
const { notifyMany } = require('../utils/notify');

const listSchedules = async (req, res) => {
  const filter = {};
  if (req.query.researchId) filter.researchId = req.query.researchId;
  res.json(await Schedule.find(filter).sort({ date: 1, startTime: 1 }));
};

// Coordinator manually registers a defense slot (handleAddSchedule)
const createSchedule = async (req, res, next) => {
  const { researchId, date, startTime, endTime, roomId, panelistIds, type } = req.body;
  if (!researchId || !date || !startTime || !endTime || !roomId || !panelistIds || panelistIds.length < 3) {
    return next(new AppError('researchId, date, startTime, endTime, roomId, and 3 panelistIds are required', 400));
  }

  const schedule = await Schedule.create({
    researchId, date, startTime, endTime, roomId, panelistIds,
    status: 'scheduled', type: type || 'proposal',
  });

  const research = await Research.findByIdAndUpdate(researchId, { status: 'Scheduled' }, { returnDocument: 'after' });
  if (research) {
    await notifyMany(
      research.studentIds,
      'Defense Schedule Published!',
      `Your defense is set for ${date} @ ${startTime} in the presentation rooms. Check coordinates.`,
      'success',
    );
  }

  await logAction(req, 'CREATE_SCHEDULE', `Coordinator registered defense slot ID ${schedule._id} for research ${researchId}`);
  res.status(201).json(schedule);
};

const updateSchedule = async (req, res, next) => {
  const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
  if (!schedule) return next(new AppError('Schedule not found', 404));
  await logAction(req, 'UPDATE_SCHEDULE', `Coordinator updated defense schedule ID ${schedule._id} date/time coordinates.`);
  res.json(schedule);
};

const cancelSchedule = async (req, res, next) => {
  const schedule = await Schedule.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { returnDocument: 'after' });
  if (!schedule) return next(new AppError('Schedule not found', 404));
  await Research.findByIdAndUpdate(schedule.researchId, { status: 'Approved by Adviser' });
  await logAction(req, 'CANCEL_SCHEDULE', `Coordinator cancelled defense schedule ID ${schedule._id}`);
  res.json(schedule);
};

const deleteSchedule = async (req, res, next) => {
  const schedule = await Schedule.findByIdAndDelete(req.params.id);
  if (!schedule) return next(new AppError('Schedule not found', 404));
  await Research.findByIdAndUpdate(schedule.researchId, { status: 'Approved by Adviser' });
  await logAction(req, 'DELETE_SCHEDULE', `Coordinator permanently deleted schedule ID ${req.params.id}`);
  res.status(204).send();
};

// Reset draft (non-completed) schedules (handleClearSchedules)
const clearDraftSchedules = async (req, res) => {
  const drafts = await Schedule.find({ status: { $ne: 'completed' } });
  const researchIds = drafts.map((s) => s.researchId);
  await Schedule.deleteMany({ status: { $ne: 'completed' } });
  await Research.updateMany({ _id: { $in: researchIds }, status: 'Scheduled' }, { status: 'Approved by Adviser' });
  await logAction(req, 'CLEAR_SCHEDULES', 'Coordinator cleared draft scheduling calendars.');
  res.json({ success: true });
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_SLOTS = [
  { start: '09:00', end: '10:30' },
  { start: '10:45', end: '12:15' },
  { start: '13:30', end: '15:00' },
  { start: '15:15', end: '16:45' },
];

// Conflict-free auto-scheduler, ported from Frontend/src/components/AutomatedScheduler.tsx
const autoGenerate = async (req, res) => {
  const { dates } = req.body; // e.g. ['2026-07-22', '2026-07-23', '2026-07-24']
  const candidateDates = dates && dates.length ? dates : ['2026-07-22', '2026-07-23', '2026-07-24'];
  const timeSlots = DEFAULT_SLOTS;

  const [existingSchedules, rooms, panelists, availabilities] = await Promise.all([
    Schedule.find({ status: 'scheduled' }),
    Room.find(),
    User.find({ role: 'panelist' }),
    PanelAvailability.find({ isAvailable: true }),
  ]);

  const scheduledResearchIds = new Set(existingSchedules.map((s) => String(s.researchId)));
  const eligibleResearch = await Research.find({
    status: { $in: ['Approved by Adviser', 'Pending Coordinator'] },
    _id: { $nin: [...scheduledResearchIds] },
  });

  const logs = [];
  const created = [];
  const tempSchedules = existingSchedules.map((s) => ({
    date: s.date, startTime: s.startTime, endTime: s.endTime, roomId: String(s.roomId), panelistIds: s.panelistIds.map(String),
  }));

  logs.push('Initializing NORMI Schedule Optimizer (Conflict Resolution Model)...');

  for (const research of eligibleResearch) {
    let isScheduled = false;

    for (const date of candidateDates) {
      if (isScheduled) break;
      const dayOfWeek = DAYS[new Date(date).getDay()];

      for (const slot of timeSlots) {
        if (isScheduled) break;

        for (const room of rooms) {
          if (isScheduled) break;
          const roomId = String(room._id);

          const roomOverlap = tempSchedules.some((s) => s.date === date && s.roomId === roomId && slot.start < s.endTime && slot.end > s.startTime);
          if (roomOverlap) continue;

          const availablePanelists = panelists.filter((p) => {
            const pid = String(p._id);
            const isAvail = availabilities.some((a) => String(a.panelistId) === pid && a.dayOfWeek.toLowerCase() === dayOfWeek.toLowerCase());
            if (!isAvail) return false;
            const hasConflict = tempSchedules.some((s) => s.date === date && s.panelistIds.includes(pid) && slot.start < s.endTime && slot.end > s.startTime);
            return !hasConflict;
          });

          if (availablePanelists.length >= 3) {
            const selectedPanelists = availablePanelists.slice(0, 3);
            const panelistIds = selectedPanelists.map((p) => p._id);

            const schedule = await Schedule.create({
              researchId: research._id, date, startTime: slot.start, endTime: slot.end,
              roomId: room._id, panelistIds, status: 'scheduled', type: 'proposal',
            });
            await Research.findByIdAndUpdate(research._id, { status: 'Scheduled' });
            await notifyMany(research.studentIds, 'Defense Schedule Published!', `Your defense is set for ${date} @ ${slot.start} in ${room.name}. Check coordinates.`, 'success');

            tempSchedules.push({ date, startTime: slot.start, endTime: slot.end, roomId, panelistIds: panelistIds.map(String) });
            created.push(schedule);

            const pNames = selectedPanelists.map((p) => p.name.split(' ').slice(-1)[0]).join(', ');
            logs.push(`SUCCESS: Scheduled "${research.title.substring(0, 25)}..." on ${date} @ ${slot.start} in ${room.name}. Panelists: ${pNames}`);
            isScheduled = true;
          }
        }
      }
    }

    if (!isScheduled) {
      logs.push(`FAILED: Could not find conflict-free slot for "${research.title.substring(0, 25)}...". Please schedule manually.`);
    }
  }

  logs.push(`Optimization complete. Successfully scheduled ${created.length} research defense presentations.`);
  await logAction(req, 'AUTO_SCHEDULE', `Coordinator ran automated conflict-resolution scheduler; ${created.length} defenses scheduled.`);

  res.json({ scheduled: created, logs });
};

module.exports = {
  listSchedules, createSchedule, updateSchedule, cancelSchedule, deleteSchedule, clearDraftSchedules, autoGenerate,
};
