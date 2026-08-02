(() => {
  if (window.bingoApi) return;

  const STATE_KEY = "muha-bingo-live-state";
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("muha-bingo-live") : null;
  const listeners = new Set();
  const windowId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const navigationEntry = window.performance?.getEntriesByType?.("navigation")?.[0];

  if (navigationEntry?.type === "reload") {
    try {
      localStorage.removeItem(STATE_KEY);
    } catch {
      // A reload still starts from the app defaults when storage is unavailable.
    }
    channel?.postMessage({ type: "round-reset", source: windowId });
  }

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

  channel?.addEventListener("message", (event) => {
    if (event.data?.type === "state") deliver(event.data.state);
    if (event.data?.type === "round-reset" && event.data.source !== windowId) {
      try {
        localStorage.removeItem(STATE_KEY);
      } catch {
        // Connected windows will stop restoring the previous round when possible.
      }
    }
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
      // Ignore an incomplete storage event.
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
        // A named window from another page can still be safely navigated below.
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
      if (state) window.setTimeout(() => listener(state), 0);
      return () => listeners.delete(listener);
    },
    requestState() {
      const state = readState();
      if (state) deliver(state);
      channel?.postMessage({ type: "request-state" });
    },
    publishState(state) {
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
      } catch {
        // Open windows still synchronize through BroadcastChannel.
      }
      channel?.postMessage({ type: "state", state });
    },
    appReady() {
      if (new URLSearchParams(window.location.search).has("screen")) {
        document.documentElement.classList.add("bingo-popout-window");
      }
    },
  };
})();
