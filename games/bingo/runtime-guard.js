(() => {
  const state = document.querySelector("#bingoStartupState");
  const title = document.querySelector("#bingoStartupTitle");
  const message = document.querySelector("#bingoStartupMessage");
  const actions = document.querySelector("#bingoStartupActions");
  const reload = document.querySelector("#bingoStartupReload");
  const startedAt = Date.now();
  let settled = false;

  function hasVisibleGame() {
    const theme = document.documentElement.dataset.bingoTheme || "planet-hall-2";
    const isPopout = document.documentElement.classList.contains("bingo-popout-window");
    const app = document.querySelector("#app");
    const themedShell = !isPopout && theme === "planet-hall-2"
      ? document.querySelector(".planet-hall-shell")
      : null;
    const targets = [themedShell, app].filter(Boolean);
    return targets.some((target) => {
      if (!target.children.length) return false;
      const style = window.getComputedStyle(target);
      return style.display !== "none" && style.visibility !== "hidden" &&
        target.getBoundingClientRect().height > 40;
    });
  }

  function showFailure(reason) {
    if (settled) return;
    title.textContent = "Muha Bingo did not load";
    message.textContent = reason || "Reload this window. Your saved Hall settings will be preserved.";
    actions.hidden = false;
    state.hidden = false;
  }

  function inspect() {
    if (hasVisibleGame()) {
      settled = true;
      state.hidden = true;
      return;
    }
    if (Date.now() - startedAt >= 10000) {
      showFailure("The game window opened without visible content.");
      return;
    }
    window.setTimeout(inspect, 100);
  }

  window.addEventListener("error", () => {
    window.setTimeout(() => {
      if (!hasVisibleGame()) showFailure("A game file failed while this window was starting.");
    }, 100);
  });
  window.addEventListener("unhandledrejection", () => {
    window.setTimeout(() => {
      if (!hasVisibleGame()) showFailure("Bingo could not finish starting.");
    }, 100);
  });
  reload.addEventListener("click", () => {
    const url = new URL(window.location.href);
    url.searchParams.set("reload", Date.now().toString());
    window.location.replace(url.href);
  });

  inspect();
})();
