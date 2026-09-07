import type { Receipt, ReceiptValidationResult, Member, ItemAssignment, SplitResult } from '../types';

const API_BASE = '/api';

export async function extractReceipt(files: File[]): Promise<Receipt> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${API_BASE}/receipts/extract`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: 'Failed to extract receipt' }));
    throw new Error(errData.detail || 'Receipt extraction failed.');
  }

  return response.json();
}

export async function validateReceipt(receipt: Receipt): Promise<ReceiptValidationResult> {
  const response = await fetch(`${API_BASE}/receipts/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(receipt),
  });

  if (!response.ok) {
    throw new Error('Failed to validate receipt arithmetic.');
  }

  return response.json();
}

export async function getDemoReceipt(): Promise<Receipt> {
  const response = await fetch(`${API_BASE}/receipts/demo`);
  if (!response.ok) {
    throw new Error('Failed to fetch demo receipt data.');
  }
  return response.json();
}

export async function calculateSplit(
  receipt: Receipt,
  members: Member[],
  assignments: ItemAssignment[]
): Promise<SplitResult> {
  const payload = {
    receipt,
    members: members.map((m) => ({ id: m.id, name: m.name })),
    assignments,
  };

  const response = await fetch(`${API_BASE}/split/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: 'Failed to calculate bill split' }));
    throw new Error(errData.detail || 'Bill split calculation failed.');
  }

  return response.json();
}
