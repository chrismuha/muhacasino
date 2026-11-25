# Muha Casino agent instructions

## Build workflow

These project-specific rules take precedence over conflicting inherited build and push rules. Other workspace policies still apply.

- When the user says `build` for Muha Casino, that request explicitly authorizes committing and pushing the completed, relevant work to `main` after the required documentation audit and applicable checks/builds succeed. Do not ask for a separate push instruction. This still applies when Electron packaging is absent and production builds are skipped. Do not force-push, publish a release, change versions, or include unrelated work.
- When the user requests a Muha Casino build, check whether this project already has an Electron app and configured Electron packaging. Build desktop apps/installers only when both exist; follow the applicable installer delivery rules. Do not add Electron just to fulfill a build request.
- Without Electron app packaging, skip all builds, including web-asset builds, and skip installer destination searches and delivery. Local browser development uses the existing dev command and does not require a production build. Run a web build only if the user explicitly requests web build output for the current task.
- A user-requested Muha Casino build/workflow still includes updating the current version’s release notes with completed changes, updating an existing matching GitHub draft prerelease when present, running appropriate non-build checks, and committing and pushing the relevant completed work to `main`. With Electron packaging, also complete the requested app build before pushing. This is the user’s explicit standing authorization for that workflow and overrides the generic requirement for a separate push request for Muha Casino build requests only. Do not force-push or include unrelated work.
- Do not change versions, publish GitHub releases, deploy, or run Capacitor sync/mobile packaging unless explicitly requested. Merely editing code or instructions does not trigger the build/workflow or authorize a push.
- Do not run routine test or verification builds. Prefer focused non-build checks. Diagnostic work alone does not authorize a push.

## Slot feature comparison before pushing

- Before pushing Muha Casino changes to `main`, check whether any slot feature was added, removed, or changed. Update `slots-guide.html` and related in-game guide/Help descriptions whenever shared or exclusive feature differences change. Verify the comparison against the actual implementations before pushing; keep release notes consistent.

## Documentation required for every build request

- When the user says `build`, audit every launcher game, not only the most recently edited game. Check each game's user guide, in-game rules, Help content, current-version release notes, release-note source data, shared changelog, and current labels against the actual implementation.
- Ensure every game has accessible user-guide and release-history links. Use `game-guides.html` as the suite guide index and preserve each game's more detailed existing rules and guide.
- Synchronize shared and exclusive slot descriptions in `slots-guide.html`, in-game Payouts & rules, Help, and release notes. Include completed changes only; preserve historical notes and do not change versions merely to document or build.
- Check for an existing matching GitHub draft prerelease when notes change, update it when present, and verify its alphabetical bullet-only body, title, tag, and draft/prerelease status. Do not create or publish a release without authorization.
- Verify guide links, version labels, note ordering, and documented behavior with focused non-build checks. Keep unresolved issues listed until the required user verification is received, even when automated checks pass.
- Perform this audit even when Electron packaging is absent and production builds are skipped. The existing build-scope and push rules still apply. Asking about build instructions does not itself request a build or authorize a push.

## Release version numbering

- Use a separate release sequence for each versioned project. A new sequence starts at `1.0.0`. Show zero-patch versions as `v1.0`, `v1.1`, and so on in public app and documentation labels. Show all three parts for maintenance patches, such as `v1.0.4`. Keep all three parts in machine-readable metadata and GitHub release titles and tags.
- Use patch increments `.1` through `.4` within a minor series for small user-facing fixes and refinements. Advance the minor number and reset the patch for a substantial feature or coherent set of larger user-facing improvements. Continue the same pattern through `v1.4`. An explicitly authorized major-series rollover starts at `v2.0`. At patch `.4`, use the next planned release or follow an explicitly requested maintenance version.
- Choose the increment from the completed user-facing changes going into the release, including work in the commits being prepared. Treat related commits as one release. Keep routine internal changes, documentation, tests, dependency maintenance, and packaging in the current or pending version. Review existing drafts and reuse a matching pending version when appropriate. Bump the version only when the user explicitly requests it for the current work.
- Keep public labels consistent across the app, guides, and release notes. Preserve historical version identifiers and dates. Apply project-specific version exceptions where they are explicitly documented.
- Monopoly Deal follows its own version and label policy in `games/monopoly-deal/AGENTS.md`.

## Git commit messages

- Use this format for every Git commit you create in this workspace and its repositories. Write a short, specific subject in the imperative mood, followed by a blank line and a bulleted body. Keep any repository-required prefix or ticket ID in the subject.
- Start each body line with `- ` and describe one concrete change or outcome. Include enough detail to understand what changed and add relevant verification when it helps. Keep the bullets short enough to scan quickly.
- Follow the existing authorization rules for commits, pushes, history rewrites, and releases.
