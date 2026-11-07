## Build requests and installer delivery

- Established destination search roots, relative to the user’s Dropbox folder, include `MCR Development/main-primary development/program development/PROGRAMS DEVELOPED/<suite>/<program>/`, `Chris Muha/MCR UTILITIES/<suite>/<program>/`, and `Chris Muha/2. DELETE WHEN DONE/flash drive updates/app updates/<suite>/<program>/`. Discover and verify actual suite/program folder names and any additional existing destinations instead of assuming capitalization or creating a new structure. Apply the flash-drive opt-in rule before delivery there.
- Flash-drive updates are opt-in per project: update that location only when the project already has installers there. If no installers for that project are present, do not create its flash-drive folder or add installers unless the user explicitly asks. An empty project folder does not authorize adding installers. Existing projects follow the direct-in-folder latest-DMG-and-EXE standard; preserve the explicit-authorization requirement for removing older files.
- Do not run test, trial, or verification builds routinely. Build only when the user requests a build or when a build is genuinely necessary to implement or diagnose the requested work. Prefer focused non-build checks when they are sufficient; do not run extra builds after a valid requested build succeeds.
- A requested installer build includes delivery to the user's existing distribution locations. Before building, search the user's established Dropbox project archives, utilities folders, flash-drive updates folders, and any other previously used destinations for that program. Verify unexpected empty searches with a second search; do not invent replacement locations or leave the only deliverable in the repository build folder.
- Record the discovered destinations for the current task and copy the completed installers to every applicable existing location after a successful build. Use the latest explicitly authorized version; never increment the version merely to build it. If a fresh matching build already exists, verify and reuse it rather than rebuilding unnecessarily.
- Desktop delivery requires one universal macOS DMG for Intel and Apple silicon and one Windows EXE installer containing both x64 and ARM64 builds. Distribute only the finished installers, and verify version, architecture coverage, and matching source/destination hashes.
- In project archives and utilities folders, place installers directly under `versions/pre-releases/v<version>/` for prereleases or `versions/releases/v<version>/` for stable releases, following existing version folder names. Do not add dated build subfolders.
- In flash-drive updates, place the latest DMG and EXE directly in the existing program folder without version subfolders. Replacing an older version or removing installers still requires explicit user authorization; when authorized, verify both new installers before removing only the specifically superseded files. Preserve historical builds in other locations.
- Building or distributing installers does not authorize a Git push, GitHub release publication, or a version change. Keep a prepared GitHub release unpublished unless publication is explicitly requested.

## Current version and release-note policy

This policy applies throughout this workspace and its child repositories. It supersedes conflicting older instructions below, including automatic version increments and historical instructions claiming precedence.

- Never change a program, package, release, or build version unless the user explicitly requests that version change for the current work. Fixes, features, packaging, release-note updates, and draft creation do not authorize a version bump. Keep working in the current version or existing draft; checking for a draft is not permission to increment a version. Do not run tools that automatically advance versions without that explicit request.
- Always update the current version's release notes when making user-facing changes. Record the actual completed behavior, preserve existing entries, and keep in-program notes, their source data, changelogs, and any authorized GitHub draft updates consistent. Do not invent changes or push, publish, or change a version merely to update notes.
- Inside programs, organize each version's release notes into meaningful feature or change categories. Alphabetize category headings and alphabetize the change bullets by their text within each category. Use real bulleted lists rather than paragraphs or numbered changes. Keep version history newest first; do not alphabetize version numbers.
- Give in-program release notes a polished, theme-aware design: a clear What’s New header with the current version and a concise summary, a prominent Latest Version section, category icons with readable headings, well-spaced bullet lists, and expandable older versions under Version History. Preserve all historical content. Use the program's existing design tokens, strong contrast in light and dark themes, responsive spacing, a comfortably sized scrolling content area, and clear Close or Done controls with keyboard access. Avoid clipped text and tiny nested scrolling boxes.
- Keep GitHub release bodies as a single alphabetical bulleted list without categories, summaries, dates, or extra headings. Use title `version <version>` and tag `v<version>`. Keep releases unpublished as draft prereleases unless the user explicitly requests publication; push only when explicitly requested for the current work.
- Use `TBD` for an unpublished version's in-program release-note and changelog date. Preserve historical in-program dates. Do not put dates in GitHub release titles or bodies.
- Before completing release-note changes, verify category and bullet ordering in the source and in-program display. For an authorized GitHub draft update, also verify the remote bullets and confirm draft/prerelease status remains enabled.
- Write reusable suite guidance in generic terms. Describe the desired behavior and design directly; do not name another repository or program as the standard or reference to imitate.

## Current cross-suite Git and GitHub release rules

These rules apply to this workspace and all child repositories. They supersede conflicting older instructions below about Git pushes or GitHub release creation, naming, formatting, and publication.

- Push commits only when the user explicitly asks to push the current work. Editing files, bumping versions, updating notes, or preparing a release does not authorize a push. Earlier push authorization does not extend indefinitely to future work.
- When asked to create or prepare a GitHub release, leave it unpublished as a draft prerelease (`--draft --prerelease`). Do not publish it, remove draft status, or make it stable unless the user explicitly requests that action. Permission to push is not permission to publish a release.
- Use this release naming standard: release title `version <version>` and tag `v<version>` (for example, `version 1.3.3` and `v1.3.3`).
- Do not include dates in GitHub release titles or bodies: no date headings, dated summaries, or build-date footers. GitHub's automatic timestamps are outside this rule.
- GitHub release bodies contain only change bullets alphabetized by their text, with no extra headings, summaries, or build metadata. Preserve the content of each entry. Use the same format across all projects; only the version and change bullets vary.
- Use `TBD` for the app release-note and changelog date of an unpublished version. Preserve existing historical app/changelog dates; GitHub release titles and bodies remain date-free.
- Before bumping a version or creating a release, check GitHub for an existing project draft. Reuse the pending draft version when appropriate rather than creating duplicate releases or unnecessarily incrementing the version.
- After creating or editing a GitHub release, verify its title, body, alphabetized bullets, draft/prerelease flags, and uploaded assets. Drafts may remain without installers while being prepared; preserve existing installer asset rules.

# Monopoly Deal release version

The user explicitly requires Monopoly Deal to remain at **v1.6.0**.
This game-specific instruction overrides the suite rule limiting the middle version number to 0–4.
Do not advance the version unless the user explicitly requests a new version.
Merge subsequent fixes into the existing v1.6.0 release entry, preserve distinct notes, and consolidate duplicate listings.
Keep the launcher, game UI, guide, About history, release-notes page, and version tests consistent.

## Content punctuation

Do not use em dashes or long runs of hyphens in Coming soon content or release notes. Use short sentences, commas, or colons.

## Mobile scrolling issue

Keep the Chrome mobile page-scrolling issue listed in Known issues until the user explicitly verifies that it is fixed. Automated checks alone do not authorize removing it.

## Release date

The v1.6.0 release date is **TBD** until the user provides a date. Preserve the dated v1.5.0 history and add new changes to v1.6.0.
