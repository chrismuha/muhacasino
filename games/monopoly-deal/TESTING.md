# Monopoly Deal regression checks

Run from the `muhacasino` repository:

```sh
npm ci
npx playwright install chromium webkit
npm run test:monopoly-deal
DEAL_QA_BROWSER=webkit npm run test:monopoly-deal
npm run check
npm run build
```

On macOS, the default test run uses installed Google Chrome when available; otherwise it uses Playwright Chromium. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use another local Chromium executable. WebKit checks the Safari browser engine; it does not replace testing on a physical iPhone.

Set `DEAL_QA_ARTIFACTS` to an output directory to save screenshots of empty-table, property, money, and rent selections at 320×740, 390×844, 430×932, 768×1024, 1260×2736, 1440×900, and 844×390. The suite also checks the 58 card designs, navigation, small-screen clipping, card proportions, long names, and large-hand scrolling.

Gameplay coverage includes setup validation and cancellation, private handoffs, bank/property placement, Pass Go, three-play limits, wild flipping and rearrangement, buildings, rent/doublers, Any Color Rent, steals/swaps/full sets, Just Say No and counter-responses, debtor-chosen payments, insufficient assets, discarding, and victory. The single card-table appearance, saved colors, unavailable storage, and public table/guide navigation are covered.

Tests run a temporary local HTTP server and inject fixture access into intercepted responses. The shipped game contains no fixture access API. Card-conservation checks ensure every original deck card remains accounted for after tested actions.

Responsive coverage also sweeps 22 viewport sizes from 240×568 through 1920×1080, including 320×240, 480×240, and 844×240 browser-chrome stress cases in the card-table layout, including the 600/601px breakpoint. It checks single-line names and controls, horizontal overflow, selected-card containment, opponent labels, setup/settings/choice dialogs, rules, card catalog, and table activity. Touch-device tests rotate an existing game through six viewport sizes while preserving selection and private hands. Long names and oversized lists remain accessible through local scrolling.

Selected-card browsing checks cover left/right swipe direction, wrapping at both ends, short/vertical gestures, actual touch injection in Chromium, arrow buttons and keyboard navigation, single-card hands, turn-handoff privacy, wild flipping, card conservation, and banking the displayed card without browsing spending a play.

Card drop coverage checks mouse and held-touch drops onto Properties and Bank, action-card play, invalid and cancelled drops, the three-play limit, card conservation, sorting without spending plays, non-overlapping complete hand cards, and inset close-button focus rings.

Selection checks cover single-click/tap actions without enlargement, deliberate double-click/tap enlargement, closing the preview while preserving the hand and selection, with no manual Hide/Privacy controls, and automatic casino-header collapse only after dealing Monopoly Deal.

Public-card paging checks cover full artwork and descriptions within phone panes, pointer swipes, and precise trackpad deltas. Enlarged-card checks compare the same dimensions and content containment across designs on phone and desktop. Launcher checks keep arrows within the first phone screen and verify one slide per trackpad burst. The guide and release notes describe the current controls and the limits of same-tab recovery and planned save features.

Properties-ordering checks verify cards on the first page and completion/property/building totals on a separate final Details page, across phone and desktop sizes and after switching to a player with no properties.

Property-stack checks cover one page per color, one full reading card at a time, buildings kept with their set, inspecting members using arrows without changing game state, complete-set badges on the table, and a separate final Details page on phone and desktop.

Selection-feedback checks verify lifted/checkmarked selections, selecting and deselecting several cards, clearing all, retaining unplayed selections, single-card action consumption, aligned action icon columns, unambiguous numbered-player payment text, and turn-limit/handoff toasts.


AI difficulty coverage verifies that Easy retains the original strategy, Normal develops different color sets and prioritizes winning steals, and Hard builds cash reserves, protects nearly completed groups in payments and swaps, holds low-impact steals, and retains defensive cards. All three difficulties retain the existing payment rules, three-set victory, and three-play turn limit. Hard charges one remaining play per required discard, still enforces seven cards after plays run out, and charges a play for hand wild flips and played wild color changes. Easy and Normal required discards and hand wild flips are free. Reassigning a played regular or universal wild costs one play in every difficulty. Regression checks cover human and computer required discards, cancel, unchanged colors, building normalization, and Undo. UI checks cover difficulty selection, setup review, Back navigation, hiding difficulty in human-only mode, same-tab reload persistence, and migration of older deals to Easy. Flip checks verify animation on both the hand card and enlarged preview, updated color artwork, and no play cost.


Phone-height coverage checks iPhone 17/17 Pro (402×874) and 17 Pro Max (440×956), plus 132px shorter viewports to simulate space taken by browser controls and device insets. Tests verify that the hand fits in normal and single-selection portrait play, with four players and property collections, both standalone and inside the casino. Run with Chromium and WebKit. These are viewport simulations, not physical-device tests. Screen dimensions: https://developer.apple.com/design/human-interface-guidelines/layout


