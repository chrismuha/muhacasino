(() => {
  const tabList = document.querySelector(".history-nav");
  const cards = [...document.querySelectorAll(".history-card")];
  if (!tabList || !cards.length) return;

  const tabs = [...tabList.querySelectorAll("a[href^='#']")];
  const pages = new Map();

  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-label", "Game release histories");

  function releaseCategory(text) {
    if (/fix|repair|restore|stabil|recover|crash|bug|cache|reliab|prevent|correct/i.test(text)) return "Reliability";
    if (/integrat|casino|launcher|category|portable|shared|window|session track/i.test(text)) return "Casino integration";
    if (/play|spin|payout|jackpot|bonus|wager|card|bingo|call|winner|pattern|rule|pawn|dice|score|credit|prize/i.test(text)) return "Gameplay";
    if (/design|display|screen|layout|responsive|mobile|color|contrast|readab|header|footer|button|control|dialog|art|icon|typograph|navigation/i.test(text)) return "Interface and accessibility";
    return "General improvements";
  }

  function categorizeRelease(release) {
    if (release.querySelector(":scope > .release-groups, :scope > .release-categories")) return;
    const list = release.querySelector(":scope > ul");
    if (!list) {
      const paragraph = release.querySelector(":scope > p");
      if (!paragraph) return;
      const group = document.createElement("div");
      group.className = "release-category";
      group.innerHTML = "<h4>Release</h4>";
      paragraph.before(group);
      group.append(paragraph);
      return;
    }
    const groups = new Map();
    [...list.children].forEach((item) => {
      const category = releaseCategory(item.textContent);
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(item);
    });
    const container = document.createElement("div");
    container.className = "release-categories";
    groups.forEach((items, category) => {
      const group = document.createElement("div");
      group.className = "release-category";
      const heading = document.createElement("h4");
      const categorizedList = document.createElement("ul");
      heading.textContent = category;
      items.forEach((item) => categorizedList.append(item));
      group.append(heading, categorizedList);
      container.append(group);
    });
    list.replaceWith(container);
  }

  function showRelease(card, requestedIndex = 0, focus = false) {
    const releases = [...card.querySelectorAll(":scope > section")];
    const index = Math.max(0, Math.min(releases.length - 1, requestedIndex));
    pages.set(card.id, index);
    releases.forEach((release, releaseIndex) => {
      release.hidden = releaseIndex !== index;
    });
    card.querySelectorAll("[data-release-index]").forEach((button) => {
      const active = Number(button.dataset.releaseIndex) === index;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (focus) releases[index]?.querySelector("h3")?.focus({ preventScroll: true });
  }

  cards.forEach((card) => {
    const releases = [...card.querySelectorAll(":scope > section")];
    releases.forEach((release, index) => {
      categorizeRelease(release);
      const heading = release.querySelector("h3");
      if (heading) {
        heading.tabIndex = -1;
        heading.id ||= `${card.id}-release-${index + 1}`;
        release.setAttribute("aria-labelledby", heading.id);
      }
    });
    const versionNav = document.createElement("nav");
    versionNav.className = "release-version-nav";
    versionNav.setAttribute("aria-label", `${card.querySelector("h2")?.textContent || card.id} versions`);
    versionNav.innerHTML = releases.map((release, index) => {
      const version = release.querySelector("h3")?.textContent.match(/v\d+\.\d+\.\d+/)?.[0] || `Release ${index + 1}`;
      return `<button type="button" data-release-index="${index}" aria-pressed="false">${version}</button>`;
    }).join("");
    versionNav.addEventListener("click", (event) => {
      const button = event.target.closest("[data-release-index]");
      if (!button) return;
      showRelease(card, Number(button.dataset.releaseIndex));
    });
    versionNav.addEventListener("keydown", (event) => {
      const buttons = [...versionNav.querySelectorAll("button")];
      if (!buttons.includes(event.target) || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const current = buttons.indexOf(event.target);
      const next = event.key === "Home" ? 0
        : event.key === "End" ? buttons.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
      buttons[next].click();
    });
    card.querySelector(":scope > header").insertAdjacentElement("afterend", versionNav);
    showRelease(card);
  });

  function selectGame(id, updateHash = true) {
    const selected = cards.find((card) => card.id === id) || cards[0];
    cards.forEach((card) => {
      const active = card === selected;
      card.hidden = !active;
      card.setAttribute("role", "tabpanel");
      card.setAttribute("aria-labelledby", `history-tab-${card.id}`);
    });
    tabs.forEach((tab) => {
      const active = tab.getAttribute("href") === `#${selected.id}`;
      tab.id = `history-tab-${tab.getAttribute("href").slice(1)}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    showRelease(selected, pages.get(selected.id) || 0);
    if (updateHash) history.replaceState(null, "", `#${selected.id}`);
  }

  tabList.addEventListener("click", (event) => {
    const tab = event.target.closest("a[href^='#']");
    if (!tab) return;
    event.preventDefault();
    selectGame(tab.getAttribute("href").slice(1));
    tab.focus();
  });

  tabList.addEventListener("keydown", (event) => {
    if (!tabs.includes(event.target) || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = tabs.indexOf(event.target);
    const next = event.key === "Home" ? 0
      : event.key === "End" ? tabs.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click();
  });

  const requestedGame = window.location.hash.slice(1);
  selectGame(cards.some((card) => card.id === requestedGame) ? requestedGame : cards[0].id, false);
})();
