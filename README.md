# TreasuryOS — Liquidity Management System

A production-quality Treasury Liquidity Management System with Liquidity Pooling and a Sweeping Rules Engine.

## Tech Stack

- **Frontend**: React 19 + Vite, TypeScript, Tailwind CSS, React Router, Zustand
- **Backend**: Node.js + Express, TypeScript, Firebase Admin SDK
- **Database**: Firestore (via backend only)
- **Auth**: Firebase Authentication

---

## Prerequisites

- Node.js >= 18
- A Firebase project (already configured: `treasury-liquidity-management`)
- Firebase service account key (download from Firebase Console)

---

## Setup

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com) → Project Settings → Service Accounts
2. Click **Generate new private key** → download the JSON
3. Open the JSON and extract `client_email` and `private_key`

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```
PORT=5000
FIREBASE_PROJECT_ID=treasury-liquidity-management
FIREBASE_CLIENT_EMAIL=your-service-account@...iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FRONTEND_URL=http://localhost:5173
```

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (from project root)
cd ..
npm install
```

### 4. Seed Database (Optional)

```bash
cd backend
npx ts-node src/seed.ts
```

This creates 10 sample accounts, 2 pools, and 4 sweep rules.

### 5. Run

Open two terminals:

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd ..  (project root)
npm run dev
```

Visit: http://localhost:5173

Register an account on the login page to get started.

---

## Architecture

```
treasury-liquidity-management/
├── src/                        # Frontend (React/Vite)
│   ├── api/                    # Axios API clients
│   ├── components/             # Reusable UI components
│   ├── lib/                    # Firebase client config
│   ├── pages/                  # Page components
│   ├── store/                  # Zustand state stores
│   └── types/                  # TypeScript interfaces
│
└── backend/
    └── src/
        ├── config/             # Firebase Admin SDK init
        ├── middleware/         # Auth token verification
        ├── routes/             # Express route handlers
        └── services/           # Business logic layer
```

---

## API Endpoints

All endpoints require `Authorization: Bearer <firebase-id-token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List all accounts |
| POST | `/api/accounts` | Create account |
| PUT | `/api/accounts/:id` | Update account |
| PATCH | `/api/accounts/:id/status` | Toggle active/inactive |
| GET | `/api/pools` | List pools with members |
| POST | `/api/pools` | Create liquidity pool |
| POST | `/api/pools/:id/add-account` | Add child account |
| DELETE | `/api/pools/:id/remove-account` | Remove child account |
| POST | `/api/pooling/:poolId/execute` | Execute pool sweep |
| GET | `/api/rules` | List sweep rules |
| POST | `/api/rules` | Create sweep rule |
| PUT | `/api/rules/:id` | Update rule (draft/paused only) |
| POST | `/api/rules/:id/clone` | Clone rule |
| POST | `/api/rules/:id/submit` | Submit for approval |
| POST | `/api/rules/:id/activate` | Activate approved rule |
| POST | `/api/rules/:id/pause` | Pause active rule |
| POST | `/api/approvals/:ruleId/approve` | Approve rule |
| POST | `/api/approvals/:ruleId/reject` | Reject rule |
| POST | `/api/sweeping/:ruleId/execute` | Execute sweep |
| GET | `/api/executions` | Execution history |
| GET | `/api/dashboard/summary` | Dashboard stats |

---

## Sweep Rule Types

| Type | Logic |
|------|-------|
| **Zero Balance** | Transfers entire source balance to target |
| **Target Balance** | Transfers `sourceBalance - targetBalance` to target |
| **Threshold** | Transfers when `sourceBalance > threshold`, moves excess |
| **Deficit Funding** | Funds source from target when `sourceBalance < targetBalance` |

---

## Rule Workflow

```
draft → pending (submit) → approved (approve) → active (activate)
                        ↓ rejected              ↓ paused
                      (back to draft)         (back to draft for edit)
```

**4-eyes principle enforced**: Rule creator cannot approve their own rule.
