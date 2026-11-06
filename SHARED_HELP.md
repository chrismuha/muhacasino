# Shared Help

This app uses the suite Help standard: Contact us, Report an issue, Known issues, Coming soon, and Tips & troubleshooting. Open Help to browse these sections. Close or Escape returns to the app. Existing user guides and release notes remain available.

Coming soon contains planned features that are not available yet. Empty Known issues and Coming soon lists mean no entries are currently listed; they do not promise that the app has no bugs or that no further features will be added. Issue reporting opens an email draft for the user to review and send; it does not send a report automatically.

Vue apps use the identical portable `SuiteHelp.vue` owned by `MCR SOFTWARE SUITE/ProfitPulse/src/components/SuiteHelp.vue`. Supply project content through the existing adapter/content file; do not edit the shared layout for one app. New standalone integrations store app content under `shared-help/content.json`; version labels come from package.json. Native apps use the equivalent `suite-help.js` interface, with app content in their existing Help details file or native adapter.

Keep documented issues, planned features, user guides, and release notes in sync. Preserve the app’s support contact overrides. No app version or installer release is changed by adopting this Help interface.

## Help access update · November 5, 2026

Help uses the inline navigation button to open the same five Help sections. The floating tab and its setting have been removed. Close or Escape returns focus to Help. This access change does not change the app version.

## Monopoly Deal current guide and release notes

Monopoly Deal remains v1.6.0. The in-game guide, Release Notes page, and About version history describe Hard property banking, the seven-card Pass Go restriction and its default-off override, the elapsed timer, and the updated mobile controls. No Mercy combined with Hard rules is Coming soon and is not playable yet. Unwanted mobile page scrolling remains unresolved and is listed under Known issues in the game guide and shared Help, without claims of a scrolling fix in the release history.

November 5 follow-up: turn and complete-set labels align left above Properties without colliding with Help. Help is available only in the navigation bar, including Monopoly Deal. Game settings saves Show elapsed game time. Rent can offer to move a played wild to a matching color for one play when a second play remains for rent; cancellation restores the move and plays.

The v1.6.0 release date is TBD. Toast notifications are off by default, with explicit saved choices preserved. Both Discard buttons share confirmation and play costs. Blocked card-play and banking attempts always open a readable popup, even when toast notifications are off. The popup explains the rule and stays until dismissed without spending cards or plays. Other-player panels now separate the player name, hand and complete-set counts, a compact Bank summary, and a full-width Properties strip. Bank details remain available by tapping the summary. The Chrome mobile scrolling issue remains listed until the user verifies it is fixed.
