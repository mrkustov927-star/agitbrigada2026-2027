if (!document.querySelector('link[data-closed-actualization]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './closed-actualization.css?v=1';
  link.dataset.closedActualization = 'true';
  document.head.append(link);
}

await import('./closed-actualization.js');
