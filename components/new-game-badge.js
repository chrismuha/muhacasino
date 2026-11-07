// Use <new-game-badge is-new> or set badge.isNew = true.
customElements.define('new-game-badge', class extends HTMLElement {
  static observedAttributes = ['is-new'];
  get isNew() { return this.hasAttribute('is-new'); }
  set isNew(value) { this.toggleAttribute('is-new', value === true); }
  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }
  render() { this.innerHTML = this.isNew ? '<span class="new-game-badge">NEW</span>' : ''; }
});
