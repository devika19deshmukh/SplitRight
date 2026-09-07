export interface FieldWithConfidence<T> {
  value: T;
  confidence: number;
  source_image_index?: number;
}

export interface ReceiptItem {
  id: string;
  name: FieldWithConfidence<string>;
  quantity: FieldWithConfidence<number>;
  unit_price: FieldWithConfidence<number>;
  total_price: FieldWithConfidence<number>;
  category?: string;
  is_suspected_duplicate?: boolean;
  warning?: string;
}

export interface Receipt {
  restaurant_name: FieldWithConfidence<string>;
  items: ReceiptItem[];
  subtotal: FieldWithConfidence<number>;
  tax: FieldWithConfidence<number>;
  cgst?: FieldWithConfidence<number>;
  sgst?: FieldWithConfidence<number>;
  service_charge: FieldWithConfidence<number>;
  discount: FieldWithConfidence<number>;
  other_charges: FieldWithConfidence<number>;
  total: FieldWithConfidence<number>;
  currency: string;
  validation_warnings: string[];
  image_count: number;
}

export interface ReceiptValidationResult {
  is_valid: boolean;
  printed_total: number;
  calculated_total: number;
  difference: number;
  line_items_sum: number;
  subtotal_difference: number;
  has_mismatch: boolean;
  has_line_item_mismatch: boolean;
  warnings: string[];
}

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface ItemAssignment {
  item_id: string;
  assigned_members: string[]; // member IDs
  split_type: 'equal' | 'custom';
  custom_shares?: Record<string, number>; // member_id -> percentage or share weight
}

export interface AssignedItemDetail {
  item_id: string;
  item_name: string;
  full_quantity: number;
  full_item_total: number;
  member_share_fraction: number;
  member_share_amount: number;
}

export interface MemberBreakdown {
  member_id: string;
  member_name: string;
  assigned_items: AssignedItemDetail[];
  items_subtotal: number;
  tax_share: number;
  service_charge_share: number;
  discount_share: number;
  other_charges_share: number;
  total_payable: number;
}

export interface SplitResult {
  members_breakdown: MemberBreakdown[];
  confirmed_receipt_total: number;
  sum_member_totals: number;
  difference: number;
  reconciled: boolean;
  rounding_adjustment_paise: number;
  warnings: string[];
}

export type Stage = 'upload' | 'review' | 'members' | 'assign' | 'results';