Public reading-card coverage verifies full faces at 320px, 420px, and desktop widths, minimum readable rent text, bank quantities, and card conservation. Chromium exercises actual page-scale zoom through CDP; WebKit exercises the visual-viewport resize path with a simulated zoom scale. Both verify that zoom preserves live DOM, page, scroll position, and selected property. Larger cards scroll within the viewer instead of shrinking their text.


Mistake-recovery coverage checks cancelling prompts with Cancel action and Escape, rollback of partial end-of-turn discards, consecutive undo of property and bank moves, restored discarded cards and wild-set buildings, and clearing undo at turn handoff or required opponent decisions. Finished-game refresh coverage checks computer winners in standalone and hosted phone layouts, top-of-page recovery, visible navigation, and working New game controls.


v1.5.0 coverage updates obsolete Hide controls to reload/handoff privacy, uses explicit enlargement before preview checks, selects human mode for pass-and-play setup, checks ARIA disabled states, and permits vertical scrolling for full public reading cards. Tests use bounded browser waits so removed selectors fail promptly. Recovery cases cover partially completed AI turns and interrupted payments without duplicate transfers; turn-status cases check play dots, last action, and Undo after a move and after undoing it.


v1.5.0 table fixes verify direct table-wild editing, money-only banking in the UI and engine for both AI levels, rent rejection against assetless opponents without spending cards or plays, real selected-card previews, and compact property reading cards with controls below the face. Property-view entry tests double-click the heading so they do not accidentally trigger the new direct wild-edit shortcut.

Header control coverage checks that only Game settings and Game guide disable during setup, dialogs, and pending actions. Both navigation arrows and New game stay enabled; refresh restores the deal and releases the utility controls, and leaving during setup releases the host lock.


v1.5.0 responsive checks cover populated hosted tables at 390×700, 768×1024, 1440×900, 1536×864, and 1920×1080, including standalone desktop play. Body scroll height must equal its client height exactly. Normal play fits vertically, selected previews stay within the stage, iPad/desktop previews grow, desktop mouse/trackpad hand cards grow, and phone cards keep their compact sizes. Enlarged phone reading cards retain accessible controls through scrolling inside the game. Release checks verify the consolidated v1.5.0 labels and single November 2 entry.


Action sizing checks cover compact phones, touch tablets in portrait and landscape, and desktop screens. They verify larger action circles and labels, deck heading/count alignment, the larger desktop deck, no normal-play vertical overflow, and center-preview medallions at least as large as their hand counterparts. Enlarged reading-card artwork stays circular and scales with the card; long action instructions remain visible on phone, tablet, and desktop.


Category-selection checks cover touch on phone/tablet and mouse/keyboard on desktop, same-category additions, category replacement, deselection, banking only the active money card, and enlarged browsing across categories without spending plays. Payment checks keep Bank before Property before Building, sort each group by value and label, preserve stored asset order, and regroup buildings moved to the bank after a property payment in the card-table layout.


Property-deal notification checks cover Sly Deal, Forced Deal, and Deal Breaker in the card-table layout at phone, tablet, and desktop sizes. They verify one bullet per transferred card, both swap directions, included House/Hotel cards, viewport containment, dismissal, third-play reminders, and matching action-history details. Computer results survive turn handoff and combine consecutive steals. Cancelled actions and Just Say No blocks never report transfers.


iPhone Air residual-scroll coverage attempts to scroll the body and requires zero movement in normal play at 420px width and 700, 742, 780, 844, 860, and 912px heights. It covers standalone and hosted games, populated four-player tables, property and wild selections, and expanded hosted headers where sufficient height remains. Card reading views retain their intended scrolling. Run in Chromium and WebKit; physical iPhone verification remains separate.


## November 1, 2026: mobile refresh and notifications (v1.5.0)

- `npm run test:games:refresh`: tests every casino game through hosted refresh, child-frame reload, toolbar changes, orientation changes, host-height changes without a window resize, and direct-URL refresh. Uses touch, an iPhone Safari user agent, 3× device scale, and a 420px phone viewport. Includes fresh-code/offline-cache checks for the shared service worker.
- `GAME_QA_BROWSER=chromium npm run test:games:refresh` selects Chromium. `GAME_QA_ARTIFACTS=/path` saves hosted refresh screenshots.
- The notification timing regression uses a paused browser clock to check a full two-second display, fade, newest-first pending events, uniform timing for transfer details, and early dismissal without shortening the next notification.
- The ready-screen regression checks root, body, and main scrolling at eight phone heights, both directly and hosted with either toolbar state.
- Targeted WebKit checks also cover populated play tables, notification settings, transfer details in the card-table layout, keyboard toast positioning, keyboard panning, and leaving/re-entering all games.
- A simulated host-height change fails against the previous frame-sizing code and passes with the grid layout. The exact physical iPhone Air half-black refresh symptom was not reproduced in automation; physical-device confirmation remains necessary.
- Follow-up fixes keep Change wild color available when another card in a group is selected, and test oversized hands through the actual mandatory-discard flow before checking normal selection. Both previously failing cases now pass. Required discards still lock play and consume no plays.
- Refresh coverage now also simulates a temporary half-height visual viewport before initial load and refresh, restoration without resize, and page-cache return for every game. The previous release retains a 356px host in a 712px viewport in this test; the native dynamic-viewport layout remains full height. Text-entry keyboard tests verify shrinking and restoration on blur for all four slots.

