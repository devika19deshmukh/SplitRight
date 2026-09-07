import React, { useState } from 'react';
import type { Receipt, Member, ItemAssignment } from '../types';
import { Layers, Users, Check, AlertCircle, ArrowRight, PieChart } from 'lucide-react';

interface AssignmentPageProps {
  receipt: Receipt;
  members: Member[];
  onCalculateSplit: (assignments: ItemAssignment[]) => void;
}

export const AssignmentPage: React.FC<AssignmentPageProps> = ({
  receipt,
  members,
  onCalculateSplit,
}) => {
  // Initialize assignments map for each item
  const [assignments, setAssignments] = useState<Record<string, ItemAssignment>>(() => {
    const initial: Record<string, ItemAssignment> = {};
    receipt.items.forEach((item) => {
      initial[item.id] = {
        item_id: item.id,
        assigned_members: [],
        split_type: 'equal',
        custom_shares: {},
      };
    });
    return initial;
  });

  const toggleMember = (itemId: string, memberId: string) => {
    setAssignments((prev) => {
      const current = prev[itemId] || {
        item_id: itemId,
        assigned_members: [],
        split_type: 'equal',
        custom_shares: {},
      };

      const isAssigned = current.assigned_members.includes(memberId);
      const newAssigned = isAssigned
        ? current.assigned_members.filter((id) => id !== memberId)
        : [...current.assigned_members, memberId];

      // Re-normalize custom shares if in custom mode
      const newShares: Record<string, number> = {};
      if (newAssigned.length > 0) {
        const equalShare = Math.round((100 / newAssigned.length) * 100) / 100;
        newAssigned.forEach((id) => {
          newShares[id] = current.custom_shares?.[id] || equalShare;
        });
      }

      return {
        ...prev,
        [itemId]: {
          ...current,
          assigned_members: newAssigned,
          custom_shares: newShares,
        },
      };
    });
  };

  const selectEveryone = (itemId: string) => {
    setAssignments((prev) => {
      const allMemberIds = members.map((m) => m.id);
      const equalShare = Math.round((100 / allMemberIds.length) * 100) / 100;
      const customShares: Record<string, number> = {};
      allMemberIds.forEach((id) => (customShares[id] = equalShare));

      return {
        ...prev,
        [itemId]: {
          item_id: itemId,
          assigned_members: allMemberIds,
          split_type: 'equal',
          custom_shares: customShares,
        },
      };
    });
  };

  const toggleSplitType = (itemId: string, type: 'equal' | 'custom') => {
    setAssignments((prev) => {
      const current = prev[itemId];
      return {
        ...prev,
        [itemId]: { ...current, split_type: type },
      };
    });
  };

  const updateCustomShare = (itemId: string, memberId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setAssignments((prev) => {
      const current = prev[itemId];
      return {
        ...prev,
        [itemId]: {
          ...current,
          custom_shares: {
            ...current.custom_shares,
            [memberId]: num,
          },
        },
      };
    });
  };

  // Helper validation checks
  const assignedCount = receipt.items.filter(
    (item) => (assignments[item.id]?.assigned_members.length || 0) > 0
  ).length;

  const allAssigned = assignedCount === receipt.items.length;

  const getCustomSum = (itemId: string) => {
    const assignment = assignments[itemId];
    if (!assignment || !assignment.custom_shares) return 0;
    return Math.round(
      assignment.assigned_members.reduce(
        (sum, mId) => sum + (assignment.custom_shares?.[mId] || 0),
        0
      ) * 100
    ) / 100;
  };

  const handleSubmit = () => {
    if (!allAssigned) {
      alert('Please assign all items to at least one member before proceeding.');
      return;
    }

    const assignmentList = Object.values(assignments);
    onCalculateSplit(assignmentList);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-400" /> Assign Receipt Items
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Tap members who had each dish or drink. Shared items are split equally or custom % proportionally.
          </p>
        </div>

        {/* Unassigned Counter Pill */}
        <div
          className={`px-4 py-2 rounded-xl text-sm font-semibold border flex items-center gap-2 ${
            allAssigned
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          {allAssigned ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>
            {assignedCount} of {receipt.items.length} items assigned
          </span>
        </div>
      </div>

      {/* Item Cards List */}
      <div className="space-y-4 mb-8">
        {receipt.items.map((item) => {
          const assignment = assignments[item.id] || {
            item_id: item.id,
            assigned_members: [],
            split_type: 'equal',
          };

          const isItemAssigned = assignment.assigned_members.length > 0;
          const customSum = getCustomSum(item.id);
          const isCustomMismatch = assignment.split_type === 'custom' && Math.abs(customSum - 100) > 0.1;

          return (
            <div
              key={item.id}
              className={`glass-panel rounded-2xl p-5 border transition-all duration-200 shadow-lg ${
                isItemAssigned ? 'border-slate-700/80 bg-slate-900/60' : 'border-amber-500/40 bg-amber-950/10'
              }`}
            >
              {/* Item Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    {item.name.value}
                    {item.quantity.value > 1 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                        Qty: {item.quantity.value}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {item.quantity.value > 1
                      ? `@ ₹${item.unit_price.value.toFixed(2)} each`
                      : 'Single line item'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xl font-extrabold text-indigo-300">
                    ₹{item.total_price.value.toFixed(2)}
                  </span>

                  {/* Everyone Button Shortcut */}
                  <button
                    onClick={() => selectEveryone(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-indigo-400 border border-indigo-500/20 transition-colors flex items-center gap-1"
                  >
                    <Users className="w-3.5 h-3.5" /> Everyone
                  </button>
                </div>
              </div>

              {/* Member Selection Buttons */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Who had this?
                </span>

                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const isSelected = assignment.assigned_members.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleMember(item.id, m.id)}
                        className={`px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-200 border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30 scale-105'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-700/80'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold border ${m.color}`}>
                          {m.name.slice(0, 2).toUpperCase()}
                        </span>
                        {m.name}
                        {isSelected && <Check className="w-4 h-4 text-indigo-200" />}
                      </button>
                    );
                  })}
                </div>

                {/* Split Type Controls (Equal vs Custom) */}
                {assignment.assigned_members.length > 1 && (
                  <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800 w-fit">
                      <button
                        onClick={() => toggleSplitType(item.id, 'equal')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          assignment.split_type === 'equal'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Equal Split ({assignment.assigned_members.length})
                      </button>
                      <button
                        onClick={() => toggleSplitType(item.id, 'custom')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          assignment.split_type === 'custom'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Custom Split %
                      </button>
                    </div>

                    {/* Custom Split % Inputs */}
                    {assignment.split_type === 'custom' && (
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {assignment.assigned_members.map((mId) => {
                          const member = members.find((m) => m.id === mId);
                          return (
                            <div key={mId} className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                              <span className="text-slate-300 font-medium">{member?.name}:</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={assignment.custom_shares?.[mId] ?? 0}
                                onChange={(e) => updateCustomShare(item.id, mId, e.target.value)}
                                className="w-12 bg-slate-900 text-indigo-300 font-bold px-1 py-0.5 rounded text-right focus:outline-none"
                              />
                              <span className="text-slate-500">%</span>
                            </div>
                          );
                        })}
                        {isCustomMismatch && (
                          <span className="text-amber-400 text-xs font-bold">
                            ⚠️ Total = {customSum}% (Should equal 100%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Floating Submit Bar */}
      <div className="sticky bottom-6 glass-panel rounded-2xl p-4 border border-slate-800 shadow-2xl flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-bold text-slate-200 block">Ready to Calculate?</span>
          <span className="text-xs text-slate-400">Proportional tax & fees will be allocated deterministically.</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allAssigned}
          className="btn-primary px-6 py-3 flex items-center gap-2 text-base font-bold shadow-xl"
        >
          <PieChart className="w-5 h-5" /> Calculate Final Split <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
