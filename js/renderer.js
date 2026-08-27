// Canvas 渲染器
import { CONST, view, ui } from './state.js';
import { allCountries, allEvents, matchNationality } from './data.js';
import { formatYearShort, shade, clamp, normalizeColor } from './utils.js';

// ---------- 坐标换算 ----------
export function yearToX(year) {
  return year * view.scale + view.offsetX;
}
export function xToYear(x) {
  return (x - view.offsetX) / view.scale;
}
export function laneScreenY(i) {
  return view.offsetY + i * (CONST.LANE_H + CONST.LANE_GAP);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, rr);
  } else {
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}

// ---------- 刻度 ----------
function tickStep() {
  const target = 90;
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  for (const s of steps) if (s * view.scale >= target) return s;
  let s = 2000;
  while (s * view.scale < target) s *= 2;
  return s;
}

// ---------- 主绘制 ----------
export function draw(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fbf8f1';
  ctx.fillRect(0, 0, w, h);

  const countries = allCountries();
  const events = allEvents();

  drawGrid(ctx, w, h);
  countries.forEach((c, i) => drawLane(ctx, c, i, w, h));
  drawEvents(ctx, countries, events, w, h);
  drawRuler(ctx, w);
}

function drawGrid(ctx, w, h) {
  const step = tickStep();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  const minY = Math.floor(xToYear(CONST.GUTTER_W) / step) * step;
  const maxY = Math.ceil(xToYear(w) / step) * step;
  for (let y = minY; y <= maxY; y += step) {
    const x = yearToX(y);
    if (x < CONST.GUTTER_W || x > w) continue;
    ctx.beginPath(); ctx.moveTo(x, CONST.RULER_H); ctx.lineTo(x, h); ctx.stroke();
  }
  // 公元元年分界线
  const x0 = yearToX(0);
  if (x0 >= CONST.GUTTER_W && x0 <= w) {
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.moveTo(x0, CONST.RULER_H); ctx.lineTo(x0, h); ctx.stroke();
  }
}

function drawRuler(ctx, w) {
  ctx.fillStyle = '#fffdf8';
  ctx.fillRect(0, 0, w, CONST.RULER_H);
  ctx.strokeStyle = '#e6dfd0';
  ctx.beginPath(); ctx.moveTo(0, CONST.RULER_H); ctx.lineTo(w, CONST.RULER_H); ctx.stroke();

  const step = tickStep();
  ctx.fillStyle = '#8a7f6c';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const minY = Math.floor(xToYear(CONST.GUTTER_W) / step) * step;
  const maxY = Math.ceil(xToYear(w) / step) * step;
  for (let y = minY; y <= maxY; y += step) {
    const x = yearToX(y);
    if (x < CONST.GUTTER_W || x > w) continue;
    ctx.fillText(formatYearShort(y), x, CONST.RULER_H / 2 + 1);
  }
  ctx.textBaseline = 'alphabetic';
}

function drawLane(ctx, country, i, w, h) {
  const top = laneScreenY(i);
  const bottom = top + CONST.LANE_H;
  if (bottom < CONST.RULER_H || top > h) return;

  // 轨道底色
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(0, top, w, CONST.LANE_H);

  // 朝代块（裁剪到标尺区右侧，随平移滚动）
  ctx.save();
  ctx.beginPath();
  ctx.rect(CONST.GUTTER_W, top, w - CONST.GUTTER_W, CONST.LANE_H);
  ctx.clip();
  (country.periods || []).forEach(p => drawPeriod(ctx, country, p, top));
  ctx.restore();

  // 轨道上下边界
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(w, top); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, bottom); ctx.lineTo(w, bottom); ctx.stroke();

  // 左侧国家名固定列
  ctx.fillStyle = 'rgba(251,248,241,0.94)';
  ctx.fillRect(0, top, CONST.GUTTER_W, CONST.LANE_H);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.beginPath(); ctx.moveTo(CONST.GUTTER_W, top); ctx.lineTo(CONST.GUTTER_W, bottom); ctx.stroke();

  const cy = top + CONST.LANE_H / 2;
  // 旗帜
  ctx.font = '22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(country.flag || '🌍', 12, cy - 2);
  // 国家名
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#2a2318';
  ctx.fillText(country.name, 42, cy - 2);
  // 色块标识
  const tw = ctx.measureText(country.name).width;
  ctx.fillStyle = normalizeColor(country.color, '#999');
  ctx.beginPath(); ctx.arc(42 + tw + 16, cy - 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.textBaseline = 'alphabetic';
}

