from backend.models.receipt import Receipt, ReceiptValidationResult

class ReceiptValidator:
    """Validates arithmetic consistency of extracted or user-reviewed receipt data."""

    @staticmethod
    def validate(receipt: Receipt) -> ReceiptValidationResult:
        subtotal = receipt.subtotal.value or 0.0
        tax = receipt.tax.value or 0.0
        if receipt.cgst and receipt.cgst.value:
            tax += receipt.cgst.value
        if receipt.sgst and receipt.sgst.value:
            tax += receipt.sgst.value

        service_charge = receipt.service_charge.value or 0.0
        discount = receipt.discount.value or 0.0
        other_charges = receipt.other_charges.value or 0.0
        printed_total = receipt.total.value or 0.0

        line_items_sum = round(sum(item.total_price.value or 0.0 for item in receipt.items), 2)
        calculated_total = round(subtotal + tax + service_charge + other_charges - discount, 2)

        diff = round(abs(printed_total - calculated_total), 2)
        subtotal_diff = round(abs(subtotal - line_items_sum), 2)

        # Allow small rounding tolerance (e.g., <= 0.05)
        has_mismatch = diff > 0.05
        has_line_item_mismatch = subtotal_diff > 0.05

        warnings = []

        if has_mismatch:
            warnings.append(
                f"Bill mismatch detected! Printed Total: ₹{printed_total:.2f}, "
                f"Calculated Total: ₹{calculated_total:.2f} (Difference: ₹{printed_total - calculated_total:+.2f})"
            )

        if has_line_item_mismatch:
            warnings.append(
                f"Line items sum mismatch! Sum of items: ₹{line_items_sum:.2f}, "
                f"Subtotal: ₹{subtotal:.2f} (Difference: ₹{subtotal - line_items_sum:+.2f})"
            )

        return ReceiptValidationResult(
            is_valid=(not has_mismatch and not has_line_item_mismatch),
            printed_total=printed_total,
            calculated_total=calculated_total,
            difference=round(printed_total - calculated_total, 2),
            line_items_sum=line_items_sum,
            subtotal_difference=round(subtotal - line_items_sum, 2),
            has_mismatch=has_mismatch,
            has_line_item_mismatch=has_line_item_mismatch,
            warnings=warnings
        )
