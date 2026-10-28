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

Gameplay coverage includes setup validation and cancellation, private handoffs, bank/property placement, Pass Go, three-play limits, wild flipping and rearrangement, buildings, rent/doublers, Any Color Rent, steals/swaps/full sets, Just Say No and counter-responses, debtor-chosen payments, insufficient assets, discarding, and victory. Both themes, independent saved colors, unavailable storage, and public table/guide navigation are covered.

Tests run a temporary local HTTP server and inject fixture access into intercepted responses. The shipped game contains no fixture access API. Card-conservation checks ensure every original deck card remains accounted for after tested actions.

Responsive coverage also sweeps 22 viewport sizes from 240×568 through 1920×1080, including 320×240, 480×240, and 844×240 browser-chrome stress cases in both themes, including the 600/601px breakpoint. It checks single-line names and controls, horizontal overflow, selected-card containment, opponent labels, setup/settings/choice dialogs, rules, card catalog, and table activity. Touch-device tests rotate an existing game through six viewport sizes while preserving selection and private hands. Long names and oversized lists remain accessible through local scrolling.

Selected-card browsing checks cover left/right swipe direction, wrapping at both ends, short/vertical gestures, actual touch injection in Chromium, arrow buttons and keyboard navigation, single-card hands, turn-handoff privacy, wild flipping, card conservation, and banking the displayed card without browsing spending a play.

Card drop coverage checks mouse and held-touch drops onto Properties and Bank, action-card play, invalid and cancelled drops, the three-play limit, card conservation, sorting without spending plays, non-overlapping complete hand cards, and inset close-button focus rings.

Selection checks cover single-click/tap actions without enlargement, deliberate double-click/tap enlargement, closing the preview while preserving the hand and selection, with no manual Hide/Privacy controls, and automatic casino-header collapse only after dealing Monopoly Deal.

Public-card paging checks cover full artwork and descriptions within phone panes, pointer swipes, and precise trackpad deltas. Enlarged-card checks compare the same dimensions and content containment across designs on phone and desktop. Launcher checks keep arrows within the first phone screen and verify one slide per trackpad burst. The guide and release notes describe the current controls and the limits of same-tab recovery and planned save features.

Properties-ordering checks verify cards on the first page and completion/property/building totals on a separate final Details page, across phone and desktop sizes and after switching to a player with no properties.

Property-stack checks cover one page per color, one full reading card at a time, buildings kept with their set, inspecting members using arrows without changing game state, complete-set badges on the table, and a separate final Details page on phone and desktop.

Selection-feedback checks verify lifted/checkmarked selections, selecting and deselecting several cards, clearing all, retaining unplayed selections, single-card action consumption, aligned action icon columns, unambiguous numbered-player payment text, and turn-limit/handoff toasts.


AI difficulty coverage verifies that Easy retains the original strategy and Normal develops different color sets and prioritizes winning steals. UI checks cover difficulty selection, setup review, Back navigation, hiding difficulty in human-only mode, same-tab reload persistence, and migration of older deals to Easy. Flip checks verify animation on both the hand card and enlarged preview, updated color artwork, and no play cost.


Phone-height coverage checks iPhone 17/17 Pro (402×874) and 17 Pro Max (440×956), plus 132px shorter viewports to simulate space taken by browser controls and device insets. Tests verify that the hand fits in normal and single-selection portrait play, with four players and property collections, both standalone and inside the casino. Run with Chromium and WebKit. These are viewport simulations, not physical-device tests. Screen dimensions: https://developer.apple.com/design/human-interface-guidelines/layout


Public reading-card coverage verifies full faces at 320px, 420px, and desktop widths, minimum readable rent text, bank quantities, and card conservation. Chromium exercises actual page-scale zoom through CDP; WebKit exercises the visual-viewport resize path with a simulated zoom scale. Both verify that zoom preserves live DOM, page, scroll position, and selected property. Larger cards scroll within the viewer instead of shrinking their text.


Mistake-recovery coverage checks cancelling prompts with Cancel action and Escape, rollback of partial end-of-turn discards, consecutive undo of property and bank moves, restored discarded cards and wild-set buildings, and clearing undo at turn handoff or required opponent decisions. Finished-game refresh coverage checks computer winners in standalone and hosted phone layouts, top-of-page recovery, visible navigation, and working New game controls.


v1.5.0 coverage updates obsolete Hide controls to reload/handoff privacy, uses explicit enlargement before preview checks, selects human mode for pass-and-play setup, checks ARIA disabled states, and permits vertical scrolling for full public reading cards. Tests use bounded browser waits so removed selectors fail promptly. Recovery cases cover partially completed AI turns and interrupted payments without duplicate transfers; action-summary cases check plays, last action, and Undo after a move and after undoing it.


v1.5.0 table fixes verify direct table-wild editing, money-only banking in the UI and engine for both AI levels, rent rejection against assetless opponents without spending cards or plays, real selected-card previews, and compact property reading cards with controls below the face. Property-view entry tests double-click the heading so they do not accidentally trigger the new direct wild-edit shortcut.

Header control coverage checks that only Game settings and Game guide disable during setup, dialogs, and pending actions. Both navigation arrows and New game stay enabled; refresh restores the deal and releases the utility controls, and leaving during setup releases the host lock.


v1.5.0 responsive checks cover populated hosted tables at 390×700, 768×1024, 1440×900, 1536×864, and 1920×1080, including standalone desktop play. Body scroll height must equal its client height exactly. Normal play fits vertically, selected previews stay within the stage, iPad/desktop previews grow, desktop mouse/trackpad hand cards grow, and phone cards keep their compact sizes. Enlarged phone reading cards retain accessible controls through scrolling inside the game. Release checks verify the consolidated v1.5.0 labels and single October 28 entry.


Action sizing checks cover compact phones, touch tablets in portrait and landscape, and desktop screens. They verify larger action circles and labels, deck heading/count alignment, the larger desktop deck, no normal-play vertical overflow, and center-preview medallions at least as large as their hand counterparts. Enlarged reading-card artwork stays circular and scales with the card; long action instructions remain visible on phone, tablet, and desktop.
