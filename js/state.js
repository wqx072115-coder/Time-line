// 全局视图状态与常量
export const view = {
  scale: 1,          // 每 1 年对应的像素数（放大则增大）
  offsetX: 0,        // 时间轴平移（像素）
  offsetY: 0,        // 纵向平移（像素）
  cw: 1200,          // 画布逻辑宽度
  ch: 700,           // 画布逻辑高度
  minScale: 0.001,
  maxScale: 120,
};

export const ui = {
  selection: null,   // 当前选中项 {kind, item, countryId, country}
  hover: null,
  hits: [],
  lanes: [],
};

export const CONST = {
  LANE_H: 150,       // 每个国家时间线轨道高度
  LANE_GAP: 28,      // 轨道间距
  RULER_H: 42,       // 顶部年份标尺高度
  GUTTER_W: 150,     // 左侧国家名固定列宽
};
