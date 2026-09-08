# SplitRight 🧾

**Smart restaurant bill splitting from receipt photos.**

SplitRight is a full-stack web application that extracts structured data from restaurant receipts, lets users verify the extracted bill, assign items to diners, and calculates a fair split with proportional taxes and charges.

> **Probabilistic extraction. Human verification. Deterministic arithmetic.**

---

## ✨ Why SplitRight?

Splitting a restaurant bill is easy when everyone spends the same amount. Real bills are rarely that simple.

One person may order only a drink while another orders a full meal. Items may be shared, taxes and service charges apply to the whole bill, and rounding can leave the final split a few paise away from the receipt total.

SplitRight is designed around three ideas:

- **Extract** receipt data instead of entering every item manually.
- **Review** uncertain OCR output before calculations are trusted.
- **Split fairly** by distributing bill-level charges according to each person's actual item subtotal.

---

## 🚀 Core Features

### 📷 Receipt Extraction
- Upload one or multiple restaurant receipt images.
- Extract restaurant name, items, quantity, unit price, item totals and bill-level charges.
- Supports fields such as **CGST, SGST, tax, service charge and discount**.
- Stores a confidence score for extracted fields.
- Supports multi-image receipt merging with duplicate-line warnings.

### 🔍 Human Review & Validation
OCR is treated as an extraction aid rather than an unquestionable source of truth.

SplitRight can validate:
- sum of line items vs. receipt subtotal;
- calculated bill total vs. printed total;
- small rounding differences using a tolerance.

This makes incorrect or uncertain receipt data visible before the final split.

### 👥 Flexible Item Assignment
Each receipt item can be assigned to:
- one person;
- multiple people equally;
- multiple people using custom shares.

The backend prevents calculation when receipt items remain unassigned.

### ⚖️ Proportional Charges
Taxes, service charges, discounts and other bill-level charges are distributed according to each member's share of the item subtotal.

For member `i`:

```text
ratioᵢ = member item subtotalᵢ / total assigned item subtotal

taxᵢ            = total tax × ratioᵢ
service chargeᵢ = service charge × ratioᵢ
discountᵢ       = total discount × ratioᵢ
```

So someone who ordered only 10% of the food receives approximately 10% of the applicable shared charges instead of paying an equal portion.

### 🪙 Exact Paise-Level Reconciliation
All monetary calculations use Python `Decimal`.

After individual amounts are rounded to ₹0.01, SplitRight performs deterministic rounding reconciliation so that:

```text
sum(member payable amounts) = confirmed receipt total
```

For example, splitting ₹10 equally among three people can produce:

```text
₹3.33 + ₹3.33 + ₹3.34 = ₹10.00
```

---

## 🔄 Application Flow

```text
Receipt Photo(s)
      │
      ▼
OCR / Vision Extraction
      │
      ▼
Structured Receipt + Confidence Scores
      │
      ▼
Review & Arithmetic Validation
      │
      ▼
Add Members
      │
      ▼
Assign Receipt Items
      │
      ▼
Proportional Tax / Charge Distribution
      │
      ▼
Paise-Level Reconciliation
      │
      ▼
Final Member Breakdown
```

---

## 🏗️ Architecture

```text
┌──────────────────────────────────────┐
│          React Frontend              │
│ React + TypeScript + Vite + Tailwind │
└──────────────────┬───────────────────┘
                   │ REST / JSON
                   ▼
┌──────────────────────────────────────┐
│             FastAPI API              │
├──────────────────┬───────────────────┤
│ Receipt Routes   │ Split Routes      │
└────────┬─────────┴────────┬──────────┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌────────────────────┐
│ Receipt Pipeline│  │ Split Calculator   │
│                 │  │                    │
│ • Vision APIs   │  │ • Decimal math     │
│ • RapidOCR      │  │ • Equal/custom     │
│ • Line parser   │  │ • Proportional fees│
│ • Multi-image   │  │ • Reconciliation   │
└────────┬────────┘  └────────────────────┘
         │
         ▼
┌─────────────────┐
│ Receipt Validator│
│ • Item subtotal │
│ • Printed total │
│ • Warnings      │
└─────────────────┘
```

---

## 🧠 OCR Pipeline

SplitRight uses a modular receipt-extraction pipeline.

When configured, the backend can attempt vision-based extraction through:

- **Google Gemini**
- **OpenAI**

Without those API keys, the project can use its local OCR path based on **RapidOCR**, followed by a heuristic receipt-line parser.

The parser recognizes common receipt patterns such as:

```text
2 Chicken Biryani 320.00 640.00
Chicken Biryani 2 640.00
Chicken Biryani 640.00
```

It also detects common financial labels including:

```text
Subtotal
CGST
SGST
GST / Tax / VAT
Service Charge
Discount
Grand Total
```

Extracted data is converted into validated Pydantic receipt models before it is used by the splitting engine.

> Receipt OCR is inherently imperfect. SplitRight therefore keeps confidence information and supports validation instead of silently assuming every extracted value is correct.

---

## 🛠️ Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Lucide React

### Backend
- Python
- FastAPI
- Pydantic
- Uvicorn
- Pillow
- RapidOCR / ONNX Runtime
- Pytest

### Optional Vision Providers
- Google Gemini
- OpenAI Vision

### Numerical Accuracy
- Python `Decimal`
- ₹0.01 quantization
- deterministic rounding reconciliation

---

## 📁 Project Structure

