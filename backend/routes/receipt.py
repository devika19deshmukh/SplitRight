from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.models.receipt import Receipt, ReceiptValidationResult
from backend.services.receipt_extractor import ReceiptExtractorService
from backend.services.receipt_validator import ReceiptValidator

router = APIRouter(prefix="/api/receipts", tags=["receipts"])

@router.post("/extract", response_model=Receipt)
async def extract_receipt(files: List[UploadFile] = File(...)):
    """Extract structured data with per-field confidence scores from uploaded receipt photo(s)."""
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    image_bytes_list = []
    for file in files:
        contents = await file.read()
        if contents:
            image_bytes_list.append(contents)

    if not image_bytes_list:
        raise HTTPException(status_code=400, detail="Uploaded file(s) are empty.")

    try:
        receipt = ReceiptExtractorService.extract_from_images(image_bytes_list)
        return receipt
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Receipt extraction failed: {str(e)}")


@router.post("/validate", response_model=ReceiptValidationResult)
async def validate_receipt(receipt: Receipt):
    """Validate arithmetic totals of user-reviewed receipt."""
    return ReceiptValidator.validate(receipt)


@router.get("/demo", response_model=Receipt)
async def get_demo_receipt():
    """Get realistic sample receipt dataset for demo/testing mode."""
    return ReceiptExtractorService.get_demo_receipt()
