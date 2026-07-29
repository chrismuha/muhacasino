(() => {
    const script = document.createElement("script");
    script.src = new URL("../muhaslots/play-session.js", document.currentScript.src).href;
    document.head.append(script);
})();
