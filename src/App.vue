<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import appIcon from './assets/app-icon.png';

const letters = ['B', 'I', 'N', 'G', 'O'];
const playerCount = ref(100);
const cardsPerPlayer = ref(1);
const maximumWinners = ref(10);
const startingCredits = ref(500);
const cardCost = ref(10);
const winnerPrize = ref(100);
const requestedScreen = new URLSearchParams(window.location.search).get('screen');
const currentScreen = ref(['dealer', 'audience'].includes(requestedScreen) ? requestedScreen : 'floor');
const dealerSection = ref('game');
const setupEditing = ref(true);
const advancedOpen = ref(false);
const cardSearch = ref('');
const appPrompt = ref({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  tone: 'default'
});
let promptResolver = null;
let stopStateListener = null;
let applyingRemoteState = false;
const visibleCardCount = ref(2);
const cardPageStart = ref(0);
const cards = ref([]);
const calledNumbers = ref([]);
const isAutoCalling = ref(false);
const autoDelay = ref(5);
const selectedPattern = ref('regular');
const autoRotatePatterns = ref(false);
const winningCardIds = ref([]);
const pendingWinnerIds = ref([]);
const rejectedCardIds = ref([]);
const playerBalances = ref([]);
const playerNames = ref([]);
const houseCredits = ref(0);
const paidPrizeCredits = ref(0);
const dealerCorrectionCount = ref(0);
const targetCardId = ref(1);
const dealerNotice = ref('Dealer console ready.');
let autoTimer = null;

const currentCall = computed(() => calledNumbers.value.at(-1) ?? null);
const totalPlayerCards = computed(() => playerCount.value * cardsPerPlayer.value);
const claimedWinnerCount = computed(() =>
  winningCardIds.value.length + pendingWinnerIds.value.length
);
const roundComplete = computed(() => winningCardIds.value.length >= maximumWinners.value);
const roundActive = computed(() =>
  calledNumbers.value.length > 0 && !roundComplete.value
);
const gameStage = computed(() => {
  if (setupEditing.value) return 'Setup';
  if (roundComplete.value) return 'Complete';
  if (pendingWinnerIds.value.length) return 'Verification';
  if (!calledNumbers.value.length) return 'Ready';
  return isAutoCalling.value ? 'Playing' : 'Paused';
});
const primaryDealerLabel = computed(() => {
  if (setupEditing.value) return 'Apply setup & prepare round';
  if (roundComplete.value) return 'Start a new round';
  if (pendingWinnerIds.value.length) return 'Review Bingo claim';
  if (isAutoCalling.value) return 'Pause number calling';
  return calledNumbers.value.length ? 'Resume number calling' : 'Start number calling';
});
const prizePool = computed(() => maximumWinners.value * winnerPrize.value);
const visibleCards = computed(() =>
  cards.value.slice(cardPageStart.value, cardPageStart.value + visibleCardCount.value)
);
const cardGridColumns = computed(() => {
  if (visibleCards.value.length === 4) return 2;
  return Math.min(visibleCards.value.length, 3);
});
const cardGridRows = computed(() =>
  Math.ceil(visibleCards.value.length / cardGridColumns.value)
);
const visibleCardRange = computed(() => {
  const first = cardPageStart.value + 1;
  const last = Math.min(cardPageStart.value + visibleCardCount.value, totalPlayerCards.value);
  return `${first}–${last} of ${totalPlayerCards.value}`;
});
const patterns = [
  { id: 'regular', name: 'Regular Bingo', detail: 'Any complete row, column, or diagonal' },
  { id: 'four-corners', name: 'Four Corners', detail: 'Mark all four corner squares' },
  { id: 'postage-stamp', name: 'Postage Stamp', detail: 'Any 2 × 2 corner block' },
  { id: 'letter-x', name: 'Letter X', detail: 'Complete both diagonal lines' },
  { id: 'letter-t', name: 'Letter T', detail: 'Top row and center column' },
  { id: 'letter-h', name: 'Letter H', detail: 'Both outside columns and the center row' },
  { id: 'three-by-three', name: '3 × 3 Block', detail: 'Cover the nine squares in the center' },
  { id: 'bowling-pin', name: 'Bowling Pin', detail: 'Complete the triangular ten-pin formation' },
  { id: 'small-diamond', name: 'Small Diamond', detail: 'Cover the four squares around the free space' },
  { id: 'large-diamond', name: 'Large Diamond', detail: 'Complete the large diamond outline' },
  { id: 'plus-sign', name: 'Plus Sign', detail: 'Complete the center row and center column' },
  { id: 'crazy-kite', name: 'Crazy Kite', detail: 'A diagonal string with a 2 × 2 corner kite' },
  { id: 'arrow', name: 'Arrow', detail: 'Complete the arrowhead and center shaft' },
  { id: 'lucky-seven', name: 'Lucky 7', detail: 'Top row with a descending diagonal' },
  { id: 'letter-l', name: 'Letter L', detail: 'Left column and bottom row' },
  { id: 'letter-z', name: 'Letter Z', detail: 'Top and bottom rows joined diagonally' },
  { id: 'six-pack', name: 'Six Pack', detail: 'Complete any adjacent 2 × 3 block' },
  { id: 'outside-corners', name: 'Outside Corners', detail: 'Cover all four 2 × 2 corner blocks' },
  { id: 'double-bingo', name: 'Double Bingo', detail: 'Complete any two standard Bingo lines' },
  { id: 'triple-bingo', name: 'Triple Bingo', detail: 'Complete any three standard Bingo lines' },
  { id: 'inside-frame', name: 'Inside Frame', detail: 'Cover the border of the inner 3 × 3 square' },
  { id: 'railroad-tracks', name: 'Railroad Tracks', detail: 'Complete two parallel rows or columns' },
  { id: 'sputnik', name: 'Sputnik', detail: 'Center cross with all four corners' },
  { id: 'american-flag', name: 'American Flag', detail: 'Striped flag pattern with a filled upper field' },
  { id: 'picture-frame', name: 'Picture Frame', detail: 'Every square around the outside' },
  { id: 'blackout', name: 'Blackout', detail: 'Cover every number on the card' }
];
const activePattern = computed(() => patterns.find((pattern) => pattern.id === selectedPattern.value));
const targetCard = computed(() =>
  cards.value.find((card) => card.id === Number(targetCardId.value)) ?? null
);
const searchedCard = computed(() => {
  const cardId = Number(String(cardSearch.value).trim().replace(/\D/g, ''));
  return cards.value.find((card) => card.id === cardId) ?? null;
});
const availableNumbers = computed(() =>
  Array.from({ length: 75 }, (_, index) => index + 1)
    .filter((number) => !calledNumbers.value.includes(number))
);
const recentCalls = computed(() => calledNumbers.value.slice(-6).reverse());
const gameProgress = computed(() => Math.round((calledNumbers.value.length / 75) * 100));

function getBallLabel(number) {
  if (!number) return '—';
  return `${letters[Math.floor((number - 1) / 15)]}-${number}`;
}

function makeColumn(start) {
  const choices = Array.from({ length: 15 }, (_, index) => start + index);
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [choices[index], choices[randomIndex]] = [choices[randomIndex], choices[index]];
  }
  return choices.slice(0, 5);
}

