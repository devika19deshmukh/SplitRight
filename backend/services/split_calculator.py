from decimal import Decimal, ROUND_HALF_UP, ROUND_HALF_EVEN
from typing import List, Dict
from backend.models.receipt import Receipt, ReceiptItem
from backend.models.split import (
    SplitRequest, SplitResult, MemberBreakdown, AssignedItemDetail, Member, ItemAssignment
)

def to_decimal(val: float | int | str | None) -> Decimal:
    if val is None:
        return Decimal("0.00")
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def quantize_paise(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class SplitCalculator:
    """Deterministic bill splitting calculation engine using Python Decimal."""

    @staticmethod
    def calculate(request: SplitRequest) -> SplitResult:
        receipt = request.receipt
        members = request.members
        assignments = request.assignments

        if not members:
            raise ValueError("At least one member is required for bill calculation.")

        # Create quick lookup for assignments by item_id
        assignment_map: Dict[str, ItemAssignment] = {a.item_id: a for a in assignments}
        items_map: Dict[str, ReceiptItem] = {item.id: item for item in receipt.items}

        # Validate that every item has at least one assigned member
        unassigned_items = []
        for item in receipt.items:
            assignment = assignment_map.get(item.id)
            if not assignment or not assignment.assigned_members:
                unassigned_items.append(item.name.value or f"Item {item.id}")

        if unassigned_items:
            raise ValueError(f"The following items are unassigned: {', '.join(unassigned_items)}")

        # Initialize tracking structures per member
        member_items: Dict[str, List[AssignedItemDetail]] = {m.id: [] for m in members}
        member_subtotals: Dict[str, Decimal] = {m.id: Decimal("0.00") for m in members}

        # Step 1: Distribute items to members
        for item in receipt.items:
            assignment = assignment_map[item.id]
            assigned_ids = assignment.assigned_members
            item_total = to_decimal(item.total_price.value)
            item_qty = float(item.quantity.value or 1.0)
            item_name = item.name.value or "Unnamed Item"

            if not assigned_ids:
                continue

            num_assigned = Decimal(len(assigned_ids))

            if assignment.split_type == "custom" and assignment.custom_shares:
                # Custom split (percentages or shares)
                raw_shares = assignment.custom_shares
                total_custom_weight = Decimal(str(sum(raw_shares.get(m_id, 0.0) for m_id in assigned_ids)))
                if total_custom_weight == Decimal("0"):
                    total_custom_weight = num_assigned
                    shares_normalized = {m_id: Decimal("1.0") / num_assigned for m_id in assigned_ids}
                else:
                    shares_normalized = {
                        m_id: Decimal(str(raw_shares.get(m_id, 0.0))) / total_custom_weight
                        for m_id in assigned_ids
                    }
            else:
                # Equal split
                shares_normalized = {m_id: Decimal("1.0") / num_assigned for m_id in assigned_ids}

            # Distribute this item's price
            for m_id in assigned_ids:
                fraction = shares_normalized[m_id]
                member_share_amt = quantize_paise(item_total * fraction)

                member_items[m_id].append(
                    AssignedItemDetail(
                        item_id=item.id,
                        item_name=item_name,
                        full_quantity=item_qty,
                        full_item_total=float(item_total),
                        member_share_fraction=float(fraction),
                        member_share_amount=float(member_share_amt),
                    )
                )
                member_subtotals[m_id] += member_share_amt

        # Step 2: Sum up total item subtotals across all members
        total_assignable_subtotal = sum(member_subtotals.values())

        # Bill-level charges in Decimal
        # Handle CGST/SGST if separate, or combined tax
        raw_tax = to_decimal(receipt.tax.value)
        if receipt.cgst and receipt.cgst.value:
            raw_tax += to_decimal(receipt.cgst.value)
        if receipt.sgst and receipt.sgst.value:
            raw_tax += to_decimal(receipt.sgst.value)

        service_charge = to_decimal(receipt.service_charge.value)
        discount = to_decimal(receipt.discount.value)
        other_charges = to_decimal(receipt.other_charges.value)
        confirmed_total = to_decimal(receipt.total.value)

        # Step 3: Proportional distribution of charges based on food subtotal ratio
        member_breakdowns: List[MemberBreakdown] = []
        pre_reconciliation_totals: Dict[str, Decimal] = {}
        exact_unrounded_totals: Dict[str, Decimal] = {}

        for m in members:
            m_id = m.id
            s_i = member_subtotals[m_id]

            if total_assignable_subtotal > Decimal("0.00"):
                ratio = s_i / total_assignable_subtotal
            else:
                ratio = Decimal("1.00") / Decimal(len(members))

            m_tax = quantize_paise(raw_tax * ratio)
            m_service = quantize_paise(service_charge * ratio)
            m_discount = quantize_paise(discount * ratio)
            m_other = quantize_paise(other_charges * ratio)

            unrounded_total = s_i + (raw_tax * ratio) + (service_charge * ratio) + (other_charges * ratio) - (discount * ratio)
            exact_unrounded_totals[m_id] = unrounded_total

            payable = quantize_paise(s_i + m_tax + m_service + m_other - m_discount)
            # Payable cannot be negative
            if payable < Decimal("0.00"):
                payable = Decimal("0.00")

            pre_reconciliation_totals[m_id] = payable

            member_breakdowns.append(
                MemberBreakdown(
                    member_id=m_id,
                    member_name=m.name,
                    assigned_items=member_items[m_id],
                    items_subtotal=float(s_i),
                    tax_share=float(m_tax),
                    service_charge_share=float(m_service),
                    discount_share=float(m_discount),
                    other_charges_share=float(m_other),
                    total_payable=float(payable)
                )
            )

        # Step 4: Largest-remainder rounding reconciliation to guarantee sum(payable) == confirmed_total
        current_sum = sum(pre_reconciliation_totals.values())
        paise_diff = int(round(float(confirmed_total - current_sum) * 100))

        rounding_adjustment = paise_diff
        warnings = []

        if paise_diff != 0 and member_breakdowns:
            # Rank members by remainder fraction (unrounded - rounded) descending for positive diff, ascending for negative
            remainder_scores = []
            for b in member_breakdowns:
                m_id = b.member_id
                exact_t = exact_unrounded_totals[m_id]
                approx_t = pre_reconciliation_totals[m_id]
                rem = exact_t - approx_t
                remainder_scores.append((rem, b.items_subtotal, m_id))

            if paise_diff > 0:
                # Sort highest remainder first
                remainder_scores.sort(key=lambda x: (x[0], x[1]), reverse=True)
                step = 1
            else:
                # Sort lowest remainder first
                remainder_scores.sort(key=lambda x: (x[0], x[1]))
                step = -1

            abs_diff = abs(paise_diff)
            # Adjust by 0.01 step for top N members
            for i in range(min(abs_diff, len(member_breakdowns))):
                target_m_id = remainder_scores[i][2]
                for b in member_breakdowns:
                    if b.member_id == target_m_id:
                        adj = Decimal(step) * Decimal("0.01")
                        new_total = quantize_paise(Decimal(str(b.total_payable)) + adj)
                        b.total_payable = float(new_total)
                        break

        # Final verification check
        final_sum = sum(Decimal(str(b.total_payable)) for b in member_breakdowns)
        final_diff = quantize_paise(confirmed_total - final_sum)
        reconciled = (final_diff == Decimal("0.00"))

        if not reconciled:
            warnings.append(f"Bill total mismatch remaining: ₹{final_diff}")

        return SplitResult(
            members_breakdown=member_breakdowns,
            confirmed_receipt_total=float(confirmed_total),
            sum_member_totals=float(final_sum),
            difference=float(final_diff),
            reconciled=reconciled,
            rounding_adjustment_paise=rounding_adjustment,
            warnings=warnings
        )
