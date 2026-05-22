# Wellness Backend

Backend services and portals for the Wellness healthcare platform.

## Structure

```
wellness-platform/
├── backend/         # Express + SuperTokens API (port 3001)
├── doctor-portal/   # Next.js doctor dashboard (port 3002)
└── admin-portal/    # Next.js admin dashboard (port 3003)
```

## Prerequisites

- Node.js 18+
- PostgreSQL 17 (running on port 5432)
- Docker (for SuperTokens Core)

## Getting started

### 1. Start SuperTokens Core
```bash
docker start supertokens
```

### 2. Start the backend
```bash
cd backend
npm install
npm run dev
```

### 3. Start the doctor portal
```bash
cd doctor-portal
npm install
npm run dev
```

### 4. Start the admin portal
```bash
cd admin-portal
npm install
npm run dev
```

## Environment variables

Each folder has a `.env.example` — copy it to `.env` / `.env.local` and fill in your values.
