if (!document.querySelector('link[data-closed-actualization]')) {
  const base = document.createElement('link');
  base.rel = 'stylesheet';
  base.href = './closed-actualization.css?v=2';
  base.dataset.closedActualization = 'true';
  document.head.append(base);
}

if (!document.querySelector('link[data-closed-polish]')) {
  const polish = document.createElement('link');
  polish.rel = 'stylesheet';
  polish.href = './closed-polish.css?v=1';
  polish.dataset.closedPolish = 'true';
  document.head.append(polish);
}

await import('./closed-actualization.js');
