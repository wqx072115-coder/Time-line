// AI 助手：调用 LLM 分析并添加人物/事件
import { store, allCountries, countryByNameOrId, findCountry, matchNationality, saveData } from './data.js';
import { uid } from './utils.js';

const SYSTEM_PROMPT = `你是一个历史时间线助手。用户会用中文描述一个历史人物或事件，要求你将其加入时间线。
你必须【只输出一个 JSON 对象】，不要输出任何其他文字、注释或 markdown 代码块。

JSON 结构（按类型二选一）：
人物：
{
  "type": "person",
  "name": "中文名",
  "nameEn": "英文名（可选，没有则为空字符串）",
  "nationality": ["国籍1", "国籍2"],
  "birth": 1879,
  "death": 1955,
  "category": "科学家/政治人物/军事家/艺术家/文学家 等",
  "birthPlace": "出生地（可选）",
  "description": "50~150 字的中文简介，客观准确"
}
事件：
{
  "type": "event",
  "name": "事件名",
  "country": "中国 或 美国",
  "year": -221,
  "category": "战争/政治/科技/文化 等",
  "description": "50~150 字的中文简介"
}

年份规则（非常重要）：
- 公元后使用正数，例如 1879、1949。
- 公元前使用负数，例如 公元前221年 = -221，公元前551年 = -551。
- death 表示逝世年份；若人物在世则填 null。
- 事件只有一个时间点，填在 year 字段。

国籍规则：
- 使用中文国家名，例如：中国、美国、德国、瑞士、法国、英国、日本。
- 一个人可有多个国籍，按时间先后排列（例如 爱因斯坦：["德国","瑞士","美国"]）。
- 事件的 country 优先填"中国"或"美国"；若都不是，填最相关国家的中文名。

若信息不确定，请基于可靠的历史常识给出最可能的答案，并在 description 中说明。`;

function parseJSON(content) {
  let text = String(content || '').trim();
  // 去掉可能的 markdown 代码块围栏
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    // 尝试截取第一个 { 到最后一个 }
    const s = text.indexOf('{');
    const e2 = text.lastIndexOf('}');
    if (s !== -1 && e2 > s) {
      return JSON.parse(text.slice(s, e2 + 1));
    }
    throw new Error('AI 返回内容无法解析为 JSON');
  }
}

async function callOpenAI(userText) {
  const s = store.settings;
  const res = await fetch(s.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.apiKey}` },
    body: JSON.stringify({
      model: s.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`API 请求失败 (${res.status})：${t.slice(0, 240)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('API 未返回内容');
  return parseJSON(content);
}

async function callGemini(userText) {
  const s = store.settings;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.geminiModel)}:generateContent?key=${encodeURIComponent(s.apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n用户输入：' + userText }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Gemini 请求失败 (${res.status})：${t.slice(0, 240)}`);
  }
  const data = await res.json();
  const content = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  if (!content) throw new Error('Gemini 未返回内容');
  return parseJSON(content);
}

// 自动调色板
const AUTO_COLORS = ['#16a085', '#2980b9', '#c0392b', '#8e44ad', '#d35400', '#27ae60', '#7f8c8d', '#b9770e'];

function autoColor() {
  const n = store.userCountries.length;
  return AUTO_COLORS[n % AUTO_COLORS.length];
}

function prettyCountryName(key) {
  // 若已是中文则原样返回
  if (/[\u4e00-\u9fff]/.test(key)) return key;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// 将国籍字符串映射到国家 id，必要时自动创建国家
function normalizeNationalities(raw) {
  const list = Array.isArray(raw) ? raw : [raw];
  const out = [];
  for (const n of list) {
    const key = String(n || '').trim();
    if (!key) continue;
    const existing = matchNationality(key) || countryByNameOrId(key);
    if (existing) {
      if (!out.some(o => o.id === existing.id)) out.push({ id: existing.id, name: existing.name, created: false });
      continue;
    }
    // 自动创建国家轨道
    const id = 'auto-' + key.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '') || uid();
    const country = {
      id,
      name: prettyCountryName(key),
      nameEn: /[\u4e00-\u9fff]/.test(key) ? '' : key,
      flag: '🌍',
      color: autoColor(),
      aliases: [key.toLowerCase()],
      periods: [],
    };
    store.userCountries.push(country);
    saveData.userCountries();
    out.push({ id, name: country.name, created: true });
  }
  return out;
}

