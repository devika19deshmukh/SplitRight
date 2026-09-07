import React from 'react';
import type { Stage } from '../types';
import { Upload, FileSearch, Users, Layers, PieChart, CheckCircle2 } from 'lucide-react';

interface StepperProps {
  currentStage: Stage;
  onStageClick: (stage: Stage) => void;
}

const STAGES: { key: Stage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'review', label: 'Review', icon: FileSearch },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'assign', label: 'Assign', icon: Layers },
  { key: 'results', label: 'Split', icon: PieChart },
];

export const Stepper: React.FC<StepperProps> = ({ currentStage, onStageClick }) => {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 px-4">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 -translate-y-1/2 z-0 rounded-full" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 -translate-y-1/2 z-0 rounded-full transition-all duration-300"
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
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-sm md:text-base transition-all duration-200 ${
                  isCurrent
                    ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white ring-4 ring-indigo-500/30 scale-110 shadow-lg shadow-indigo-500/30'
                    : isPassed
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isPassed ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </button>
              <span
                className={`mt-2 text-xs md:text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'text-indigo-400 font-semibold'
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
