import pytest
from backend.models.receipt import Receipt, ReceiptItem, FieldWithConfidence
from backend.models.split import SplitRequest, Member, ItemAssignment
from backend.services.split_calculator import SplitCalculator
from backend.services.receipt_validator import ReceiptValidator

def make_field(val, conf=0.95):
    return FieldWithConfidence(value=val, confidence=conf)

def make_item(item_id, name, qty, unit_price, total_price):
    return ReceiptItem(
        id=item_id,
        name=make_field(name),
        quantity=make_field(qty),
        unit_price=make_field(unit_price),
        total_price=make_field(total_price)
    )

def make_receipt(items, subtotal, tax=0.0, service_charge=0.0, discount=0.0, other_charges=0.0, total=None, cgst=None, sgst=None):
    if total is None:
        calc_tax = tax + (cgst or 0.0) + (sgst or 0.0)
        total = subtotal + calc_tax + service_charge + other_charges - discount
    return Receipt(
        restaurant_name=make_field("Test Bistro"),
        items=items,
        subtotal=make_field(subtotal),
        tax=make_field(tax),
        cgst=make_field(cgst) if cgst is not None else None,
        sgst=make_field(sgst) if sgst is not None else None,
        service_charge=make_field(service_charge),
        discount=make_field(discount),
        other_charges=make_field(other_charges),
        total=make_field(total)
    )


# 1. One item assigned to one person
def test_case_1_single_item_single_person():
    item = make_item("1", "Pizza", 1.0, 500.0, 500.0)
    receipt = make_receipt([item], subtotal=500.0, total=500.0)
    members = [Member(id="m1", name="Devika")]
    assignments = [ItemAssignment(item_id="1", assigned_members=["m1"])]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    assert len(result.members_breakdown) == 1
    assert result.members_breakdown[0].total_payable == 500.0


# 2. One item split equally between two people
def test_case_2_item_split_equal_two_people():
    item = make_item("1", "Biryani", 1.0, 600.0, 600.0)
    receipt = make_receipt([item], subtotal=600.0, total=600.0)
    members = [Member(id="m1", name="Devika"), Member(id="m2", name="Priya")]
    assignments = [ItemAssignment(item_id="1", assigned_members=["m1", "m2"], split_type="equal")]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    assert result.members_breakdown[0].total_payable == 300.0
    assert result.members_breakdown[1].total_payable == 300.0


# 3. Custom 70/30 split
def test_case_3_custom_70_30_split():
    item = make_item("1", "Platter", 1.0, 1000.0, 1000.0)
    receipt = make_receipt([item], subtotal=1000.0, total=1000.0)
    members = [Member(id="m1", name="Devika"), Member(id="m2", name="Priya")]
    assignments = [
        ItemAssignment(
            item_id="1",
            assigned_members=["m1", "m2"],
            split_type="custom",
            custom_shares={"m1": 70.0, "m2": 30.0}
        )
    ]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    m1_pay = next(b for b in result.members_breakdown if b.member_id == "m1")
    m2_pay = next(b for b in result.members_breakdown if b.member_id == "m2")
    assert m1_pay.total_payable == 700.0
    assert m2_pay.total_payable == 300.0


# 4. Item assigned to everyone
def test_case_4_item_assigned_to_everyone():
    item = make_item("1", "Nachos", 1.0, 400.0, 400.0)
    receipt = make_receipt([item], subtotal=400.0, total=400.0)
    members = [Member(id="m1", name="Devika"), Member(id="m2", name="Priya"), Member(id="m3", name="Rahul"), Member(id="m4", name="Aman")]
    assignments = [ItemAssignment(item_id="1", assigned_members=["m1", "m2", "m3", "m4"], split_type="equal")]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    for b in result.members_breakdown:
        assert b.total_payable == 100.0


