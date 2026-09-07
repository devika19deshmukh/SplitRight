# SplitRight — Smart Bill Splitter from Receipt Photos

[![Python 3.14](https://img.shields.io/badge/Python-3.14-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com)

---

## 🌟 Overview & Problem Solved

**SplitRight** is a smart, end-to-end web application designed to solve the common pain points of splitting restaurant bills fairly after dining out with friends:

1. **Unequal Tax/Fee Allocation**: Traditional bill splitters often divide GST and service charges equally among diners, which unfairly penalizes members who only ordered a cheap drink.
2. **Fragile OCR**: Automated AI receipt scanners can make errors on dim, angled, or faded thermal receipts.
3. **Rounding Discrepancies**: Floating-point rounding errors often lead to split totals that don't match the original receipt.

### Core Design Philosophy:
> **"Probabilistic extraction, human verification, deterministic arithmetic."**
> AI extracts structured data with per-field confidence scores; human users verify and adjust values on the mandatory Review screen; deterministic Python `Decimal` math calculates 100% exact proportional splits.

---

## 📐 System Architecture

```
                                  +-----------------------+
                                  | React + Vite Frontend |
                                  | (TypeScript + Tailwind)|
                                  +-----------+-----------+
                                              |
                                      REST API (JSON)
                                              |
                                  +-----------v-----------+
                                  | FastAPI Python Backend|
                                  +-----+-----------+-----+
                                        |           |
               +------------------------+           +-----------------------+
               |                                                            |
    +----------v-----------+                                     +----------v-----------+
    | Modular OCR Service  |                                     | Deterministic Engine |
    | - Vision API         |                                     | - Decimal Math       |
    | - Multi-Image Merge  |                                     | - Proportional Taxes |
    | - Per-Field Conf.    |                                     | - Largest Remainder  |
    | - Demo / Mock Fallback|                                     | - Strict Validation  |
    +----------------------+                                     +----------------------+
```

---

## 🚀 Key Features & User Flow

1. **Photo Upload**: Drag and drop single or multiple receipt photos (JPG, PNG, WEBP). Supports long receipts photographed across 2+ images with automatic duplicate line detection.
2. **Review Screen (Desktop Split View)**: Mandatory review step showing original receipt image side-by-side with editable items and field-level confidence ratings (High `96% ✓`, Medium `75% ⚠️`, Low `45% ❓`).
3. **Live Arithmetic Bill Mismatch Warning**: Automatically compares printed receipt total vs `subtotal + taxes + service_charge - discount` without silently altering values.
4. **Member Management**: Add 2 or more diners with color-coded avatar circles.
5. **Flexible Item Assignment**: Assign dishes to 1 person, multiple people, or everyone with equal split or custom percentage (70/30) controls.
6. **Proportional Tax & Charge Distribution**:
   - $\text{Person Food Subtotal } (S_i) = \sum \text{Assigned Item Shares}$
   - $\text{Proportional Tax } (T_i) = \text{Total Tax} \times \left(\frac{S_i}{S_{\text{total}}}\right)$
   - $\text{Proportional Service Charge } (SC_i) = \text{Total Service Charge} \times \left(\frac{S_i}{S_{\text{total}}}\right)$
7. **Largest-Remainder Rounding Reconciliation**: Guarantees $\sum \text{Member Payable} = \text{Confirmed Receipt Total}$ exactly to the paise ($\text{₹}0.01$).
8. **Final Detailed Breakdown**: Per-member cards displaying itemized shares, subtotal, proportional tax, service charge, discount, total payable, and one-click summary copy button.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Backend**: Python 3.14, FastAPI, Pydantic v2, Pillow, Uvicorn, Pytest.
- **Data Handling**: Python `Decimal` for exact monetary arithmetic.

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### 1. Backend Setup
```bash
# Navigate to project root
cd splitright

# Activate Python virtual environment (if created)
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # macOS/Linux

# Install dependencies
pip install -r backend/requirements.txt # or install fastapi uvicorn pydantic pillow python-multipart pytest httpx
```

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

---

## 🏃 How to Run the Application

### Option A: Run Backend & Frontend Concurrently

1. **Start Backend Server**:
   ```bash
   .\venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
   ```
   FastAPI interactive API docs available at: `http://localhost:8000/docs`

2. **Start Frontend Dev Server**:
   ```bash
   cd frontend
   npm run dev
   ```
   Open browser at: `http://localhost:5173`

---

## 🧪 Running Automated Tests

The application includes 16 unit test cases covering edge cases such as proportional GST, cheap drink orders, custom 70/30 splits, multi-tax receipts, and decimal rounding reconciliation.

```bash
# Run backend pytest suite
.\venv\Scripts\python.exe -m pytest backend/tests/test_split_calculator.py
```

Expected Output:
```
backend/tests/test_split_calculator.py ................ [100%]
16 passed in 0.12s
```

---

## 📊 Ground Truth Evaluation Dataset

To evaluate OCR accuracy on real-world photographed receipts:

1. Place receipt images and ground truth JSON files under `test_data/`:
   ```
   test_data/
     bill_01/
       image.jpg
       ground_truth.json
     bill_02/
       image.jpg
       ground_truth.json
   ```

2. Run the evaluation script:
   ```bash
   .\venv\Scripts\python.exe evaluate_ocr.py
   ```

---

## 🔑 Environment Variables (`.env.example`)

```ini
# Optional Vision API Keys for extraction
GEMINI_API_KEY=
OPENAI_API_KEY=

# Server Configuration
PORT=8000
HOST=0.0.0.0
```

---

## ⚠️ Known Limitations

- Real vision API features require `GEMINI_API_KEY` or `OPENAI_API_KEY` in environment. Fallback OCR and Demo Mode provide rich receipts for testing when offline.
- Highly crumpled or blurred handwritten receipts require manual field editing on the Review screen.