function createCard(id) {
  const columns = letters.map((_, index) => makeColumn(index * 15 + 1));
  const cells = [];
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const isFree = row === 2 && column === 2;
      cells.push({
        key: `${id}-${row}-${column}`,
        number: isFree ? null : columns[column][row],
        isFree,
        marked: isFree
      });
    }
  }
  return { id, cells };
}

function generateCards() {
  cards.value = Array.from({ length: totalPlayerCards.value }, (_, index) => createCard(index + 1));
}

function startNewGame() {
  stopAutoCall();
  calledNumbers.value = [];
  winningCardIds.value = [];
  pendingWinnerIds.value = [];
  rejectedCardIds.value = [];
  cardPageStart.value = 0;
  generateCards();
}

function applyGameSetup() {
  playerCount.value = Math.max(1, Math.min(500, Number(playerCount.value) || 1));
  cardsPerPlayer.value = Math.max(1, Math.min(6, Number(cardsPerPlayer.value) || 1));
  maximumWinners.value = Math.max(
    1,
    Math.min(totalPlayerCards.value, Number(maximumWinners.value) || 1)
  );
  playerBalances.value = Array.from(
    { length: playerCount.value },
    () => Math.max(0, startingCredits.value - cardsPerPlayer.value * cardCost.value)
  );
  playerNames.value = Array.from(
    { length: playerCount.value },
    (_, index) => playerNames.value[index] || `Player ${String(index + 1).padStart(3, '0')}`
  );
  houseCredits.value = totalPlayerCards.value * cardCost.value;
  paidPrizeCredits.value = 0;
  dealerCorrectionCount.value = 0;
  startNewGame();
  setupEditing.value = false;
  dealerSection.value = 'game';
  dealerNotice.value = `${playerCount.value} players and ${totalPlayerCards.value} cards are ready.`;
}

function requestConfirmation({ title, message, confirmLabel = 'Confirm', tone = 'default' }) {
  if (promptResolver) promptResolver(false);
  appPrompt.value = { open: true, title, message, confirmLabel, tone };
  return new Promise((resolve) => {
    promptResolver = resolve;
  });
}

function closeAppPrompt(confirmed) {
  appPrompt.value.open = false;
  const resolve = promptResolver;
  promptResolver = null;
  resolve?.(confirmed);
}

async function confirmApplyGameSetup() {
  const confirmed = await requestConfirmation({
    title: 'Apply game setup?',
    message: `Prepare ${totalPlayerCards.value} cards for ${playerCount.value} players with a limit of ${maximumWinners.value} winners.`,
    confirmLabel: 'Apply & start',
    tone: 'primary'
  });
  if (!confirmed) return;
  applyGameSetup();
}

async function confirmNewRound() {
  const confirmed = await requestConfirmation({
    title: 'Start a new round?',
    message: 'This clears every called number, daub, pending claim, rejection, and winner from the current round.',
    confirmLabel: 'Clear & start new',
    tone: 'danger'
  });
  if (!confirmed) return;
  startNewGame();
  dealerNotice.value = 'A fresh round is ready.';
}

function callNextNumber() {
  if (roundComplete.value || pendingWinnerIds.value.length) {
    stopAutoCall();
    dealerNotice.value = roundComplete.value
      ? 'Winner limit reached. Start a new round to continue.'
      : 'Calling paused: a Bingo claim requires dealer verification.';
    return;
  }
  if (!availableNumbers.value.length) {
    stopAutoCall();
    return;
  }
  const pool = availableNumbers.value.filter(isSafeCall);
  if (!pool.length) {
    stopAutoCall();
    dealerNotice.value = 'No safe numbers remain for this round.';
    return;
  }
  const number = pool[Math.floor(Math.random() * pool.length)];
  callSpecificNumber(number);
}

function isSafeCall(number) {
  const additionalMatches = cards.value
    .filter((card) => !winningCardIds.value.includes(card.id))
    .filter((card) => !pendingWinnerIds.value.includes(card.id))
    .filter((card) => !rejectedCardIds.value.includes(card.id))
    .filter((card) => cardMatchesPattern(card, number));
  return claimedWinnerCount.value + additionalMatches.length <= maximumWinners.value;
}

function callSpecificNumber(number) {
  if (roundComplete.value || pendingWinnerIds.value.length) {
    stopAutoCall();
    dealerNotice.value = roundComplete.value
      ? 'Winner limit reached. No more numbers can be called.'
      : 'Verify the pending Bingo claim before calling another number.';
    return false;
  }
  if (!availableNumbers.value.includes(number)) {
    dealerNotice.value = `${getBallLabel(number)} has already been called.`;
    return false;
  }
  if (!isSafeCall(number)) {
    dealerNotice.value = `${getBallLabel(number)} was blocked to protect the 10-winner limit.`;
    return false;
  }
  calledNumbers.value.push(number);
  checkForWinner();
  dealerNotice.value = `${getBallLabel(number)} called successfully.`;
  return true;
}

function undoLastCall() {
  if (!calledNumbers.value.length) {
    dealerNotice.value = 'There is no call to undo.';
    return;
  }
  const removed = calledNumbers.value.pop();
  winningCardIds.value = [];
  pendingWinnerIds.value = [];
  rejectedCardIds.value = [];
  checkForWinner();
  dealerNotice.value = `${getBallLabel(removed)} removed from the board.`;
}

function toggleAutoCall() {
  if (isAutoCalling.value) {
    stopAutoCall();
    return;
  }
  if (roundComplete.value || pendingWinnerIds.value.length) {
    dealerNotice.value = roundComplete.value
      ? 'This round is complete.'
      : 'Verify the pending Bingo claim before resuming play.';
    return;
  }
  if (autoRotatePatterns.value && calledNumbers.value.length === 0) {
    const currentIndex = patterns.findIndex((pattern) => pattern.id === selectedPattern.value);
    selectedPattern.value = patterns[(currentIndex + 1) % patterns.length].id;
  }
  isAutoCalling.value = true;
  callNextNumber();
  autoTimer = window.setInterval(callNextNumber, autoDelay.value * 1000);
}

function stopAutoCall() {
  isAutoCalling.value = false;
  if (autoTimer) window.clearInterval(autoTimer);
  autoTimer = null;
}

function updateAutoDelay() {
  if (isAutoCalling.value) {
    stopAutoCall();
    toggleAutoCall();
  }
}

function toggleCell(card, cell) {
  if (!cell.isFree) {
    cell.marked = !cell.marked;
    if (
      cell.marked
      && !winningCardIds.value.includes(card.id)
      && claimedWinnerCount.value >= maximumWinners.value
      && cardMatchesPattern(card)
    ) {
      cell.marked = false;
      return;
    }
    checkForWinner();
  }
}

function isCalled(number) {
  return calledNumbers.value.includes(number);
}

