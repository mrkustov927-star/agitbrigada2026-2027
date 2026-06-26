import './app-v3.js';

function localizeStageCodes() {
  document.querySelectorAll('.v3-event-code').forEach(node => {
    const value = node.textContent.trim();
    const match = value.match(/^EVT-(\d+)$/i);
    if (!match) return;
    node.textContent = `Этап ${Number(match[1])}`;
    node.setAttribute('aria-label', `Этап ${Number(match[1])}`);
  });
}

const app = document.getElementById('app');
const observer = new MutationObserver(localizeStageCodes);
observer.observe(app, { childList: true, subtree: true });
localizeStageCodes();