- Additional fixture corrections retain all card-design coverage in realistic hands of at most seven cards, complete required discards after Pass Go and AI handoff, use same-category multi-selection, and supply payable assets when testing rent ordering. Setup checks require the table to stay stable while its dialog fits above the keyboard; the responsive matrix permits intentionally wrapping setup headings while still rejecting clipped content.
- Validation: the broad WebKit run covered 131 cases (115 passed, 3 Chromium-only touch cases skipped, 13 outdated assertions failed); all 13 corrected cases passed their focused rerun. The all-game refresh/cache suite passes 32 cases in each engine.

Manual drawing checks cover the default automatic mode, saved toast duration, private opening hands, one card per deck tap, full-screen reading faces and Close in the card-table layout, Pass Go, required discards, empty-hand draws, automatic computer turns, discard recycling, hosted frames, and refresh without duplicated draws. Settings and recovery checks confirm that enabling automatic dealing completes outstanding draws without card popups.

Played wild color changes use one play in the card-table layout, including multicolor wilds. Wild regressions cover direct table taps, the property manager, third-play blocking and dots, Cancel, unchanged colors, building normalization, and Undo restoring the color and play count.

November phone regressions start a real hosted deal through setup before selecting or playing the first card, check the unaltered full-screen card artwork, and verify deck-side/default and saved footer toast placement. Slot responsive checks cover the shared Controls layout, fixed heading with scrolled content, Buy Bonus typography/order, and persisted paid/free/bonus spin history.

Appearance checks verify a single card-table renderer, no appearance-selector controls, preserved saved table colors and hands, and current release dates matching November 5, 2026.

## November 4 controls follow-up

Easy, Normal, and Hard permit banking properties and action cards with a positive cash value. Pass Go is blocked when its net draw would leave more than seven cards unless the saved Allow Pass Go over seven setting is enabled (off by default). Regression checks cover the default guard, override, property banking, mobile library navigation, compact Help access, elapsed time across reload, and scalable Pass Go artwork. No Mercy combined with Hard rules remains Coming soon pending verified card counts and debt interactions.

November 5: verify left-aligned turn and complete-set labels at 320, 430, 768, and 1440 pixels; saved elapsed-time switch and re-enabling; inline Help outside Monopoly Deal; wild movement from rent with the one-play cost and cancellation rollback.

Help access: verify navigation-bar Help remains available after reload, with exactly one Help component and no optional tab or tab setting.

November 5 defaults: toast notifications are off without an explicit saved opt-in; notification-specific fixtures opt in deliberately. Checks cover navigation-only Help (including obsolete saved settings), the sole circular Discard action, and the unique v1.5.0 release dated November 5, 2026.


v1.6.0: verify cash-value action banking in every difficulty, one-play cost, bank-only debt transfers, and rejection of attempts to play banked actions. Preserve the shared property-banking rule and zero-value-wild restriction.

Preview canvas checks cover phone, tablet, and cabinet shells at two browser sizes without changing their simulated viewport. Hosted canvas checks cover default and custom table colors. Notch checks cover expanded and collapsed headers with a 54px simulated inset. Physical iPhone confirmation remains required for the documented Chrome issue.


iPhone footer hand regression coverage checks larger card widths and stable width and height through regular property, wild, money, and action selection, opening and closing the reading view, and Clear, without spending plays. Standalone and hosted layouts cover 390×700, 420×740, and 430×932 CSS viewports in Chromium and WebKit. Short crowded screens may scroll vertically to preserve readable cards.


Desktop progression coverage fills four players’ Bank and Properties panels and switches between property, wild, and money selections at 1280×720, 1440×800, 1536×864, and 1920×1080, both standalone and hosted. It verifies no page overflow, visible turn controls and previews, horizontal access to the last hand card, and fitted play after closing reading views, expanding the launcher header, and reducing the window height by 100 pixels. Run in Chromium and WebKit. The elapsed-time badge is present before layout measurements.


Shared banking coverage enumerates all 106 cards and verifies positive cash values are eligible. UI checks bank a regular property and a valued wild in Easy, Normal, and Hard, verify one play per card, keep banked properties out of played sets, reject zero-value wilds without spending cards or plays, and block replaying banked properties. Mouse drops cover property banking, normal property play, invalid money-to-Properties drops, cancellation, and the three-play limit.
