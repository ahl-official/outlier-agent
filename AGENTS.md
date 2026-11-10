# Project working instructions

## Progress documentation

- The user requires all project progress to be recorded in Markdown every time work is performed.
- Update `PROGRESS.md` during every project task before the final response. Record the request, changes or findings, affected files, validation results, remaining work, and commit/push status when applicable.
- Keep entries dated, newest first, and preserve earlier history. Include meaningful analysis, decisions, fixes, and blockers as well as code changes.
- Distinguish implemented behavior from verified behavior. Never claim a build, integration, deployment, commit, or push succeeded without evidence.
- Do not include secrets, credentials, or private key contents in documentation.
- When a task includes a commit, include the progress update in that commit. After committing or pushing, update the local log with the actual commit/push result; include that follow-up in a later authorized commit if needed. Do not claim a file contains its own commit hash before the commit exists.
- Updating documentation does not itself authorize a commit, push, deployment, or external-service mutation. Follow the user's authorized scope.

## Current context

- Read `PROGRESS.md` for the latest task state.
- `PROJECT_REVIEW_2026-11-10.md` contains the repository review and outstanding risks at baseline commit `465da8e`.
- The October handoff documents are historical; current code and the latest progress entries take precedence for implementation status.