function drawPeriod(ctx, country, p, laneTop) {
  const x1 = yearToX(p.start);
  const x2 = yearToX(p.end);
  let w = x2 - x1;
  const py = laneTop + 14;
  const ph = CONST.LANE_H - 28;
  const color = normalizeColor(p.color, country.color || '#999999');

  if (w < 1) w = 1; // 极小时间段也保持可见

  ctx.fillStyle = color;
  roundRect(ctx, x1, py, w, ph, 5);
  ctx.fill();
  ctx.strokeStyle = shade(color, -0.22);
  ctx.lineWidth = 1;
  roundRect(ctx, x1, py, w, ph, 5);
  ctx.stroke();

  // 选中高亮
  if (ui.selection && ui.selection.kind === 'period' && ui.selection.item.id === p.id && ui.selection.countryId === country.id) {
    ctx.strokeStyle = '#1f1a12';
    ctx.lineWidth = 2.5;
    roundRect(ctx, x1 - 1, py - 1, w + 2, ph + 2, 6);
    ctx.stroke();
  }

  // 朝代名称
  if (w > 34) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x1, py, w, ph);
    ctx.clip();
    const label = p.name;
    ctx.font = 'bold 13px system-ui, sans-serif';
    const tw = ctx.measureText(label).width;
    const lx = x1 + 5;
    if (tw + 12 < w) {
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      roundRect(ctx, lx - 1, py + ph / 2 - 10, tw + 12, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#33302a';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + 5, py + ph / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
  }
}

function drawEvents(ctx, countries, events, w, h) {
  const idx = {};
  countries.forEach((c, i) => { idx[c.id] = i; });
  const PERSON = '#0e7c66';
  const EVENT = '#8e44ad';

  for (const e of events) {
    if (e.type === 'person') {
      const nats = Array.isArray(e.nationality) ? e.nationality : [e.nationality];
      for (const n of nats) {
        const c = matchNationality(n);
        if (!c || idx[c.id] == null) continue;
        const i = idx[c.id];
        const y = laneScreenY(i) + CONST.LANE_H / 2;
        if (y < CONST.RULER_H || y > h) continue;
        const x1 = yearToX(e.birth);
        const x2 = e.death != null ? yearToX(e.death) : x1;

        ctx.strokeStyle = PERSON;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();

        // 出生点
        ctx.fillStyle = PERSON;
        ctx.beginPath(); ctx.arc(x1, y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        // 逝世点
        if (e.death != null) {
          ctx.fillStyle = PERSON;
          ctx.fillRect(x2 - 3, y - 3, 6, 6);
        }
        // 姓名标签
        if (x1 > CONST.GUTTER_W && (x2 - x1) > 20) {
          const label = e.name;
          ctx.font = '12px system-ui, sans-serif';
          const tw = ctx.measureText(label).width;
          const lx = Math.max(CONST.GUTTER_W + 2, x1 + 7);
          if (lx + tw + 6 < w) {
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            roundRect(ctx, lx - 2, y - 21, tw + 8, 17, 4);
            ctx.fill();
            ctx.strokeStyle = shade(PERSON, -0.2);
            ctx.lineWidth = 1;
            roundRect(ctx, lx - 2, y - 21, tw + 8, 17, 4);
            ctx.stroke();
            ctx.fillStyle = '#085a4b';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, lx + 2, y - 13);
            ctx.textBaseline = 'alphabetic';
          }
        }
      }
    } else {
      const c = findById(countries, e.country);
      if (!c || idx[c.id] == null) continue;
      const i = idx[c.id];
      const y = laneScreenY(i) + CONST.LANE_H / 2;
      const x = yearToX(e.year);
      if (x < CONST.GUTTER_W || x > w) continue;

      // 菱形标记
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = EVENT;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();

      const label = e.name;
      ctx.font = '12px system-ui, sans-serif';
      const tw = ctx.measureText(label).width;
      const lx = x + 10;
      if (lx + tw + 6 < w) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        roundRect(ctx, lx - 2, y - 19, tw + 8, 17, 4);
        ctx.fill();
        ctx.fillStyle = '#5b2d86';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lx + 2, y - 11);
        ctx.textBaseline = 'alphabetic';
      }
    }
  }
}

