// 数据加载与本地持久化
import { toFinite, normalizeColor, uid } from './utils.js';

export const store = {
  countries: [],      // 基础国家（countries.json）
  events: [],         // 基础事件（events.json）
  userCountries: [],  // AI 自动创建的国家
  userEvents: [],     // AI / 手动添加的事件、人物
  userPeriods: {},    // 用户编辑过的朝代简介 {countryId: {periodId: text}}
  notes: [],
  settings: {
    provider: 'openai',   // 'openai' | 'gemini'
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    geminiModel: 'gemini-2.0-flash',
    apiKey: '',
  },
};

const LS = {
  userEvents: 'timeline.userEvents',
  userCountries: 'timeline.userCountries',
  userPeriods: 'timeline.userPeriods',
  notes: 'timeline.notes',
  settings: 'timeline.settings',
};

function safeGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    console.warn('读取本地数据失败', key, e);
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('保存本地数据失败', key, e);
  }
}

export async function loadData() {
  // 分别加载，互不影响；countries.json 是关键文件，失败时抛出以便页面提示
  let cList = [];
  try {
    const cRes = await fetch('data/countries.json');
    if (!cRes.ok) throw new Error('HTTP ' + cRes.status);
    cList = (await cRes.json()).countries;
  } catch (err) {
    console.error('countries.json 加载失败', err);
    throw new Error('无法加载 data/countries.json（' + (err?.message || err) + '）');
  }

  let eList = [];
  try {
    const eRes = await fetch('data/events.json');
    if (!eRes.ok) throw new Error('HTTP ' + eRes.status);
    eList = (await eRes.json()).events;
  } catch (err) {
    console.error('events.json 加载失败（事件为空，但不影响时间线）', err);
    eList = [];
  }

  store.countries = sanitizeCountries(cList);
  store.events = sanitizeEvents(eList);
  loadOverlay();
}

// ---------- 数据清洗（防御非法字段） ----------
function sanitizeCountries(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const c of list) {
    if (!c || typeof c !== 'object') continue;
    const country = {
      id: String(c.id || uid()),
      name: String(c.name || c.id || '未命名'),
      nameEn: String(c.nameEn || ''),
      flag: String(c.flag || '🌍'),
      color: normalizeColor(c.color, '#999999'),
      aliases: Array.isArray(c.aliases) ? c.aliases.map(a => String(a)) : [],
      periods: sanitizePeriods(c.periods, c.color),
    };
    out.push(country);
  }
  return out;
}

function sanitizePeriods(list, countryColor) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const p of list) {
    if (!p || typeof p !== 'object') continue;
    const start = toFinite(p.start);
    const end = toFinite(p.end);
    if (start == null || end == null) {
      console.warn('跳过无效朝代（年份非法）:', p && p.name);
      continue;
    }
    let s = start, e = end;
    if (s > e) {
      console.warn('朝代起止年倒置，已自动纠正:', p && p.name, start, end);
      [s, e] = [e, s];
    }
    out.push({
      id: String(p.id || uid()),
      name: String(p.name || '未命名时期'),
      start: s,
      end: e,
      color: normalizeColor(p.color, countryColor || '#999999'),
      mapImage: p.mapImage ? String(p.mapImage) : null,
      map: p.map ? String(p.map) : null,
      description: String(p.description || ''),
    });
  }
  return out;
}

function sanitizeEvents(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const type = e.type === 'person' ? 'person' : 'event';
    if (type === 'person') {
      const birth = toFinite(e.birth);
      if (birth == null) {
        console.warn('跳过无效人物（出生年非法）:', e.name);
        continue;
      }
      out.push({
        id: String(e.id || uid()),
        type: 'person',
        name: String(e.name || e.nameEn || '未命名'),
        nameEn: String(e.nameEn || ''),
        nationality: Array.isArray(e.nationality)
          ? e.nationality.map(n => String(n))
          : (e.nationality ? [String(e.nationality)] : []),
        birth,
        death: toFinite(e.death),
        category: String(e.category || '人物'),
        birthPlace: String(e.birthPlace || ''),
        description: String(e.description || ''),
        source: e.source ? String(e.source) : undefined,
        createdAt: e.createdAt ? String(e.createdAt) : undefined,
      });
    } else {
      const year = toFinite(e.year);
      if (year == null) {
        console.warn('跳过无效事件（年份非法）:', e.name);
        continue;
      }
      out.push({
        id: String(e.id || uid()),
        type: 'event',
        name: String(e.name || '未命名'),
        nameEn: String(e.nameEn || ''),
        country: String(e.country || ''),
        year,
        category: String(e.category || '事件'),
        description: String(e.description || ''),
        source: e.source ? String(e.source) : undefined,
        createdAt: e.createdAt ? String(e.createdAt) : undefined,
      });
    }
  }
  return out;
}

