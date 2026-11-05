# Shared Help

This app uses the suite Help standard: Contact us, Report an issue, Known issues, Coming soon, and Tips & troubleshooting. Open Help to browse these sections. Close or Escape returns to the app. Existing user guides and release notes remain available.

Coming soon contains planned features that are not available yet. Empty Known issues and Coming soon lists mean no entries are currently listed; they do not promise that the app has no bugs or that no further features will be added. Issue reporting opens an email draft for the user to review and send; it does not send a report automatically.

Vue apps use the identical portable `SuiteHelp.vue` owned by `MCR SOFTWARE SUITE/ProfitPulse/src/components/SuiteHelp.vue`. Supply project content through the existing adapter/content file; do not edit the shared layout for one app. New standalone integrations store app content under `shared-help/content.json`; version labels come from package.json. Native apps use the equivalent `suite-help.js` interface, with app content in their existing Help details file or native adapter.

Keep documented issues, planned features, user guides, and release notes in sync. Preserve the app’s support contact overrides. No app version or installer release is changed by adopting this Help interface.

## Help access update · November 4, 2026

Standalone floating Help launchers now use a compact 44px-wide tab on the right edge above the bottom controls. Tap it or focus it with the keyboard to open the same five Help sections. Existing inline Help buttons keep their location. Close or Escape returns focus to Help. This access change does not change the app version.

## Monopoly Deal current guide and release notes

Monopoly Deal remains v1.5.0. The in-game guide, Release Notes page, and About version history describe Hard property banking, the seven-card Pass Go restriction and its default-off override, the elapsed timer, and the updated mobile controls. No Mercy combined with Hard rules is Coming soon and is not playable yet. Unwanted mobile page scrolling remains unresolved and is listed under Known issues in the game guide and shared Help, without claims of a scrolling fix in the release history.

November 5 follow-up: turn and complete-set labels align left above Properties without colliding with Help. Only Monopoly Deal uses the readable edge Help tab; other apps keep standard inline Help. Game settings saves independent Show Help button and Show elapsed game time switches. Rent can offer to move a played wild to a matching color for one play when a second play remains for rent; cancellation restores the move and plays.