function findById(countries, id) {
  return countries.find(c => c.id === id);
}

// ---------- 视图控制 ----------
export function clampView() {
  const n = allCountries().length;
  const contentH = n * CONST.LANE_H + (n - 1) * CONST.LANE_GAP;
  const h = view.ch || 600;
  if (contentH < h - CONST.RULER_H) {
    view.offsetY = (h - contentH) / 2;
  } else {
    view.offsetY = clamp(view.offsetY, h - contentH - 20, CONST.RULER_H + 6);
  }
  view.scale = clamp(view.scale, view.minScale, view.maxScale);
}

export function fitView() {
  const ys = [];
  allCountries().forEach(c => (c.periods || []).forEach(p => { ys.push(p.start, p.end); }));
  allEvents().forEach(e => {
    if (e.type === 'person') { ys.push(e.birth); if (e.death != null) ys.push(e.death); }
    else ys.push(e.year);
  });
  // 过滤非法值，避免 NaN/Infinity
  const finite = ys.filter(v => Number.isFinite(v));
  const w = view.cw || 1200;
  if (!finite.length) { view.offsetX = CONST.GUTTER_W + 20; view.offsetY = 40; view.scale = 1; return; }
  const min = Math.min(...finite), max = Math.max(...finite);
  const pad = (max - min) * 0.05 || 200;
  const range = (max - min) + pad * 2;
  view.scale = clamp((w - CONST.GUTTER_W - 60) / range, view.minScale, view.maxScale);
  view.offsetX = CONST.GUTTER_W + 30 - (min - pad) * view.scale;
  clampView();
}

function itemSpan(item) {
  if (!item) return 100;
  if (item.type === 'person') return item.death != null ? Math.max(item.death - item.birth, 1) : 1;
  if (item.type === 'event') return 1;
  if (item.start != null && item.end != null) return Math.max(item.end - item.start, 1);
  return 100;
}

// 聚焦到某个项目（朝代/人物/事件）
export function focusOn(item, country) {
  const countries = allCountries();
  const ci = Math.max(0, countries.findIndex(c => c.id === country?.id));
  let year;
  if (item.type === 'person') year = item.birth;
  else if (item.type === 'event') year = item.year;
  else if (item.start != null) year = (item.start + item.end) / 2;
  else year = 0;

  const span = itemSpan(item);
  const desiredYears = Math.max(span * 1.5, 40);
  const targetWidth = Math.min((view.cw || 1200) * 0.6, 700);
  view.scale = clamp(targetWidth / desiredYears, view.minScale, view.maxScale);
  view.offsetX = (view.cw || 1200) / 2 - year * view.scale;
  const ly = laneScreenY(ci);
  view.offsetY = (view.ch || 600) / 2 - (ly + CONST.LANE_H / 2);
  clampView();
}

// 聚焦到某一年（笔记跳转用）
export function focusYear(year, ci = -1) {
  const targetWidth = Math.min((view.cw || 1200) * 0.6, 700);
  view.scale = clamp(targetWidth / 100, view.minScale, view.maxScale);
  view.offsetX = (view.cw || 1200) / 2 - year * view.scale;
  if (ci >= 0) {
    const ly = laneScreenY(ci);
    view.offsetY = (view.ch || 600) / 2 - (ly + CONST.LANE_H / 2);
  }
  clampView();
}