# 5. Person who only had one cheap drink
def test_case_5_person_with_cheap_drink():
    item1 = make_item("1", "Steak", 1.0, 900.0, 900.0)
    item2 = make_item("2", "Coke", 1.0, 100.0, 100.0)
    receipt = make_receipt([item1, item2], subtotal=1000.0, tax=100.0, total=1100.0)
    members = [Member(id="m1", name="Rich Eater"), Member(id="m2", name="Coke Drinker")]
    assignments = [
        ItemAssignment(item_id="1", assigned_members=["m1"]),
        ItemAssignment(item_id="2", assigned_members=["m2"])
    ]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    m2_b = next(b for b in result.members_breakdown if b.member_id == "m2")
    # Coke = 100, Tax ratio = 100/1000 = 0.10, Tax share = 10.0. Total = 110.0 (NOT equal 550.0!)
    assert m2_b.tax_share == 10.0
    assert m2_b.total_payable == 110.0


# 6. Proportional GST
def test_case_6_proportional_gst():
    item1 = make_item("1", "Meal A", 1.0, 600.0, 600.0)
    item2 = make_item("2", "Meal B", 1.0, 400.0, 400.0)
    receipt = make_receipt([item1, item2], subtotal=1000.0, tax=180.0, total=1180.0) # 18% GST
    members = [Member(id="m1", name="Alice"), Member(id="m2", name="Bob")]
    assignments = [
        ItemAssignment(item_id="1", assigned_members=["m1"]),
        ItemAssignment(item_id="2", assigned_members=["m2"])
    ]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    m1_b = next(b for b in result.members_breakdown if b.member_id == "m1")
    m2_b = next(b for b in result.members_breakdown if b.member_id == "m2")
    # Alice: 600/1000 * 180 = 108
    # Bob: 400/1000 * 180 = 72
    assert m1_b.tax_share == 108.0
    assert m2_b.tax_share == 72.0


# 7. Proportional Service Charge
def test_case_7_proportional_service_charge():
    item1 = make_item("1", "Dish 1", 1.0, 800.0, 800.0)
    item2 = make_item("2", "Dish 2", 1.0, 200.0, 200.0)
    receipt = make_receipt([item1, item2], subtotal=1000.0, service_charge=100.0, total=1100.0)
    members = [Member(id="m1", name="Alice"), Member(id="m2", name="Bob")]
    assignments = [
        ItemAssignment(item_id="1", assigned_members=["m1"]),
        ItemAssignment(item_id="2", assigned_members=["m2"])
    ]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    m1_b = next(b for b in result.members_breakdown if b.member_id == "m1")
    m2_b = next(b for b in result.members_breakdown if b.member_id == "m2")
    assert m1_b.service_charge_share == 80.0
    assert m2_b.service_charge_share == 20.0


# 8. Bill-level discount
def test_case_8_bill_level_discount():
    item1 = make_item("1", "Dish 1", 1.0, 700.0, 700.0)
    item2 = make_item("2", "Dish 2", 1.0, 300.0, 300.0)
    receipt = make_receipt([item1, item2], subtotal=1000.0, discount=100.0, total=900.0)
    members = [Member(id="m1", name="Alice"), Member(id="m2", name="Bob")]
    assignments = [
        ItemAssignment(item_id="1", assigned_members=["m1"]),
        ItemAssignment(item_id="2", assigned_members=["m2"])
    ]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    m1_b = next(b for b in result.members_breakdown if b.member_id == "m1")
    m2_b = next(b for b in result.members_breakdown if b.member_id == "m2")
    assert m1_b.discount_share == 70.0
    assert m2_b.discount_share == 30.0
    assert m1_b.total_payable == 630.0
    assert m2_b.total_payable == 270.0


# 9. Decimal/rounding edge cases (3 people splitting 10.00 total)
def test_case_9_decimal_rounding_edge_case():
    item = make_item("1", "Tea", 1.0, 10.0, 10.0)
    receipt = make_receipt([item], subtotal=10.0, total=10.0)
    members = [Member(id="m1", name="A"), Member(id="m2", name="B"), Member(id="m3", name="C")]
    assignments = [ItemAssignment(item_id="1", assigned_members=["m1", "m2", "m3"])]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    totals = [b.total_payable for b in result.members_breakdown]
    assert sum(totals) == 10.0
    assert sorted(totals) == [3.33, 3.33, 3.34]