function getWinningSets(patternId) {
  const rows = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, column) => row * 5 + column)
  );
  const columns = Array.from({ length: 5 }, (_, column) =>
    Array.from({ length: 5 }, (_, row) => row * 5 + column)
  );
  const diagonals = [[0, 6, 12, 18, 24], [4, 8, 12, 16, 20]];
  const stamps = [[0, 1, 5, 6], [3, 4, 8, 9], [15, 16, 20, 21], [18, 19, 23, 24]];
  const frame = [0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24];
  const sixPacks = [];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      sixPacks.push([
        row * 5 + column, row * 5 + column + 1, row * 5 + column + 2,
        (row + 1) * 5 + column, (row + 1) * 5 + column + 1, (row + 1) * 5 + column + 2
      ]);
    }
  }
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      sixPacks.push([
        row * 5 + column, row * 5 + column + 1,
        (row + 1) * 5 + column, (row + 1) * 5 + column + 1,
        (row + 2) * 5 + column, (row + 2) * 5 + column + 1
      ]);
    }
  }

  switch (patternId) {
    case 'four-corners':
      return [[0, 4, 20, 24]];
    case 'postage-stamp':
      return stamps;
    case 'letter-x':
      return [[...new Set(diagonals.flat())]];
    case 'letter-t':
      return [[...new Set([...rows[0], ...columns[2]])]];
    case 'letter-h':
      return [[...new Set([...columns[0], ...columns[4], ...rows[2]])]];
    case 'three-by-three':
      return [[6, 7, 8, 11, 12, 13, 16, 17, 18]];
    case 'bowling-pin':
      return [[2, 6, 8, 10, 12, 14, 15, 16, 18, 19]];
    case 'small-diamond':
      return [[7, 11, 12, 13, 17]];
    case 'large-diamond':
      return [[2, 6, 8, 10, 14, 16, 18, 22]];
    case 'plus-sign':
      return [[...new Set([...rows[2], ...columns[2]])]];
    case 'crazy-kite':
      return [
        [...new Set([...diagonals[0], 0, 1, 5, 6])],
        [...new Set([...diagonals[0], 18, 19, 23, 24])],
        [...new Set([...diagonals[1], 3, 4, 8, 9])],
        [...new Set([...diagonals[1], 15, 16, 20, 21])]
      ];
    case 'arrow':
      return [[2, 6, 7, 8, 12, 17, 22]];
    case 'lucky-seven':
      return [[...new Set([...rows[0], ...diagonals[0]])]];
    case 'letter-l':
      return [[...new Set([...columns[0], ...rows[4]])]];
    case 'letter-z':
      return [[...new Set([...rows[0], ...diagonals[1], ...rows[4]])]];
    case 'six-pack':
      return sixPacks;
    case 'outside-corners':
      return [[0, 1, 3, 4, 5, 6, 8, 9, 15, 16, 18, 19, 20, 21, 23, 24]];
    case 'double-bingo':
      return [[...new Set([...rows[0], ...rows[1]])]];
    case 'triple-bingo':
      return [[...new Set([...rows[0], ...rows[1], ...rows[2]])]];
    case 'inside-frame':
      return [[6, 7, 8, 11, 13, 16, 17, 18]];
    case 'railroad-tracks':
      return [[...rows[0], ...rows[1]]];
    case 'sputnik':
      return [[...new Set([0, 4, 20, 24, ...rows[2], ...columns[2]])]];
    case 'american-flag':
      return [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 22, 24]];
    case 'picture-frame':
      return [frame];
    case 'blackout':
      return [Array.from({ length: 25 }, (_, index) => index)];
    default:
      return [...rows, ...columns, ...diagonals];
  }
}

function cardMatchesPattern(card, nextNumber = null) {
  const marked = card.cells.map((cell) =>
    cell.isFree || isCalled(cell.number) || cell.number === nextNumber
  );
  marked[12] = true;
  const standardLines = getWinningSets('regular');
  const completedStandardLines = standardLines.filter((set) => set.every((index) => marked[index]));

  if (selectedPattern.value === 'double-bingo') {
    return completedStandardLines.length >= 2;
  }
  if (selectedPattern.value === 'triple-bingo') {
    return completedStandardLines.length >= 3;
  }
  if (selectedPattern.value === 'railroad-tracks') {
    const rows = standardLines.slice(0, 5);
    const columns = standardLines.slice(5, 10);
    return rows.filter((set) => set.every((index) => marked[index])).length >= 2
      || columns.filter((set) => set.every((index) => marked[index])).length >= 2;
  }
  return getWinningSets(selectedPattern.value)
    .some((set) => set.every((index) => marked[index]));
}

function getMatchedWinningSet(card) {
  if (!card) return [];
  const covered = card.cells.map((cell) => cell.isFree || isCalled(cell.number));
  const standardLines = getWinningSets('regular');
  const completedLines = standardLines.filter((set) => set.every((index) => covered[index]));

  if (selectedPattern.value === 'double-bingo') {
    return [...new Set(completedLines.slice(0, 2).flat())];
  }
  if (selectedPattern.value === 'triple-bingo') {
    return [...new Set(completedLines.slice(0, 3).flat())];
  }
  if (selectedPattern.value === 'railroad-tracks') {
    const completedRows = standardLines.slice(0, 5).filter((set) => set.every((index) => covered[index]));
    const completedColumns = standardLines.slice(5, 10).filter((set) => set.every((index) => covered[index]));
    const tracks = completedRows.length >= 2 ? completedRows.slice(0, 2) : completedColumns.slice(0, 2);
    return [...new Set(tracks.flat())];
  }

  return getWinningSets(selectedPattern.value)
    .find((set) => set.every((index) => covered[index])) ?? [];
}

function checkForWinner() {
  const openWinnerSlots = maximumWinners.value - claimedWinnerCount.value;
  if (openWinnerSlots <= 0) return;
  const newWinners = cards.value
    .filter((card) => !winningCardIds.value.includes(card.id))
    .filter((card) => !pendingWinnerIds.value.includes(card.id))
    .filter((card) => !rejectedCardIds.value.includes(card.id))
    .filter((card) => cardMatchesPattern(card))
    .slice(0, openWinnerSlots)
    .map((card) => card.id);
  pendingWinnerIds.value.push(...newWinners);
  if (newWinners.length) {
    stopAutoCall();
    dealerSection.value = 'game';
    if (currentScreen.value !== 'audience') currentScreen.value = 'dealer';
    dealerNotice.value = `${newWinners.length} Bingo claim${newWinners.length === 1 ? '' : 's'} require verification. Calling is paused.`;
  }
}

function approveWinner(cardId) {
  const pendingIndex = pendingWinnerIds.value.indexOf(cardId);
  if (pendingIndex < 0) return;
  pendingWinnerIds.value.splice(pendingIndex, 1);
  winningCardIds.value.push(cardId);
  const playerIndex = Math.floor((cardId - 1) / cardsPerPlayer.value);
  if (playerBalances.value[playerIndex] !== undefined) {
    playerBalances.value[playerIndex] += winnerPrize.value;
  }
  paidPrizeCredits.value += winnerPrize.value;
  if (roundComplete.value) {
    stopAutoCall();
    dealerNotice.value = `Winner limit reached. The round is complete.`;
  } else {
    dealerNotice.value = `Card ${String(cardId).padStart(3, '0')} approved and paid ${winnerPrize.value} credits.`;
  }
}

