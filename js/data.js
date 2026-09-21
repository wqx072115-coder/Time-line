// 数据加载与本地持久化
import { toFinite, normalizeColor, uid, toast } from './utils.js';

export const store = {
  countries: [],      // 基础国家（countries.json）
  events: [],         // 基础事件（events.json）
  userCountries: [],  // AI 自动创建的国家
  userEvents: [],     // AI / 手动添加的事件、人物
  userPeriods: {},    // 用户编辑过的朝代简介 {countryId: {periodId: text}}
  notes: [],
  removed: [],
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
  removed: 'timeline.removed',
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
    toast('保存失败：浏览器存储不可用或已满，请立即导出备份。');
    throw new Error('本地保存失败，请导出备份');
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
    const end = p.ongoing ? new Date().getFullYear() : toFinite(p.end);
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
      ongoing: p.ongoing === true,
      color: normalizeColor(p.color, countryColor || '#999999'),
      mapImage: p.mapImage ? String(p.mapImage) : null,
      map: p.map ? String(p.map) : null,
      description: String(p.description || ''),
      mapSource: String(p.mapSource || ''),
      sourceUrl: String(p.sourceUrl || ''),
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
        ...e,
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
        ...e,
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
  store.notes = sanitizeNotes(notes);
  const removed = safeGet(LS.removed, []);
  store.removed = Array.isArray(removed) ? removed.filter(x=>typeof x==='string') : [];
  const s = safeGet(LS.settings, null);
  if (s && typeof s === 'object' && !Array.isArray(s)) Object.assign(store.settings, s);
}

export const saveData = {
  userEvents() { save(LS.userEvents, store.userEvents); },
  userCountries() { save(LS.userCountries, store.userCountries); },
  userPeriods() { save(LS.userPeriods, store.userPeriods); },
  notes() { save(LS.notes, store.notes); },
  settings() { save(LS.settings, store.settings); },
  removed() { save(LS.removed, store.removed); },
};

// ---------- 便捷读取 ----------
export function allCountries() {
  return [...new Map([...store.countries, ...store.userCountries].map(c=>[c.id,c])).values()];
}
export function allEvents() {
  return [...new Map([...store.events, ...store.userEvents].map(e=>[e.id,e])).values()].filter(e=>!store.removed.includes(e.id));
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
    removed: store.removed,
    version: 2,
  }, null, 2);
}
export function importAll(json) {
  const d = typeof json === 'string' ? JSON.parse(json) : json;
  if (!d || d.app !== 'history-timeline' || !Array.isArray(d.userEvents) || !Array.isArray(d.userCountries) || !Array.isArray(d.notes)) throw new Error('请选择历史时间线导出的备份文件');
  for(const e of d.userEvents){
    if(!e || !['person','event'].includes(e.type) || !e.name) throw new Error('备份包含无效条目，未导入');
    validYear(e.type==='person'?e.birth:e.year);
    if(e.type==='person'&&e.death!=null){validYear(e.death);if(e.death<e.birth)throw new Error('备份人物生卒年份倒置');}
  }
  for(const c of d.userCountries){if(!c || !c.id || !c.name || !Array.isArray(c.periods))throw new Error('备份包含无效国家');for(const p of c.periods){validYear(p.start);validYear(p.end);if(p.start>p.end)throw new Error('备份时期年份倒置');}}
  if (Array.isArray(d.userEvents)) store.userEvents = sanitizeEvents(d.userEvents);
  if (Array.isArray(d.userCountries)) store.userCountries = sanitizeCountries(d.userCountries);
  if (d.userPeriods && typeof d.userPeriods === 'object' && !Array.isArray(d.userPeriods)) store.userPeriods = d.userPeriods;
  if (Array.isArray(d.notes)) store.notes = sanitizeNotes(d.notes);
  store.removed = Array.isArray(d.removed) ? d.removed.filter(x=>typeof x==='string') : [];
  saveData.userEvents(); saveData.userCountries(); saveData.userPeriods(); saveData.notes(); saveData.removed();
  document.dispatchEvent(new Event('datachanged'));
}

function sanitizeNotes(list) {
  return Array.isArray(list) ? list.filter(n=>n && typeof n==='object').map(n=>({...n,id:String(n.id||uid()),title:String(n.title||''),text:String(n.text||''),year:toFinite(n.year)})) : [];
}

export function validYear(value, label='年份') {
  const n=toFinite(value);
  if(n===null || !Number.isInteger(n) || n===0 || n < -100000 || n>100000) throw new Error(label+'须为非零整数（公元前用负数）');
  return n;
}
export function ensureCountry(name) {
  const text=String(name||'').trim();
  if(!text) throw new Error('请填写国家');
  const existing=countryByNameOrId(text); if(existing)return existing;
  const c={id:uid(),name:text,nameEn:'',color:'#527d88',aliases:[text],periods:[]};
  store.userCountries.push(c);saveData.userCountries();return c;
}
export function saveEntry(entry) {
  if(!String(entry.name||'').trim())throw new Error('请填写名称');
  if(entry.type==='person'){
    entry.birth=validYear(entry.birth,'出生年份');
    entry.death=entry.death==null||entry.death===''?null:validYear(entry.death,'逝世年份');
    if(entry.death!=null&&entry.death<entry.birth)throw new Error('逝世年份不能早于出生年份');
    if(!Array.isArray(entry.nationality)||!entry.nationality.length)throw new Error('请填写国籍');
    entry.nationality=[...new Set(entry.nationality.map(n=>ensureCountry(n).id))];
  }else if(entry.type==='event'){
    entry.year=validYear(entry.year); entry.country=ensureCountry(entry.country).id;
  }else throw new Error('不支持的条目类型');
  entry.id ||= uid();
  const i=store.userEvents.findIndex(e=>e.id===entry.id);
  if(i<0)store.userEvents.push(entry);else store.userEvents[i]=entry;
  store.removed=store.removed.filter(id=>id!==entry.id);
  saveData.userEvents();saveData.removed();
  document.dispatchEvent(new Event('datachanged'));return entry;
}
export function savePeriod(countryId,period){
  period.start=validYear(period.start,'起始年份');period.end=validYear(period.end,'结束年份');
  if(period.start>period.end)throw new Error('结束年份不能早于起始年份');
  if(!period.name?.trim())throw new Error('请填写时期名称');
  const country=structuredClone(findCountry(countryId));if(!country)throw new Error('国家不存在');
  period.id ||= uid();period.color=normalizeColor(period.color,country.color);
  const i=country.periods.findIndex(p=>p.id===period.id);if(i<0)country.periods.push(period);else country.periods[i]=period;
  const ci=store.userCountries.findIndex(c=>c.id===country.id);if(ci<0)store.userCountries.push(country);else store.userCountries[ci]=country;
  if(store.userPeriods[countryId]){delete store.userPeriods[countryId][period.id];saveData.userPeriods();}
  saveData.userCountries();document.dispatchEvent(new Event('datachanged'));return period;
}
export function removeEntry(id){store.removed.push(id);saveData.removed();document.dispatchEvent(new Event('datachanged'));}
export function removePeriod(countryId,id){
  const c=structuredClone(findCountry(countryId));c.periods=c.periods.filter(p=>p.id!==id);
  const i=store.userCountries.findIndex(x=>x.id===countryId);if(i<0)store.userCountries.push(c);else store.userCountries[i]=c;
  saveData.userCountries();document.dispatchEvent(new Event('datachanged'));
}
