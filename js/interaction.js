// 交互：滚轮缩放、拖动画布、点击命中
import { CONST, view } from './state.js';
import { xToYear, yearToX, laneScreenY, clampView } from './renderer.js';
import { allCountries, allEvents, matchNationality } from './data.js';
import { clamp } from './utils.js';

export function hitTest(mx, my) {
  const countries = allCountries();
  const events = allEvents();

  // 1. 先命中人物/事件（绘制在朝代块之上）
  for (const e of events) {
    if (e.type === 'person') {
      const nats = Array.isArray(e.nationality) ? e.nationality : [e.nationality];
      for (const n of nats) {
        const c = matchNationality(n);
        if (!c) continue;
        const ci = countries.findIndex(cc => cc.id === c.id);
        if (ci === -1) continue;
        const y = laneScreenY(ci) + CONST.LANE_H / 2;
        if (Math.abs(my - y) > 9) continue;
        const year = xToYear(mx);
        const x1 = e.birth;
        const x2 = e.death != null ? e.death : e.birth;
        const tol = 3 / view.scale;
        if (year >= x1 - tol && year <= x2 + tol) {
          return { kind: 'person', item: e, countryId: c.id, country: c };
        }
      }
    } else {
      const c = countries.find(cc => cc.id === e.country);
      if (!c) continue;
      const ci = countries.findIndex(cc => cc.id === c.id);
      const y = laneScreenY(ci) + CONST.LANE_H / 2;
      const x = yearToX(e.year);
      if (Math.abs(mx - x) <= 10 && Math.abs(my - y) <= 12) {
        return { kind: 'event', item: e, countryId: c.id, country: c };
      }
    }
  }

  // 2. 命中朝代
  let laneCi = -1;
  countries.forEach((c, i) => {
    const top = laneScreenY(i);
    if (my >= top && my <= top + CONST.LANE_H) laneCi = i;
  });
  if (laneCi === -1) return null;
  const country = countries[laneCi];
  const year = xToYear(mx);
  const tol = Math.max(2, 4 / view.scale); // 窄时间块也保留几像素的可点击范围
  for (const p of (country.periods || [])) {
    if (year >= p.start - tol && year <= p.end + tol) {
      return { kind: 'period', item: p, countryId: country.id, country };
    }
  }

  // 3. 命中国家轨道本身
  return { kind: 'country', item: country, countryId: country.id, country };
}

export function zoomAt(mx, my, factor) {
  const year = xToYear(mx);
  view.scale = clamp(view.scale * factor, view.minScale, view.maxScale);
  view.offsetX = mx - year * view.scale;
  clampView();
}

export function initInteraction(canvas, callbacks) {
  const { onSelect, onHover, onViewChange } = callbacks;
  let dragging = false;
  let moved = false;
  let lastX = 0, lastY = 0, startX = 0, startY = 0;

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAt(mx, my, factor);
    onViewChange();
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = false;
    lastX = e.clientX; lastY = e.clientY;
    startX = e.clientX; startY = e.clientY;
    canvas.classList.add('dragging');
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 4) moved = true;
      view.offsetX += dx;
      view.offsetY += dy;
      clampView();
      onViewChange();
    } else if (onHover) {
      onHover(hitTest(mx, my), { x: mx, y: my });
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (dragging && !moved && onSelect) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      onSelect(hitTest(mx, my));
    }
    dragging = false;
    canvas.classList.remove('dragging');
  });

  canvas.addEventListener('pointerleave', () => {
    if (!dragging && onHover) onHover(null);
  });
}
