import React, { useState } from 'react';
import type { Member } from '../types';
import { Users, UserPlus, Trash2, Edit2, Check, ArrowRight, UserCheck } from 'lucide-react';

interface MembersPageProps {
  members: Member[];
  onMembersConfirmed: (members: Member[]) => void;
}

const PRESET_COLORS = [
  'bg-indigo-500 text-white border-indigo-400',
  'bg-purple-500 text-white border-purple-400',
  'bg-pink-500 text-white border-pink-400',
  'bg-emerald-500 text-white border-emerald-400',
  'bg-amber-500 text-white border-amber-400',
  'bg-cyan-500 text-white border-cyan-400',
  'bg-rose-500 text-white border-rose-400',
  'bg-violet-500 text-white border-violet-400',
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
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-500/20 shadow-lg">
          <Users className="w-7 h-7" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-100">Who's Splitting This Bill?</h2>
        <p className="text-slate-400 text-sm mt-1">
          Add at least 2 members who shared this meal. You will assign bill items to them next.
        </p>
      </div>

      {/* Main Glass Box */}
      <div className="glass-panel rounded-2xl p-6 shadow-2xl border border-slate-800 space-y-6">
        {/* Add Member Input Form */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter member name (e.g. Devika)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMember()}
            className="flex-1 bg-slate-900/80 text-slate-100 placeholder-slate-500 px-4 py-3 rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none font-medium text-base shadow-inner"
          />
          <button
            onClick={addMember}
            disabled={!newName.trim()}
            className="btn-primary px-5 py-3 flex items-center gap-2 font-semibold text-sm shadow-md"
          >
            <UserPlus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Member Cards Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            <span>Members ({members.length})</span>
            {members.length < 2 && <span className="text-amber-400">Add at least {2 - members.length} more member</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md border ${m.color}`}
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
                        className="bg-slate-900 text-slate-100 px-2 py-1 rounded text-sm border border-indigo-500 focus:outline-none w-28"
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
                    <span className="font-semibold text-slate-200 text-base truncate">
                      {m.name}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {editingId !== m.id && (
                    <button
                      onClick={() => startRename(m)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors rounded-lg hover:bg-slate-700/50"
                      title="Rename member"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => removeMember(m.id)}
                    disabled={members.length <= 2}
                    className="p-1.5 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded-lg hover:bg-slate-700/50"
                    title={members.length <= 2 ? 'Minimum 2 members required' : 'Remove member'}
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
          <UserCheck className="w-5 h-5" /> Continue to Assign Items ({members.length} Members) <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
