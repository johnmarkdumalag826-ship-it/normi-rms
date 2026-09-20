import React, { useState } from 'react';
import { 
  ClipboardList, CheckCircle2, Award, ShieldAlert, FileText, Send, 
  HelpCircle, ChevronRight, X, AlertTriangle, Play 
} from 'lucide-react';
import { User, Schedule, Research, Evaluation } from '../types';

interface DashboardPanelistProps {
  user: User;
  schedules: Schedule[];
  researchList: Research[];
  evaluations: Evaluation[];
  users: User[];
  onAddEvaluation: (evaluation: Evaluation) => void;
  onSelectResearch: (id: string) => void;
}

export default function DashboardPanelist({
  user, schedules, researchList, evaluations, users, onAddEvaluation, onSelectResearch
}: DashboardPanelistProps) {
  const [selectedSchedId, setSelectedSchedId] = useState('');
  const [score1, setScore1] = useState(18); // default values out of max
  const [score2, setScore2] = useState(25);
  const [score3, setScore3] = useState(25);
  const [score4, setScore4] = useState(18);
  const [comments, setComments] = useState('');
  const [recommendation, setRecommendation] = useState<'Passed' | 'Minor Revision' | 'Major Revision' | 'Failed'>('Passed');
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);

  // Filters defenses assigned to this panelist
  const assignedDefenses = schedules.filter(s => s.panelistIds.includes(user.id));
  
  // Stats
  const pendingEvaluationCount = assignedDefenses.filter(s => 
    s.status === 'scheduled' && 
    !evaluations.some(e => e.scheduleId === s.id && e.panelistId === user.id)
  ).length;

  const completedEvaluationCount = evaluations.filter(e => e.panelistId === user.id).length;

  const getResearchTitle = (researchId: string) => {
    const r = researchList.find(x => x.id === researchId);
    return r ? r.title : 'Research Project';
  };

  const getStudentNames = (researchId: string) => {
    const res = researchList.find(x => x.id === researchId);
    if (!res) return 'Unknown Authors';
    return res.studentIds.map(sid => {
      const u = users.find(x => x.id === sid);
      return u ? u.name : 'Unknown';
    }).join(', ');
  };

  const handleOpenEvaluation = (schedId: string) => {
    setSelectedSchedId(schedId);
    setShowEvaluationForm(true);
    setComments('');
    setScore1(18);
    setScore2(25);
    setScore3(25);
    setScore4(18);
  };

  const handleEvaluationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedId) return;

    const total = Number(score1) + Number(score2) + Number(score3) + Number(score4);

    onAddEvaluation({
      id: `eval-${Date.now()}`,
      scheduleId: selectedSchedId,
      panelistId: user.id,
      panelistName: user.name,
      score1: Number(score1),
      score2: Number(score2),
      score3: Number(score3),
      score4: Number(score4),
      totalScore: total,
      comment: comments,
      recommendation,
      evaluatedAt: new Date().toISOString()
    });

    setShowEvaluationForm(false);
    setSelectedSchedId('');
  };

  return (
    <div className="space-y-6">
      {/* Stats summary banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal">Upcoming Panels Assigned</span>
            <span className="text-sm font-extrabold text-slate-800">{pendingEvaluationCount} pending defenses</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs  font-bold text-slate-500 block tracking-normal">Completed evaluations</span>
            <span className="text-sm font-extrabold text-slate-800">{completedEvaluationCount} scores logged</span>
          </div>
        </div>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Defense calendar schedules */}
        <section className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-150 px-5 py-3 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700  tracking-normal">Assigned Defense Calendar Slots</h3>
              <span className="text-xs text-slate-500 ">Count: {assignedDefenses.length}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {assignedDefenses.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No defenses currently assigned to your panel committee.
                </div>
              ) : (
                assignedDefenses.map(sched => {
                  const isEvaluated = evaluations.some(e => e.scheduleId === sched.id && e.panelistId === user.id);
                  return (
                    <div key={sched.id} className="p-5 hover:bg-slate-50/20 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <span className="text-xs bg-indigo-50 text-indigo-700  font-bold px-2 py-0.25 rounded">
                            {sched.startTime} - {sched.endTime}
                          </span>
                          <h4 className="text-xs font-bold text-slate-850 leading-snug">{getResearchTitle(sched.researchId)}</h4>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center">
                          <button
                            onClick={() => onSelectResearch(sched.researchId)}
                            className="px-2.5 py-1 text-xs font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                          >
                            <FileText className="h-3 w-3" /> View Manuscript
                          </button>

                          {isEvaluated ? (
                            <span className="text-xs font-bold  text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Scores Logged
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenEvaluation(sched.id)}
                              className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-1 px-3 text-xs rounded flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                            >
                              <Play className="h-3 w-3 shrink-0" /> Grade Defense
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div className="text-slate-500 font-medium">
                          Authors: <strong className="text-slate-700 font-semibold">{getStudentNames(sched.researchId)}</strong>
                        </div>
                        <div className="text-slate-500  text-right text-xs">
                          Defense Date: {sched.date}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Right Col: Evaluated list logs */}
        <section className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-150 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-800  tracking-normal border-b border-slate-100 pb-2">
              My Historical Grading Logs
            </h3>

            {evaluations.filter(e => e.panelistId === user.id).length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No scores logged yet. Open an assigned defense to record evaluation grades.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {evaluations.filter(e => e.panelistId === user.id).map(e => (
                  <div key={e.id} className="p-3 bg-slate-50 rounded-lg border border-slate-150 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className=" text-xs font-bold text-slate-500">ID #{e.id.substring(5, 10).toUpperCase()}</span>
                      <span className={`px-1.5 py-0.25 rounded  font-bold text-xs  ${e.recommendation === 'Passed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                        {e.recommendation}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-800 truncate" title={e.comment}>
                      Score: <strong className="text-blue-900">{e.totalScore} / 100</strong>
                    </p>
                    <p className="text-xs text-slate-500 italic line-clamp-2">"{e.comment}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* EVALUATION SCORING SHEET MODAL */}
      {showEvaluationForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <form 
            onSubmit={handleEvaluationSubmit} 
            className="bg-white rounded-xl border border-slate-150 w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 font-serif">
                <Award className="h-4.5 w-4.5 text-blue-700" />
                CIT Faculty Evaluation Grade Sheet
              </h3>
              <button 
                type="button" 
                onClick={() => setShowEvaluationForm(false)}
                className="text-slate-500 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded border">
              Input scores based on the capstone presentations. Max aggregate points is 100. Relational parameters will instantly update student records upon locking.
            </p>

            <div className="space-y-3 pt-2">
              {/* Score 1 */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <label>1. Problem Statement & Situation analysis (Max 20)</label>
                  <span>Max 20 pts</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="20"
                  required
                  value={score1}
                  onChange={(e) => setScore1(Math.min(20, Math.max(0, Number(e.target.value))))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Score 2 */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <label>2. Literature review & Methodology (Max 30)</label>
                  <span>Max 30 pts</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="30"
                  required
                  value={score2}
                  onChange={(e) => setScore2(Math.min(30, Math.max(0, Number(e.target.value))))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Score 3 */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <label>3. System Design & Database Relational normalization (Max 30)</label>
                  <span>Max 30 pts</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="30"
                  required
                  value={score3}
                  onChange={(e) => setScore3(Math.min(30, Math.max(0, Number(e.target.value))))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Score 4 */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <label>4. Q&A and presentation skills (Max 20)</label>
                  <span>Max 20 pts</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="20"
                  required
                  value={score4}
                  onChange={(e) => setScore4(Math.min(20, Math.max(0, Number(e.target.value))))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Total Score display */}
              <div className="p-2.5 bg-blue-50 text-blue-900 border border-blue-100 rounded-lg text-center  font-bold text-xs">
                CALCULATED WEIGHTED TOTAL SCORE: {Number(score1) + Number(score2) + Number(score3) + Number(score4)} / 100
              </div>

              {/* Recommendation */}
              <div>
                <label className="text-xs font-bold text-slate-500  block mb-1">Committee recommendation</label>
                <select
                  required
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value as any)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="Passed">Passed (No Revisions)</option>
                  <option value="Minor Revision">Minor Revision Required</option>
                  <option value="Major Revision">Major Revision Required</option>
                  <option value="Failed">Failed (Re-defense Required)</option>
                </select>
              </div>

              {/* Comments */}
              <div>
                <label className="text-xs font-bold text-slate-500  block mb-1">Descriptive Jury comments</label>
                <textarea
                  rows={3}
                  required
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Detail critical updates, circuit improvements, formatting, etc."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-3">
              <button
                type="button"
                onClick={() => setShowEvaluationForm(false)}
                className="px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer"
              >
                Lock & Log Scores
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
