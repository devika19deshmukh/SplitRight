from fastapi import APIRouter, HTTPException
from backend.models.split import SplitRequest, SplitResult
from backend.services.split_calculator import SplitCalculator

router = APIRouter(prefix="/api/split", tags=["split"])

@router.post("/calculate", response_model=SplitResult)
async def calculate_split(request: SplitRequest):
    """Calculate deterministic split with proportional tax/charge allocation and exact rounding reconciliation."""
    try:
        result = SplitCalculator.calculate(request)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")