function loadOverlay() {
  store.userEvents = sanitizeEvents(safeGet(LS.userEvents, []));
  store.userCountries = sanitizeCountries(safeGet(LS.userCountries, []));
  const up = safeGet(LS.userPeriods, {});
  store.userPeriods = (up && typeof up === 'object' && !Array.isArray(up)) ? up : {};
  const notes = safeGet(LS.notes, []);
  store.notes = Array.isArray(notes) ? notes : [];
  const s = safeGet(LS.settings, null);
  if (s && typeof s === 'object' && !Array.isArray(s)) Object.assign(store.settings, s);
}

export const saveData = {
  userEvents() { save(LS.userEvents, store.userEvents); },
  userCountries() { save(LS.userCountries, store.userCountries); },
  userPeriods() { save(LS.userPeriods, store.userPeriods); },
  notes() { save(LS.notes, store.notes); },
  settings() { save(LS.settings, store.settings); },
};

// ---------- 便捷读取 ----------
export function allCountries() {
  return store.countries.concat(store.userCountries);
}
export function allEvents() {
  return store.events.concat(store.userEvents);
}
export function findCountry(id) {
  return allCountries().find(c => c.id === id);
}

// 根据 id / 中文名 / 英文名 / 别名 匹配国家
export function countryByNameOrId(name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  return allCountries().find(c => {
    if (c.id.toLowerCase() === key) return true;
    if ((c.nameEn || '').toLowerCase() === key) return true;
    if ((c.name || '').toLowerCase() === key) return true;
    return (c.aliases || []).some(a => a.toLowerCase() === key);
  }) || null;
}

// 人物的某个国籍字符串匹配到的国家
export function matchNationality(nat) {
  const key = String(nat || '').trim();
  if (!key) return null;
  const byId = findCountry(key);
  if (byId) return byId;
  const k = key.toLowerCase();
  return allCountries().find(c =>
    (c.nameEn || '').toLowerCase() === k ||
    (c.name || '').toLowerCase() === k ||
    (c.aliases || []).some(a => a.toLowerCase() === k)
  ) || null;
}

export function periodDescription(countryId, periodId) {
  return store.userPeriods[countryId]?.[periodId] ?? null;
}
export function setPeriodDescription(countryId, periodId, text) {
  if (!store.userPeriods[countryId]) store.userPeriods[countryId] = {};
  store.userPeriods[countryId][periodId] = text;
  saveData.userPeriods();
}

// ---------- 备份 / 恢复 ----------
export function exportAll() {
  return JSON.stringify({
    app: 'history-timeline',
    exportedAt: new Date().toISOString(),
    userCountries: store.userCountries,
    userEvents: store.userEvents,
    userPeriods: store.userPeriods,
    notes: store.notes,
  }, null, 2);
}
export function importAll(json) {
  const d = typeof json === 'string' ? JSON.parse(json) : json;
  if (!d || typeof d !== 'object') throw new Error('数据格式无效');
  if (Array.isArray(d.userEvents)) store.userEvents = sanitizeEvents(d.userEvents);
  if (Array.isArray(d.userCountries)) store.userCountries = sanitizeCountries(d.userCountries);
  if (d.userPeriods && typeof d.userPeriods === 'object' && !Array.isArray(d.userPeriods)) store.userPeriods = d.userPeriods;
  if (Array.isArray(d.notes)) store.notes = d.notes;
  saveData.userEvents(); saveData.userCountries(); saveData.userPeriods(); saveData.notes();
}
