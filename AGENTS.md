# AGENTS.md

Instructions for Codex and other coding agents working in this repository.

## Critical Rules

- Never commit, stage, or otherwise modify git history unless the user explicitly asks for it.
- Do not run `git add`, `git commit`, `git reset`, `git checkout --`, or other repository-modifying git commands without explicit permission.
- Never create mock data, simplified substitute components, or parallel replacement implementations unless the user explicitly requests them.
- Fix the existing implementation and root cause. Do not replace complex working code with a simplified version to avoid debugging.
- Work with the current codebase patterns and user changes. Do not revert unrelated changes.
- Do not run `npm run build` after every small change. For small CSS or copy-only edits, skip builds unless the user asks. Use builds/tests for substantial, risky, or behavior-changing edits.
- For UI work, do not run `npm run build` every time. It is too slow for normal visual iteration; inspect the code or use narrower checks unless the user asks for a build or the change is high risk.

## Project Context

- This is the AGR literature UI, a React application for Alliance of Genome Resources literature and bibliography workflows.
- The app uses React 18, React Bootstrap, Redux, AgGrid, Axios, FontAwesome, MUI, and react-select.
- Common AGR/MOD abbreviations include WB, MGI, SGD, RGD, ZFIN, and FB.
- Domain concepts include bibliography records, references, topic entity tags, ontology/topic terms, confidence scores/levels, and professional biocurator validation.

## Common Commands

- `npm run start`: starts the local React dev server on port 3001 with `BROWSER=none`.
- `npm run build`: creates a production build and runs `scripts/generate-version.js` first.
- `npm run test`: runs the React test suite.
- `make restart-ui`: rebuilds and restarts the UI container using Docker Compose and the selected `.env` file.

Run commands only when they materially help the current task. If a command needs elevated permissions, ask for approval through the normal tool flow.

## Code Style

- Follow existing file style and component patterns before introducing new abstractions.
- Prefer localized, low-blast-radius edits.
- Avoid unused imports, trailing whitespace, and unrelated formatting churn.
- Keep line length reasonable, generally under 120 characters where practical.
- For Python, follow PEP8, 4-space indentation, clean imports, and descriptive names.
- For JavaScript/React, preserve the repo's current conventions, including functional components and existing Redux/API patterns.
- Use structured parsers or existing helpers for structured data instead of ad hoc string manipulation when practical.

## Frontend Guidance

- Build the actual usable experience, not landing-page or marketing-style scaffolding.
- Match the existing Bootstrap/AgGrid application style unless the user asks for a broader redesign.
- Keep operational screens dense, readable, and practical for repeated curation workflows.
- Use icons in buttons where the app already uses FontAwesome or an existing icon library.
- Avoid nested cards and decorative-only visuals in tool/dashboard surfaces.
- Ensure text and controls fit on both desktop and mobile.
- For AgGrid work, preserve existing scrolling, pinned columns, filters, and copy behavior.

## Testing And Verification

- Choose verification proportional to risk.
- For small CSS-only changes, a code inspection may be enough unless the user asks for a build or screenshot.
- For behavior changes, run the narrowest useful test or check first.
- For broad React changes, `npm run build` is acceptable, but do not use it reflexively for every edit.
- Report existing warnings separately from warnings introduced by the current change.

## Git Hygiene

- Always inspect `git status --short` before discussing or preparing commits.
- If the user asks for a commit, use Conventional Commits: `<type>[optional scope]: <description>`.
- Only stage files you modified or generated for the current task.
- Never use `git add -A` or `git add .` without careful review.
- Do not accidentally include `.env*`, token files, IDE config, generated temp files, or unrelated user edits.

## Research And Tools

- Use `rg` and `rg --files` first for code searches.
- Prefer official documentation and primary sources for library/API questions.
- If a tool or package behavior is unclear, inspect local package docs/types first, then ask before using external/network-dependent approaches.
- Use subagents only when the user explicitly asks for parallel agent work or delegation.
