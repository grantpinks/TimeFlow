# AGENTS.md instructions for C:\Users\theth\Desktop\Productivity Pro

<INSTRUCTIONS>
## Skills
These skills are discovered at startup from multiple local sources. Each entry includes a name, description, and file path so you can open the source for full instructions.
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: C:/Users/theth/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: C:/Users/theth/.codex/skills/.system/skill-installer/SKILL.md)
- brainstorming: You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation. (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\brainstorming\SKILL.md)
- dispatching-parallel-agents: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\dispatching-parallel-agents\SKILL.md)
- executing-plans: Use when you have a written implementation plan to execute in a separate session with review checkpoints (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\executing-plans\SKILL.md)
- finishing-a-development-branch: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\finishing-a-development-branch\SKILL.md)
- frontend-design: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics. (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\frontend-design\SKILL.md)
- receiving-code-review: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\receiving-code-review\SKILL.md)
- requesting-code-review: Use when completing tasks, implementing major features, or before merging to verify work meets requirements (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\requesting-code-review\SKILL.md)
- subagent-driven-development: Use when executing implementation plans with independent tasks in the current session (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\subagent-driven-development\SKILL.md)
- systematic-debugging: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\systematic-debugging\SKILL.md)
- test-driven-development: Use when implementing any feature or bugfix, before writing implementation code (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\test-driven-development\SKILL.md)
- using-git-worktrees: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\using-git-worktrees\SKILL.md)
- using-superpowers: Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\using-superpowers\SKILL.md)
- verification-before-completion: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\verification-before-completion\SKILL.md)
- writing-plans: Use when you have a spec or requirements for a multi-step task, before touching code (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\writing-plans\SKILL.md)
- writing-skills: Use when creating new skills, editing existing skills, or verifying skills work before deployment (file: C:\Users\theth\Desktop\Productivity Pro\.claude\skills\writing-skills\SKILL.md)
## Commands
These commands are available locally. Each entry includes a name, description, and file path so you can open the source for full instructions.
- code-review: Code review a pull request (file: C:\Users\theth\Desktop\Productivity Pro\.claude\commands\code-review.md)
- Discovery: Available skills are listed in project docs and may also appear in a runtime "## Skills" section (name + description + file path). These are the sources of truth; skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  3) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  4) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Description as trigger: The YAML `description` in `SKILL.md` is the primary trigger signal; rely on it to decide applicability. If unsure, ask a brief clarification before proceeding.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deeply nested references; prefer one-hop files explicitly linked from `SKILL.md`.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
</INSTRUCTIONS>
