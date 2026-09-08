import pytest
from backend.services.ocr_line_parser import OCRLineParser

def test_ocr_line_parser_basic():
    raw_lines = [
        "PUNJAB GRILL & TAVERN",
        "Table 04 Date: 08/09/2026",
        "2 Chicken Biryani 320.00 640.00",
        "1 Paneer Butter Masala 340.00 340.00",
        "4 Garlic Naan 60.00 240.00",
        "Subtotal 1220.00",
        "CGST @ 2.5% 30.50",
        "SGST @ 2.5% 30.50",
        "Service Charge 122.00",
        "Total 1403.00"
    ]

    receipt = OCRLineParser.parse_text_lines(raw_lines)
    assert receipt.restaurant_name.value == "PUNJAB GRILL & TAVERN"
    assert len(receipt.items) == 3
    assert receipt.items[0].name.value == "Chicken Biryani"
    assert receipt.items[0].quantity.value == 2.0
    assert receipt.items[0].total_price.value == 640.0
    assert receipt.subtotal.value == 1220.0
    assert receipt.cgst.value == 30.50
    assert receipt.sgst.value == 30.50
    assert receipt.service_charge.value == 122.00
    assert receipt.total.value == 1403.00
