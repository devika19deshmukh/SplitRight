from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.receipt import router as receipt_router
from backend.routes.split import router as split_router

app = FastAPI(
    title="SplitRight API",
    description="Smart Bill Splitter from Receipt Photos with Proportional Tax Allocation & Deterministic Reconciliation",
    version="1.0.0"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(receipt_router)
app.include_router(split_router)

@app.get("/")
async def root():
    return {
        "app": "SplitRight API",
        "status": "online",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
