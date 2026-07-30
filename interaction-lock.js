(() => {
  const style = document.createElement("style");
  style.textContent = `
    html, body, body * {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }

    img, svg {
      -webkit-user-drag: none !important;
      user-drag: none !important;
    }
  `;
  document.head.append(style);

  ["copy", "cut", "dragstart", "selectstart"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => event.preventDefault(), { capture: true });
  });
})();
