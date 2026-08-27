// 应用入口
import { loadData, allCountries } from './data.js';
import { view, ui } from './state.js';
import { draw, fitView, focusOn, focusYear } from './renderer.js';
import { initInteraction } from './interaction.js';
import { openDetail, updateTooltip, initPanels } from './panels.js';
import { initAI } from './ai.js';
import { initNotes } from './notes.js';
import { initUI, updateScaleInfo } from './ui.js';

const canvas = document.getElementById('timeline');
const ctx = canvas.getContext('2d');
let dpr = 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  view.cw = Math.max(320, rect.width);
  view.ch = Math.max(240, rect.height);
  canvas.width = Math.round(view.cw * dpr);
  canvas.height = Math.round(view.ch * dpr);
  canvas.style.width = view.cw + 'px';
  canvas.style.height = view.ch + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function render() {
  draw(ctx, view.cw, view.ch);
  updateScaleInfo();
}

function focusAndSelect(item, country) {
  ui.selection = { kind: item.type || 'period', item, countryId: country?.id || null, country };
  focusOn(item, country);
  render();
}

function showFatal(err) {
  const isFile = (typeof location !== 'undefined' && location.protocol === 'file:');
  const hint = document.getElementById('hint');
  hint.style.display = 'block';
  hint.style.background = 'rgba(150,40,40,0.95)';
  if (isFile) {
    hint.textContent = '⚠️ 检测到您以 file:// 方式直接打开页面，浏览器会拦截数据加载。请使用本地静态服务器（如 `python -m http.server 8000`）或部署到 GitHub Pages 后访问。';
  } else {
    hint.textContent = '❌ 数据加载失败：' + (err?.message || err) + '（请通过本地服务器或 GitHub Pages 访问）';
  }
}

function showEmptyWarning() {
  const hint = document.getElementById('hint');
  hint.style.display = 'block';
  hint.style.background = 'rgba(150,90,20,0.95)';
  hint.textContent = '⚠️ 已加载页面，但未找到任何国家数据，请检查 data/countries.json。';
}

async function boot() {
  try {
    await loadData();
  } catch (err) {
    showFatal(err);
    return;
  }

  resize();
  fitView();
  render();

  if (!allCountries().length) showEmptyWarning();

  initPanels();

  initInteraction(canvas, {
    onSelect: (hit) => {
      if (hit) {
        ui.selection = hit;
        render();
        openDetail(hit);
      }
    },
    onHover: (hit, pos) => updateTooltip(hit, pos),
    onViewChange: () => render(),
  });

  initUI({
    render,
    onFocus: focusAndSelect,
  });

  initAI({
    onDataChanged: () => render(),
    onFocus: (item, country) => {
      focusAndSelect(item, country);
      const kind = item.type === 'person' ? 'person' : 'event';
      openDetail({ kind, item, countryId: country?.id, country });
    },
  });

  initNotes({
    onDataChanged: () => render(),
    onFocusYear: (year) => { focusYear(year); render(); },
  });

  window.addEventListener('resize', () => { resize(); render(); });

  // 首次提示渐隐
  setTimeout(() => {
    const hint = document.getElementById('hint');
    if (hint) hint.style.opacity = '0';
  }, 5000);
}

boot();
