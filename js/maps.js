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
  const local = {
    'china/qin': {img:'assets/maps/qin.png',caption:'约公元前210年 · ItsMine / Yeu Ninje，后续修订 Nguyen1310 · CC BY-SA 3.0',file:'Qin empire 210 BCE.png'},
    'china/tang': {img:'assets/maps/tang.png',caption:'约公元700年参考图（部分地区含其他年代注记）· Ian Kiu · CC BY-SA 3.0',file:'Tang Dynasty circa 700 CE.png'},
    'usa/colonial': {img:'assets/maps/colonies.svg',caption:'约1775年十三殖民地 · Urban 及后续贡献者 · 公有领域',file:'Map Thirteen Colonies 1775.svg'},
  }[key];
  if(local)return {...local,article:periodArticle(country,period),source:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(local.file)};
  // Do not substitute another dynasty or a China map for an unknown country.
  const file = ['china/xin','china/donghan','china/sanguo','china/dongzhou'].includes(key) ? null : PERIOD_FILES[key];
  return {
    img: file ? wikiFile(file, 900) : null,
    caption: file || '尚未收录此时期地图',
    file,
    source: file ? 'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file) : null,
    article: periodArticle(country, period),
  };
}
