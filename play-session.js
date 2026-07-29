(() => {
    const startedAt = Date.now();
    const storageKey = "muhaGames.timeZone.v1";
    const fallbackZones = [
        "UTC",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Phoenix",
        "America/Los_Angeles",
        "America/Anchorage",
        "Pacific/Honolulu",
    ];

    function supportedTimeZones() {
        try {
            const zones = Intl.supportedValuesOf("timeZone");
            return zones.includes("UTC") ? zones : ["UTC", ...zones];
        } catch {
            return fallbackZones;
        }
    }

    function formatElapsed(milliseconds) {
        const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
    }

    function zoneLabel(zone) {
        return zone.replaceAll("_", " ").replaceAll("/", " / ");
    }

    function initializePlaySessionDisplay() {
        const title = document.querySelector(".title") || document.querySelector("h1");
        if (!title || document.querySelector(".play-session-display")) return;

        const panel = document.createElement("section");
        panel.className = "play-session-display";
        panel.setAttribute("aria-label", "Play session time");
        panel.innerHTML = `
            <div><span>Time elapsed</span><strong data-play-elapsed>00:00:00</strong></div>
            <div><span>Current time</span><strong data-current-time>—</strong></div>
            <label><span>Time zone</span><select data-time-zone aria-label="Time zone"></select></label>
        `;

        const style = document.createElement("style");
        style.textContent = `
            .play-session-display {
                display: flex; align-items: center; justify-content: center; flex-wrap: wrap;
                gap: 8px 18px; margin: 8px auto 14px; padding: 9px 14px; width: fit-content;
                max-width: 100%; border: 1px solid rgba(255,255,255,.2); border-radius: 12px;
                background: rgba(0,0,0,.28); box-shadow: inset 0 1px rgba(255,255,255,.06);
                color: inherit; font: 600 12px/1.25 system-ui, sans-serif;
            }
            .play-session-display div, .play-session-display label {
                display: grid; gap: 2px; text-align: left; margin: 0;
            }
            .play-session-display span { opacity: .72; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
            .play-session-display strong { font-variant-numeric: tabular-nums; font-size: 14px; }
            .play-session-display select {
                max-width: 230px; min-height: 28px; padding: 3px 26px 3px 7px;
                border: 1px solid rgba(255,255,255,.25); border-radius: 7px;
                background: #171923; color: #fff; font: inherit;
            }
            @media (max-width: 600px) {
                .play-session-display { width: 100%; gap: 8px 12px; }
                .play-session-display select { max-width: 180px; }
            }
        `;
        document.head.append(style);
        title.insertAdjacentElement("afterend", panel);

        const zoneSelect = panel.querySelector("[data-time-zone]");
        const deviceOption = new Option("Device time zone", "");
        zoneSelect.add(deviceOption);
        supportedTimeZones().forEach((zone) => zoneSelect.add(new Option(zoneLabel(zone), zone)));
        try {
            const savedZone = localStorage.getItem(storageKey) || "";
            if ([...zoneSelect.options].some((option) => option.value === savedZone)) zoneSelect.value = savedZone;
        } catch {
            // Storage can be unavailable in privacy-restricted browser contexts.
        }

        zoneSelect.addEventListener("change", () => {
            try {
                localStorage.setItem(storageKey, zoneSelect.value);
            } catch {
                // The clock still works when the preference cannot be saved.
            }
            update();
        });

        const elapsed = panel.querySelector("[data-play-elapsed]");
        const clock = panel.querySelector("[data-current-time]");
        function update() {
            const now = new Date();
            elapsed.textContent = formatElapsed(now.getTime() - startedAt);
            const options = { hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" };
            if (zoneSelect.value) options.timeZone = zoneSelect.value;
            clock.textContent = new Intl.DateTimeFormat(undefined, options).format(now);
        }
        update();
        window.setInterval(update, 1000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializePlaySessionDisplay, { once: true });
    } else {
        initializePlaySessionDisplay();
    }
})();
