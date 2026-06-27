import * as XLSX from 'xlsx-js-style';
import { A, loadData } from './report-export-core.js';
import { buildReportWorkbook } from './report-export-build.js';
import { appendFinalSheets } from './report-export-build-b.js';

function toast(text, type = 'success') {
  const host = document.getElementById('toastStack');
  if (!host) return;
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = text;
  host.append(item);
  setTimeout(() => item.remove(), 5000);
}

function safeFileDate() {
  return new Date().toISOString().slice(0, 10);
}

async function downloadReport(button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Формируем Excel…';

  try {
    const data = await loadData();
    const workbook = buildReportWorkbook(data);
    appendFinalSheets(workbook, data);
    XLSX.writeFile(
      workbook,
      `Фронтовая_агитбригада_отчёт_${safeFileDate()}.xlsx`,
      { compression: true, cellStyles: true },
    );
    toast('Excel-файл для отчёта сформирован.');
  } catch (error) {
    console.error('[report-export]', error);
    toast(error.message || 'Не удалось сформировать Excel-файл.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function installExportButton() {
  if (!A || !['owner', 'manager'].includes(A.role)) return;
  if ((location.hash.slice(1) || 'dashboard') !== 'report') return;

  const actions = document.querySelector('#app .page-actions');
  if (!actions || actions.querySelector('[data-export-report]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-primary';
  button.dataset.exportReport = 'true';
  button.textContent = 'Скачать Excel для отчёта';
  button.addEventListener('click', () => downloadReport(button));
  actions.append(button);

  const intro = document.querySelector('#app .page-intro');
  if (intro && !document.getElementById('reportExportHint')) {
    const hint = document.createElement('div');
    hint.id = 'reportExportHint';
    hint.className = 'callout';
    hint.style.marginBottom = '16px';
    hint.innerHTML = '<strong>Экспорт отчётности</strong><p>Файл собирается из актуальных данных закрытой части. Плановые значения фиксируются по проектной заявке, а фактические показатели, реестры, публикации, бюджет и документы подставляются из базы.</p>';
    intro.insertAdjacentElement('afterend', hint);
  }
}

if (A) {
  const app = document.getElementById('app');
  if (app) {
    new MutationObserver(() => setTimeout(installExportButton, 40))
      .observe(app, { childList: true, subtree: true });
  }
  window.addEventListener('hashchange', () => setTimeout(installExportButton, 80));
  setTimeout(installExportButton, 350);
}
