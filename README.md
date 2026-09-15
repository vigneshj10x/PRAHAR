# THERMO-SHIELD — Climate-Aware Shelter Thermal Design & Optimization Engine

Smart India Hackathon Prototype (PS 26051, DRDO / iDEX).

---

## Repository Structure

```text
thermo-shield/
├── frontend/             # React + TypeScript + Vite, React Three Fiber, Recharts, Zustand
├── backend/              # FastAPI Python backend (HTTP REST API)
├── simulation-engine/    # Reduced-order RC thermal physics model & material database
├── docs/                 # API contract, physics methodology & material sources
└── README.md
```

---

## How to Run Locally

### Option 1: Run Frontend + Backend (Two Terminals)

#### Terminal 1 — Backend (FastAPI on port 8000)
```bash
cd backend
pip install -r requirements.txt
python main.py
```
*Backend runs at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).*

#### Terminal 2 — Frontend (Vite on port 5173)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

---

### Option 2: Frontend-Only Mode (In-Memory Mock Fallback)
To run the frontend in standalone mode without starting the Python backend, set in `frontend/.env`:
```env
VITE_USE_MOCK_ENGINE=true
```
Then run:
```bash
cd frontend
npm run dev
```

To enable live backend API transport over HTTP:
```env
VITE_USE_MOCK_ENGINE=false
VITE_API_BASE_URL=http://localhost:8000
```

---

## Documentation & Methodology
- [API Contract Specification](docs/api-contract.md)
- [Thermal Simulation Methodology](docs/methodology.md)
- [Material Database Sources & Standards](docs/material-sources.md)
