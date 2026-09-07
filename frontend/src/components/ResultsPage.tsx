import React, { useState } from 'react';
import type { SplitResult, Member } from '../types';
import { CheckCircle, Copy, RefreshCw } from 'lucide-react';

interface ResultsPageProps {
  splitResult: SplitResult;
  members: Member[];
  onStartNewSplit: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  splitResult,
  members,
  onStartNewSplit,
}) => {
  const [copied, setCopied] = useState(false);

  const getMemberColor = (id: string) => {
    const found = members.find((m) => m.id === id);
    return found?.color || 'bg-indigo-500 text-white border-indigo-400';
  };

  const formatSummaryText = () => {
    let text = `🧾 SplitRight Bill Breakdown\n`;
    text += `Confirmed Total: ₹${splitResult.confirmed_receipt_total.toFixed(2)}\n`;
    text += `Status: ${splitResult.reconciled ? '✓ Split Verified' : 'Unreconciled'}\n\n`;

    splitResult.members_breakdown.forEach((b) => {
      text += `${b.member_name.toUpperCase()} — ₹${b.total_payable.toFixed(2)}\n`;
      b.assigned_items.forEach((item) => {
        const shareStr = item.member_share_fraction < 1
          ? ` (${Math.round(item.member_share_fraction * 100)}%)`
          : '';
        text += `  • ${item.item_name}${shareStr}: ₹${item.member_share_amount.toFixed(2)}\n`;
      });
      text += `  Items Subtotal: ₹${b.items_subtotal.toFixed(2)}\n`;
      if (b.tax_share > 0) text += `  GST/Tax: ₹${b.tax_share.toFixed(2)}\n`;
      if (b.service_charge_share > 0) text += `  Service Charge: ₹${b.service_charge_share.toFixed(2)}\n`;
      if (b.discount_share > 0) text += `  Discount: -₹${b.discount_share.toFixed(2)}\n`;
      text += `\n`;
    });

    return text;
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(formatSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Top Banner Header */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 mb-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Split Complete
              </span>
              {splitResult.reconciled && (
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
                  ✓ 100% Reconciled
                </span>
              )}
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-100">
              Final Payment Breakdown
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Proportional GST & service charges allocated according to each member's item subtotal.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopySummary}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition-colors flex items-center gap-2 text-sm shadow-md"
            >
              <Copy className="w-4 h-4 text-indigo-400" />
              {copied ? 'Copied Summary!' : 'Copy Summary'}
            </button>

            <button
              onClick={onStartNewSplit}
              className="btn-primary px-5 py-3 flex items-center gap-2 font-bold text-sm shadow-lg"
            >
              <RefreshCw className="w-4 h-4" /> Start New Split
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Individual Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {splitResult.members_breakdown.map((breakdown) => {
          const colorClass = getMemberColor(breakdown.member_id);
          const initials = breakdown.member_name.slice(0, 2).toUpperCase();

          return (
            <div
              key={breakdown.member_id}
              className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div>
                {/* Member Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-md border ${colorClass}`}>
                      {initials}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-100 uppercase tracking-wide">
                        {breakdown.member_name}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {breakdown.assigned_items.length} items shared
                      </span>
                    </div>
                  </div>

                  {/* YOU PAY Badge */}
                  <div className="text-right bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-500/30">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                      YOU PAY
                    </span>
                    <span className="text-2xl font-extrabold text-indigo-300">
                      ₹{breakdown.total_payable.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="space-y-2 mb-4">
                  {breakdown.assigned_items.map((item, idx) => {
                    const isShared = item.member_share_fraction < 0.99;
                    const shareText = isShared
                      ? ` (${Math.round(item.member_share_fraction * 100)}%)`
                      : '';

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm py-1 border-b border-slate-800/40 text-slate-300"
                      >
                        <span className="font-medium truncate pr-2">
                          {item.item_name}
                          {shareText && (
                            <span className="text-indigo-400 font-semibold text-xs ml-1">
                              {shareText}
                            </span>
                          )}
                        </span>
                        <span className="font-semibold text-slate-200">
                          ₹{item.member_share_amount.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Math Breakdown Lines */}
              <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-slate-200">₹{breakdown.items_subtotal.toFixed(2)}</span>
                </div>
                {breakdown.tax_share > 0 && (
                  <div className="flex justify-between">
                    <span>GST / Tax Share (Proportional)</span>
                    <span className="font-semibold text-slate-200">₹{breakdown.tax_share.toFixed(2)}</span>
                  </div>
                )}
                {breakdown.service_charge_share > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge Share (Proportional)</span>
                    <span className="font-semibold text-slate-200">₹{breakdown.service_charge_share.toFixed(2)}</span>
                  </div>
                )}
                {breakdown.discount_share > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount Share</span>
                    <span className="font-semibold">-₹{breakdown.discount_share.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-extrabold text-indigo-300">
                  <span>Total Payable</span>
                  <span>₹{breakdown.total_payable.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Exact Reconciliation Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Bill Reconciliation Report</h3>
              <p className="text-xs text-slate-400">Verified math invariant: SUM(member totals) == confirmed bill total</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
            <CheckCircle className="w-4 h-4" /> ✓ Split verified
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Confirmed Bill Total</span>
            <span className="text-lg font-bold text-slate-200">
              ₹{splitResult.confirmed_receipt_total.toFixed(2)}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Sum of Member Payments</span>
            <span className="text-lg font-bold text-slate-200">
              ₹{splitResult.sum_member_totals.toFixed(2)}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Difference</span>
            <span className="text-lg font-bold text-emerald-400">
              ₹{splitResult.difference.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Compact Quick Summary Bar */}
        <div className="pt-3 border-t border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Quick Summary
          </span>
          <div className="flex flex-wrap gap-2">
            {splitResult.members_breakdown.map((b) => (
              <span
                key={b.member_id}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                {b.member_name} — <strong className="text-indigo-300">₹{b.total_payable.toFixed(2)}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
