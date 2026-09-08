import React, { useState, useEffect } from 'react';
import type { Receipt, ReceiptItem, ReceiptValidationResult } from '../types';
import { validateReceipt } from '../services/api';
import {
  FileText, CheckCircle, AlertTriangle, HelpCircle, Plus, Trash2,
  AlertCircle, ArrowRight, Image as ImageIcon, ZoomIn, ZoomOut, RotateCw, Check, RefreshCw
} from 'lucide-react';

interface ReviewPageProps {
  receipt: Receipt;
  imagePreviews: string[];
  onConfirmReceipt: (confirmedReceipt: Receipt) => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({
  receipt: initialReceipt,
  imagePreviews,
  onConfirmReceipt,
}) => {
  const [receipt, setReceipt] = useState<Receipt>(initialReceipt);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [validation, setValidation] = useState<ReceiptValidationResult | null>(null);

  // Live arithmetic validation whenever receipt fields change
  useEffect(() => {
    validateReceipt(receipt).then(setValidation).catch(console.error);
  }, [receipt]);

  const updateItem = (index: number, key: keyof ReceiptItem, val: any) => {
    setReceipt((prev) => {
      const updatedItems = [...prev.items];
      const item = { ...updatedItems[index] };

      if (key === 'name') {
        item.name = { ...item.name, value: val };
      } else if (key === 'quantity') {
        const qty = parseFloat(val) || 0;
        item.quantity = { ...item.quantity, value: qty };
        item.total_price = {
          ...item.total_price,
          value: roundMoney(qty * (item.unit_price.value || 0))
        };
      } else if (key === 'unit_price') {
        const uPrice = parseFloat(val) || 0;
        item.unit_price = { ...item.unit_price, value: uPrice };
        item.total_price = {
          ...item.total_price,
          value: roundMoney((item.quantity.value || 1) * uPrice)
        };
      } else if (key === 'total_price') {
        item.total_price = { ...item.total_price, value: parseFloat(val) || 0 };
      }

      updatedItems[index] = item;

      // Recalculate subtotal automatically if user edits item total
      const newSubtotal = roundMoney(updatedItems.reduce((acc, i) => acc + (i.total_price.value || 0), 0));
      return {
        ...prev,
        items: updatedItems,
        subtotal: { ...prev.subtotal, value: newSubtotal }
      };
    });
  };

  const addItem = () => {
    setReceipt((prev) => {
      const newItem: ReceiptItem = {
        id: `custom-item-${Date.now()}`,
        name: { value: 'New Item', confidence: 1.0 },
        quantity: { value: 1.0, confidence: 1.0 },
        unit_price: { value: 100.0, confidence: 1.0 },
        total_price: { value: 100.0, confidence: 1.0 },
      };
      const updatedItems = [...prev.items, newItem];
      const newSubtotal = roundMoney(updatedItems.reduce((acc, i) => acc + (i.total_price.value || 0), 0));
      return {
        ...prev,
        items: updatedItems,
        subtotal: { ...prev.subtotal, value: newSubtotal }
      };
    });
  };

  const deleteItem = (index: number) => {
    setReceipt((prev) => {
      const updatedItems = prev.items.filter((_, i) => i !== index);
      const newSubtotal = roundMoney(updatedItems.reduce((acc, i) => acc + (i.total_price.value || 0), 0));
      return {
        ...prev,
        items: updatedItems,
        subtotal: { ...prev.subtotal, value: newSubtotal }
      };
    });
  };

  const updateBillField = (field: keyof Receipt, val: any) => {
    setReceipt((prev) => ({
      ...prev,
      [field]: { ...(prev[field] as any), value: parseFloat(val) || 0 }
    }));
  };

  const autoBalanceTotal = () => {
    if (!validation) return;
    setReceipt((prev) => ({
      ...prev,
      total: { ...prev.total, value: validation.calculated_total }
    }));
  };

  const roundMoney = (v: number) => Math.round(v * 100) / 100;

  const renderConfidenceBadge = (confidence: number) => {
    const pct = Math.round(confidence * 100);
    if (pct >= 85) {
      return (
        <span className="badge-high inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold">
          <CheckCircle className="w-3 h-3" /> {pct}%
        </span>
      );
    } else if (pct >= 60) {
      return (
        <span className="badge-med inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold">
          <AlertTriangle className="w-3 h-3" /> {pct}%
        </span>
      );
    } else {
      return (
        <span className="badge-low inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold">
          <HelpCircle className="w-3 h-3" /> {pct}% Review
        </span>
      );
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-2">
      {/* Top Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-indigo-400" /> Mandatory Bill Review Screen
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Compare OCR extracted line items with your photo. Edit any field before final calculations are performed.
          </p>
        </div>

        <button
          onClick={() => onConfirmReceipt(receipt)}
          className="btn-primary flex items-center justify-center gap-2 px-6 py-3.5 text-base shadow-xl"
        >
          <Check className="w-5 h-5" /> Confirm Bill & Continue <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Arithmetic Validation Warning Banner */}
      {validation && (validation.has_mismatch || validation.has_line_item_mismatch) && (
        <div className="mb-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-base text-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              Bill Arithmetic Mismatch Detected
            </div>
            {validation.warnings.map((w, idx) => (
              <p key={idx} className="text-xs font-mono text-amber-300/90 pl-7">{w}</p>
            ))}
          </div>

          <button
            onClick={autoBalanceTotal}
            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs flex items-center gap-1.5 self-start md:self-auto transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync Printed Total (₹{validation.calculated_total.toFixed(2)})
          </button>
        </div>
      )}

      {/* Split Screen Grid (Left: Image Viewer, Right: Editable Receipt) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Receipt Photo Viewer */}
        <div className="lg:col-span-5 flex flex-col glass-panel rounded-3xl p-4 border border-slate-800 h-[680px] sticky top-4">
          <div className="flex items-center justify-between mb-3 px-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              Original Photo {imagePreviews.length > 1 && `(${activeImageIdx + 1}/${imagePreviews.length})`}
            </span>
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-indigo-300">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 ml-1"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Photo Canvas */}
          <div className="flex-1 overflow-auto bg-slate-950/90 rounded-2xl p-2 flex items-center justify-center relative border border-slate-800/80">
            {imagePreviews.length > 0 ? (
              <img
                src={imagePreviews[activeImageIdx]}
                alt="Uploaded Receipt"
                className="max-w-full h-auto object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
              />
            ) : (
              <div className="text-center text-slate-500 text-sm">
                No receipt photo preview available.
              </div>
            )}
          </div>

          {/* Multi-Image Switcher */}
          {imagePreviews.length > 1 && (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-800">
              {imagePreviews.map((preview, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`flex-shrink-0 w-14 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImageIdx === idx ? 'border-indigo-500 scale-105 shadow-md ring-2 ring-indigo-500/30' : 'border-slate-800 opacity-50'
                  }`}
                >
                  <img src={preview} alt={`Part ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Editable Structured Receipt */}
        <div className="lg:col-span-7 space-y-6">
          {/* Restaurant Title Card */}
          <div className="glass-panel rounded-3xl p-5 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Restaurant / Venue Name
                </label>
                <input
                  type="text"
                  value={receipt.restaurant_name.value}
                  onChange={(e) =>
                    setReceipt((prev) => ({
                      ...prev,
                      restaurant_name: { ...prev.restaurant_name, value: e.target.value }
                    }))
                  }
                  className="bg-slate-900/90 text-slate-100 font-extrabold text-xl px-3.5 py-2 rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Confidence:</span>
                {renderConfidenceBadge(receipt.restaurant_name.confidence)}
              </div>
            </div>
          </div>

          {/* Line Items Table Card */}
          <div className="glass-panel rounded-3xl p-5 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100">Line Items ({receipt.items.length})</h3>
              <button
                onClick={addItem}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Item Name</th>
                    <th className="py-3 px-2 w-16 text-center">Qty</th>
                    <th className="py-3 px-2 w-24 text-right">Unit Price</th>
                    <th className="py-3 px-2 w-28 text-right">Total (₹)</th>
                    <th className="py-3 px-2 w-24 text-center">Confidence</th>
                    <th className="py-3 px-2 w-10 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {receipt.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        item.is_suspected_duplicate ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Item Name */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.name.value}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          className="bg-slate-900/80 text-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-700/80 focus:border-indigo-500 focus:outline-none w-full text-sm font-semibold"
                        />
                        {item.warning && (
                          <span className="text-[10px] text-amber-400 block mt-1 font-sans">
                            ⚠️ {item.warning}
                          </span>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          value={item.quantity.value}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className="bg-slate-900/80 text-slate-100 px-1 py-1.5 rounded-lg border border-slate-700/80 text-center focus:border-indigo-500 focus:outline-none w-full text-sm font-semibold"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price.value}
                          onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                          className="bg-slate-900/80 text-slate-100 px-2 py-1.5 rounded-lg border border-slate-700/80 text-right focus:border-indigo-500 focus:outline-none w-full text-sm font-semibold"
                        />
                      </td>

                      {/* Total Price */}
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.total_price.value}
                          onChange={(e) => updateItem(idx, 'total_price', e.target.value)}
                          className="bg-slate-900/90 text-indigo-300 font-extrabold px-2 py-1.5 rounded-lg border border-slate-700/80 text-right focus:border-indigo-500 focus:outline-none w-full text-sm"
                        />
                      </td>

                      {/* Confidence */}
                      <td className="py-2.5 px-2 text-center">
                        {renderConfidenceBadge(item.total_price.confidence)}
                      </td>

                      {/* Delete */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => deleteItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                          title="Delete line item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charges & Printed Total Card */}
          <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-3">
              Bill Charges & GST Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold">Items Subtotal:</span>
                <span className="font-extrabold text-slate-100">₹{receipt.subtotal.value.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold">GST / Tax:</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={receipt.tax.value}
                    onChange={(e) => updateBillField('tax', e.target.value)}
                    className="w-24 bg-slate-950 text-slate-100 font-bold px-2 py-1 rounded-lg border border-slate-700 text-right focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold">Service Charge:</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={receipt.service_charge.value}
                    onChange={(e) => updateBillField('service_charge', e.target.value)}
                    className="w-24 bg-slate-950 text-slate-100 font-bold px-2 py-1 rounded-lg border border-slate-700 text-right focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold">Discount (-):</span>
                <div className="flex items-center gap-1">
                  <span className="text-emerald-400 font-bold">-₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={receipt.discount.value}
                    onChange={(e) => updateBillField('discount', e.target.value)}
                    className="w-24 bg-slate-950 text-emerald-400 font-bold px-2 py-1 rounded-lg border border-slate-700 text-right focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Final Printed Total Box */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between bg-indigo-950/40 p-4 rounded-2xl border border-indigo-500/30">
              <div>
                <span className="text-sm font-extrabold text-slate-100 block">Confirmed Bill Total</span>
                <span className="text-xs text-slate-400">Total amount to be split among members</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-indigo-400 font-extrabold text-2xl">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={receipt.total.value}
                  onChange={(e) => updateBillField('total', e.target.value)}
                  className="w-36 bg-slate-950 text-indigo-300 font-extrabold text-2xl px-3 py-1.5 rounded-xl border border-indigo-500/50 text-right focus:border-indigo-400 focus:outline-none shadow-inner"
                />
              </div>
            </div>

            <button
              onClick={() => onConfirmReceipt(receipt)}
              className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base font-bold shadow-xl mt-4"
            >
              <Check className="w-5 h-5" /> Confirm Bill & Continue to Diners
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
