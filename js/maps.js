// 地图来源：优先使用维基共享资源（Wikimedia Commons）上的真实历史地图，
// 通过 Special:FilePath 稳定地址热链接；加载失败时回退到示意 SVG。
import { escapeHtml } from './utils.js';

const FILE_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath/';

// 生成稳定热链接地址（文件名含中文/空格会自动编码）
function wikiFile(file, width = 900) {
  return FILE_BASE + encodeURIComponent(String(file).replace(/ /g, '_')) + '?width=' + width;
}

// 国家级兜底历史地图
const CHINA_FALLBACK = 'Territories of Dynasties in China.gif';
const USA_FALLBACK = 'UnitedStatesExpansion.png';

// 每个朝代/时期的对应维基地图（Wikimedia Commons 文件名）
const PERIOD_FILES = {
  // 中国
  'china/xizhou': 'Zhou dynasty 1000 BC.png',
  'china/dongzhou': 'Zhou Dynasty 1122 BC - 256 BC.PNG',
  'china/qin': 'Qin empire 210 BCE.png',
  'china/xihan': 'Han Dynasty map 2CE.png',
  'china/xin': 'Han Dynasty map 2CE.png',
  'china/donghan': 'Han Dynasty map 2CE.png',
  'china/sanguo': 'Cao exp200-220.png',
  'china/sui': 'Sui Dynasty.png',
  'china/tang': 'Tang Dynasty circa 700 CE.png',
  'china/beisong': '北宋疆域图（简）.png',
  'china/nansong': '南宋疆域图（简）.png',
  'china/yuan': 'Yuan Dynasty revised.png',
  'china/ming': 'Ming Dynasty 1368 – 1644 (AD).PNG',
  'china/qing': 'Qing Dynasty 1820.png',
  'china/roc': 'Republic of China edcp location map 1945 (disputed territories).svg',
  // 美国
  'usa/colonial': 'Map Thirteen Colonies 1775.svg',
  'usa/revolution': 'UnitedStatesExpansion.png',
  'usa/early': 'USA Territorial Growth 1850.jpg',
  'usa/civilwar': 'US Secession map 1861.svg',
  'usa/gilded': 'UnitedStatesExpansion.png',
  'usa/progressive': 'UnitedStatesExpansion.png',
  'usa/coldwar': 'UnitedStatesExpansion.png',
  'usa/contemporary': 'UnitedStatesExpansion.png',
};

// 维基百科文章链接（中文标题）
const PERIOD_ARTICLES = {
  'china/xia': '夏朝',
  'china/shang': '商朝',
  'china/xizhou': '西周',
  'china/dongzhou': '东周',
  'china/qin': '秦朝',
  'china/xihan': '西汉',
  'china/xin': '新朝',
  'china/donghan': '东汉',
  'china/sanguo': '三国',
  'china/xijin': '西晋',
  'china/dongjin': '东晋',
  'china/nanbei': '南北朝',
  'china/sui': '隋朝',
  'china/tang': '唐朝',
  'china/wudai': '五代十国',
  'china/beisong': '北宋',
  'china/nansong': '南宋',
  'china/yuan': '元朝',
  'china/ming': '明朝',
  'china/qing': '清朝',
  'china/roc': '中华民国',
  'china/prc': '中华人民共和国',
  'usa/colonial': '十三殖民地',
  'usa/revolution': '美国独立战争',
  'usa/early': '美国领土扩张',
  'usa/civilwar': '美国南北战争',
  'usa/gilded': '镀金时代',
  'usa/progressive': '进步时代',
  'usa/coldwar': '冷战',
  'usa/contemporary': '美国',
};

function periodArticle(country, period) {
  const key = country.id + '/' + period.id;
  const title = PERIOD_ARTICLES[key] || period.name;
  return 'https://zh.wikipedia.org/wiki/' + encodeURIComponent(title);
}

// 返回某时期的地图来源（图片 URL + 维基文章链接）
export function getPeriodMap(country, period) {
  const key = country.id + '/' + period.id;
  const file = PERIOD_FILES[key] || (country.id === 'usa' ? USA_FALLBACK : CHINA_FALLBACK);
  return {
    img: wikiFile(file, 900),
    file,
    article: periodArticle(country, period),
  };
}

// ---------- 兜底示意 SVG（维基地图加载失败时使用） ----------
const CHINA_MAIN = `M120,95 L200,62 L300,72 L400,42 L520,58 L620,92 L700,150 L724,220 L704,300 L664,342 L642,422 L600,472 L562,522 L518,540 L474,562 L432,540 L392,562 L352,520 L300,470 L258,420 L220,380 L178,342 L138,300 L118,238 L98,180 Z`;
const CHINA_ISLANDS = `
  <ellipse cx="662" cy="466" rx="16" ry="26" transform="rotate(-12 662 466)"/>
  <ellipse cx="434" cy="576" rx="26" ry="14"/>`;

const USA_MAIN = `M64,182 L112,120 L200,90 L320,100 L420,122 L468,180 L560,202 L682,232 L722,282 L702,342 L662,420 L640,470 L662,522 L702,562 L642,542 L562,562 L500,542 L440,522 L420,470 L380,450 L340,420 L300,400 L240,420 L180,380 L140,320 L110,258 Z`;
const USA_FLORIDA = `<path d="M640,470 L640,540 L600,470 Z"/>`;
const USA_INSETS = `
  <rect x="66" y="40" width="72" height="58" rx="4"/>
  <circle cx="204" cy="510" r="7"/>
  <circle cx="224" cy="532" r="7"/>`;

function svgShell(path, label, color) {
  return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(label)}" class="map-svg">
    <defs>
      <radialGradient id="mapfill" cx="50%" cy="42%" r="70%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.45"/>
      </radialGradient>
    </defs>
    <rect width="800" height="600" fill="#f6f2e9"/>
    <g fill="url(#mapfill)" stroke="#5a4a35" stroke-width="2.5" stroke-linejoin="round">${path}</g>
    <text x="24" y="48" font-size="22" font-weight="700" fill="#5a4a35" font-family="system-ui,sans-serif">${escapeHtml(label)}</text>
  </svg>`;
}

function genericSVG(label, color) {
  return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" role="img" class="map-svg">
    <rect width="800" height="600" fill="#f6f2e9"/>
    <circle cx="400" cy="290" r="180" fill="${color}" fill-opacity="0.5" stroke="#5a4a35" stroke-width="2.5"/>
    <text x="400" y="300" text-anchor="middle" font-size="40" fill="#5a4a35" font-family="system-ui,sans-serif">${escapeHtml(label)}</text>
  </svg>`;
}

// 兜底示意地图（维基地图加载失败时使用）
export function periodMapSVG(country, period) {
  const color = period?.color || country.color || '#999';
  const label = period?.name || country.name;
  const key = String(country.id || '').toLowerCase();
  if (key === 'china') return svgShell(CHINA_MAIN + CHINA_ISLANDS, label, color);
  if (key === 'usa' || key === 'united-states') return svgShell(USA_MAIN + USA_FLORIDA + USA_INSETS, label, color);
  return genericSVG(label, color);
}
