// 详情面板与提示框
import { periodDescription, setPeriodDescription, matchNationality, removeEntry, removePeriod } from './data.js';
import { openEditor } from './editor.js';
import { getPeriodMap } from './maps.js';
import { formatYearFull, rangeLabel, escapeHtml, toast } from './utils.js';

function countryNameOf(nat) {
  const c = matchNationality(nat);
  return c ? c.name : String(nat);
}

function personHTML(p) {
  const dates = p.death != null
    ? `${formatYearFull(p.birth)} — ${formatYearFull(p.death)}`
    : `生于 ${formatYearFull(p.birth)}`;
  const nats = (Array.isArray(p.nationality) ? p.nationality : [p.nationality])
    .map(countryNameOf).filter(Boolean).join('、') || '—';
  return `
    <div class="person-avatar">${escapeHtml(p.category || '人物') === '科学家' ? '🔬' : '👤'}</div>
    <h2 style="margin:4px 0">${escapeHtml(p.name)}</h2>
    <div class="detail-dates">${dates}</div>
    ${p.birthDate ? `<div class="detail-meta">出生日期：${escapeHtml(p.birthDate)}</div>` : ''}
    ${p.deathDate ? `<div class="detail-meta">逝世日期：${escapeHtml(p.deathDate)}</div>` : ''}
    <div class="detail-meta">国籍：${escapeHtml(nats)}</div>
    <div class="detail-meta">人物线表示生平，不表示在各国拥有国籍的完整时段。</div>
    ${p.birthPlace ? `<div class="detail-meta">出生地：${escapeHtml(p.birthPlace)}</div>` : ''}
    ${p.category ? `<div class="detail-meta">分类：${escapeHtml(p.category)}</div>` : ''}
    <div class="detail-desc">${escapeHtml(p.description || '（暂无说明）')}</div>
    ${p.nameEn ? `<div class="detail-meta">${escapeHtml(p.nameEn)}</div>` : ''}
  `;
}

function eventHTML(e) {
  return `
    <h2 style="margin:4px 0">${escapeHtml(e.name)}</h2>
    <div class="detail-dates">${formatYearFull(e.year)}</div>
    ${e.category ? `<div class="detail-meta">分类：${escapeHtml(e.category)}</div>` : ''}
    <div class="detail-desc">${escapeHtml(e.description || '（暂无说明）')}</div>
  `;
}

function countryHTML(c) {
  const periods = (c.periods || []).map(p =>
    `<li>${escapeHtml(p.name)}（${rangeLabel(p.start, p.end)}）</li>`
  ).join('');
  return `
    <div class="detail-dates">${escapeHtml(c.nameEn || c.name)}</div>
    <div class="detail-desc">${c.periods?.length ? '该国家共 ' + c.periods.length + ' 个时期：' : '暂无时期数据（可编辑 data/countries.json 添加）。'}</div>
    ${periods ? `<ul style="font-size:13px;line-height:1.9;padding-left:18px;margin:0 0 10px">${periods}</ul>` : ''}
    <div class="detail-meta">点击各彩色时期查看地图与简介。</div>
  `;
}

function periodMapHTML(country, period) {
  const m = getPeriodMap(country, period);
  // JSON 中显式配置的 mapImage 优先；否则使用维基共享资源地图
  const src = period.mapImage || m.img;
  if(!src) return '<div class="map-caption">尚未收录此时期的历史地图。可通过“编辑时期”添加地图图片及来源。</div>';
  return `
    <img src="${escapeHtml(src)}" alt="${escapeHtml(period.name)}地图" loading="lazy" referrerpolicy="no-referrer">
    <div class="map-caption">${escapeHtml(period.mapSource || m.caption || '历史参考地图，范围以来源标注年代为准')} · ${period.mapImage ? '自定义图片' : 'Wikimedia Commons'}</div>`;
}

function periodMapFallbackHTML(country, period) {
  return `<div class="map-caption">地图暂时无法加载。请通过下方资料链接查看，或编辑时期添加可访问的地图网址。</div>`;
}

