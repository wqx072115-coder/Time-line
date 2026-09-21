// 通用工具函数
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// 完整年份显示：公元前/公元
export function formatYearFull(y) {
  if (y == null || Number.isNaN(Number(y))) return '—';
  y = Number(y);
  if (y === 0) return '公元前后';
  if (y <= 0) return `公元前${Math.abs(y)}年`;
  return `公元${y}年`;
}

// 短年份显示（用于坐标轴）
export function formatYearShort(y) {
  y = Number(y);
  if (y === 0) return '公元前后';
  if (y <= 0) return `前${Math.abs(y)}`;
  return `${y}`;
}

// 时间段显示
export function rangeLabel(a, b) {
  return `${formatYearFull(a)} — ${formatYearFull(b)}`;
}

// 将任意值转为有限数字，非法返回 null
export function toFinite(v) {
  if (v == null || typeof v === 'boolean' || String(v).trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// 校验并规范化颜色（支持 #abc 与 #aabbcc），非法回退默认色
export function normalizeColor(c, fallback = '#999999') {
  let s = String(c || '').trim();
  if (/^#?[0-9a-f]{3}$/i.test(s)) s = '#' + [...s.replace('#', '')].map(x => x + x).join('');
  if (/^#[0-9a-f]{6}$/i.test(s)) return s;
  let f = String(fallback || '').trim();
  if (/^#?[0-9a-f]{3}$/i.test(f)) f = '#' + [...f.replace('#', '')].map(x => x + x).join('');
  return /^#[0-9a-f]{6}$/i.test(f) ? f : '#999999';
}

export function hexToRgba(hex, alpha = 1) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(0,0,0,${alpha})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// 颜色加深/变浅，amt ∈ [-1, 1]
export function shade(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const target = amt > 0 ? 255 : 0;
  const p = Math.abs(amt);
  r = Math.round(r + (target - r) * p);
  g = Math.round(g + (target - g) * p);
  b = Math.round(b + (target - b) * p);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('show'), 2800);
}
