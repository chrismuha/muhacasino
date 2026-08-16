(() => {
  if (window.bingoApi) return;

  const STATE_KEY = "muha-bingo-live-state";
  const CLOCK_KEY = "muha-bingo-round-clock";
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("muha-bingo-live") : null;
  const listeners = new Set();
  const restoredState = readState();
  let restoredStateDelivered = !restoredState;

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function deliver(state) {
    if (state && typeof state === "object") listeners.forEach((listener) => listener(state));
  }

  function roundHasProgress(state) {
    return Boolean(state && (
      state.calledNumbers?.length
      || state.winningCardIds?.length
      || state.pendingWinnerIds?.length
      || state.rejectedCardIds?.length
    ));
  }

  function roundIsActive(state) {
    if (!roundHasProgress(state)) return false;
    const winnerLimit = Math.max(1, Number(state.maximumWinners) || 1);
    return (state.winningCardIds?.length || 0) < winnerLimit;
  }

  function readClock() {
    try {
      return { elapsedMs: 0, startedAt: null, running: false, ...JSON.parse(localStorage.getItem(CLOCK_KEY) || "{}") };
    } catch {
      return { elapsedMs: 0, startedAt: null, running: false };
    }
  }

  function writeClock(clock) {
    try {
      localStorage.setItem(CLOCK_KEY, JSON.stringify(clock));
    } catch {

    }
  }

  function syncClock(state) {
    const now = Date.now();
    const clock = readClock();
    if (!roundHasProgress(state)) {
      writeClock({ elapsedMs: 0, startedAt: null, running: false });
    } else if (roundIsActive(state) && !clock.running) {
      writeClock({ elapsedMs: Math.max(0, Number(clock.elapsedMs) || 0), startedAt: now, running: true });
    } else if (!roundIsActive(state) && clock.running) {
      writeClock({
        elapsedMs: Math.max(0, Number(clock.elapsedMs) || 0) + Math.max(0, now - Number(clock.startedAt || now)),
        startedAt: null,
        running: false,
      });
    }
  }

  function elapsedMilliseconds() {
    const clock = readClock();
    return Math.max(0, Number(clock.elapsedMs) || 0)
      + (clock.running ? Math.max(0, Date.now() - Number(clock.startedAt || Date.now())) : 0);
  }

  function formattedElapsed() {
    const totalSeconds = Math.floor(elapsedMilliseconds() / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  function syncElapsedDisplay() {
    const display = document.querySelector("#app .play-time-panel > div:first-child strong");
    if (display && display.textContent !== formattedElapsed()) display.textContent = formattedElapsed();
  }

  channel?.addEventListener("message", (event) => {
    if (event.data?.type === "state") deliver(event.data.state);
    if (event.data?.type === "request-state") {
      const state = readState();
      if (state) channel.postMessage({ type: "state", state });
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STATE_KEY || !event.newValue) return;
    try {
      deliver(JSON.parse(event.newValue));
    } catch {

    }
  });

  function openWindow(parameters, name) {
    const url = new URL(window.location.href);
    url.search = "";
    Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
    const build = "20260731-classic-header-final";
    url.searchParams.set("build", build);
    const windowOwner = window.top && window.top !== window ? window.top : window;
    const popup = windowOwner.open("", name);
    if (popup) {
      let current = null;
      try {
        current = popup.location.href === "about:blank" || popup.location.href === ""
          ? null
          : new URL(popup.location.href);
      } catch {

      }
      const wrongScreen = Object.entries(parameters).some(
        ([key, value]) => current?.searchParams.get(key) !== String(value)
      );
      const wrongBuild = current?.searchParams.get("build") !== build;
      if (!current || current.pathname !== url.pathname || wrongScreen || wrongBuild) {
        popup.location.href = url.href;
      }
    }
    popup?.focus();
    return popup;
  }

  window.bingoApi = {
    openScreen(screen) {
      return openWindow({ screen }, `muha-bingo-${screen}`);
    },
    openPlayer(player) {
      return openWindow({ player }, `muha-bingo-player-${player}`);
    },
    onState(listener) {
      listeners.add(listener);
      const state = readState();
      if (state) window.setTimeout(() => {
        restoredStateDelivered = true;
        listener(state);
      }, 0);
      else restoredStateDelivered = true;
      return () => listeners.delete(listener);
    },
    requestState() {
      const state = readState();
      if (state) deliver(state);
      channel?.postMessage({ type: "request-state" });
    },
    publishState(state) {
      if (!restoredStateDelivered && roundHasProgress(restoredState) && !roundHasProgress(state)) {
        deliver(restoredState);
        return;
      }
      syncClock(state);
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
      } catch {

      }
      channel?.postMessage({ type: "state", state });
    },
    appReady() {
      if (window.top === window && new URLSearchParams(window.location.search).has("screen")) {
        document.documentElement.classList.add("bingo-popout-window");
      }
    },
  };

  syncClock(restoredState);
  const elapsedObserver = new MutationObserver(syncElapsedDisplay);
  elapsedObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.setInterval(syncElapsedDisplay, 250);
})();