```text
splitright/
│
├── backend/
│   ├── models/
│   │   ├── receipt.py
│   │   └── split.py
│   │
│   ├── routes/
│   │   ├── receipt.py
│   │   └── split.py
│   │
│   ├── services/
│   │   ├── ocr_line_parser.py
│   │   ├── receipt_extractor.py
│   │   ├── receipt_validator.py
│   │   └── split_calculator.py
│   │
│   ├── tests/
│   │   ├── test_ocr_parser.py
│   │   └── test_split_calculator.py
│   │
│   └── main.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── index.html
│   └── package.json
│
├── test_data/
│   ├── bill_01/
│   └── schema.json
│
├── evaluate_ocr.py
├── .env.example
├── .gitignore
└── README.md
```

Generated folders such as `venv/`, `node_modules/`, `dist/`, `.pytest_cache/` and `__pycache__/` should not be committed.

---

## 🔌 API Overview

### Receipt Extraction

```http
POST /api/receipts/extract
```

Accepts one or more uploaded receipt images and returns a structured receipt with field confidence information.

### Receipt Validation

```http
POST /api/receipts/validate
```

Checks the reviewed receipt for arithmetic inconsistencies.

### Demo Receipt

```http
GET /api/receipts/demo
```

Returns a sample receipt for development and testing.

### Calculate Split

```http
POST /api/split/calculate
```

Accepts:
- reviewed receipt;
- members;
- item assignments.

Returns a detailed member-by-member breakdown and reconciliation status.

Interactive FastAPI documentation is available while the backend is running at:

```text
http://localhost:8000/docs
```

---

## ⚙️ Local Setup

### Prerequisites

Install:

- Python 3.10+
- Node.js 18+
- npm

### 1. Clone the repository

```bash
git clone https://github.com/devika19deshmukh/SplitRight.git
cd SplitRight
```

### 2. Create a Python environment

Windows:

```bash
python -m venv venv
.\venv\Scripts\activate
```

macOS/Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install backend dependencies

If using the project's requirements file:

```bash
pip install -r backend/requirements.txt
```

### 4. Configure environment variables

Copy `.env.example` to `.env`.

```env
GEMINI_API_KEY=
OPENAI_API_KEY=

PORT=8000
HOST=0.0.0.0
```

The vision API keys are optional for the local/demo OCR paths.

### 5. Start the backend

From the project root:

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

Backend:

```text
http://localhost:8000
```

API docs:

```text
http://localhost:8000/docs
```

### 6. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

---

## 🧪 Testing

SplitRight includes automated tests for both receipt parsing and bill calculations.

Run all backend tests:

```bash
python -m pytest backend/tests
```

The calculation test suite covers cases including:

- one-person assignments;
- equal shared items;
- custom 70/30 splits;
- items shared by everyone;
- proportional tax;
- proportional service charge;
- proportional discounts;
- decimal rounding;
- printed-total mismatches;
- line-item/subtotal mismatches;
- very different diner subtotals;
- quantity greater than one;
- zero service charge;
- zero tax;
- CGST + SGST.

A dedicated OCR parser test also checks extraction of restaurant information, items, subtotal, CGST, SGST, service charge and total from receipt-style text.

---

## 📊 OCR Evaluation Dataset

The repository includes a ground-truth schema for receipt evaluation.

Example structure:

```text
test_data/
└── bill_01/
    ├── image.jpg
    └── ground_truth.json
```

The schema can represent:

- restaurant name;
- item name;
- quantity;
- unit price;
- item total;
- subtotal;
- tax;
- CGST;
- SGST;
- service charge;
- discount;
- other charges;
- final total.

Run the evaluation utility with:

```bash
python evaluate_ocr.py
```

> **Note:** The current evaluation utility is a lightweight scaffold around ground-truth bill fields. It should not be interpreted as a production OCR benchmark or a measured real-world accuracy claim.

---

## 🧮 Example Fair Split

Suppose two diners order:

```text
A → ₹900 meal
B → ₹100 drink
Subtotal → ₹1,000
Tax → ₹100
```

Instead of charging ₹50 tax to each person:

```text
A ratio = 900 / 1000 = 90%
B ratio = 100 / 1000 = 10%

A tax = ₹90
B tax = ₹10
```

Final:

| Member | Items | Tax | Payable |
|---|---:|---:|---:|
| A | ₹900 | ₹90 | ₹990 |
| B | ₹100 | ₹10 | ₹110 |
| **Total** | **₹1,000** | **₹100** | **₹1,100** |

This is the central fairness principle behind SplitRight.

---

## ⚠️ Current Limitations

- OCR quality depends on receipt image quality and layout.
- Very blurred, handwritten, folded or heavily damaged receipts may require manual correction.
- Heuristic parsing cannot reliably understand every restaurant receipt format.
- External vision extraction requires the corresponding API key.
- Multi-image duplicate detection is heuristic and should be reviewed by the user.
- The included OCR evaluation script is an evaluation scaffold rather than a full production benchmark.

---

## 🔐 Security Notes

- API keys belong in `.env`, not frontend code.
- `.env` and `.env.local` are excluded through `.gitignore`.
- `.env.example` contains only placeholder configuration.
- Do not commit real provider credentials to GitHub.

---

## 🎯 Design Principle

SplitRight deliberately separates uncertain extraction from exact financial calculation:

```text
Receipt image
     ↓
Probabilistic OCR
     ↓
Human-verifiable structured data
     ↓
Deterministic Decimal calculation
     ↓
Exactly reconciled bill split
```

This allows OCR to assist the user without allowing an uncertain extraction result to silently determine how much each person owes.

---

## 👩‍💻 Author

**Devika Deshmukh**

Built as a full-stack project exploring receipt OCR, structured extraction, validation and fair expense splitting.
