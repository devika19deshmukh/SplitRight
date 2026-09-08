import React from 'react';
import type { Stage } from '../types';
import { Upload, FileSearch, Users, Layers, PieChart, Check } from 'lucide-react';

interface StepperProps {
  currentStage: Stage;
  onStageClick: (stage: Stage) => void;
}

const STAGES: { key: Stage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'upload', label: 'Upload Receipt', icon: Upload },
  { key: 'review', label: 'Review Bill', icon: FileSearch },
  { key: 'members', label: 'Add Diners', icon: Users },
  { key: 'assign', label: 'Assign Items', icon: Layers },
  { key: 'results', label: 'Split Summary', icon: PieChart },
];

export const Stepper: React.FC<StepperProps> = ({ currentStage, onStageClick }) => {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="w-full max-w-4xl mx-auto mb-10 px-4">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Bar */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800/80 -translate-y-1/2 z-0 rounded-full" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 -translate-y-1/2 z-0 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(99,102,241,0.5)]"
          style={{ width: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
        />

        {STAGES.map((s, idx) => {
          const Icon = s.icon;
          const isCurrent = s.key === currentStage;
          const isPassed = idx < currentIndex;
          const isClickable = idx < currentIndex;

          return (
            <div key={s.key} className="flex flex-col items-center relative z-10">
              <button
                onClick={() => isClickable && onStageClick(s.key)}
                disabled={!isClickable}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold text-sm md:text-base transition-all duration-300 ${
                  isCurrent
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-4 ring-indigo-500/25 scale-110 shadow-xl shadow-indigo-500/30'
                    : isPassed
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 hover:bg-slate-700 cursor-pointer shadow-md'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {isPassed ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-5 h-5" />}
              </button>
              <span
                className={`mt-2 text-xs md:text-xs font-semibold tracking-wide transition-colors ${
                  isCurrent
                    ? 'text-indigo-300 font-bold'
                    : isPassed
                    ? 'text-slate-300'
                    : 'text-slate-500'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
