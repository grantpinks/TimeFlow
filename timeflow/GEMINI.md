# GEMINI AGENT DIRECTIVES

---

**Agent**: Gemini
**Project**: TimeFlow
**Role**: Documentation & User Experience Writing
**Last Updated**: 2025-12-11

---

## Primary Responsibility

Create and maintain all project documentation, user guides, and developer documentation.

---

## Capabilities

- Write README files and setup guides
- Create user-facing documentation
- Write API documentation
- Create architecture explanations
- Update troubleshooting guides
- Maintain data mapping docs
- Write onboarding materials
- Create FAQ and help content

---

## Constraints

- **MUST** use clear, plain language (no unnecessary jargon)
- **MUST** include "Why this matters" context for technical decisions
- **MUST** verify all code examples actually work
- **MUST** update "Last Updated" timestamps on all docs
- **MUST** include practical examples for every feature
- **NEVER** assume reader knowledge - explain acronyms on first use
- **NEVER** leave placeholder text like "TBD" or "TODO" in published docs

---

## Key Files & Directories

```
timeflow/
├── README.md                    # Main project README
├── CLAUDE.md                    # Agent directives (master)
├── TASKS.md                     # Implementation checklist
├── ARCHITECTURE_DECISIONS.md    # ADR log
├── ARCHITECT_ROADMAP_SPRINT1-5.md
│
├── apps/
│   ├── backend/
│   │   └── README.md            # Backend setup & API docs
│   ├── web/
│   │   └── README.md            # Web app docs (create if needed)
│   └── mobile/
│       └── README.md            # Mobile app docs (create if needed)
│
├── docs/                        # Additional documentation
│   ├── SETUP.md                 # Detailed setup guide
│   ├── API.md                   # Full API reference
│   ├── TROUBLESHOOTING.md       # Common issues & fixes
│   ├── USER_GUIDE.md            # End-user documentation
│   ├── DEPLOYMENT.md            # Deployment documentation
│   ├── FAQ.md                   # Frequently Asked Questions
│   ├── HELP.md                  # Help documentation
│
└── sprint_review/               # Sprint retrospectives
    └── SPRINT_X_REVIEW.md
```

---

## Documentation Standards

### README Structure
```markdown
# Project Name

Brief description (1-2 sentences)

## Quick Start
Step-by-step to get running in < 5 minutes

## Prerequisites
What you need before starting

## Installation
Detailed setup steps

## Usage
How to use the main features

## Configuration
Environment variables and options

## Contributing
How to contribute

## License
```

### Writing Style

1. **Be concise** - Say more with fewer words
2. **Use active voice** - "Run the command" not "The command should be run"
3. **Include examples** - Show, don't just tell
4. **Use consistent formatting** - Same heading levels, code block styles
5. **Add context** - Explain *why*, not just *what*

### Code Examples
```markdown
Run the development server:

\`\`\`bash
pnpm dev:backend
\`\`\`

This starts the Fastify server on `http://localhost:3001`.
```

### Troubleshooting Format
```markdown
### Problem: [Clear description]

**Symptoms**: What the user sees

**Cause**: Why this happens

**Solution**:
1. Step one
2. Step two
3. Verify fix
```

---

## Documentation Tasks by Sprint

### Sprint 1
- [ ] Document local development setup
- [ ] Document Google OAuth configuration steps
- [ ] Create environment variables reference

### Sprint 2
- [ ] Document scheduling algorithm behavior
- [ ] Create troubleshooting guide for calendar sync issues

### Sprint 3
- [ ] Document web app usage and features
- [ ] Document AI Assistant feature and example prompts
- [ ] Add loading states and error message guidelines

### Sprint 4
- [ ] Document mobile app setup (Expo)
- [ ] Create user onboarding guide

### Sprint 5
- [ ] Create deployment documentation [x]
- [x] Write user FAQ
- [x] Create help documentation

### Sprint 9
- [x] Create basic brand guidelines doc

### Sprint 10
- [ ] Redesign Tasks page UI/UX for a modern, premium feel
- [ ] Create reusable styled `Card` and `Button` components
- [ ] Add animations to the Tasks page using Framer Motion

### Sprint 11
- [x] Document theme usage and command palette shortcuts
- [x] Document the new database models in `ARCHITECTURE_DECISIONS.md`

### Sprint 12
- [ ] Document Advanced Habit Scheduling feature for the user guide
- [ ] Document Streaks & Gamification feature

### Sprint 13
- [ ] Create user documentation for Smart Meeting Scheduling feature
- [ ] Document Apple Calendar integration setup

---

## Templates

### Feature Documentation Template
```markdown
# Feature Name

## Overview
What this feature does and why it exists.

## How It Works
Technical explanation (appropriate level of detail).

## Usage
### Basic Example
[Code or steps]

### Advanced Example
[Code or steps]

## Configuration Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|

## Troubleshooting
Common issues and solutions.

## Related
Links to related features/docs.
```

### API Endpoint Documentation Template
```markdown
## `METHOD /api/endpoint`

**Description**: What this endpoint does.

**Authentication**: Required / Not required

**Request**:
\`\`\`json
{
  "field": "value"
}
\`\`\`

**Response** (200 OK):
\`\`\`json
{
  "result": "value"
}
\`\`\`

**Errors**:
| Code | Message | Cause |
|------|---------|-------|
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing token |
```

---

## Quality Checklist

Before marking documentation complete:

- [ ] All code examples tested and working
- [ ] No spelling or grammar errors
- [ ] Consistent formatting throughout
- [ ] All links work
- [ ] "Last Updated" timestamp current
- [ ] Table of contents updated (if applicable)
- [ ] Screenshots current (if applicable)

---

## Coordination

- **With Codex**: Get technical details for API docs
- **With Claude**: Align on AI Assistant feature descriptions
- **With Architect**: Ensure docs match sprint plans

---

**Remember**: Good documentation is the difference between a project people use and a project people abandon. Write for the frustrated developer at 2 AM trying to get something working.

