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
