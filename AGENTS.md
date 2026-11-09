# Muha Casino agent instructions

## Build workflow

These project-specific rules take precedence over conflicting inherited build and push rules. Other workspace policies still apply.

- When the user requests a Muha Casino build, check whether this project already has an Electron app and configured Electron packaging. Build desktop apps/installers only when both exist; follow the applicable installer delivery rules. Do not add Electron just to fulfill a build request.
- Without Electron app packaging, skip all builds, including web-asset builds, and skip installer destination searches and delivery. Local browser development uses the existing dev command and does not require a production build. Run a web build only if the user explicitly requests web build output for the current task.
- A user-requested Muha Casino build/workflow still includes updating the current version’s release notes with completed changes, updating an existing matching GitHub draft prerelease when present, running appropriate non-build checks, and committing and pushing the relevant completed work to `main`. With Electron packaging, also complete the requested app build before pushing. This is the user’s explicit standing authorization for that workflow and overrides the generic requirement for a separate push request for Muha Casino build requests only. Do not force-push or include unrelated work.
- Do not change versions, publish GitHub releases, deploy, or run Capacitor sync/mobile packaging unless explicitly requested. Merely editing code or instructions does not trigger the build/workflow or authorize a push.
- Do not run routine test or verification builds. Prefer focused non-build checks. Diagnostic work alone does not authorize a push.
