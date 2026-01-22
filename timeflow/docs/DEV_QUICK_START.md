# TimeFlow Development Quick Start

Quick reference for starting and managing the development servers.

---

## 📂 Navigate to Repository

```bash
cd ~/Desktop/Time\ Flow/TimeFlow/timeflow
```

**Or with tab completion:**
```bash
cd ~/Desktop/Time<TAB>/TimeFlow/timeflow
```

---

## 🚀 Start Development Servers

### Start Backend + Web + ngrok

```bash
cd ~/Desktop/Time\ Flow/TimeFlow/timeflow
pnpm dev:full
```

### Start Both Servers (Recommended)

From the project root, open **two terminal tabs/windows**:

**Terminal 1 - Backend:**
```bash
cd ~/Desktop/Time\ Flow/TimeFlow/timeflow
pnpm dev:backend
```

**Terminal 2 - Frontend:**
```bash
cd ~/Desktop/Time\ Flow/TimeFlow/timeflow
pnpm dev:web
```

### Stop Backend + Web + ngrok

```bash
cd ~/Desktop/Time\ Flow/TimeFlow/timeflow
pnpm dev:stop
```

### Start Backend + Web + ngrok

```bash
cd ~/Desktop/Time\ Flow/TimeFlow/timeflow
pnpm dev:full
```

### What You'll See

**Backend (Port 3001):**
```
Server listening at http://0.0.0.0:3001
```

**Frontend (Port 3000):**
```
- Local:   http://localhost:3000
- Network: http://192.168.x.x:3000
```

---

## 🌐 ngrok Tunnel (Gmail Pub/Sub Push)

Use this when testing Gmail background sync in local development.

```bash
ngrok http 3001
```

Notes:
- Use the public URL printed by ngrok as the Pub/Sub push endpoint.
- ngrok inspector runs at `http://127.0.0.1:4040` for request debugging.

---

## 🔄 Restart Servers

### If Server is Frozen or Unresponsive

**Method 1: Ctrl+C in Terminal**
1. Click into the terminal running the server
2. Press `Ctrl+C` to stop it
3. Run the start command again:
   - Backend: `pnpm dev:backend`
   - Frontend: `pnpm dev:web`

**Method 2: Kill by Port (if Ctrl+C doesn't work)**

```bash
# Kill backend (port 3001)
lsof -ti:3001 | xargs kill -9

# Kill frontend (port 3000)
lsof -ti:3000 | xargs kill -9

# Then restart normally
pnpm dev:backend  # in one terminal
pnpm dev:web      # in another terminal
```

**Method 3: Kill All Dev Processes (Nuclear Option)**

```bash
# Kill all backend processes
pkill -f "tsx.*src/index.ts"

# Kill all frontend processes
pkill -f "next dev"

# Then restart normally
pnpm dev:backend
pnpm dev:web
```

---

## 🔍 Check Which Servers Are Running

```bash
# Check backend (should show port 3001)
lsof -ti:3001

# Check frontend (should show port 3000)
lsof -ti:3000

# Show all info about what's running on those ports
lsof -i:3001
lsof -i:3000
```

---

## ⚠️ Common Issues

### "Address already in use" Error

**Cause:** A server is already running on that port (3000 or 3001)

**Solution:**
```bash
# For backend (port 3001)
lsof -ti:3001 | xargs kill -9
pnpm dev:backend

# For frontend (port 3000)
lsof -ti:3000 | xargs kill -9
pnpm dev:web
```

### Multiple Backend Processes Running

**Check:**
```bash
ps aux | grep "tsx.*src/index.ts" | grep -v grep
```

**If you see multiple processes, kill them all:**
```bash
pkill -f "tsx.*src/index.ts"
pnpm dev:backend
```

### Server Not Responding After Code Changes

**Backend:** Auto-restarts on file changes (using `tsx watch`)
- If it doesn't restart, press `Ctrl+C` and restart manually

**Frontend:** Auto-reloads on file changes (Next.js Fast Refresh)
- If it doesn't reload, hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)

---

## 📝 Development Workflow

### Typical Session Startup

1. **Open Cursor/VS Code**
   ```bash
   cursor ~/Desktop/Time\ Flow/TimeFlow/timeflow
   # or
   code ~/Desktop/Time\ Flow/TimeFlow/timeflow
   ```

2. **Open 2 terminal tabs in the editor**
   - Terminal 1: `pnpm dev:backend`
   - Terminal 2: `pnpm dev:web`

3. **Open browser**
   - Navigate to http://localhost:3000

### End of Session

**Option 1: Leave Running**
- Servers will stay running even if you close the editor
- Good if you're coming back soon

**Option 2: Stop Servers**
- Press `Ctrl+C` in each terminal tab
- Or close the terminal windows (will prompt to kill processes)

---

## 🛠️ Other Useful Commands

### Database Management

```bash
# View database in Prisma Studio
cd apps/backend
pnpm prisma studio
# Opens at http://localhost:5555
```

### Build for Production

```bash
# Build backend
pnpm build:backend

# Build frontend
pnpm build:web
```

### Run Tests

```bash
# Backend tests
cd apps/backend
pnpm test

# Frontend tests (if available)
cd apps/web
pnpm test
```

---

## 🎯 Quick Command Reference

| Task | Command |
|------|---------|
| Navigate to repo | `cd ~/Desktop/Time\ Flow/TimeFlow/timeflow` |
| Start backend | `pnpm dev:backend` |
| Start frontend | `pnpm dev:web` |
| Stop server | `Ctrl+C` |
| Kill backend port | `lsof -ti:3001 \| xargs kill -9` |
| Kill frontend port | `lsof -ti:3000 \| xargs kill -9` |
| Check running servers | `lsof -i:3000,3001` |
| Hard refresh browser | `Cmd+Shift+R` / `Ctrl+Shift+R` |

---

## 💡 Pro Tips

1. **Use separate terminal tabs** - Easier to see logs from both servers
2. **Watch the terminal** - Errors appear here first
3. **Check port conflicts** - If startup fails, another process might be using the port
4. **Hard refresh browser** - When frontend behaves strangely: `Cmd+Shift+R`
5. **Restart backend after schema changes** - Especially after Prisma migrations

---

## 🔗 Related Docs

- [Sprint 16 Phase A Transfer Status](./TRANSFER_STATUS_SPRINT16_PHASEA.md)
- [Sprint 20 Production Deployment](./SPRINT_20_PRODUCTION_DEPLOYMENT.md)
- [Architecture Roadmap](../ARCHITECT_ROADMAP_SPRINT1-17.md)