function applyAction(a) {
  if (!a || typeof a !== 'object') throw new Error('AI 返回格式不正确');

  if (a.type === 'person') {
    const name = a.name || a.nameEn || '未命名人物';
    const birth = Number(a.birth);
    if (Number.isNaN(birth)) throw new Error('AI 未返回有效的出生年份');
    const deathRaw = a.death;
    const death = (deathRaw == null || deathRaw === '' || Number.isNaN(Number(deathRaw))) ? null : Number(deathRaw);
    const nats = normalizeNationalities(a.nationality || (a.country ? [a.country] : []));
    if (!nats.length) throw new Error('AI 未返回有效的国籍信息');
    const person = {
      id: uid(),
      type: 'person',
      name,
      nameEn: a.nameEn || '',
      nationality: nats.map(o => o.id),
      birth,
      death,
      category: a.category || '人物',
      birthPlace: a.birthPlace || '',
      description: a.description || '',
      source: 'ai',
      createdAt: new Date().toISOString(),
    };
    store.userEvents.push(person);
    saveData.userEvents();
    return { person, nats };
  }

  if (a.type === 'event') {
    const name = a.name || '未命名事件';
    const year = Number(a.year);
    if (Number.isNaN(year)) throw new Error('AI 未返回有效年份');
    const country = countryByNameOrId(a.country) || allCountries()[0];
    if (!country) throw new Error('没有可用的国家');
    const ev = {
      id: uid(),
      type: 'event',
      name,
      nameEn: a.nameEn || '',
      country: country.id,
      year,
      category: a.category || '事件',
      description: a.description || '',
      source: 'ai',
      createdAt: new Date().toISOString(),
    };
    store.userEvents.push(ev);
    saveData.userEvents();
    return { event: ev };
  }

  throw new Error('AI 返回的操作类型无法识别（应为 person 或 event）');
}

export async function runAI(userText) {
  const s = store.settings;
  if (!s.apiKey) throw new Error('请先在「设置」中填写 API Key');
  const parsed = s.provider === 'gemini' ? await callGemini(userText) : await callOpenAI(userText);
  return applyAction(parsed);
}

// ---------- 聊天 UI ----------
export function initAI({ onDataChanged, onFocus }) {
  const panel = document.getElementById('aiPanel');
  const messages = document.getElementById('aiMessages');
  const input = document.getElementById('aiInput');
  const sendBtn = document.getElementById('aiSend');
  const hints = document.getElementById('aiHints');

  function addMsg(role, text) {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  async function send(text) {
    if (!text || !text.trim()) return;
    text = text.trim();
    addMsg('user', text);
    input.value = '';
    const loading = addMsg('ai', '思考中…');
    try {
      const result = await runAI(text);
      let reply = '';
      if (result.person) {
        const p = result.person;
        const created = result.nats.filter(n => n.created).map(n => n.name);
        reply = `已添加人物「${p.name}」\n${p.death != null ? `生卒：${p.birth} — ${p.death}` : `生于：${p.birth}`}\n所属时间线：${result.nats.map(n => n.name).join('、')}`;
        if (created.length) reply += `\n（已自动创建国家时间线：${created.join('、')}）`;
      } else if (result.event) {
        const ev = result.event;
        const c = countryByNameOrId(ev.country);
        reply = `已添加事件「${ev.name}」\n年份：${ev.year}（${ev.year <= 0 ? '公元前' + Math.abs(ev.year) + '年' : '公元' + ev.year + '年'}）\n所属：${c ? c.name : ev.country}`;
      }
      loading.textContent = reply;
      loading.className = 'msg ai';
      onDataChanged();
      if (onFocus && (result.person || result.event)) {
        const item = result.person || result.event;
        const countryId = result.person ? (result.person.nationality[0] || null) : result.event.country;
        const country = countryId ? findCountry(countryId) : null;
        if (country) onFocus(item, country);
      }
    } catch (err) {
      loading.className = 'msg error';
      loading.textContent = '出错了：' + (err.message || err);
    }
  }

  sendBtn.addEventListener('click', () => send(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input.value);
    }
  });
  hints.addEventListener('click', (e) => {
    const q = e.target.getAttribute('data-q');
    if (q) send(q);
  });
}
