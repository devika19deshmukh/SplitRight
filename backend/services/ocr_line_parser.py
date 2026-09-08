import re
from typing import List, Dict, Any, Tuple, Optional
from backend.models.receipt import Receipt, ReceiptItem, FieldWithConfidence

def clean_amount(val_str: str) -> Optional[float]:
    """Clean currency symbols (₹, Rs, INR, $, etc.) and parse float amount."""
    if not val_str:
        return None
    # Remove currency symbols and non-numeric except dot and minus
    cleaned = re.sub(r"[^\d.-]", "", val_str)
    try:
        val = float(cleaned)
        return round(val, 2)
    except ValueError:
        return None

class OCRLineParser:
    """Intelligent heuristic parser extracting structured receipt data from raw OCR text lines."""

    @classmethod
    def parse_text_lines(cls, lines: List[str], img_idx: int = 0) -> Receipt:
        clean_lines = [l.strip() for l in lines if l.strip()]
        if not clean_lines:
            return Receipt(
                restaurant_name=FieldWithConfidence(value="Unknown Restaurant", confidence=0.3, source_image_index=img_idx),
                validation_warnings=["No text lines detected in image."],
                image_count=1
            )

        # 1. Restaurant Name: First prominent line that isn't a date/table/address line
        restaurant_name = "Restaurant"
        rest_confidence = 0.5
        for line in clean_lines[:4]:
            if not re.search(r"\b(date|table|tax|invoice|bill|gstin|pos|order)\b", line.lower()) and len(line) > 3:
                restaurant_name = re.sub(r"[^\w\s&'-]", "", line).strip()
                rest_confidence = 0.85
                break

        items: List[ReceiptItem] = []
        subtotal_val: Optional[float] = None
        cgst_val: Optional[float] = None
        sgst_val: Optional[float] = None
        tax_val: Optional[float] = None
        service_charge_val: Optional[float] = None
        discount_val: Optional[float] = None
        total_val: Optional[float] = None

        # Helper patterns
        num_pattern = r"(?:₹|Rs\.?|INR)?\s*(-?\d+(?:\.\d{1,2})?)"

        for idx, line in enumerate(clean_lines):
            line_lower = line.lower()

            # Check for Bill Totals keywords first
            if re.search(r"\b(subtotal|sub-total|sub total|item total|food total)\b", line_lower):
                amt = cls._extract_last_number(line)
                if amt is not None:
                    subtotal_val = amt
                continue

            if re.search(r"\bcgst\b", line_lower):
                amt = cls._extract_last_number(line)
                if amt is not None:
                    cgst_val = amt
                continue

            if re.search(r"\bsgst\b", line_lower):
                amt = cls._extract_last_number(line)
                if amt is not None:
                    sgst_val = amt
                continue

            if re.search(r"\b(gst|tax|vat)\b", line_lower) and not re.search(r"\b(cgst|sgst|gstin)\b", line_lower):
                amt = cls._extract_last_number(line)
                if amt is not None:
                    tax_val = amt
                continue

            if re.search(r"\b(service charge|service chg|sc\s*@)\b", line_lower):
                amt = cls._extract_last_number(line)
                if amt is not None:
                    service_charge_val = amt
                continue

            if re.search(r"\b(discount|disc|happy hour|less)\b", line_lower):
                amt = cls._extract_last_number(line)
                if amt is not None:
                    discount_val = abs(amt)
                continue

            if re.search(r"\b(grand total|total payable|net total|final total|balance due|total)\b", line_lower) and not re.search(r"\b(subtotal|item)\b", line_lower):
                amt = cls._extract_last_number(line)
                if amt is not None:
                    total_val = amt
                continue

            # Skip header lines, dates, addresses
            if re.search(r"\b(qty|price|amount|item|rate|date|time|table|cashier|pax|thank|visit|tax|cgst|sgst|gstin)\b", line_lower):
                continue

            # Try to parse line item:
            # Pattern A: <Qty> <Item Name> <Unit Price> <Total Price> (e.g., "2 Chicken Biryani 320.00 640.00")
            match_a = re.match(r"^(\d+(?:\.\d+)?)\s+(.+?)\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)$", line)
            if match_a:
                qty = float(match_a.group(1))
                name = match_a.group(2).strip()
                unit_p = float(match_a.group(3))
                tot_p = float(match_a.group(4))
                conf = 0.95 if abs((qty * unit_p) - tot_p) < 0.1 else 0.75
                items.append(cls._make_item(items, name, qty, unit_p, tot_p, conf, img_idx))
                continue

            # Pattern B: <Item Name> <Qty> <Total Price> (e.g., "Chicken Biryani 2 640.00")
            match_b = re.match(r"^(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d{1,2})?)$", line)
            if match_b:
                name = match_b.group(1).strip()
                qty = float(match_b.group(2))
                tot_p = float(match_b.group(3))
                unit_p = round(tot_p / qty, 2) if qty > 0 else tot_p
                items.append(cls._make_item(items, name, qty, unit_p, tot_p, 0.85, img_idx))
                continue

            # Pattern C: <Item Name> <Total Price> (e.g., "Chicken Biryani 640.00")
            match_c = re.match(r"^(.+?)\s+(?:₹|Rs\.?|INR)?\s*(\d+(?:\.\d{1,2})?)$", line)
            if match_c and len(match_c.group(1).strip()) > 2:
                name = match_c.group(1).strip()
                tot_p = float(match_c.group(2))
                items.append(cls._make_item(items, name, 1.0, tot_p, tot_p, 0.70, img_idx))
                continue

        # Derived calculations
        calc_subtotal = round(sum(i.total_price.value or 0 for i in items), 2)
        if subtotal_val is None or subtotal_val == 0.0:
            subtotal_val = calc_subtotal

        calc_tax = (tax_val or 0.0) + (cgst_val or 0.0) + (sgst_val or 0.0)
        calc_total = round((subtotal_val or 0.0) + calc_tax + (service_charge_val or 0.0) - (discount_val or 0.0), 2)

        if total_val is None or total_val == 0.0:
            total_val = calc_total

        return Receipt(
            restaurant_name=FieldWithConfidence(value=restaurant_name, confidence=rest_confidence, source_image_index=img_idx),
            items=items,
            subtotal=FieldWithConfidence(value=subtotal_val, confidence=0.88, source_image_index=img_idx),
            cgst=FieldWithConfidence(value=cgst_val, confidence=0.85, source_image_index=img_idx) if cgst_val else None,
            sgst=FieldWithConfidence(value=sgst_val, confidence=0.85, source_image_index=img_idx) if sgst_val else None,
            tax=FieldWithConfidence(value=tax_val or calc_tax, confidence=0.85, source_image_index=img_idx),
            service_charge=FieldWithConfidence(value=service_charge_val or 0.0, confidence=0.80, source_image_index=img_idx),
            discount=FieldWithConfidence(value=discount_val or 0.0, confidence=0.80, source_image_index=img_idx),
            other_charges=FieldWithConfidence(value=0.0, confidence=1.0, source_image_index=img_idx),
            total=FieldWithConfidence(value=total_val, confidence=0.90, source_image_index=img_idx),
            currency="₹",
            raw_text="\n".join(clean_lines),
            image_count=1
        )

    @staticmethod
    def _extract_last_number(text: str) -> Optional[float]:
        matches = re.findall(r"-?\d+(?:\.\d{1,2})?", text)
        if matches:
            try:
                return round(float(matches[-1]), 2)
            except ValueError:
                return None
        return None

    @staticmethod
    def _make_item(items_list, name, qty, unit_p, tot_p, conf, img_idx) -> ReceiptItem:
        return ReceiptItem(
            id=f"ocr-item-{img_idx}-{len(items_list) + 1}",
            name=FieldWithConfidence(value=name, confidence=conf, source_image_index=img_idx),
            quantity=FieldWithConfidence(value=qty, confidence=conf, source_image_index=img_idx),
            unit_price=FieldWithConfidence(value=unit_p, confidence=conf, source_image_index=img_idx),
            total_price=FieldWithConfidence(value=tot_p, confidence=conf, source_image_index=img_idx),
        )
