# Stack Management Guide

Quick reference for starting, restarting, and shutting down the TimeFlow development stack.

## Stack Components

- **Backend API**: Fastify server on port 3001
- **Web App**: Next.js on port 3000
- **Database**: PostgreSQL (external service)

## Prerequisites

All commands must be run from the `timeflow/` directory:

```bash
cd timeflow
```

---

## Quick Start

### Start Full Stack

```bash
# Terminal 1 - Backend
pnpm dev:backend

# Terminal 2 - Web
pnpm dev:web
```

### Start in Background (Recommended)

If using Claude Code or automation:

```bash
# Start backend in background
cd timeflow && pnpm dev:backend &

# Start web in background
cd timeflow && pnpm dev:web &
```

### Verify Stack is Running

```bash
# Check backend
curl http://localhost:3001/health

# Check web
curl http://localhost:3000
```

---

## Restart Stack

### Option 1: Clean Restart (Recommended)

```bash
# 1. Kill existing processes
npx kill-port 3001
npx kill-port 3000

# 2. Start services
pnpm dev:backend &
pnpm dev:web &
```

### Option 2: Find and Kill Processes Manually

**Windows:**
```bash
# Find process IDs
netstat -ano | findstr :3001
netstat -ano | findstr :3000

# Kill by PID
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
# Find process IDs
lsof -ti:3001
lsof -ti:3000

# Kill by port
kill -9 $(lsof -ti:3001)
kill -9 $(lsof -ti:3000)
```

---

## Shutdown Stack

### Kill All Services

```bash
# Kill backend and web
npx kill-port 3001
npx kill-port 3000
```

### Verify Shutdown

```bash
# Should return nothing or "No process found"
netstat -ano | findstr :3001
netstat -ano | findstr :3000
```

---

## Troubleshooting

### "Address already in use" Error

**Problem:** Port 3000 or 3001 is already occupied.

**Solution:**
```bash
npx kill-port 3001
npx kill-port 3000
```

Then restart the service.

### Backend won't start

**Check database connection:**
```bash
cd apps/backend
cat .env | grep DATABASE_URL
```

**Run migrations:**
```bash
cd apps/backend
pnpm prisma migrate dev
```

### Web app won't connect to backend

**Verify backend is running:**
```bash
curl http://localhost:3001/health
```

**Check NEXT_PUBLIC_API_URL in web/.env.local:**
```bash
cd apps/web
cat .env.local | grep NEXT_PUBLIC_API_URL
# Should be: NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Database migrations needed

```bash
cd apps/backend
pnpm prisma migrate dev
pnpm prisma generate
```

---

## Development Workflow

### Full Development Session

```bash
# 1. Navigate to project
cd timeflow

# 2. Install dependencies (if needed)
pnpm install

# 3. Run database migrations (if needed)
cd apps/backend && pnpm prisma migrate dev && cd ../..

# 4. Start services
pnpm dev:backend &
pnpm dev:web &

# 5. Verify
curl http://localhost:3001/health
curl http://localhost:3000
```

### End Development Session

```bash
# Kill all services
npx kill-port 3001
npx kill-port 3000

# Optionally stop database (if running locally)
# pg_ctl stop -D /path/to/data
```

---

## Quick Reference Table

| Task | Command |
|------|---------|
| Start backend | `pnpm dev:backend` |
| Start web | `pnpm dev:web` |
| Kill backend | `npx kill-port 3001` |
| Kill web | `npx kill-port 3000` |
| Kill both | `npx kill-port 3001 && npx kill-port 3000` |
| Check backend health | `curl http://localhost:3001/health` |
| Run migrations | `cd apps/backend && pnpm prisma migrate dev` |
| Open Prisma Studio | `cd apps/backend && pnpm prisma studio` |

---

## Notes for AI Agents

- **Always run from `timeflow/` directory**
- **Use `npx kill-port` before restarting** to avoid EADDRINUSE errors
- **Wait 2-3 seconds** after killing ports before restarting
- **Backend must start before web** for optimal startup
- **Check `.output` files** in temp directory for background process logs
