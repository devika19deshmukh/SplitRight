import React, { useState, useRef } from 'react';
import type { Receipt } from '../types';
import { extractReceipt, getDemoReceipt } from '../services/api';
import { Upload, FileImage, ShieldCheck, Sparkles, AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';

interface UploadPageProps {
  onReceiptExtracted: (receipt: Receipt, imagePreviews: string[]) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onReceiptExtracted }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Extracting receipt data...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setLoadingText(
      selectedFiles.length > 1
        ? `Merging & extracting ${selectedFiles.length} receipt photos...`
        : 'Extracting structured bill data...'
    );

    try {
      const extracted = await extractReceipt(selectedFiles);
      onReceiptExtracted(extracted, filePreviews);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to extract receipt data. You can try demo mode or re-upload.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoMode = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingText('Loading sample receipt demo...');

    try {
      const demoReceipt = await getDemoReceipt();
      const demoPreview = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
      onReceiptExtracted(demoReceipt, [demoPreview]);
    } catch (err: any) {
      setErrorMsg('Failed to load demo receipt.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold mb-3">
          <Sparkles className="w-4 h-4" /> Smart Bill Splitter
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">
          Split Restaurant Bills <span className="gradient-text">Fairly & Instantly</span>
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto">
          Upload photo(s) of your restaurant receipt. AI extracts the items, human reviews, and deterministic math splits taxes & fees proportionally.
        </p>
      </div>

      {/* Main Upload Box */}
      <div className="glass-panel rounded-2xl p-6 md:p-8 shadow-2xl border border-slate-800 relative">
        {isLoading ? (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mx-auto" />
            <p className="text-lg font-medium text-slate-200">{loadingText}</p>
            <p className="text-sm text-slate-500">Scanning line items, taxes, CGST/SGST, and total amounts...</p>
          </div>
        ) : (
          <>
            {/* Drag & Drop Target */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 bg-slate-900/40 hover:bg-slate-800/40 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files)}
              />

              <div className="w-16 h-16 rounded-full bg-indigo-600/10 text-indigo-400 group-hover:scale-110 flex items-center justify-center mx-auto mb-4 transition-transform">
                <Upload className="w-8 h-8" />
              </div>

              <p className="text-lg font-semibold text-slate-200 mb-1">
                Drop your restaurant bill here
              </p>
              <p className="text-sm text-slate-400 mb-3">or <span className="text-indigo-400 underline font-medium">choose a photo</span> from your device</p>
              <p className="text-xs text-slate-500">Supports JPG, JPEG, PNG, WEBP (Multiple images allowed for long bills)</p>
            </div>

            {/* Selected File Previews */}
            {selectedFiles.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-300 font-medium">
                  <span>Selected Photos ({selectedFiles.length})</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add another image
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filePreviews.map((preview, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-800/80 aspect-[3/4]">
                      <img src={preview} alt={`Receipt ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-2 left-2 bg-slate-900/80 text-slate-200 text-[10px] px-2 py-0.5 rounded font-mono">
                        Part {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Extraction Issue</p>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={processUpload}
                disabled={selectedFiles.length === 0}
                className="w-full sm:flex-1 btn-primary flex items-center justify-center gap-2 text-base py-3"
              >
                <FileImage className="w-5 h-5" />
                {selectedFiles.length > 1 ? `Extract from ${selectedFiles.length} Photos` : 'Extract Structured Bill'}
              </button>

              <button
                onClick={handleDemoMode}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                Try Sample Receipt
              </button>
            </div>
          </>
        )}
      </div>

      {/* Privacy Guarantee Footer */}
      <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-xs text-center">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span>Your receipt stays private and is only used to calculate the split. No data is shared.</span>
      </div>
    </div>
  );
};
