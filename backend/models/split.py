from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field
from backend.models.receipt import Receipt

class Member(BaseModel):
    id: str
    name: str
    avatar_color: Optional[str] = None


class ItemAssignment(BaseModel):
    item_id: str
    assigned_members: List[str]  # List of member IDs
    split_type: Literal["equal", "custom"] = "equal"
    # custom_shares maps member_id to percentage (0..100) or share fraction
    custom_shares: Optional[Dict[str, float]] = None


class SplitRequest(BaseModel):
    receipt: Receipt
    members: List[Member]
    assignments: List[ItemAssignment]


class AssignedItemDetail(BaseModel):
    item_id: str
    item_name: str
    full_quantity: float
    full_item_total: float
    member_share_fraction: float  # e.g., 0.5 for 1/2 share
    member_share_amount: float    # e.g., ₹300.00


class MemberBreakdown(BaseModel):
    member_id: str
    member_name: str
    assigned_items: List[AssignedItemDetail]
    items_subtotal: float
    tax_share: float
    service_charge_share: float
    discount_share: float
    other_charges_share: float
    total_payable: float


class SplitResult(BaseModel):
    members_breakdown: List[MemberBreakdown]
    confirmed_receipt_total: float
    sum_member_totals: float
    difference: float
    reconciled: bool
    rounding_adjustment_paise: int  # Any paise remainder adjusted deterministically
    warnings: List[str] = Field(default_factory=list)
