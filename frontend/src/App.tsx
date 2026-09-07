import { useState } from 'react';
import type { Stage, Receipt, Member, ItemAssignment, SplitResult } from './types';
import { calculateSplit } from './services/api';
import { Stepper } from './components/Stepper';
import { UploadPage } from './components/UploadPage';
import { ReviewPage } from './components/ReviewPage';
import { MembersPage } from './components/MembersPage';
import { AssignmentPage } from './components/AssignmentPage';
import { ResultsPage } from './components/ResultsPage';
import { Receipt as ReceiptIcon } from 'lucide-react';

export function App() {
  const [stage, setStage] = useState<Stage>('upload');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [splitResult, setSplitResult] = useState<SplitResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Step 1: Receipt Extracted
  const handleReceiptExtracted = (extractedReceipt: Receipt, previews: string[]) => {
    setReceipt(extractedReceipt);
    setImagePreviews(previews);
    setStage('review');
  };

  // Step 2: Bill Reviewed & Confirmed
  const handleConfirmReceipt = (confirmedReceipt: Receipt) => {
    setReceipt(confirmedReceipt);
    setStage('members');
  };

  // Step 3: Members Confirmed
  const handleMembersConfirmed = (confirmedMembers: Member[]) => {
    setMembers(confirmedMembers);
    setStage('assign');
  };

  // Step 4: Items Assigned & Calculate API called
  const handleCalculateSplit = async (assignments: ItemAssignment[]) => {
    if (!receipt || !members.length) return;

    setIsCalculating(true);
    setCalcError(null);

    try {
      const result = await calculateSplit(receipt, members, assignments);
      setSplitResult(result);
      setStage('results');
    } catch (err: any) {
      setCalcError(err.message || 'Failed to calculate bill split.');
    } finally {
      setIsCalculating(false);
    }
  };

  // Reset Application
  const handleStartNewSplit = () => {
    setReceipt(null);
    setImagePreviews([]);
    setMembers([]);
    setSplitResult(null);
    setCalcError(null);
    setStage('upload');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={handleStartNewSplit}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <ReceiptIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              Split<span className="text-indigo-400">Right</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
              Demo Ready v1.0
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 py-8">
        {/* Stage Stepper Header */}
        <Stepper currentStage={stage} onStageClick={(s) => setStage(s)} />

        {/* Calculation Loading Overlay */}
        {isCalculating && (
          <div className="w-full max-w-md mx-auto py-16 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-lg font-bold text-slate-200">Calculating Proportional Split...</p>
            <p className="text-xs text-slate-400">Distributing taxes, service charges, and running Decimal rounding checks.</p>
          </div>
        )}

        {/* Error Banner */}
        {calcError && (
          <div className="max-w-xl mx-auto mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm text-center">
            ⚠️ {calcError}
          </div>
        )}

        {/* Active Stage Screen */}
        {!isCalculating && (
          <>
            {stage === 'upload' && (
              <UploadPage onReceiptExtracted={handleReceiptExtracted} />
            )}

            {stage === 'review' && receipt && (
              <ReviewPage
                receipt={receipt}
                imagePreviews={imagePreviews}
                onConfirmReceipt={handleConfirmReceipt}
              />
            )}

            {stage === 'members' && (
              <MembersPage
                members={members}
                onMembersConfirmed={handleMembersConfirmed}
              />
            )}

            {stage === 'assign' && receipt && (
              <AssignmentPage
                receipt={receipt}
                members={members}
                onCalculateSplit={handleCalculateSplit}
              />
            )}

            {stage === 'results' && splitResult && (
              <ResultsPage
                splitResult={splitResult}
                members={members}
                onStartNewSplit={handleStartNewSplit}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>© 2026 SplitRight — Probabilistic Extraction • Human Verification • Deterministic Arithmetic</p>
      </footer>
    </div>
  );
}
export default App;
