# AI-Powered Development Architecture Template

A complete, production-tested template for building software with AI coding assistants.

**Extracted from**: Auto Job Recruiter (13 sprints, 80%+ completion rate, zero doc drift)

---

## What's Inside

**AI_ARCHITECTURE_COMPLETE_TEMPLATE.md** - Single file containing:
- ✅ Copy/paste ready CLAUDE.md template
- ✅ Sprint planning template
- ✅ Agent role definitions
- ✅ Architecture patterns reference
- ✅ Customizations for web apps, CLI tools, data pipelines, ML projects
- ✅ Real-world examples and workflows
- ✅ Troubleshooting guide

---

## Quick Start (5 Minutes)

### 1. Download Template

```bash
# Clone this repo
git clone https://github.com/grantpinks/JB_Automations.git
cd JB_Automations

# Or download just the file
curl -O https://raw.githubusercontent.com/grantpinks/JB_Automations/main/AI_ARCHITECTURE_COMPLETE_TEMPLATE.md
```

### 2. Create Your New Project

```bash
mkdir my-new-project && cd my-new-project
mkdir -p docs sprint_review tests src
```

### 3. Copy CLAUDE.md Section

1. Open `AI_ARCHITECTURE_COMPLETE_TEMPLATE.md`
2. Find the "CLAUDE.md Template" section
3. Copy everything from `# AGENT STRATEGIC DIRECTIVES` to the end of that section
4. Save as `CLAUDE.md` in your project root

### 4. Customize for Your Project

Replace all `[PLACEHOLDERS]`:
- `[PROJECT_NAME]` → Your project name
- `[MVP_FEATURES]` → Your 3-5 core features
- `[TECH_STACK]` → Your chosen technologies

### 5. Start Building

```
Prompt: "Use the architect agent to create Sprint 1 plan for [your project]"
```

---

## What Makes This Efficient

### ✅ Clear MVP Scope
- Prevents feature creep
- Agents know exactly what to build

### ✅ Documentation Mandate
- Docs stay in sync with code
- Every code change requires doc update

### ✅ Specialized Agents
- **Architect** → Planning, roadmaps
- **Codex** → Implementation
- **Gemini** → Documentation
- **Ruthless Reviewer** → Quality control

### ✅ Sprint Planning with Decision Gates
- 2-week sprints
- Realistic hour estimates (ranges)
- Validates assumptions before committing

### ✅ ADR Workflow
- All architectural decisions documented
- Prevents repeated debates

---

## Real Results

From Auto Job Recruiter project:
- **13 sprints** planned with detailed task breakdowns
- **80%+ sprint completion** rate (realistic estimates work!)
- **Zero documentation drift** (mandatory doc updates enforced)
- **MVP to production-ready** in 5 sprints

---

## Use Cases

### ✅ Web Applications
- React/Vue/Svelte frontends
- FastAPI/Express/Django backends
- Database + API + auth

### ✅ CLI Tools
- Python Click / Node Commander
- Rich output formatting
- Configuration management

### ✅ Data Pipelines
- ETL workflows
- Data validation
- Airflow/Dagster scheduling

### ✅ Machine Learning Projects
- PyTorch/TensorFlow
- Experiment tracking
- Model serving

---

## File Structure After Setup

```
your-project/
├── CLAUDE.md                       ← From template
├── ARCHITECT_ROADMAP_SPRINT1-5.md  ← Created by architect
├── CODEX_TASKS_SPRINT1.md          ← Implementation tasks
├── GEMINI_TASKS_SPRINT1.md         ← Documentation tasks
├── ARCHITECTURE_DECISIONS.md       ← ADR log
├── README.md
├── PLAN.md
├── docs/
├── sprint_review/
├── src/
└── tests/
```

---

## Examples

### Building a New Feature

```
1. User: "Add user authentication"
2. Architect: Creates Sprint N plan
3. Codex: Implements backend (src/auth/)
4. Gemini: Documents (README + docs/AUTHENTICATION.md)
5. Ruthless Reviewer: Reviews for security issues
6. Codex: Applies fixes
7. Session Closer: Commits and documents next steps
```

### Starting a New Project

```
1. Copy CLAUDE.md from template
2. Define MVP (3-5 core features)
3. Architect creates Sprint 1 plan
4. Codex implements features
5. Gemini documents
6. Iterate!
```

---

## Best Practices

### ✅ Start with MVP
Define 3-5 core features. Ship fast, iterate.

### ✅ Use Decision Gates
Validate assumptions before committing to next sprint.

### ✅ Enforce Documentation
Task not complete until docs updated.

### ✅ Use Hour Ranges
"8-12 hours" not "8 hours" (accounts for unknowns)

### ✅ Review Critical Features
Use ruthless-reviewer before shipping.

---

## Support

- **Issues**: [Create GitHub issue](https://github.com/grantpinks/JB_Automations/issues)
- **Source Project**: Auto Job Recruiter
- **Author**: Grant Pinkerton + Claude Code

---

## License

MIT License - Free to use for any project

---

## Next Steps

1. ✅ Download template
2. ✅ Create new project
3. ✅ Copy CLAUDE.md section
4. ✅ Customize for your domain
5. ✅ Start building!

**Happy Building! 🚀**
