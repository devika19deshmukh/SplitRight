import React, { useState, useRef } from 'react';
import type { Receipt } from '../types';
import { extractReceipt, getDemoReceipt } from '../services/api';
import { Upload, FileImage, ShieldCheck, Sparkles, AlertCircle, Loader2, Plus, Trash2, ArrowRight } from 'lucide-react';

interface UploadPageProps {
  onReceiptExtracted: (receipt: Receipt, imagePreviews: string[]) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onReceiptExtracted }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const LOADING_STEPS = [
    'Analyzing receipt photo quality & layout...',
    'Scanning line items, prices, and quantities...',
    'Detecting CGST, SGST, Service Charges & Discounts...',
    'Calculating per-field OCR confidence metrics...'
  ];

  const handleFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    Array.from(files).forEach((file) => {
      if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      }
    });

    if (validFiles.length === 0) {
      setErrorMsg('Please upload valid image files (JPG, PNG, WEBP).');
      return;
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setFilePreviews((prev) => [...prev, ...validPreviews]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileChange(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const processUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 600);

    try {
      const extracted = await extractReceipt(selectedFiles);
      clearInterval(interval);
      onReceiptExtracted(extracted, filePreviews);
    } catch (err: any) {
      clearInterval(interval);
      setErrorMsg(err.message || 'Failed to extract receipt data. You can try sample mode or re-upload.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoMode = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStep(1);

    try {
      const demoReceipt = await getDemoReceipt();
      const demoPreview = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
      onReceiptExtracted(demoReceipt, [demoPreview]);
    } catch (err: any) {
      setErrorMsg('Failed to load sample receipt.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4">
      {/* Hero Banner Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
          <Sparkles className="w-4 h-4 text-purple-400" /> AI Receipt OCR • Proportional Bill Splitter
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
          Split Restaurant Bills <br className="hidden sm:inline" />
          <span className="gradient-text">Fairly & Accurately</span>
        </h1>

        <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Upload photo(s) of your restaurant receipt. AI extracts the items, human verifies on the Review screen, and deterministic math splits taxes & fees proportionally.
        </p>
      </div>

      {/* Main Upload Panel */}
      <div className="glass-panel rounded-3xl p-6 md:p-10 shadow-2xl border border-slate-800/80 relative">
        {isLoading ? (
          <div className="py-20 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto shadow-inner">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>

            <div className="space-y-2">
              <p className="text-xl font-bold text-slate-100">Extracting Receipt Data...</p>
              <p className="text-sm text-indigo-400 font-medium">{LOADING_STEPS[loadingStep]}</p>
            </div>

            {/* Progress indicators */}
            <div className="max-w-md mx-auto flex items-center justify-between px-4 pt-2">
              {LOADING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i <= loadingStep ? 'bg-indigo-500 w-1/5 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-slate-800 w-1/5'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 bg-slate-900/40 hover:bg-slate-800/40 group relative overflow-hidden"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files)}
              />

              <div className="w-20 h-20 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 flex items-center justify-center mx-auto mb-4 transition-transform shadow-lg">
                <Upload className="w-9 h-9" />
              </div>

              <p className="text-xl font-bold text-slate-100 mb-1">
                Drop your restaurant bill here
              </p>
              <p className="text-sm text-slate-400 mb-4">
                or <span className="text-indigo-400 underline font-semibold">browse files</span> from your phone or computer
              </p>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 text-xs font-mono text-slate-400 border border-slate-700">
                JPG • PNG • WEBP (Supports 2+ photos for long receipts)
              </div>
            </div>

            {/* Selected File Previews Grid */}
            {selectedFiles.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between text-sm text-slate-300 font-semibold px-1">
                  <span>Selected Receipt Photos ({selectedFiles.length})</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold"
                  >
                    <Plus className="w-4 h-4" /> Add another photo
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {filePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 aspect-[3/4] shadow-md">
                      <img src={preview} alt={`Receipt Part ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-2.5 bg-red-600/90 hover:bg-red-600 text-white rounded-xl transition-colors shadow-lg"
                          title="Remove photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 bg-slate-900/90 text-indigo-300 text-[10px] px-2 py-0.5 rounded-md font-mono border border-indigo-500/30">
                        Part {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                <div>
                  <p className="font-bold">Extraction Warning</p>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Action Buttons & Sample Receipt Options */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={handleDemoMode}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 font-bold border border-slate-700 transition-colors flex items-center justify-center gap-2 text-sm shadow-md"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                Try Sample Receipt Demo
              </button>

              <button
                onClick={processUpload}
                disabled={selectedFiles.length === 0}
                className="w-full sm:flex-1 btn-primary flex items-center justify-center gap-2 text-base py-3.5 shadow-xl"
              >
                <FileImage className="w-5 h-5" />
                {selectedFiles.length > 1 ? `Extract from ${selectedFiles.length} Photos` : 'Extract Structured Bill'}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Privacy Guarantee Footer */}
      <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs text-center">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span>Your receipt photos stay private and are strictly used to calculate the bill split. No data is stored externally.</span>
      </div>
    </div>
  );
};
