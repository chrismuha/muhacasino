const games = [
  ["big-money-deluxe", "Big Money Deluxe"],
  ["neon-slots", "Neon Slots"],
  ["pretty-penny", "Pretty Penny"],
  ["treasurepots", "TreasurePots"],
];

const money = (value) => `$${Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const cards = games.map(([gameId, title]) => {
  let stats = {};
  try {
    stats = JSON.parse(localStorage.getItem(`muhaCasino.slotExperience.${gameId}.v1`) || "{}");
  } catch { }

  const wagered = Math.max(0, Number(stats.lifetimeWagered) || 0);
  const won = Math.max(0, Number(stats.lifetimeWon) || 0);
  const lost = Math.max(0, Number(stats.lifetimeLost) || 0);
  const net = won - wagered;
  const card = document.createElement("article");
  card.className = "overall-stat-card";
  card.innerHTML = `<h2>${title}</h2><div><span>Won overall</span><strong>${money(won)}</strong></div><div><span>Lost overall</span><strong>${money(lost)}</strong></div><div><span>Wagered overall</span><strong>${money(wagered)}</strong></div><div><span>Net</span><strong class="${net >= 0 ? "positive" : "negative"}">${money(net)}</strong></div>`;
  return card;
});

document.querySelector("#overallStatsGrid")?.replaceChildren(...cards);