async function rejectWinner(cardId) {
  const cardLabel = `Card ${String(cardId).padStart(3, '0')}`;
  const reviewed = await requestConfirmation({
    title: `Review ${cardLabel} carefully`,
    message: 'Rejecting a valid Bingo delays the player’s prize. Confirm that you inspected the highlighted winning line.',
    confirmLabel: 'Continue to rejection',
    tone: 'warning'
  });
  if (!reviewed) return;
  const finalConfirmation = await requestConfirmation({
    title: 'Final rejection confirmation',
    message: `${cardLabel} will be disqualified for this round and the action will be recorded in the dealer log.`,
    confirmLabel: 'Reject claim',
    tone: 'danger'
  });
  if (!finalConfirmation) return;
  const pendingIndex = pendingWinnerIds.value.indexOf(cardId);
  if (pendingIndex < 0) return;
  pendingWinnerIds.value.splice(pendingIndex, 1);
  rejectedCardIds.value.push(cardId);
  dealerNotice.value = `Card ${String(cardId).padStart(3, '0')} rejected for this round.`;
}

async function restoreRejectedClaim(cardId) {
  const confirmed = await requestConfirmation({
    title: 'Restore rejected claim?',
    message: `Card ${String(cardId).padStart(3, '0')} will return to the verification queue and calling will pause.`,
    confirmLabel: 'Restore claim',
    tone: 'primary'
  });
  if (!confirmed) return;
  const rejectedIndex = rejectedCardIds.value.indexOf(cardId);
  if (rejectedIndex < 0) return;
  rejectedCardIds.value.splice(rejectedIndex, 1);
  if (!pendingWinnerIds.value.includes(cardId)) pendingWinnerIds.value.push(cardId);
  dealerCorrectionCount.value += 1;
  stopAutoCall();
  currentScreen.value = 'dealer';
  dealerSection.value = 'game';
  dealerNotice.value = `Card ${String(cardId).padStart(3, '0')} restored. Dealer correction recorded.`;
}

function runPrimaryDealerAction() {
  if (setupEditing.value) {
    confirmApplyGameSetup();
  } else if (roundComplete.value) {
    confirmNewRound();
  } else if (pendingWinnerIds.value.length) {
    dealerSection.value = 'game';
    dealerNotice.value = 'Review the highlighted Bingo claim below.';
  } else {
    toggleAutoCall();
  }
}

function openSetupEditor() {
  if (roundActive.value) {
    dealerNotice.value = 'Game setup is locked while a round is active.';
    return;
  }
  setupEditing.value = !setupEditing.value;
}

function searchForCard() {
  const raw = String(cardSearch.value).trim().replace(/\D/g, '');
  const cardId = Number(raw);
  if (!cardId || cardId < 1 || cardId > totalPlayerCards.value) {
    dealerNotice.value = `Enter a card number from 1 to ${totalPlayerCards.value}.`;
    return;
  }
  targetCardId.value = cardId;
  dealerNotice.value = `Card ${String(cardId).padStart(3, '0')} belongs to ${getPlayerName(cardId)}.`;
}

function getPlayerIndex(cardId) {
  return Math.floor((cardId - 1) / cardsPerPlayer.value);
}

function getPlayerName(cardId) {
  return playerNames.value[getPlayerIndex(cardId)] || `Player ${getPlayerIndex(cardId) + 1}`;
}

function openSeparateScreen(screen) {
  window.bingoApi?.openScreen?.(screen);
}

function serializableGameState() {
  return JSON.parse(JSON.stringify({
    playerCount: playerCount.value,
    cardsPerPlayer: cardsPerPlayer.value,
    maximumWinners: maximumWinners.value,
    startingCredits: startingCredits.value,
    cardCost: cardCost.value,
    winnerPrize: winnerPrize.value,
    cards: cards.value,
    calledNumbers: calledNumbers.value,
    winningCardIds: winningCardIds.value,
    pendingWinnerIds: pendingWinnerIds.value,
    rejectedCardIds: rejectedCardIds.value,
    playerBalances: playerBalances.value,
    playerNames: playerNames.value,
    houseCredits: houseCredits.value,
    paidPrizeCredits: paidPrizeCredits.value,
    dealerCorrectionCount: dealerCorrectionCount.value,
    selectedPattern: selectedPattern.value
  }));
}

function applySharedState(state) {
  if (!state) return;
  applyingRemoteState = true;
  playerCount.value = state.playerCount;
  cardsPerPlayer.value = state.cardsPerPlayer;
  maximumWinners.value = state.maximumWinners;
  startingCredits.value = state.startingCredits;
  cardCost.value = state.cardCost;
  winnerPrize.value = state.winnerPrize;
  cards.value = state.cards;
  calledNumbers.value = state.calledNumbers;
  winningCardIds.value = state.winningCardIds;
  pendingWinnerIds.value = state.pendingWinnerIds;
  rejectedCardIds.value = state.rejectedCardIds;
  playerBalances.value = state.playerBalances;
  playerNames.value = state.playerNames;
  houseCredits.value = state.houseCredits;
  paidPrizeCredits.value = state.paidPrizeCredits;
  dealerCorrectionCount.value = state.dealerCorrectionCount;
  selectedPattern.value = state.selectedPattern;
  nextTick(() => {
    applyingRemoteState = false;
  });
}

function handleKeyboardShortcut(event) {
  if (appPrompt.value.open) {
    if (event.key === 'Escape') closeAppPrompt(false);
    if (event.key === 'Enter') closeAppPrompt(true);
    return;
  }
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return;
  if (event.code === 'Space') {
    event.preventDefault();
    callNextNumber();
  } else if (event.key.toLowerCase() === 'p') {
    toggleAutoCall();
  } else if (event.key.toLowerCase() === 'u') {
    undoLastCall();
  } else if (event.key.toLowerCase() === 'v') {
    currentScreen.value = 'dealer';
    dealerSection.value = 'game';
  } else if (event.key.toLowerCase() === 'a') {
    currentScreen.value = 'audience';
  }
}

function printVisibleCards() {
  currentScreen.value = 'floor';
  window.setTimeout(() => window.print(), 100);
}

function printRoundReport() {
  window.print();
}

function changePattern() {
  startNewGame();
}

function choosePattern(patternId) {
  if (selectedPattern.value === patternId) return;
  selectedPattern.value = patternId;
  changePattern();
}

function setVisibleCardCount(count) {
  visibleCardCount.value = count;
  cardPageStart.value = 0;
}

function showPreviousCards() {
  cardPageStart.value = Math.max(0, cardPageStart.value - visibleCardCount.value);
}

function showNextCards() {
  cardPageStart.value = Math.min(
    totalPlayerCards.value - visibleCardCount.value,
    cardPageStart.value + visibleCardCount.value
  );
}

