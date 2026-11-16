# Shared Help

This app uses the suite Help standard: Contact us, Report an issue, Known issues, Coming soon, and Tips & troubleshooting. Open Help to browse these sections. Close or Escape returns to the app. Existing user guides and release notes remain available.

Coming soon contains planned features that are not available yet. Empty Known issues and Coming soon lists mean no entries are currently listed; they do not promise that the app has no bugs or that no further features will be added. Issue reporting opens an email draft for the user to review and send; it does not send a report automatically.

Vue apps use the identical portable `SuiteHelp.vue` owned by `MCR SOFTWARE SUITE/ProfitPulse/src/components/SuiteHelp.vue`. Supply project content through the existing adapter/content file; do not edit the shared layout for one app. New standalone integrations store app content under `shared-help/content.json`; version labels come from package.json. Native apps use the equivalent `suite-help.js` interface, with app content in their existing Help details file or native adapter.

Keep documented issues, planned features, user guides, and release notes in sync. Preserve the app’s support contact overrides. No app version or installer release is changed by adopting this Help interface.

## Help access update · November 5, 2026

Help uses the inline navigation button to open the same five Help sections. The floating tab and its setting have been removed. Close or Escape returns focus to Help. This access change does not change the app version.

## Monopoly Deal current guide and release notes

Monopoly Deal is v1.6.0, the next release after v1.5.0. Completed banking, layout, interaction, browsing, setup, Tools, larger phone control, and 15M Multicolor Wild changes belong to this single unpublished release with a TBD date. The in-game guide, Release Notes page, and About version history describe valued property banking in every difficulty, the seven-card Pass Go restriction and its default-off override, the elapsed timer, and the updated mobile controls. No Mercy combined with Hard rules is Coming soon and is not playable yet. The user confirmed that unwanted mobile page scrolling is fixed. The game guide, release history, and Help retain the Fixed status and completed layout explanation.

November 5 follow-up: turn and complete-set labels align left above Properties without colliding with Help. Help is available only in the navigation bar, including Monopoly Deal. Game settings saves Show elapsed game time. Rent can offer to move a played wild to a matching color for one play when a second play remains for rent; cancellation restores the move and plays.

The v1.6.0 release date is TBD. Toast notifications are off by default, with explicit saved choices preserved. Use the circular Discard action beside the preview to confirm selected discards with the existing play costs. Blocked card-play and banking attempts always open a readable popup, even when toast notifications are off. The popup explains the rule and stays until dismissed without spending cards or plays. Other-player panels now separate the player name, hand and complete-set counts, a compact Bank summary, and a full-width Properties strip. Bank details remain available by tapping the summary. The Chrome mobile scrolling issue is confirmed fixed by the user.


v1.6.0 (TBD): action cards can be banked for cash in all difficulties, with one play per banked card. They remain cash-only when paying debts and cannot be used for actions or returned to hand through normal play. Every difficulty also permits valued property banking. The release covers the other-player redesign, the narrower equal-height Bank panel, Hard difficulty rules, and mandatory blocked-play popups.


Chrome mobile scrolling: confirmed fixed by the user. A refresh is no longer required after a fresh deal or selecting a card. Keep the completed explanation in the Fixed section.


Verified fresh-deal layout correction: empty collection summaries compact on short phones, keeping the full hand visible without body overflow in tested Chromium/WebKit layouts before and after refresh. The user confirmed the Chrome iPhone scrolling issue is fixed.


Preview and notch update (v1.6.0, TBD): Device previews fit both the available width and height while preserving their exact CSS viewport dimensions. Monopoly Deal uses one table color across its game canvas. Every hosted game extends its existing navigation background around the notch, preserving the navigation color. The collapsed header places its menu beside the notch, with game content below the cutout. Hand sizing ignores body scroll offsets, and short phone layouts reserve space below cards for the horizontal scrollbar. The user confirmed the Chrome mobile scrolling issue is fixed.

Current device follows the available browser area at full scale, including when the window is narrowed or maximized. Tablet and desktop hand cards grow into spare viewport space. Short phone views keep readable card sizes, place the timer beside selected-card actions, and keep utilities in a separate Tools dialog. The current v1.6.0 controls use 48-pixel action circles and 16-pixel labels. Unavailable actions stay dimmed in fixed slots while browsing. The clock uses deck-side space on short phones.


