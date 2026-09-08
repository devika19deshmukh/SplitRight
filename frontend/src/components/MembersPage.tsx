import React, { useState } from 'react';
import type { Member } from '../types';
import { Users, UserPlus, Trash2, Edit2, Check, ArrowRight, UserCheck, Sparkles } from 'lucide-react';

interface MembersPageProps {
  members: Member[];
  onMembersConfirmed: (members: Member[]) => void;
}

const PRESET_COLORS = [
  'bg-indigo-600 text-white border-indigo-400',
  'bg-purple-600 text-white border-purple-400',
  'bg-pink-600 text-white border-pink-400',
  'bg-emerald-600 text-white border-emerald-400',
  'bg-amber-600 text-white border-amber-400',
  'bg-cyan-600 text-white border-cyan-400',
  'bg-rose-600 text-white border-rose-400',
  'bg-violet-600 text-white border-violet-400',
];

const QUICK_GROUPS = [
  { label: '4 Diners', names: ['Devika', 'Priya', 'Rahul', 'Aman'] },
  { label: 'Family Trip', names: ['Mom', 'Dad', 'Devika', 'Rohan'] },
  { label: 'Work Lunch', names: ['Devika', 'Alex', 'Sarah', 'Karan'] },
];

export const MembersPage: React.FC<MembersPageProps> = ({
  members: initialMembers,
  onMembersConfirmed,
}) => {
  const [members, setMembers] = useState<Member[]>(
    initialMembers.length >= 2
      ? initialMembers
      : [
          { id: 'm-1', name: 'Devika', color: PRESET_COLORS[0] },
          { id: 'm-2', name: 'Priya', color: PRESET_COLORS[1] },
          { id: 'm-3', name: 'Rahul', color: PRESET_COLORS[2] },
          { id: 'm-4', name: 'Aman', color: PRESET_COLORS[3] },
        ]
  );
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameText, setEditNameText] = useState('');

  const addMember = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const newMember: Member = {
      id: `m-${Date.now()}`,
      name: trimmed,
      color: PRESET_COLORS[members.length % PRESET_COLORS.length],
    };
    setMembers((prev) => [...prev, newMember]);
    setNewName('');
  };

  const loadPresetGroup = (names: string[]) => {
    const newMembers: Member[] = names.map((n, idx) => ({
      id: `m-${Date.now()}-${idx}`,
      name: n,
      color: PRESET_COLORS[idx % PRESET_COLORS.length],
    }));
    setMembers(newMembers);
  };

  const removeMember = (id: string) => {
    if (members.length <= 2) {
      alert('Minimum 2 members required to split a bill.');
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const startRename = (m: Member) => {
    setEditingId(m.id);
    setEditNameText(m.name);
  };

  const saveRename = (id: string) => {
    const trimmed = editNameText.trim();
    if (trimmed) {
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, name: trimmed } : m))
      );
    }
    setEditingId(null);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-500/30 shadow-lg">
          <Users className="w-7 h-7" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-100">Who's Splitting This Bill?</h2>
        <p className="text-slate-400 text-sm mt-1">
          Add 2 or more diners. You will assign receipt items to them on the next step.
        </p>
      </div>

      {/* Main Glass Panel */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 space-y-6">
        {/* Quick Group Presets */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Quick Group Templates
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_GROUPS.map((g, idx) => (
              <button
                key={idx}
                onClick={() => loadPresetGroup(g.names)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700/80 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                {g.label} ({g.names.length})
              </button>
            ))}
          </div>
        </div>

        {/* Add Member Form */}
        <div className="flex gap-2 pt-2 border-t border-slate-800/80">
          <input
            type="text"
            placeholder="Enter diner name (e.g. Devika)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMember()}
            className="flex-1 bg-slate-900/90 text-slate-100 placeholder-slate-500 px-4 py-3 rounded-xl border border-slate-700/80 focus:border-indigo-500 focus:outline-none font-semibold text-base shadow-inner"
          />
          <button
            onClick={addMember}
            disabled={!newName.trim()}
            className="btn-primary px-5 py-3 flex items-center gap-2 font-bold text-sm shadow-md"
          >
            <UserPlus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Member Cards Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            <span>Diners List ({members.length})</span>
            {members.length < 2 && <span className="text-amber-400">Add at least {2 - members.length} more diner</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shadow-md border ${m.color}`}
                  >
                    {getInitials(m.name)}
                  </div>

                  {/* Name or Rename Input */}
                  {editingId === m.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editNameText}
                        onChange={(e) => setEditNameText(e.target.value)}
                        className="bg-slate-950 text-slate-100 px-2 py-1 rounded-lg text-sm border border-indigo-500 focus:outline-none w-28 font-semibold"
                        autoFocus
                      />
                      <button
                        onClick={() => saveRename(m.id)}
                        className="p-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-bold text-slate-100 text-base truncate">
                      {m.name}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {editingId !== m.id && (
                    <button
                      onClick={() => startRename(m)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-800"
                      title="Rename diner"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => removeMember(m.id)}
                    disabled={members.length <= 2}
                    className="p-1.5 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded-lg hover:bg-slate-800"
                    title={members.length <= 2 ? 'Minimum 2 members required' : 'Remove diner'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onMembersConfirmed(members)}
          disabled={members.length < 2}
          className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base font-bold shadow-xl mt-4"
        >
          <UserCheck className="w-5 h-5" /> Continue to Assign Items ({members.length} Diners) <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
