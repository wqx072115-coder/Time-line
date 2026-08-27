# 历史时间线 · History Timeline

一个纯前端的个人历史时间线网页，用 **Y 轴 = 国家、X 轴 = 时间** 的方式直观展示中国与世界历史。初始内置中国与美国两个国家的朝代/时期，方便查看 demo 效果并随时修改。

## ✨ 功能

- **国家 × 时间二维时间线**：每个国家一条彩色轨道，朝代/时期用不同颜色区分，一目了然。
- **缩放与拖拽**：鼠标滚轮缩放，按住拖动画布，既能总揽全局也能精细查看。
- **点击查看详情**：点击某个朝代/时期，右侧弹出该时期的真实历史地图（维基共享资源）与简介。
- **AI 自动添加人物/事件**：例如对 AI 说“将爱因斯坦加入时间线”，AI 自动分析国籍与生卒年，在对应国家轨道上标注其一生时间段；点击可查看说明。若国籍对应国家不存在，会自动创建一条新的国家轨道。
- **笔记功能**：随时记笔记，可关联年份并一键定位到该年份。
- **手动添加事件/人物**：不依赖 AI 也能添加内容。
- **本地持久化 + 备份**：AI/手动添加的内容、笔记、自定义简介保存在浏览器 localStorage；支持导出/导入 JSON 备份。

## 🚀 部署到 GitHub Pages

1. 在 GitHub 新建仓库，把本目录内容推送到仓库：

   ```bash
   git init
   git add .
   git commit -m "init history timeline"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

2. 打开仓库 **Settings → Pages**，在 “Build and deployment” 中：
   - Source 选择 **Deploy from a branch**
   - Branch 选择 **main**，目录选择 **/ (root)**，保存。

3. 稍等片刻，访问 `https://<你的用户名>.github.io/<仓库名>/` 即可。

> 已包含 `.nojekyll` 文件，确保 GitHub Pages 原样提供静态资源。

## 🖥 本地运行

由于使用 ES Modules 与 `fetch` 加载数据，**不要直接双击 `index.html`**（`file://` 协议会被浏览器拦截）。请起一个本地静态服务器：

```bash
# 方式一：Python
python -m http.server 8000
# 方式二：Node
npx serve .
```

然后访问 `http://localhost:8000/`。

## 🤖 AI 配置

点击右上角「⚙ 设置」，选择服务商并填写 API Key（Key 只保存在你的浏览器本地）：

| 服务商 | 接口地址 | 模型 |
| --- | --- | --- |
| DeepSeek（默认） | `https://api.deepseek.com/chat/completions` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` |
| 其他 OpenAI 兼容中转 | 自行填写 | 自行填写 |
| Google Gemini | （自动，无需地址） | `gemini-2.0-flash` |

> **关于 CORS**：部分服务商（如 OpenAI）禁止浏览器直接跨域调用，此时浏览器会报 CORS 错误。可改用支持浏览器直连的服务（Gemini），或自建一个转发代理。DeepSeek 接口在多数环境下可直接从浏览器调用。

## 📁 数据与修改

- `data/countries.json`：国家及其朝代/时期（名称、起止年、颜色、简介）。
- `data/events.json`：预置人物与事件。
- `js/maps.js`：各时期的**维基共享资源（Wikimedia Commons）真实历史地图**映射，以及加载失败时的示意 SVG 兜底。
- `data` 中的年份规则：**公元前用负数**（如公元前 221 年 = `-221`），公元后用正数。

朝代地图默认从维基共享资源热链接对应时期的真实历史地图（如唐朝、明朝、清朝、美国独立战争等），并在详情面板提供「在维基百科查看」链接；若图片加载失败会自动回退为示意图。如需自定义，可在 `data/countries.json` 的朝代中加 `"mapImage": "https://..."` 字段覆盖默认地图。

## 🗂 项目结构

```
index.html          页面结构
css/style.css       样式
js/
  main.js           入口
  state.js          视图状态与常量
  data.js           数据加载与本地持久化
  renderer.js       Canvas 渲染与视图控制
  interaction.js    缩放/拖拽/点击命中
  panels.js         详情面板
  maps.js           维基历史地图映射 + 示意兜底 SVG
  ai.js             AI 助手
  notes.js          笔记
  ui.js             工具栏/搜索/设置
data/               基础数据
```

## 📝 说明

- 朝代/时期地图默认来自**维基共享资源**的真实历史地图（通过 `Special:FilePath` 热链接），可点击详情面板中的「在维基百科查看」进一步阅读；图片加载失败会自动回退为示意图。
- 中国各朝代、美国各时期的时间与简介为常见通行说法，个人使用可按需在 `data/countries.json` 中修改。