## Automatic affordable slot bets · November 6, 2026

Automatically lower bet is on by default and saved separately for each slot. When the current wager is unaffordable, manual and auto spins use the highest affordable lower bet step without a confirmation. Denomination and paylines stay unchanged. Free spins retain their awarded wager. Turn this setting off to keep the existing low-credit flow. If no lower bet step is affordable, the optional Lucky Credit Wheel remains available under its existing rules, followed by the add-credit prompt when applicable.

Big Money Deluxe v4.0.0, Neon Slots v4.2.0, Pretty Penny v4.0.0, and Treasurepots v3.3.0 include this setting.

Monopoly Deal v1.6.0 (TBD) library artwork: Monopoly Deal uses a red title accent in the game library. Its smaller library card shows the full cover illustration without cropping.

Monopoly Deal v1.6.0 (TBD) short phone controls: Phone table controls stay visible in two rows, including short iPhone screens. The larger center card preview is restored. Game settings follows the selected table color, including live color changes. In v1.6.0 the utilities move to a separate Tools dialog, replacing these earlier inline rows.


Game library Help sits below the brand inside the padded library footer, with room for its keyboard focus outline and the device’s bottom safe area. While a game is open, Help remains beside Game Library in the game toolbar.


Sly Deal and Forced Deal results always use an acknowledged overlay, independent of global and property-transfer toast settings. It identifies both players and every moved property, including both sides of a swap. Blocked or cancelled actions do not show transfer results. Open Tools for Manage, Wilds, Settings, Undo, Clear, and History on every screen. The separate dialog keeps utility rows out of the game layout.


Every played Just Say No, including computer responses and counter-No cards, has a mandatory overlay showing who played it, the defended action, and its current blocked or active state. This pauses the response chain until Continue or Escape. Property action prompts use will take; completed-transfer results still report only cards that actually moved.

## Fixed issues and bug reports

Open Help → Known issues to see documented problems and the Fixed section. Each completed fix can show its version, what happened, a **How we fixed it** explanation, and **What this means for you** notes. Only verified fixes belong here; an empty section means none are currently listed. Existing unresolved issues remain under Known issues.

Use the small **🐛 Bug Report** button at the bottom of the Help window from any section. It opens Report an issue inside the same window, where you can prepare an email draft, review it, and send it from your email app. It never sends a report automatically. Close or Escape returns to the program.

New-game setup: Players, Names, and Review use aligned headers, consistent 48-pixel fields, a visible step indicator, and fixed bottom navigation. Only step content scrolls above the keyboard. Keyboard resizing keeps text and control sizes unchanged, and switching to human opponents clears generated computer names. Casino header arrows use compact artwork inside the existing navigation controls.

Pretty Penny v4.0.0 (TBD): Added Growing Penny Wild exclusively to Pretty Penny. On eligible paid and free reel spins, a natural Penny Wild can grow across all five cells of one random row for the current result. The saved trigger setting defaults to 3% and can be adjusted or disabled. Active paylines pay from the expanded grid; existing line awards never decrease, special-symbol rows and jackpot displays are protected, and growth increases effective returns beyond Regular Win Odds. Spreading wilds remain a separate presentation effect; Treasure Pots SCATTER chests award free spins and do not substitute as wilds.

## Game documentation audit

All eight casino games have quick-start guides and release-history links in `game-guides.html`, available from Help and the library footer. Sorry! and Yahtzee also link directly from their game screens. Existing detailed in-game rules remain available. The user confirmed Monopoly Deal Chrome mobile scrolling is fixed. Keep it in Fixed with the completed layout explanation. Every requested build includes a documentation audit across all eight games, even when production packaging is skipped.

Phone slot reels: Icons and award labels scale to the actual reel cell dimensions across all four slots. Very short play areas keep a minimum reel height and scroll internally so every row and the result remain reachable while the bottom play controls stay visible.

Phone regression follow-up (v1.6.0, TBD): played property thumbnails are reduced to 28 pixels in both collections. Compact two-column selected actions preserve 48-pixel circles and keep the hand visible without page scrolling in checked phone layouts. The recurring populated-table scrolling issue still awaits verification on the original device. The earlier confirmed Chrome refresh fix remains in Fixed. Elapsed time now keeps counting when focus moves into the game iframe and recovers on touch or keyboard input; leaving the tab or browser still pauses it.
