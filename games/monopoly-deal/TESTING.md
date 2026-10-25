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

Property-stack checks cover one page per color, overlapping cards, buildings kept with their set, inspecting members without changing game state, complete-set badges on the table, and a separate final Details page on phone and desktop.

Selection-feedback checks verify lifted/checkmarked selections, selecting and deselecting several cards, clearing all, retaining unplayed selections, single-card action consumption, aligned action icon columns, unambiguous numbered-player payment text, and turn-limit/handoff toasts.
