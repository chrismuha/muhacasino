(() => {
  const versionNode = document.querySelector("#diagnosticVersion");
  const buildNode = document.querySelector("#diagnosticBuild");
  const themeNode = document.querySelector("#diagnosticTheme");
  const cacheNode = document.querySelector("#diagnosticCache");
  const windowCountNode = document.querySelector("#diagnosticWindowCount");
  const windowListNode = document.querySelector("#diagnosticWindowList");
  const refreshButton = document.querySelector("#refreshDiagnostics");
  const clearButton = document.querySelector("#clearCasinoData");
  const build = document.querySelector('meta[name="muha-build"]')?.content || "Unknown";
  const channel = "BroadcastChannel" in window
    ? new BroadcastChannel("muha-bingo-diagnostics")
    : null;
  const connectedWindows = new Map();
  let activeRequest = "";

  function displayTheme(value) {
    return {
      planet: "Planet Hall 2",
      classic: "Planet Hall",
      current: "Classic",
    }[value] || "Planet Hall 2";
  }

  async function readCacheStatus() {
    const registrations = "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistrations().catch(() => [])
      : [];
    const cacheNames = "caches" in window
      ? await window.caches.keys().catch(() => [])
      : [];
    const casinoCaches = cacheNames.filter((name) => name.startsWith("muha-casino-"));
    if (!registrations.length && !casinoCaches.length) return "Direct loading · clear";
    return `${registrations.length} worker · ${casinoCaches.length} cache`;
  }

  function renderWindows() {
    const windows = [...connectedWindows.values()];
    windowCountNode.textContent = String(windows.length);
    windowListNode.textContent = windows.length
      ? windows.map((item) => item.label).sort().join(" · ")
      : "No Bingo windows responded";
  }

  async function refreshDiagnostics() {
    refreshButton.disabled = true;
    buildNode.textContent = build;
    try {
      const packageInfo = await fetch(`package.json?build=${encodeURIComponent(build)}`, {
        cache: "no-store",
      }).then((response) => response.json());
      versionNode.textContent = `v${packageInfo.version || "1.1.2"}`;
    } catch {
      versionNode.textContent = "v1.1.2";
    }
    try {
      themeNode.textContent = displayTheme(localStorage.getItem("muha-bingo-theme"));
    } catch {
      themeNode.textContent = "Unavailable";
    }
    cacheNode.textContent = await readCacheStatus();

    connectedWindows.clear();
    renderWindows();
    activeRequest = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    channel?.postMessage({ type: "presence-request", requestId: activeRequest });
    window.setTimeout(() => {
      renderWindows();
      refreshButton.disabled = false;
    }, 650);
  }

  channel?.addEventListener("message", (event) => {
    const message = event.data;
    if (message?.type !== "presence" || message.requestId !== activeRequest) return;
    connectedWindows.set(message.id, message);
    renderWindows();
  });

  refreshButton.addEventListener("click", refreshDiagnostics);
  clearButton.addEventListener("click", async () => {
    const approved = window.confirm(
      "Clear all Muha Casino saved preferences, old caches, and service workers, then reload?"
    );
    if (!approved) return;
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Continue clearing browser-managed caches.
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const names = await window.caches.keys().catch(() => []);
      await Promise.all(names.map((name) => window.caches.delete(name)));
    }
    window.location.reload();
  });

  refreshDiagnostics();
})();