function callTowardTargetCard() {
  const card = targetCard.value;
  if (!card) {
    dealerNotice.value = 'Choose a card number from 1 to 100.';
    return;
  }
  if (winningCardIds.value.includes(card.id) || pendingWinnerIds.value.includes(card.id)) {
    dealerNotice.value = `Card ${String(card.id).padStart(3, '0')} is already a winner.`;
    return;
  }
  const sets = getWinningSets(selectedPattern.value)
    .map((set) => ({
      set,
      missing: set
        .map((index) => card.cells[index])
        .filter((cell) => !cell.isFree && !isCalled(cell.number))
    }))
    .sort((a, b) => a.missing.length - b.missing.length);
  const safeNumber = sets
    .flatMap((candidate) => candidate.missing.map((cell) => cell.number))
    .find((number) => isSafeCall(number));

  if (!safeNumber) {
    dealerNotice.value = 'No safe target number remains for this card.';
    return;
  }
  callSpecificNumber(safeNumber);
  dealerNotice.value = `${getBallLabel(safeNumber)} called toward Card ${String(card.id).padStart(3, '0')}.`;
}

function viewTargetCard() {
  if (!targetCard.value) {
    dealerNotice.value = 'Choose a card number from 1 to 100.';
    return;
  }
  visibleCardCount.value = 1;
  cardPageStart.value = targetCard.value.id - 1;
  currentScreen.value = 'floor';
}

function isPatternSquare(index) {
  return getWinningSets(selectedPattern.value)[0].includes(index);
}

onMounted(() => {
  stopStateListener = window.bingoApi?.onState?.(applySharedState) ?? null;
  if (requestedScreen) {
    window.bingoApi?.requestState?.();
  } else {
    applyGameSetup();
  }
  window.addEventListener('keydown', handleKeyboardShortcut);
  window.bingoApi?.appReady?.();
});

onBeforeUnmount(() => {
  stopAutoCall();
  window.removeEventListener('keydown', handleKeyboardShortcut);
  stopStateListener?.();
});

