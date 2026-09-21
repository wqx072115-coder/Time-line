// 顶部工具栏、搜索、添加事件、设置、备份
import { store, allCountries, allEvents, saveData, exportAll, importAll, matchNationality, findCountry } from './data.js';
import { view, CONST } from './state.js';
import { fitView, xToYear } from './renderer.js';
import { zoomAt } from './interaction.js';
import { initEditor, openEditor } from './editor.js';
import { openDetail, showPanel, togglePanel } from './panels.js';
import { escapeHtml, formatYearShort, toast } from './utils.js';

export function initUI(opts = {}) {
  const render = opts.render || (() => {});
  const onFocus = opts.onFocus || (() => {});

  // ---------- 缩放 / 总览 ----------
  document.getElementById('btnFit').addEventListener('click', () => { fitView(); render(); });
  document.getElementById('btnZoomIn').addEventListener('click', () => {
    zoomAt((view.cw) / 2, (view.ch) / 2, 1.4); render();
  });
  document.getElementById('btnZoomOut').addEventListener('click', () => {
    zoomAt((view.cw) / 2, (view.ch) / 2, 1 / 1.4); render();
  });

  // ---------- 面板开关 ----------
  document.getElementById('btnAI').addEventListener('click', () => togglePanel(document.getElementById('aiPanel')));
  document.getElementById('btnNotes').addEventListener('click', () => togglePanel(document.getElementById('notesPanel')));
  document.getElementById('btnSettings').addEventListener('click', () => {
    if (window._openSettings) window._openSettings();
    showPanel(document.getElementById('settingsPanel'));
  });
  document.getElementById('btnAddEvent').addEventListener('click', () => openEditor());

  // ---------- 搜索 ----------
  initSearch(onFocus, render);

  // ---------- 添加事件 ----------
  initEditor({render, onFocus});

  // ---------- 设置 / 备份 ----------
  initSettings(render);
}

// 更新比例/范围显示
export function updateScaleInfo() {
  const el = document.getElementById('scaleInfo');
  if (!el) return;
  const a = xToYear(CONST.GUTTER_W);
  const b = xToYear(view.cw || 1200);
  el.textContent = `${formatYearShort(Math.floor(a))} — ${formatYearShort(Math.ceil(b))} · ${view.scale.toFixed(2)}px/年`;
}

// ---------- 搜索 ----------
function initSearch(onFocus, render) {
  const input = document.getElementById('searchInput');
  const res = document.getElementById('searchResults');

  function buildHits(q) {
    const hits = [];
    allCountries().forEach(c => {
      (c.periods || []).forEach(p => {
        if (p.name.toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q)) {
          hits.push({ kind: 'period', item: p, country: c, color: p.color || c.color, tag: '朝代' });
        }
      });
    });
    allEvents().forEach(e => {
      const hay = ((e.name || '') + ' ' + (e.nameEn || '')).toLowerCase();
      if (hay.includes(q)) {
        if (e.type === 'person') {
          const c = (e.nationality || []).map(matchNationality).find(Boolean);
          hits.push({ kind: 'person', item: e, country: c, color: '#0e7c66', tag: '人物' });
        } else {
          const c = findCountry(e.country);
          hits.push({ kind: 'event', item: e, country: c, color: '#8e44ad', tag: '事件' });
        }
      }
    });
    return hits.slice(0, 30);
  }

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { res.innerHTML = ''; res.classList.remove('show'); return; }
    const hits = buildHits(q);
    if (!hits.length) {
      res.innerHTML = '<div class="search-empty">未找到相关条目</div>';
    } else {
      res.innerHTML = hits.map(h => `
        <div class="search-item" data-i="${hits.indexOf(h)}">
          <span class="swatch" style="background:${h.color}"></span>
          <span>${escapeHtml(h.item.name)}</span>
          <span class="tag">${escapeHtml(h.tag)}${h.country ? ' · ' + escapeHtml(h.country.name) : ''}</span>
        </div>`).join('');
      res.querySelectorAll('.search-item').forEach(el => {
        el.addEventListener('click', () => {
          const hit = hits[Number(el.getAttribute('data-i'))];
          selectHit(hit, onFocus, render);
          res.classList.remove('show');
          input.value = '';
        });
      });
    }
    res.classList.add('show');
  });

  input.addEventListener('blur', () => {
    setTimeout(() => res.classList.remove('show'), 180);
  });
  input.addEventListener('focus', () => {
    if (input.value.trim()) res.classList.add('show');
  });
}

function selectHit(hit, onFocus, render) {
  if (!hit.country) {
    // 人物没有匹配国家时，退化为仅打开详情
    openDetail(hit);
    return;
  }
  onFocus(hit.item, hit.country);
  render();
  openDetail(hit);
}


// ---------- 设置 ----------
function initSettings(render) {
  const provider = document.getElementById('stProvider');
  const openaiFields = document.getElementById('stOpenaiFields');
  const geminiFields = document.getElementById('stGeminiFields');

  function syncProviderUI() {
    const isGemini = provider.value === 'gemini';
    openaiFields.classList.toggle('hidden', isGemini);
    geminiFields.classList.toggle('hidden', !isGemini);
  }
  provider.addEventListener('change', syncProviderUI);

  function openSettings() {
    const s = store.settings;
    provider.value = s.provider;
    document.getElementById('stEndpoint').value = s.endpoint;
    document.getElementById('stModel').value = s.model;
    document.getElementById('stGeminiModel').value = s.geminiModel;
    document.getElementById('stKey').value = s.apiKey;
    syncProviderUI();
  }
  window._openSettings = openSettings;

  document.getElementById('stSave').addEventListener('click', () => {
    store.settings.provider = provider.value;
    store.settings.endpoint = document.getElementById('stEndpoint').value.trim() || store.settings.endpoint;
    store.settings.model = document.getElementById('stModel').value.trim() || store.settings.model;
    store.settings.geminiModel = document.getElementById('stGeminiModel').value.trim() || store.settings.geminiModel;
    store.settings.apiKey = document.getElementById('stKey').value.trim();
    saveData.settings();
    toast('设置已保存');
  });

  // 导出
  document.getElementById('btnExport').addEventListener('click', () => {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'history-timeline-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('已导出备份文件');
  });

  // 导入
  document.getElementById('btnImport').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (!confirm('导入将替换当前浏览器中的个人记录。请确认已导出备份。')) return;
        importAll(reader.result);
        fitView();
        render();
        toast('导入成功');
      } catch (err) {
        toast('导入失败：' + (err.message || err));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}
