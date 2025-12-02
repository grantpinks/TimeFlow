# AI-Powered Development Architecture - Complete Template

**Version**: 1.0
**Created**: 2025-11-17
**Source**: Auto Job Recruiter Project
**Author**: Grant Pinkerton + Claude Code

---

## 📋 Table of Contents

0. [Prerequisites & Environment Setup](#prerequisites--environment-setup) ⚡ **START HERE**
1. [Quick Start Guide](#quick-start-guide)
2. [CLAUDE.md Template](#claudemd-template) (Copy this section to new projects)
3. [Sprint Planning Template](#sprint-planning-template) (Use for each sprint)
4. [Architecture Patterns Reference](#architecture-patterns-reference)
5. [Common Customizations](#common-customizations)
6. [Examples & Workflows](#examples--workflows)

---

# Prerequisites & Environment Setup

**⚡ Complete this section FIRST before using the template**

This template works best with **Cursor IDE** + **Claude Code**.

---

## Automated Installation (Recommended)

### One-Command Setup for Windows

Run this single command to install everything:

```powershell
# 1. Open PowerShell as Administrator (Right-click → Run as Administrator)

# 2. Download and run the setup script
irm https://raw.githubusercontent.com/grantpinks/JB_Automations/main/setup-windows.ps1 | iex

# Alternative: Download first, then run
curl -o setup-windows.ps1 https://raw.githubusercontent.com/grantpinks/JB_Automations/main/setup-windows.ps1
.\setup-windows.ps1
```

**What gets installed:**
- ✅ Python 3.12 (with pip)
- ✅ Node.js LTS (with npm)
- ✅ Git
- ✅ Cursor IDE
- ✅ Windows Terminal
- ✅ VS Code (for extension compatibility)
- ✅ PowerShell execution policy configured

**After installation:**
1. Restart your terminal
2. Verify: `python --version && node --version && git --version`
3. Open Cursor and enable Claude Code integration

---

## Manual Installation (Alternative)

If you prefer manual installation or the script doesn't work, follow these steps:

### 1. Install Cursor IDE (AI-Powered Code Editor)

**Download**: https://www.cursor.com/

### Windows Installation

```powershell
# Download the installer
# Visit https://www.cursor.com/ and click "Download for Windows"
# Run the downloaded .exe installer
# Follow the installation wizard
```

**After Installation**:
1. Launch Cursor
2. Sign up for Cursor account (free tier available)
3. Enable Claude Code integration (Settings → Features → Claude Code)

---

## 2. Install Python (Required for most projects)

**Download**: https://www.python.org/downloads/

### Windows Installation

```powershell
# Download Python 3.11 or 3.12 from python.org
# Run installer
# ✅ IMPORTANT: Check "Add Python to PATH" during installation
# Click "Install Now"
```

### Verify Installation

```powershell
# Open PowerShell and verify
python --version
# Should show: Python 3.11.x or 3.12.x

pip --version
# Should show: pip 23.x or higher
```

### Set Up Virtual Environment

```powershell
# Navigate to your project
cd C:\Users\YourName\Projects\my-project

# Create virtual environment
python -m venv .venv

# Activate it (PowerShell)
.\.venv\Scripts\Activate.ps1

# If you get execution policy error, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Activate (Command Prompt alternative)
.\.venv\Scripts\activate.bat
```

---

## 3. Install Node.js (For web projects)

**Download**: https://nodejs.org/

### Windows Installation

```powershell
# Download LTS version from nodejs.org
# Run the .msi installer
# Accept defaults (includes npm)
# Restart your terminal after installation
```

### Verify Installation

```powershell
node --version
# Should show: v20.x or v22.x

npm --version
# Should show: 10.x or higher
```

---

## 4. Install Git (Version Control)

**Download**: https://git-scm.com/download/win

### Windows Installation

```powershell
# Download Git for Windows
# Run the installer
# Recommended settings:
#   - Default editor: Cursor or VS Code
#   - PATH environment: Git from command line and 3rd-party software
#   - HTTPS transport: OpenSSL
#   - Line endings: Checkout Windows-style, commit Unix-style
```

### Configure Git

```powershell
# Set your name and email
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify configuration
git config --list
```

---

## 5. Install Claude Code Extension (for Cursor)

### Option A: Via Cursor Marketplace

1. Open Cursor
2. Click Extensions icon (left sidebar)
3. Search for "Claude Code"
4. Click "Install"

### Option B: Via Command Palette

1. Press `Ctrl+Shift+P` (Windows)
2. Type "Install Extensions"
3. Search "Claude Code"
4. Install

### Configure Claude Code

1. Open Settings: `Ctrl+,`
2. Search "Claude Code"
3. Set API key (if using Anthropic API directly)
4. Or enable Cursor's built-in Claude integration

---

## 6. Essential VS Code / Cursor Extensions

Install these for better productivity:

```powershell
# Open Cursor's integrated terminal and run:
# (Or install via Extensions marketplace)
```

### Python Development
- **Python** (Microsoft) - Language support
- **Pylance** (Microsoft) - Fast language server
- **Python Debugger** (Microsoft)
- **autoDocstring** - Generate docstrings

### JavaScript/TypeScript Development
- **ESLint** - Linting
- **Prettier** - Code formatting
- **JavaScript Debugger**

### General Productivity
- **GitLens** - Git supercharged
- **Path Intellisense** - Autocomplete paths
- **Todo Tree** - Highlight TODOs
- **Markdown All in One** - Markdown support
- **Error Lens** - Inline error messages

---

## 7. Install Package Managers

### For Python Projects

```powershell
# pip is already installed with Python

# Optional: Install Poetry (advanced dependency management)
curl -sSL https://install.python-poetry.org | python -
```

### For Node.js Projects

```powershell
# npm is already installed with Node.js

# Optional: Install pnpm (faster alternative)
npm install -g pnpm

# Optional: Install yarn
npm install -g yarn
```

---

## 8. Set Up Windows Terminal (Recommended)

**Download**: Microsoft Store → "Windows Terminal"

### Benefits
- Multiple tabs
- Better font rendering
- PowerShell, Command Prompt, Git Bash in one place
- Customizable themes

### Configure Default Shell

1. Open Windows Terminal
2. Settings → Startup → Default profile: PowerShell
3. Settings → Appearance → Color scheme: One Half Dark

---

## 9. Verify Complete Setup

Run this checklist in PowerShell:

```powershell
# Check all installations
python --version     # ✅ Should show Python 3.11+
pip --version       # ✅ Should show pip 23.x+
node --version      # ✅ Should show Node v20.x+
npm --version       # ✅ Should show npm 10.x+
git --version       # ✅ Should show git 2.x+

# Verify Cursor is installed
# Launch Cursor from Start Menu
# Open a .py or .js file to test Claude Code integration
```

---

## 10. First-Time Cursor Setup

### Enable Recommended Settings

1. **Auto-save**: `File → Auto Save` (Enable)
2. **Format on save**: `Settings → Editor: Format On Save` ✅
3. **Tab size**: `Settings → Editor: Tab Size` = 4 (Python) or 2 (JS)
4. **Python interpreter**: `Ctrl+Shift+P` → "Python: Select Interpreter" → Choose your .venv

### Create a Test Project

```powershell
# Test your setup
mkdir test-project
cd test-project

# Python test
python -m venv .venv
.\.venv\Scripts\Activate.ps1
echo "print('Hello from Python!')" > test.py
python test.py

# Node.js test
npm init -y
echo "console.log('Hello from Node!');" > test.js
node test.js
```

---

## Troubleshooting

### Python not found in PATH
```powershell
# Fix: Add Python to PATH manually
# 1. Search "Environment Variables" in Start Menu
# 2. Edit "Path" under User Variables
# 3. Add: C:\Users\YourName\AppData\Local\Programs\Python\Python311
# 4. Add: C:\Users\YourName\AppData\Local\Programs\Python\Python311\Scripts
# 5. Restart terminal
```

### PowerShell execution policy error
```powershell
# Fix: Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Git not found
```powershell
# Fix: Restart your terminal after Git installation
# If still not working, add to PATH:
# C:\Program Files\Git\cmd
```

### Cursor doesn't see Python/Node
```powershell
# Fix: Restart Cursor completely
# Then: Ctrl+Shift+P → "Reload Window"
```

---

## ✅ Setup Complete!

Once all checks pass, you're ready to use the AI Architecture Template.

**Next Step**: Continue to [Quick Start Guide](#quick-start-guide) below to create your first AI-powered project!

---

# Quick Start Guide

## What Is This?

This is a **complete AI development architecture template** extracted from a production project. It enables rapid, high-quality development with AI coding assistants.

## 5-Minute Setup for New Project

### Step 1: Create New Project Structure

```bash
mkdir my-new-project && cd my-new-project
mkdir -p docs sprint_review tests src
touch README.md PLAN.md
```

### Step 2: Copy CLAUDE.md Section Below

1. Scroll to [CLAUDE.md Template](#claudemd-template) section
2. Copy everything from "# AGENT STRATEGIC DIRECTIVES" to the end of that section
3. Save as `CLAUDE.md` in your project root
4. Replace all `[PLACEHOLDERS]` with your project specifics

### Step 3: Define Your MVP

In CLAUDE.md, answer:
- What problem are you solving?
- What are the 3-5 core features for Phase 1?
- What tech stack will you use?
- What are the non-goals?

### Step 4: Start Building

```
Prompt to AI: "Use the architect agent to create Sprint 1 plan for [your project], focusing on [list your core features]"
```

## File Structure After Setup

```
my-new-project/
├── CLAUDE.md                           ← Copy from this template
├── ARCHITECT_ROADMAP_SPRINT1-5.md      ← Created by architect agent
├── CODEX_TASKS_SPRINT1.md              ← Created by architect agent
├── GEMINI_TASKS_SPRINT1.md             ← Created by architect agent
├── ARCHITECTURE_DECISIONS.md           ← Create as needed
├── README.md
├── PLAN.md
├── docs/
├── sprint_review/
├── src/
└── tests/
```

---

# CLAUDE.md Template

**→ Copy this entire section to your new project as `CLAUDE.md`**

---

```markdown
# AGENT STRATEGIC DIRECTIVES

---

**Project Name**: [PROJECT_NAME]
**Version**: 1.0
**Last Updated**: [DATE]

---

## Critical Alerts

**IMPORTANT**: Before starting any implementation work, review these documents:

1. **Project Plan** - `PLAN.md` - Overall goals and milestones
2. **Architecture Decisions** - `ARCHITECTURE_DECISIONS.md` - Technical choices
3. **Sprint Reviews** - `sprint_review/` - Lessons learned

---

## MVP Target (Phase 1)

### Core Features

[Replace with your 3-5 core MVP features]

We'll build:

- **[Feature 1]** - [Description]
  - [Sub-feature 1a]
  - [Sub-feature 1b]

- **[Feature 2]** - [Description]
  - [Sub-feature 2a]
  - [Sub-feature 2b]

- **[Feature 3]** - [Description]
  - [Sub-feature 3a]
  - [Sub-feature 3b]

### Future Phases

- [Future feature 1] - Planned for Phase 2
- [Future feature 2] - Planned for Phase 2
- [Future feature 3] - Planned for Phase 3

### Non-Goals for MVP

- Multi-user support / authentication
- Cloud deployment
- [Add your specific non-goals]

---

## Current Working Flow

[Replace with your actual workflow]

```bash
# Example workflow commands
python -m src.cli [command]
python -m src.cli --help
```

**Key user actions**:
1. [Step 1 - what user does first]
2. [Step 2 - next action]
3. [Step 3 - final result]

---

## Tech Stack

### Backend / Core
- **Language**: [Python 3.11+ / JavaScript / TypeScript / Go / Rust]
- **Framework**: [FastAPI / Express / Django / Flask]
- **Database**: [PostgreSQL / MongoDB / SQLite]

### Frontend (if applicable)
- **Framework**: [React / Vue / Svelte / Next.js]
- **State Management**: [Redux / Zustand / Context API]
- **Styling**: [Tailwind / CSS Modules / Styled Components]

### Testing
- **Unit Tests**: [pytest / jest / vitest]
- **Integration Tests**: [pytest / cypress / playwright]
- **Coverage Target**: 80%+ for core features

### Infrastructure
- **Package Manager**: [pip / npm / poetry / cargo]
- **Environment**: [venv / docker / nvm]

---

## Data Models

[Replace with your actual data structures]

### [Model 1 Name]
```json
{
  "id": "string",
  "field1": "string",
  "field2": "number",
  "created_at": "datetime"
}
```

### [Model 2 Name]
```json
{
  "id": "string",
  "related_id": "string"
}
```

---

## Agent Roles

### 1. Architect Agent (`architect`)

**Primary Responsibility**: Create sprint plans, roadmaps, and architectural decisions.

**Capabilities**:
- Design system architecture
- Create sprint task breakdowns
- Identify decision gates and dependencies
- Document ADRs (Architecture Decision Records)

**Constraints**:
- MUST follow ADR workflow for significant decisions
- MUST create both CODEX and GEMINI task files
- MUST include hour estimates (ranges, not single numbers)

---

### 2. Codex Agent (`codex`)

**Primary Responsibility**: Implement backend features, algorithms, and infrastructure.

**Capabilities**:
- Write production-quality code
- Implement business logic
- Build CLI commands and APIs
- Write unit and integration tests
- Fix bugs and performance issues

**Constraints**:
- MUST write tests for all new features
- MUST update documentation when implementation changes
- MUST log all errors appropriately

**Key Files**:
- `src/**/*.py` (or your language)
- `tests/**/*.py`

---

### 3. Gemini Agent (`gemini`)

**Primary Responsibility**: Create and maintain all project documentation.

**Capabilities**:
- Write README, user guides, API docs
- Create architecture explanations
- Update troubleshooting guides
- Maintain data mapping docs

**Constraints**:
- MUST use clear, plain language
- MUST include "Why this matters" context
- MUST verify all code examples work
- MUST update "Last Updated" timestamps

**Key Files**:
- `README.md`
- `docs/**/*.md`

---

### 4. Ruthless Reviewer Agent (`ruthless-reviewer`)

**Primary Responsibility**: Brutal code review to catch production failures.

**When to Use**:
- After implementing core business logic
- Before committing critical features
- After making changes to data models
- Before presenting to stakeholders

**What It Checks**:
- Edge cases and error conditions
- Security vulnerabilities
- Performance bottlenecks
- Data loss or corruption risks
- Over-engineering

---

### 5. Session Closer Agent (`session-closer`)

**Primary Responsibility**: Create clean session handoffs.

**When to Use**:
- User says "let's wrap up"
- After completing major feature
- Before context switching
- When multiple files modified without commit

**What It Does**:
- Summarizes accomplishments
- Lists modified files
- Creates commit messages
- Documents next steps

---

## Documentation Mandate

🚨 **A task is not complete until docs are updated** 🚨

### Rules

1. **README.md is Source of Truth**
   - CLI commands change → Update README
   - Installation steps change → Update README

2. **Planning Docs Reflect Reality**
   - Implementation deviates → Update PLAN.md
   - Sprint scope changes → Update roadmap

3. **Data Contracts Are Binding**
   - Data structure changes → Update schemas
   - API changes → Update API docs

4. **Every Agent Updates Docs**
   - No exceptions

---

## Development Checklist

For every feature:

- [ ] 1. Define Scope - What and why?
- [ ] 2. Implement Logic - Write code
- [ ] 3. Write Tests - Unit + integration
- [ ] 4. Update User Docs - README if needed
- [ ] 5. Update Plan Docs - PLAN if scope changed
- [ ] 6. Update Schemas - If data changed
- [ ] 7. Update Agent Roles - If responsibilities changed
- [ ] 8. Run Full Tests - No regressions
- [ ] 9. Final Review - Read all changes
- [ ] 10. Update ADRs - If architectural change

---

## ADR Workflow

For significant architectural decisions:

### 1. Proposal (Codex/Gemini)
Document:
- **Context** - What problem?
- **Options** - What alternatives?
- **Choice** - What we picked?
- **Rationale** - Why?
- **Consequences** - Tradeoffs?

### 2. Review (Architect)
Check against:
- Long-term goals
- Existing decisions
- Future sprints
- Technical debt

### 3. Document
Add to `ARCHITECTURE_DECISIONS.md`:

```markdown
## ADR-[N]: [Decision Title]

**Date**: [YYYY-MM-DD]
**Status**: Accepted

### Context
[Problem]

### Decision
[What we decided]

### Rationale
[Why]

### Consequences
[Outcomes]
```

---

## Best Practices

### For All Agents

1. **Idempotency** - Same input → Same output
2. **Graceful Failure** - Never crash; log and continue
3. **Logging** - Log all actions
4. **No Silent Changes** - Everything logged
5. **Privacy First** - Never log sensitive data

### For Code

1. **TDD** - Tests first
2. **Single Responsibility** - One thing per function
3. **Error Handling** - Specific exceptions
4. **Type Hints** - For clarity
5. **Comments** - Why, not what

### For Documentation

1. **Plain Language** - No jargon
2. **Examples** - Every feature has one
3. **Troubleshooting** - Common errors
4. **Diagrams** - ASCII art or tables
5. **Business Context** - Why it matters

---

## Project-Specific Guidelines

[Add your domain-specific rules here]

### [Domain Rule 1]
- [Explanation]

### [Domain Rule 2]
- [Explanation]

---

**Last Updated**: [DATE]
```

---

# Sprint Planning Template

**→ Use this template for each 2-week sprint**

---

```markdown
# Sprint [N]: [Sprint Name]

**Duration**: 2 weeks ([Start] - [End])
**Total Effort**: [XX-YY] hours
**Status**: Planning | In Progress | Complete

---

## Sprint Overview

**Goal**: [One sentence - what this sprint achieves]

**User Value**: [Why does this matter to users?]

**Success Criteria**:
- ✅ [Measurable criterion 1]
- ✅ [Measurable criterion 2]
- ✅ [Measurable criterion 3]

**Decision Gates** (complete before starting):
- [ ] [Validation checkpoint 1]
- [ ] [Validation checkpoint 2]

---

## Task Breakdown

### Week 1: [Theme]

#### Task [N].1: [Task Name] ([X-Y] hours)

**Objective**: [What this accomplishes]

**Scope**:
- [ ] [Subtask 1]
- [ ] [Subtask 2]
- [ ] [Subtask 3]

**Acceptance Criteria**:
- [ ] [Criterion 1 - specific and testable]
- [ ] [Criterion 2 - specific and testable]
- [ ] Tests pass
- [ ] Docs updated

**Risks**:
- [Risk 1] - [Mitigation]

**Dependencies**:
- Requires: [Task X]
- Blocks: [Task Y]

---

#### Task [N].2: [Task Name] ([X-Y] hours)

[Same structure as above]

---

### Week 2: [Theme]

#### Task [N].3: [Task Name] ([X-Y] hours)

[Same structure as above]

---

## Resource Allocation

| Task | Agent | Hours | Priority |
|------|-------|-------|----------|
| [N].1 | Codex | [X-Y] | P0 |
| [N].2 | Gemini | [X-Y] | P1 |

---

## Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk 1] | High | High | [Strategy] |

---

## Sprint Review (Post-Sprint)

- What went well?
- What didn't?
- What to change?
- Lessons learned?

---

**Created**: [DATE]
```

---

# Architecture Patterns Reference

## What Makes This Architecture Efficient

### 1. Clear Agent Directives (CLAUDE.md)
- AI agents know exactly what to build
- MVP scope prevents feature creep
- Strategic reviews catch flaws early

### 2. Specialized Task Distribution
- **Codex** - Implementation, algorithms, infrastructure
- **Gemini** - Documentation, guides, explanations
- **Architect** - Planning, decision gates, roadmaps
- **Ruthless Reviewer** - Quality, edge cases, production risks

### 3. Documentation-First Mandate
- Docs must stay in sync with code
- Every code change requires doc update
- Prevents documentation drift

### 4. Sprint Planning with Decision Gates
- 2-week sprints with hour estimates
- Clear success criteria
- Risk mitigation validates assumptions

### 5. ADR Workflow
- All decisions documented
- Rationale captured
- Prevents repeated debates

---

## Core Principles

### Principle 1: Documentation Mandate

**Rule**: Task not complete until docs updated.

**Why**: Documentation drift wastes time and causes bugs.

**How**:
- README when commands change
- PLAN when scope changes
- Schemas when data changes

### Principle 2: Agent Specialization

**Rule**: Different agents for different purposes.

**Why**: Specialized agents produce higher quality in their domain.

**Agents**:
- Architect → Planning
- Codex → Implementation
- Gemini → Documentation
- Ruthless Reviewer → Quality
- Session Closer → Handoffs

### Principle 3: Decision Gates

**Rule**: Don't start Sprint N+1 until Sprint N validates assumptions.

**Why**: Prevents wasted effort on wrong approach.

**Gates**:
- After Sprint 1: "Are architectural assumptions valid?"
- After Sprint 2: "Do users understand workflow?"
- After Sprint 4: "Is performance acceptable?"

### Principle 4: Realistic Estimates

**Rule**: All tasks have hour ranges with buffers.

**Examples**:
- ❌ Bad: "8 hours"
- ✅ Good: "8-12 hours"

**Why**: Ranges account for unknowns.

### Principle 5: ADR Documentation

**Rule**: Document significant architectural decisions.

**Examples of ADR-worthy**:
- Database choice (SQL vs NoSQL)
- Authentication strategy (JWT vs sessions)
- Deployment platform
- Testing framework

---

## Common Patterns

### Pattern 1: MVP-First Development

**Anti-pattern**: Build all features before validating.

**Better**:
1. Define 3-5 core features
2. Build MVP in Sprint 1-2
3. Get user feedback
4. Iterate

### Pattern 2: Accessibility from Day 1

**Anti-pattern**: Add at the end (never happens).

**Better**:
- Distribute across sprints
- Budget 10-15% time
- Test with screen readers from Sprint 1

### Pattern 3: Technical Spikes

**Anti-pattern**: Assume tech X works, discover it doesn't in Sprint 5.

**Better**:
- Sprint 1 includes technical spike
- Validate assumptions early
- Decision gates prevent wasted effort

### Pattern 4: Ruthless Review

**Anti-pattern**: Ship without critical review.

**Better**:
- Use ruthless-reviewer after critical features
- Focus on: edge cases, security, performance
- Fix before production

---

# Common Customizations

## For Web Applications

Add to CLAUDE.md `## Tech Stack`:

```markdown
### Frontend
- **Framework**: React 18 + TypeScript
- **State**: Zustand
- **Styling**: Tailwind CSS
- **Build**: Vite

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 15
- **ORM**: SQLAlchemy
- **Auth**: JWT tokens
```

## For CLI Tools

```markdown
### CLI Framework
- **Language**: Python 3.11
- **Parsing**: Click 8.x
- **Output**: Rich
- **Config**: TOML
- **Distribution**: PyPI
```

## For Data Pipelines

```markdown
### Data Processing
- **Language**: Python 3.11
- **Processing**: Polars
- **Validation**: Pydantic
- **Scheduling**: Airflow
- **Storage**: PostgreSQL + S3
```

## For Machine Learning

```markdown
### ML Stack
- **Framework**: PyTorch 2.x
- **Tracking**: MLflow
- **Serving**: FastAPI
- **Datasets**: Hugging Face
```

---

# Examples & Workflows

## Example 1: Building a New Feature

```
1. User: "Add user authentication"

2. Architect: "Creating Sprint N plan"
   → ARCHITECT_ROADMAP_SPRINTN.md
   → CODEX_TASKS_SPRINTN.md
   → GEMINI_TASKS_SPRINTN.md

3. Codex: "Implementing auth (Task N.1)"
   → src/auth/*.py
   → tests/test_auth.py

4. Gemini: "Documenting auth (Task N.G1)"
   → README.md (auth section)
   → docs/AUTHENTICATION.md

5. Ruthless Reviewer: "Review auth"
   → Finds security issues
   → Suggests fixes

6. Codex: "Apply fixes"
   → Implements changes

7. Session Closer: "Wrap up"
   → Commits changes
   → Documents next steps
```

## Example 2: Starting New Project

```
1. User: "Help set up task management CLI"

2. Assistant: "Setting up AI architecture"
   → Copies CLAUDE_TEMPLATE.md
   → Guides customization

3. Architect: "Create Sprint 1 plan"
   → Core features:
     - Add task
     - List tasks
     - Complete task
     - Persist to file

4. Codex: "Implement CLI (Task 1.1)"
   → Sets up Click
   → Creates main.py

5. Gemini: "Document CLI (Task 1.G1)"
   → Writes README
   → Adds examples

6. Continue iterating...
```

---

# Troubleshooting

## Problem: Sprints Run Over

**Solution**: Use hour ranges, not single numbers.

❌ "Implement auth: 8 hours"
✅ "Implement auth: 8-12 hours"

## Problem: Docs Out of Sync

**Solution**: Enforce documentation mandate.

Add to PR checklist:
- [ ] README examples work
- [ ] API docs match code
- [ ] PLAN updated if scope changed

## Problem: Agents Don't Know What to Build

**Solution**: Make CLAUDE.md more specific.

❌ Vague: "Build a web app"
✅ Specific:
```markdown
MVP Features:
- User creates account (email+password)
- User creates todo items
- User marks todos complete
- Todos persist to SQLite
```

## Problem: Too Much Technical Debt

**Solution**: Add "Polish" sprint every 3-4 sprints.

- Sprint 1-3: Features
- Sprint 4: Polish
- Sprint 5-7: Features
- Sprint 8: Polish

---

# Success Metrics

## Good Signs ✅

- Sprint goals consistently achieved
- Documentation stays in sync
- Decisions documented
- Reviews catch critical issues
- User feedback incorporated quickly

## Warning Signs ⚠️

- Sprints consistently over
- Docs lag behind code
- Same debates repeated
- Critical bugs in production
- Missing features in docs

---

# Quick Reference Card

## Essential Commands

```bash
# Start new project
mkdir project && cd project
# Copy CLAUDE.md section from this template
# Replace [PLACEHOLDERS]

# Create first sprint
"Architect: Create Sprint 1 plan for [project]"

# Implement features
"Codex: Implement Task 1.1"

# Document
"Gemini: Complete Task 1.G1"

# Review
"Ruthless Reviewer: Review [feature]"

# Wrap up
"Session Closer: Wrap up this session"
```

## File Checklist

- [ ] CLAUDE.md (from template)
- [ ] README.md
- [ ] PLAN.md
- [ ] ARCHITECTURE_DECISIONS.md
- [ ] docs/ directory
- [ ] tests/ directory
- [ ] src/ directory

## Sprint Checklist

- [ ] MVP features defined
- [ ] Tech stack chosen
- [ ] Sprint 1 plan created
- [ ] Decision gates set
- [ ] Hour estimates (ranges)
- [ ] Success criteria defined

---

# Version History

- **v1.0** (2025-11-17) - Initial template from Auto Job Recruiter

---

# License

MIT License - Free to use for any project

---

# Next Steps

1. ✅ Copy CLAUDE.md section to new project
2. ✅ Replace all [PLACEHOLDERS]
3. ✅ Create Sprint 1 plan with Architect
4. ✅ Start building!

**Happy Building! 🚀**

---

**END OF TEMPLATE - Ready to use for your next project!**