watch(
  [
    playerCount, cardsPerPlayer, maximumWinners, startingCredits, cardCost, winnerPrize,
    cards, calledNumbers, winningCardIds, pendingWinnerIds, rejectedCardIds,
    playerBalances, playerNames, houseCredits, paidPrizeCredits, dealerCorrectionCount,
    selectedPattern
  ],
  () => {
    if (!applyingRemoteState) window.bingoApi?.publishState?.(serializableGameState());
  },
  { deep: true }
);
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-lockup">
        <img class="brand-mark" :src="appIcon" alt="" aria-hidden="true">
        <div>
          <h1>Lucky Hall Bingo</h1>
          <p>Classic 75-ball game</p>
        </div>
      </div>
      <nav class="screen-switcher" aria-label="Application screen">
        <button
          type="button"
          :class="{ active: currentScreen === 'floor' }"
          @click="currentScreen = 'floor'"
        >Player Floor</button>
        <button
          type="button"
          :class="{ active: currentScreen === 'dealer' }"
          @click="currentScreen = 'dealer'"
        >Dealer Console</button>
        <button
          type="button"
          :class="{ active: currentScreen === 'audience' }"
          @click="currentScreen = 'audience'"
        >Audience Display</button>
      </nav>
      <div class="header-actions">
        <div class="status-pill" :class="{ urgent: pendingWinnerIds.length, complete: roundComplete }">
          <span class="status-dot"></span>
          {{
            roundComplete
              ? 'Round complete'
              : pendingWinnerIds.length
                ? 'Verification required'
                : calledNumbers.length
                  ? 'Game in progress'
                  : 'Ready to play'
          }}
        </div>
        <button class="btn new-game-btn" type="button" @click="confirmNewRound">
          <span aria-hidden="true">↻</span> New game
        </button>
      </div>
    </header>

    <main v-if="currentScreen === 'floor'" class="game-layout">
      <aside class="caller-panel" aria-label="Bingo caller controls">
        <section class="current-call-panel">
          <div class="eyebrow">Current call</div>
          <div class="ball-wrap" :class="{ 'has-ball': currentCall }">
            <div class="bingo-ball">
              <span v-if="currentCall" class="ball-letter">{{ getBallLabel(currentCall).split('-')[0] }}</span>
              <strong>{{ currentCall ?? '—' }}</strong>
            </div>
          </div>
          <div class="call-name">{{ currentCall ? getBallLabel(currentCall) : 'Waiting to begin' }}</div>
          <button
            class="btn btn-call w-100"
            type="button"
            :disabled="!availableNumbers.length || isAutoCalling"
            @click="callNextNumber"
          >
            Call next number
          </button>
          <button class="btn btn-auto w-100" type="button" @click="toggleAutoCall">
            <span class="play-icon" aria-hidden="true">{{ isAutoCalling ? '■' : '▶' }}</span>
            {{ isAutoCalling ? 'Stop auto call' : 'Start auto call' }}
          </button>
          <label class="speed-control">
            <span>Auto-call speed</span>
            <select v-model.number="autoDelay" class="form-select form-select-sm" @change="updateAutoDelay">
              <option :value="3">3 seconds</option>
              <option :value="5">5 seconds</option>
              <option :value="8">8 seconds</option>
              <option :value="10">10 seconds</option>
            </select>
          </label>
        </section>

        <section class="recent-panel">
          <div class="section-heading">
            <h2>Recent calls</h2>
            <span>{{ calledNumbers.length }} / 75</span>
          </div>
          <div v-if="recentCalls.length" class="recent-list">
            <div
              v-for="(number, index) in recentCalls"
              :key="number"
              class="recent-ball"
              :class="{ latest: index === 0 }"
            >
              <span>{{ getBallLabel(number).split('-')[0] }}</span>
              <strong>{{ number }}</strong>
            </div>
          </div>
          <p v-else class="empty-recent">Called numbers will appear here.</p>
          <div class="progress game-progress" role="progressbar" :aria-valuenow="gameProgress" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar" :style="{ width: `${gameProgress}%` }"></div>
          </div>
        </section>

      </aside>

      <section class="cards-stage">
        <div class="stage-toolbar">
          <div>
            <div class="eyebrow">Player cards</div>
            <h2>Casino floor cards</h2>
          </div>
          <div class="card-view-tools">
            <div class="card-pager">
              <button class="btn" type="button" :disabled="cardPageStart === 0" @click="showPreviousCards">‹</button>
              <strong>{{ visibleCardRange }}</strong>
              <button
                class="btn"
                type="button"
                :disabled="cardPageStart + visibleCardCount >= totalPlayerCards"
                @click="showNextCards"
              >›</button>
            </div>
            <div class="view-control" aria-label="Number of cards shown">
              <span>Show</span>
              <div class="btn-group" role="group">
                <button
                  v-for="count in 6"
                  :key="count"
                  type="button"
                  class="btn"
                  :class="{ active: visibleCardCount === count }"
                  :aria-pressed="visibleCardCount === count"
                  @click="setVisibleCardCount(count)"
                >
                  {{ count }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <section class="called-history-frame" aria-label="Called number history">
          <div>
            <span>Call history</span>
            <strong>{{ calledNumbers.length }} of 75</strong>
          </div>
          <div v-if="calledNumbers.length" class="history-balls">
            <span
              v-for="number in calledNumbers.slice(-18).reverse()"
              :key="number"
              :class="{ latest: number === currentCall }"
            >{{ getBallLabel(number) }}</span>
          </div>
          <p v-else>Past calls will appear here as the game begins.</p>
        </section>

        <div
          class="cards-grid"
          :class="`showing-${visibleCards.length}`"
          :style="{ '--card-count': cardGridColumns, '--card-rows': cardGridRows }"
        >
          <article
            v-for="card in visibleCards"
            :key="card.id"
            class="bingo-card"
            :class="{
              winner: winningCardIds.includes(card.id),
              pending: pendingWinnerIds.includes(card.id)
            }"
          >
            <div class="card-top">
              <div>
                <span>{{ getPlayerName(card.id) }}</span>
                <strong>Card {{ String(card.id).padStart(2, '0') }}</strong>
              </div>
              <div v-if="winningCardIds.includes(card.id)" class="winner-badge">Bingo!</div>
              <div v-else-if="pendingWinnerIds.includes(card.id)" class="review-badge">Verify</div>
              <div v-else class="card-id">#{{ 7040 + card.id * 37 }}</div>
            </div>
            <div class="bingo-letters" aria-hidden="true">
              <span v-for="letter in letters" :key="letter">{{ letter }}</span>
            </div>
            <div class="number-grid">
              <button
                v-for="cell in card.cells"
                :key="cell.key"
                class="number-cell"
                :class="{ marked: cell.marked, called: isCalled(cell.number), free: cell.isFree }"
                type="button"
                :aria-label="cell.isFree ? 'Free space' : `${cell.number}${cell.marked && !isCalled(cell.number) ? ', incorrectly daubed' : ''}`"
                :aria-pressed="cell.marked || isCalled(cell.number)"
                @click="toggleCell(card, cell)"
              >
                <span v-if="cell.isFree" class="free-star">★</span>
                <strong>{{ cell.isFree ? 'FREE' : cell.number }}</strong>
              </button>
            </div>
            <p class="card-hint">Called numbers mark automatically · Click any square to mark it</p>
          </article>
        </div>
        <div v-if="winningCardIds.length" class="winner-banner" role="status">
          <span aria-hidden="true">★</span>
          <div>
            <strong>{{ winningCardIds.length }} of {{ maximumWinners }} winners</strong>
            <p>
              Winning cards: {{ winningCardIds.map((id) => String(id).padStart(3, '0')).join(', ') }}.
              Calling will continue.
            </p>
          </div>
          <button class="btn" type="button" @click="startNewGame">New round</button>
        </div>
      </section>
    </main>

    <main v-else-if="currentScreen === 'dealer'" class="dealer-layout">
      <section class="dealer-hero">
        <div>
          <div class="eyebrow">House controls</div>
          <h2>Dealer Console</h2>
        </div>
        <button class="btn popout-btn" type="button" @click="openSeparateScreen('dealer')">↗ Dealer window</button>
        <button class="btn popout-btn" type="button" @click="openSeparateScreen('audience')">↗ Audience window</button>
        <div class="dealer-search">
          <input v-model="cardSearch" type="search" placeholder="Find card #">
          <button type="button" @click="searchForCard">Find</button>
        </div>
        <button
          class="btn edit-setup-btn"
          type="button"
          :disabled="roundActive"
          @click="openSetupEditor"
        >
          {{ setupEditing ? 'Close setup' : 'Edit game setup' }}
        </button>
        <div class="dealer-stats">
          <div><strong>{{ calledNumbers.length }}</strong><span>balls called</span></div>
          <div><strong>{{ winningCardIds.length }}</strong><span>winners</span></div>
          <div><strong>{{ 75 - calledNumbers.length }}</strong><span>remaining</span></div>
        </div>
      </section>

      <section v-if="pendingWinnerIds.length" class="verification-alert" role="alert">
        <div class="alert-symbol">!</div>
        <div>
          <span>Bingo claim — action required</span>
          <strong>
            {{ pendingWinnerIds.length === 1 ? 'A player is waiting for verification' : `${pendingWinnerIds.length} players are waiting for verification` }}
          </strong>
          <p>Number calling is paused until every claim below is approved or rejected.</p>
        </div>
        <div class="alert-card-numbers">
          <i v-for="cardId in pendingWinnerIds" :key="cardId">Card {{ String(cardId).padStart(3, '0') }}</i>
        </div>
      </section>

      <section v-if="roundComplete" class="round-complete-alert" role="status">
        <strong>Winner limit reached — round complete</strong>
        <span>{{ winningCardIds.length }} official winners have been approved and paid.</span>
        <button class="btn" type="button" @click="startNewGame">Start new round</button>
      </section>

      <nav class="dealer-tabs" aria-label="Dealer console sections">
        <button type="button" :class="{ active: dealerSection === 'game' }" @click="dealerSection = 'game'">
          Live game
          <i v-if="pendingWinnerIds.length">{{ pendingWinnerIds.length }}</i>
        </button>
        <button type="button" :class="{ active: dealerSection === 'patterns' }" @click="dealerSection = 'patterns'">
          Patterns
        </button>
        <button type="button" :class="{ active: dealerSection === 'results' }" @click="dealerSection = 'results'">
          Results &amp; credits
        </button>
      </nav>

      <section class="dealer-command-bar">
        <div class="stage-indicator" :class="gameStage.toLowerCase()">
          <span>Round stage</span>
          <strong>{{ gameStage }}</strong>
        </div>
        <div class="round-snapshot">
          <span><strong>{{ activePattern.name }}</strong> pattern</span>
          <span><strong>{{ playerCount }}</strong> players</span>
          <span><strong>{{ totalPlayerCards }}</strong> cards</span>
          <span><strong>{{ winningCardIds.length }}/{{ maximumWinners }}</strong> winners</span>
        </div>
        <button class="btn primary-dealer-action" type="button" @click="runPrimaryDealerAction">
          {{ primaryDealerLabel }}
        </button>
      </section>

      <div class="fixed-dealer-status" :class="{ warning: pendingWinnerIds.length, complete: roundComplete }">
        <strong>{{ gameStage }}</strong>
        <span>{{ dealerNotice }}</span>
        <small>Space: call · P: play/pause · U: undo · V: verification · A: audience</small>
      </div>

      <section v-if="searchedCard" class="dealer-search-result">
        <div>
          <span>Search result</span>
          <strong>Card #{{ String(searchedCard.id).padStart(3, '0') }}</strong>
        </div>
        <label>
          <span>Player name</span>
          <input v-model="playerNames[getPlayerIndex(searchedCard.id)]" type="text">
        </label>
        <div>
          <span>Player</span>
          <strong>#{{ getPlayerIndex(searchedCard.id) + 1 }}</strong>
        </div>
        <div>
          <span>Credit balance</span>
          <strong>{{ playerBalances[getPlayerIndex(searchedCard.id)] }} credits</strong>
        </div>
        <button class="btn" type="button" @click="targetCardId = searchedCard.id; viewTargetCard()">View card</button>
      </section>

      <div class="dealer-grid">
        <section v-if="setupEditing" class="dealer-card game-setup-panel">
          <div class="dealer-section-title">
            <div>
              <div class="eyebrow">Session configuration</div>
              <h3>Players, cards &amp; credits</h3>
            </div>
            <div class="setup-actions">
              <button class="btn advanced-settings-btn" type="button" @click="advancedOpen = !advancedOpen">
                {{ advancedOpen ? 'Hide advanced' : 'Advanced settings' }}
              </button>
              <button class="btn setup-round-btn" type="button" @click="confirmApplyGameSetup">Apply &amp; start round</button>
            </div>
          </div>
          <div class="setup-fields">
            <label><span>Players</span><input v-model.number="playerCount" class="form-control" type="number" min="1" max="500"></label>
            <label><span>Cards per player</span><input v-model.number="cardsPerPlayer" class="form-control" type="number" min="1" max="6"></label>
            <label><span>Maximum winners</span><input v-model.number="maximumWinners" class="form-control" type="number" min="1"></label>
            <label v-show="advancedOpen"><span>Starting credits</span><input v-model.number="startingCredits" class="form-control" type="number" min="0"></label>
            <label v-show="advancedOpen"><span>Card cost</span><input v-model.number="cardCost" class="form-control" type="number" min="0"></label>
            <label v-show="advancedOpen"><span>Prize per winner</span><input v-model.number="winnerPrize" class="form-control" type="number" min="0"></label>
          </div>
          <div class="credit-summary">
            <div><span>Total cards</span><strong>{{ totalPlayerCards }}</strong></div>
            <div><span>Card sales</span><strong>{{ houseCredits }} credits</strong></div>
            <div><span>Prize budget</span><strong>{{ prizePool }} credits</strong></div>
            <div><span>Prizes paid</span><strong>{{ paidPrizeCredits }} credits</strong></div>
          </div>
        </section>

        <section v-show="dealerSection === 'game'" class="dealer-card dealer-call-card">
          <div class="dealer-section-title">
            <div>
              <div class="eyebrow">Live draw</div>
              <h3>Call controls</h3>
            </div>
            <div class="dealer-current-ball">
              <span>{{ currentCall ? getBallLabel(currentCall).split('-')[0] : '—' }}</span>
              <strong>{{ currentCall ?? '—' }}</strong>
            </div>
          </div>
          <div class="dealer-primary-actions">
            <button class="btn btn-call" type="button" :disabled="roundComplete || pendingWinnerIds.length" @click="callNextNumber">Call random ball</button>
            <button class="btn btn-auto" type="button" :disabled="roundComplete || pendingWinnerIds.length" @click="toggleAutoCall">
              {{ isAutoCalling ? '■ Stop automatic play' : '▶ Start automatic play' }}
            </button>
            <button class="btn dealer-undo" type="button" :disabled="!calledNumbers.length" @click="undoLastCall">
              ↶ Undo last call
            </button>
          </div>
          <label class="dealer-speed">
            <span>Automatic call speed</span>
            <select v-model.number="autoDelay" class="form-select" @change="updateAutoDelay">
              <option :value="3">Every 3 seconds</option>
              <option :value="5">Every 5 seconds</option>
              <option :value="8">Every 8 seconds</option>
              <option :value="10">Every 10 seconds</option>
            </select>
          </label>
          <div class="dealer-notice" role="status">{{ dealerNotice }}</div>
        </section>

        <section v-show="dealerSection === 'game'" class="dealer-card target-card-panel">
          <div class="eyebrow">Directed play</div>
          <h3>Featured winner card</h3>
          <p>Select one of the {{ totalPlayerCards }} player cards, then call safe numbers toward its current pattern.</p>
          <label>
            <span>Card number</span>
            <input v-model.number="targetCardId" class="form-control" type="number" min="1" :max="totalPlayerCards">
          </label>
          <div v-if="targetCard" class="target-summary">
            <div>
              <span>Selected card</span>
              <strong>#{{ String(targetCard.id).padStart(3, '0') }}</strong>
            </div>
            <div>
              <span>Pattern</span>
              <strong>{{ activePattern.name }}</strong>
            </div>
            <div>
              <span>Player balance</span>
              <strong>
                {{ playerBalances[Math.floor((targetCard.id - 1) / cardsPerPlayer)] ?? 0 }} credits
              </strong>
            </div>
          </div>
          <button class="btn target-call-btn" type="button" @click="callTowardTargetCard">
            Call next target number
          </button>
          <button class="btn view-target-btn" type="button" @click="viewTargetCard">
            View this player card
          </button>
          <button class="btn view-target-btn" type="button" @click="printVisibleCards">
            Print current card view
          </button>
        </section>

        <section v-show="dealerSection === 'game'" class="dealer-card ball-board-panel">
          <div class="dealer-section-title">
            <div>
              <div class="eyebrow">Manual draw</div>
              <h3>75-ball board</h3>
            </div>
            <span>Click any available ball to call it</span>
          </div>
          <div class="dealer-ball-board">
            <div v-for="(letter, columnIndex) in letters" :key="letter" class="dealer-ball-column">
              <strong>{{ letter }}</strong>
              <button
                v-for="number in 15"
                :key="columnIndex * 15 + number"
                type="button"
                :class="{ called: isCalled(columnIndex * 15 + number) }"
                :disabled="isCalled(columnIndex * 15 + number)"
                @click="callSpecificNumber(columnIndex * 15 + number)"
              >
                {{ columnIndex * 15 + number }}
              </button>
            </div>
          </div>
        </section>

        <section v-show="dealerSection === 'patterns'" class="dealer-card dealer-pattern-panel">
          <div class="dealer-section-title">
            <div>
              <div class="eyebrow">Round setup</div>
              <h3>Winning pattern</h3>
            </div>
            <label class="dealer-rotate-control">
              <span>Auto rotate on Play</span>
              <input v-model="autoRotatePatterns" class="form-check-input" type="checkbox" role="switch">
            </label>
          </div>
          <div class="dealer-pattern-list" role="listbox" aria-label="Select winning Bingo pattern">
            <button
              v-for="pattern in patterns"
              :key="pattern.id"
              type="button"
              :class="{ active: selectedPattern === pattern.id }"
              role="option"
              :aria-selected="selectedPattern === pattern.id"
              @click="choosePattern(pattern.id)"
            >
              <span>{{ pattern.name }}</span>
              <small>{{ pattern.detail }}</small>
            </button>
          </div>
        </section>

        <section v-show="dealerSection === 'game'" id="verification-queue" class="dealer-card verification-panel">
          <div class="dealer-section-title">
            <div>
              <div class="eyebrow">Dealer approval</div>
              <h3>Bingo verification queue</h3>
            </div>
            <span>{{ pendingWinnerIds.length }} awaiting review</span>
          </div>
          <div v-if="pendingWinnerIds.length" class="verification-list">
            <article v-for="cardId in pendingWinnerIds" :key="cardId">
              <div>
                <span>Claimed Bingo</span>
                <strong>Card #{{ String(cardId).padStart(3, '0') }}</strong>
                <small>{{ getPlayerName(cardId) }} · {{ activePattern.name }}</small>
              </div>
              <div class="verification-card-preview" aria-label="Claimed card preview">
                <span
                  v-for="(cell, index) in cards.find((card) => card.id === cardId).cells"
                  :key="cell.key"
                  :class="{
                    called: cell.isFree || isCalled(cell.number),
                    pattern: getMatchedWinningSet(cards.find((card) => card.id === cardId)).includes(index)
                  }"
                >{{ cell.isFree ? '★' : cell.number }}</span>
              </div>
              <button type="button" class="verify-view" @click="targetCardId = cardId; viewTargetCard()">View card</button>
              <button type="button" class="verify-reject" @click="rejectWinner(cardId)">Reject</button>
              <button type="button" class="verify-approve" @click="approveWinner(cardId)">Approve + {{ winnerPrize }}</button>
            </article>
          </div>
          <div v-else class="dealer-empty-state">
            <span>✓</span>
            <p>No Bingo claims are waiting for dealer approval.</p>
          </div>
        </section>

        <section v-show="dealerSection === 'results'" class="dealer-card finance-summary-panel">
          <div class="dealer-section-title">
            <div>
              <div class="eyebrow">Game economy</div>
              <h3>Credits &amp; prizes</h3>
            </div>
            <button class="btn view-target-btn finance-print-btn" type="button" @click="printVisibleCards">
              Print current cards
            </button>
          </div>
          <div class="credit-summary">
            <div><span>Players</span><strong>{{ playerCount }}</strong></div>
            <div><span>Total cards</span><strong>{{ totalPlayerCards }}</strong></div>
            <div><span>Card sales</span><strong>{{ houseCredits }} credits</strong></div>
            <div><span>Prize budget</span><strong>{{ prizePool }} credits</strong></div>
            <div><span>Prizes paid</span><strong>{{ paidPrizeCredits }} credits</strong></div>
            <div><span>Approved winners</span><strong>{{ winningCardIds.length }}</strong></div>
            <div><span>Dealer corrections</span><strong>{{ dealerCorrectionCount }}</strong></div>
          </div>
        </section>

        <section v-if="roundComplete && dealerSection === 'results'" class="dealer-card end-round-report">
          <div class="dealer-section-title">
            <div>
              <div class="eyebrow">Completed session</div>
              <h3>End-of-round report</h3>
            </div>
            <button class="btn setup-round-btn" type="button" @click="printRoundReport">Print report</button>
          </div>
          <div class="report-grid">
            <div><span>Pattern</span><strong>{{ activePattern.name }}</strong></div>
            <div><span>Numbers called</span><strong>{{ calledNumbers.length }}</strong></div>
            <div><span>Official winners</span><strong>{{ winningCardIds.length }}</strong></div>
            <div><span>Credits paid</span><strong>{{ paidPrizeCredits }}</strong></div>
          </div>
          <p><strong>Winning cards:</strong> {{ winningCardIds.map((id) => String(id).padStart(3, '0')).join(', ') }}</p>
          <p><strong>Called balls:</strong> {{ calledNumbers.map(getBallLabel).join(', ') }}</p>
        </section>

        <section v-show="dealerSection === 'results'" class="dealer-card winner-log-panel">
          <div class="dealer-section-title">
            <div>
              <div class="eyebrow">Round results</div>
              <h3>Winner log</h3>
            </div>
            <span>{{ winningCardIds.length }} / {{ maximumWinners }}</span>
          </div>
          <div v-if="winningCardIds.length" class="dealer-winner-list">
            <button
              v-for="(cardId, index) in winningCardIds"
              :key="cardId"
              type="button"
              @click="targetCardId = cardId; viewTargetCard()"
            >
              <span>{{ index + 1 }}</span>
              <strong>Card #{{ String(cardId).padStart(3, '0') }}</strong>
              <i>Paid {{ winnerPrize }} · View ›</i>
            </button>
          </div>
          <div v-else class="dealer-empty-state">
            <span>★</span>
            <p>No winners yet. Start the draw or direct play toward a featured card.</p>
          </div>
          <div v-if="rejectedCardIds.length" class="rejected-log">
            <strong>Rejected claims</strong>
            <button v-for="cardId in rejectedCardIds" :key="cardId" type="button" @click="restoreRejectedClaim(cardId)">
              Card {{ String(cardId).padStart(3, '0') }} · Rejected · Restore
            </button>
          </div>
          <button class="btn dealer-new-round" type="button" @click="confirmNewRound">Start fresh round</button>
        </section>
      </div>
    </main>

    <main v-else class="audience-screen">
      <header class="audience-header">
        <div>
          <img :src="appIcon" alt="">
          <span>Lucky Hall Bingo</span>
        </div>
        <strong>{{ activePattern.name }}</strong>
        <small>{{ calledNumbers.length }} / 75 called</small>
      </header>
      <section class="audience-content">
        <div class="audience-call">
          <span>Current call</span>
          <div class="audience-ball">
            <small>{{ currentCall ? getBallLabel(currentCall).split('-')[0] : '—' }}</small>
            <strong>{{ currentCall ?? '—' }}</strong>
          </div>
          <p>{{ currentCall ? getBallLabel(currentCall) : 'Waiting for the dealer' }}</p>
        </div>
        <div class="audience-side">
          <section>
            <span>Recent calls</span>
            <div class="audience-history">
              <strong v-for="number in recentCalls" :key="number">{{ getBallLabel(number) }}</strong>
            </div>
          </section>
          <section class="audience-pattern">
            <div class="pattern-preview" aria-hidden="true">
              <i v-for="index in 25" :key="index" :class="{ active: isPatternSquare(index - 1) }"></i>
            </div>
            <div><span>Winning pattern</span><strong>{{ activePattern.name }}</strong><p>{{ activePattern.detail }}</p></div>
          </section>
          <section class="audience-winners">
            <span>Official winners</span>
            <strong>{{ winningCardIds.length }} / {{ maximumWinners }}</strong>
            <p v-if="winningCardIds.length">Cards {{ winningCardIds.map((id) => String(id).padStart(3, '0')).join(' · ') }}</p>
            <p v-else>Good luck, players!</p>
          </section>
        </div>
      </section>
    </main>

    <footer v-if="currentScreen === 'floor'" class="app-footer">
      <div class="footer-pattern">
        <div class="pattern-preview" aria-hidden="true">
          <i
            v-for="index in 25"
            :key="index"
            :class="{ active: isPatternSquare(index - 1) }"
          ></i>
        </div>
        <div>
          <span>Winning pattern</span>
          <strong>{{ activePattern.name }}</strong>
          <small>{{ activePattern.detail }}</small>
        </div>
      </div>
      <span><i class="legend-dot called-dot"></i> Called</span>
      <span><i class="legend-dot marked-dot"></i> Player marked</span>
      <span><i class="legend-dot free-dot"></i> Free space</span>
      <small>Good luck &amp; have fun!</small>
    </footer>

    <div v-if="appPrompt.open" class="app-prompt-backdrop" role="presentation" @click.self="closeAppPrompt(false)">
      <section
        class="app-prompt"
        :class="`tone-${appPrompt.tone}`"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="'app-prompt-title'"
      >
        <div class="app-prompt-icon">{{ appPrompt.tone === 'danger' ? '!' : appPrompt.tone === 'warning' ? '?' : '✓' }}</div>
        <div>
          <span>Lucky Hall confirmation</span>
          <h2 id="app-prompt-title">{{ appPrompt.title }}</h2>
          <p>{{ appPrompt.message }}</p>
        </div>
        <footer>
          <button class="btn prompt-cancel-btn" type="button" @click="closeAppPrompt(false)">Cancel</button>
          <button class="btn prompt-confirm-btn" type="button" autofocus @click="closeAppPrompt(true)">
            {{ appPrompt.confirmLabel }}
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>
