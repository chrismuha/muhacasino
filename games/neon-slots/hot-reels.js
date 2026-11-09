(() => {
    const defaults = { enabled: true, triggerChance: 3, spins: 5, minimumMultiplier: 2 };
    function normalize(settings = {}) {
        const number = (key, min, max) => Number.isFinite(Number(settings[key])) ? Math.min(max, Math.max(min, Number(settings[key]))) : defaults[key];
        return { enabled: settings.enabled !== false, triggerChance: number('triggerChance', 0, 100), spins: Math.floor(number('spins', 1, 100)), minimumMultiplier: number('minimumMultiplier', 1, 10) };
    }
    function create(random = Math.random) {
        let cycle = null;
        return {
            reset() { cycle = null; },
            advance(grid, settings, canTrigger = true) {
                const config = normalize(settings);
                if (!config.enabled) cycle = null;
                if (config.enabled && !cycle && canTrigger && random() < config.triggerChance / 100) {
                    cycle = { reel: Math.floor(random() * grid[0].length), row: Math.floor(random() * grid.length), remaining: config.spins, spins: config.spins, minimumMultiplier: config.minimumMultiplier };
                }
                if (!cycle) return { grid, active: false };
                const copy = grid.map(row => [...row]);
                copy[cycle.row][cycle.reel] = { kind: 'hotWild' };
                cycle.remaining--;
                const result = { grid: copy, active: true, ...cycle };
                if (cycle.remaining === 0) cycle = null;
                return result;
            },
            supplement(result, wager, payout) {
                if (!result.active) return 0;
                const minimum = Math.ceil((wager * result.minimumMultiplier) - 1e-9);
                return Math.max(0, minimum - payout);
            },
        };
    }
    window.NeonHotReels = { normalize, create, defaults };
})();