# 10. Receipt total mismatch
def test_case_10_receipt_total_mismatch():
    item = make_item("1", "Item", 1.0, 100.0, 100.0)
    # Printed total says 125, but subtotal 100 + tax 10 = 110!
    receipt = make_receipt([item], subtotal=100.0, tax=10.0, total=125.0)
    val_res = ReceiptValidator.validate(receipt)
    assert val_res.has_mismatch
    assert val_res.difference == 15.0


# 11. Line-item subtotal mismatch
def test_case_11_line_item_subtotal_mismatch():
    item1 = make_item("1", "Item 1", 1.0, 100.0, 100.0)
    item2 = make_item("2", "Item 2", 1.0, 100.0, 100.0)
    # Line items sum = 200, but receipt subtotal says 250!
    receipt = make_receipt([item1, item2], subtotal=250.0, total=250.0)
    val_res = ReceiptValidator.validate(receipt)
    assert val_res.has_line_item_mismatch
    assert val_res.subtotal_difference == 50.0


# 12. Several people with very different food subtotals
def test_case_12_very_different_food_subtotals():
    items = [
        make_item("1", "Expensive Wine", 1.0, 3000.0, 3000.0),
        make_item("2", "Salad", 1.0, 200.0, 200.0),
        make_item("3", "Water", 1.0, 50.0, 50.0),
    ]
    receipt = make_receipt(items, subtotal=3250.0, tax=325.0, total=3575.0)
    members = [Member(id="m1", name="Big Spender"), Member(id="m2", name="Light Eater"), Member(id="m3", name="Water Only")]
    assignments = [
        ItemAssignment(item_id="1", assigned_members=["m1"]),
        ItemAssignment(item_id="2", assigned_members=["m2"]),
        ItemAssignment(item_id="3", assigned_members=["m3"]),
    ]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    m1_b = next(b for b in result.members_breakdown if b.member_id == "m1")
    m3_b = next(b for b in result.members_breakdown if b.member_id == "m3")
    assert m1_b.tax_share == 300.0
    assert m3_b.tax_share == 5.0


# 13. Quantity greater than one
def test_case_13_quantity_greater_than_one():
    item = make_item("1", "Butter Naan", 4.0, 60.0, 240.0)
    receipt = make_receipt([item], subtotal=240.0, total=240.0)
    members = [Member(id="m1", name="A"), Member(id="m2", name="B")]
    assignments = [ItemAssignment(item_id="1", assigned_members=["m1", "m2"])]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    assert result.members_breakdown[0].total_payable == 120.0
    assert result.members_breakdown[1].total_payable == 120.0


# 14. ₹0 service charge
def test_case_14_zero_service_charge():
    item = make_item("1", "Burger", 1.0, 200.0, 200.0)
    receipt = make_receipt([item], subtotal=200.0, service_charge=0.0, total=200.0)
    members = [Member(id="m1", name="A")]
    assignments = [ItemAssignment(item_id="1", assigned_members=["m1"])]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    assert result.members_breakdown[0].service_charge_share == 0.0


# 15. ₹0 tax
def test_case_15_zero_tax():
    item = make_item("1", "Coffee", 1.0, 150.0, 150.0)
    receipt = make_receipt([item], subtotal=150.0, tax=0.0, total=150.0)
    members = [Member(id="m1", name="A")]
    assignments = [ItemAssignment(item_id="1", assigned_members=["m1"])]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    assert result.members_breakdown[0].tax_share == 0.0


# 16. Multiple taxes (CGST + SGST)
def test_case_16_cgst_plus_sgst():
    item1 = make_item("1", "Paneer Tikka", 1.0, 500.0, 500.0)
    receipt = make_receipt([item1], subtotal=500.0, cgst=12.5, sgst=12.5, total=525.0) # 2.5% CGST + 2.5% SGST
    members = [Member(id="m1", name="Devika")]
    assignments = [ItemAssignment(item_id="1", assigned_members=["m1"])]

    result = SplitCalculator.calculate(SplitRequest(receipt=receipt, members=members, assignments=assignments))
    assert result.reconciled
    assert result.members_breakdown[0].tax_share == 25.0
    assert result.members_breakdown[0].total_payable == 525.0