export function openDetail(hit) {
  if (!hit || !hit.item) return;
  hit = {...hit, countryId: hit.countryId || hit.country?.id};
  const panel = document.getElementById('detailPanel');
  const title = document.getElementById('detailTitle');
  const body = document.getElementById('detailBody');

  if (hit.kind === 'period') {
    const { item: p, country } = hit;
    title.textContent = `${country.name} · ${p.name}`;
    const custom = periodDescription(country.id, p.id);
    const desc = custom ?? p.description ?? '';
    const m = getPeriodMap(country, p);
    body.innerHTML = `
      <div class="detail-dates">${rangeLabel(p.start, p.end)}</div>
      <div class="map-wrap" id="periodMapWrap">${periodMapHTML(country, p)}</div>
      ${m.source && !p.mapImage ? `<a class="map-link" href="${escapeHtml(m.source)}" target="_blank" rel="noopener">地图作者、版本与许可 ↗</a>` : ''}
      <a class="map-link" href="${escapeHtml(m.article)}" target="_blank" rel="noopener">在维基百科查看「${escapeHtml(p.name)}」▸</a>
      <div class="detail-desc-label">简介${custom ? '（已自定义）' : ''}</div>
      <div class="detail-desc" id="descText">${escapeHtml(desc)}</div>
      <button class="btn" id="btnEditDesc">✏️ 编辑简介</button>
      <div class="detail-meta">国家：${escapeHtml(country.name)} · 时期：${escapeHtml(p.name)}</div>
    `;
    body.querySelector('#btnEditDesc').onclick = () => editDesc(country, p, body);
    // 维基地图加载失败时回退为示意图
    const wrap = body.querySelector('#periodMapWrap');
    const img = wrap && wrap.querySelector('img');
    if (img) {
      img.addEventListener('error', () => {
        wrap.innerHTML = periodMapFallbackHTML(country, p);
      });
    }
  } else if (hit.kind === 'person') {
    title.textContent = hit.item.name;
    body.innerHTML = personHTML(hit.item);
  } else if (hit.kind === 'event') {
    title.textContent = hit.item.name;
    body.innerHTML = eventHTML(hit.item);
  } else if (hit.kind === 'country') {
    title.textContent = hit.item.name;
    body.innerHTML = countryHTML(hit.item);
  }

  if(hit.kind!=='country'){
    const actions=document.createElement('div');actions.className='row';
    const edit=document.createElement('button');edit.className='btn';edit.textContent=hit.kind==='period'?'编辑时期 / 地图':'编辑记录';edit.onclick=()=>openEditor(hit.item,hit.countryId);actions.append(edit);
    const note=document.createElement('button');note.className='btn';note.textContent='记一条笔记';note.onclick=()=>document.dispatchEvent(new CustomEvent('new-note',{detail:hit}));actions.append(note);
    const del=document.createElement('button');del.className='btn';del.textContent='删除记录';del.onclick=()=>{if(confirm('删除这条记录？内置记录只会在此浏览器中隐藏。')){if(hit.kind==='period')removePeriod(hit.countryId,hit.item.id);else removeEntry(hit.item.id);hidePanel(panel);}};actions.append(del);
    body.append(actions);
    if(/^https?:\/\//.test(hit.item.sourceUrl||'')){const a=document.createElement('a');a.href=hit.item.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.className='map-link';a.textContent='查看资料来源 ↗';body.append(a);}
    if(hit.item.source==='ai'){const p=document.createElement('p');p.className='hint-text';p.textContent='AI 生成资料，请结合来源核对年代和表述。';body.append(p);}
  }
  showPanel(panel);
}

function editDesc(country, p, body) {
  const div = body.querySelector('#descText');
  const current = periodDescription(country.id, p.id) ?? p.description ?? '';
  const ta = document.createElement('textarea');
  ta.className = 'desc-editor';
  ta.rows = 6;
  ta.value = current;
  div.replaceWith(ta);
  const btn = body.querySelector('#btnEditDesc');
  btn.textContent = '💾 保存简介';
  btn.onclick = () => {
    setPeriodDescription(country.id, p.id, ta.value);
    toast('简介已保存');
    openDetail({ kind: 'period', item: p, countryId: country.id, country });
  };
}

export function updateTooltip(hit, pos) {
  const t = document.getElementById('tooltip');
  if (!hit || !hit.item || hit.kind === 'country') {
    t.style.display = 'none';
    return;
  }
  let text = '';
  if (hit.kind === 'period') {
    text = `${hit.country.name} · ${hit.item.name}\n${rangeLabel(hit.item.start, hit.item.end)}`;
  } else if (hit.kind === 'person') {
    text = `${hit.item.name}\n${hit.item.death != null ? formatYearFull(hit.item.birth) + ' — ' + formatYearFull(hit.item.death) : formatYearFull(hit.item.birth)}`;
  } else if (hit.kind === 'event') {
    text = `${hit.item.name}\n${formatYearFull(hit.item.year)}`;
  }
  t.textContent = text;
  t.style.display = 'block';
  const pad = 14;
  let left = (pos?.x ?? 0) + pad;
  let top = (pos?.y ?? 0) + pad;
  const tw = t.offsetWidth, th = t.offsetHeight;
  if (left + tw > window.innerWidth - 8) left = (pos?.x ?? 0) - tw - pad;
  if (top + th > window.innerHeight - 8) top = (pos?.y ?? 0) - th - pad;
  t.style.left = left + 'px';
  t.style.top = top + 'px';
}

// ---------- 面板开关 ----------
export function showPanel(el) {
  if(el.classList.contains('panel'))document.querySelectorAll('.panel').forEach(p=>{if(p!==el)p.classList.add('hidden');});
  el.classList.remove('hidden');
}
export function hidePanel(el) {
  el.classList.add('hidden');
}
export function togglePanel(el) {
  if(el.classList.contains('hidden'))showPanel(el);else hidePanel(el);
}

export function initPanels() {
  // 统一绑定关闭按钮
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-close');
      const el = document.getElementById(id);
      if (el) hidePanel(el);
    });
  });
  // 点击弹窗遮罩关闭
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) hidePanel(m);
    });
  });
  // Esc 关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.panel:not(.hidden), .modal:not(.hidden)').forEach(el => hidePanel(el));
    }
  });
}
