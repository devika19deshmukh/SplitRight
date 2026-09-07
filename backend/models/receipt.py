from typing import Generic, TypeVar, Optional, List
from pydantic import BaseModel, Field, ConfigDict

T = TypeVar("T")

class FieldWithConfidence(BaseModel, Generic[T]):
    """Generic wrapper for any extracted field carrying value and per-field confidence score (0.0 to 1.0)."""
    value: Optional[T] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    source_image_index: int = Field(default=0, description="Index of receipt image where field was detected")

    model_config = ConfigDict(arbitrary_types_allowed=True)


class ReceiptItem(BaseModel):
    """Model representing an individual line item from a receipt."""
    id: str
    name: FieldWithConfidence[str]
    quantity: FieldWithConfidence[float]
    unit_price: FieldWithConfidence[float]
    total_price: FieldWithConfidence[float]
    category: Optional[str] = None
    is_suspected_duplicate: bool = False
    warning: Optional[str] = None


class Receipt(BaseModel):
    """Model representing a complete structured restaurant bill/receipt."""
    restaurant_name: FieldWithConfidence[str] = Field(
        default_factory=lambda: FieldWithConfidence[str](value="Restaurant", confidence=0.8)
    )
    items: List[ReceiptItem] = Field(default_factory=list)
    subtotal: FieldWithConfidence[float] = Field(
        default_factory=lambda: FieldWithConfidence[float](value=0.0, confidence=1.0)
    )
    tax: FieldWithConfidence[float] = Field(
        default_factory=lambda: FieldWithConfidence[float](value=0.0, confidence=1.0)
    )
    cgst: Optional[FieldWithConfidence[float]] = None
    sgst: Optional[FieldWithConfidence[float]] = None
    service_charge: FieldWithConfidence[float] = Field(
        default_factory=lambda: FieldWithConfidence[float](value=0.0, confidence=1.0)
    )
    discount: FieldWithConfidence[float] = Field(
        default_factory=lambda: FieldWithConfidence[float](value=0.0, confidence=1.0)
    )
    other_charges: FieldWithConfidence[float] = Field(
        default_factory=lambda: FieldWithConfidence[float](value=0.0, confidence=1.0)
    )
    total: FieldWithConfidence[float] = Field(
        default_factory=lambda: FieldWithConfidence[float](value=0.0, confidence=1.0)
    )
    currency: str = "₹"
    raw_text: Optional[str] = None
    validation_warnings: List[str] = Field(default_factory=list)
    image_count: int = 1


class ReceiptValidationResult(BaseModel):
    """Validation report comparing arithmetic line sums vs printed totals."""
    is_valid: bool
    printed_total: float
    calculated_total: float
    difference: float
    line_items_sum: float
    subtotal_difference: float
    has_mismatch: bool
    has_line_item_mismatch: bool
    warnings: List[str] = Field(default_factory=list)
