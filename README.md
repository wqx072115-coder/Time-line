# 历史时间线 · History Atlas

个人历史资料与笔记工具。X 轴为时间、Y 轴为国家，初始显示中国和美国。纯静态 HTML / CSS / JavaScript，无需构建或后端。

## 本地运行

安装 Node.js 后，在项目目录运行：

```sh
node server.mjs
```

打开 http://localhost:8000 。不要双击 HTML；模块与 JSON 需要 HTTP 服务。也可以运行 `python -m http.server 8000`。本地服务器只监听本机，不开放到局域网。可设置 `PORT` 改端口。

## 日常使用

- 滚轮围绕鼠标位置缩放，按住鼠标拖动画布。左侧国家名和顶部标尺固定；多国轨道可以纵向拖动。
- “全部历史 / 1500 年至今 / 近现代”切换范围；“总览”恢复全部年代。画布获得焦点后可用方向键平移、`+` / `-` 缩放、`0` 总览。
- 搜索朝代、人物、事件后定位并打开详情。同一时期并存的朝代自动分层，人物与事件另起一行，避免覆盖。
- “添加”支持事件、人物、朝代 / 时期。点击详情中的编辑按钮可改名称、年代、简介、地图和资料来源；也可以删除记录。
- 人物国籍可填多个，用逗号分隔。不存在的国家会自动创建轨道。人物生平会出现在相关国家中，**不等于该国籍的持有时间**。支持选填完整出生和逝世日期；日期须与年份一致。
- 朝代详情“记一条笔记”自动带入名称和年份。笔记支持新增、编辑、删除、定位年份和 AI 整理。
- 公元前用负数（例如 -221），公元后用正数，无公元 0 年；时间坐标跨纪元连续。
- 当代时期标记 `ongoing: true` 时随当前年份延伸。手动改为其他结束年后变为固定时段。

## AI 助手

未配置密钥时，“爱因斯坦 / 秦始皇 / 二战”三个快捷问题使用**内置示例**，不会调用模型。其他自由提问及笔记整理需要在设置中填写接口、模型名称和密钥。

支持 OpenAI 兼容的 Chat Completions 接口以及 Gemini generateContent 接口。接口地址应为完整 HTTPS URL，模型名称以你的服务商账户实际提供为准。默认模型名称只是可编辑初值。

AI 先生成草稿，再由用户检查。人物、事件会打开可编辑表单，同名条目优先编辑以减少重复；笔记可编辑草稿后确认保存。笔记列表的“AI 整理”只发送所选笔记和用户指令，不会发送整份笔记库。返回值需要经过 JSON、类型与年份校验；超时为45秒。

密钥存于当前浏览器的 localStorage，调用时发送给所配置接口。不要把密钥写入文件、仓库或公开截图。备份不包含密钥。GitHub Pages 不能运行服务端代理，浏览器直连需要接口允许 CORS；如果不支持，请使用自己可信的代理，或继续使用手动录入。AI 整理可能出错，请核对史实和来源。

## 地图与数据范围

秦朝（约前210年）、唐朝（约700年）、十三殖民地（约1775年）地图已随项目提供，无需连接外部图片服务。作者、许可及原始文件页面见 [地图来源](assets/maps/ATTRIBUTION.md)。

其他已配置的地图使用 Wikimedia Commons 外链，受网络和源站可用性影响；尚未收录的时期会显示缺图提示，可在“编辑时期 / 地图”中填写图片网址和年代说明。不会用随意绘制的轮廓冒充历史疆域，也不把其他朝代的地图作为缺图替代。地图表现的是来源所注明的时点，而非整个时期的固定范围。

基础数据在 `data/countries.json`、`data/events.json`。目前是个人学习用的中美示例资料，不是完整、逐条校勘的历史数据库；并列政权和近现代时期仍可继续补充。内置记录的修改与删除仅作用于当前浏览器，源文件不受影响。

## 保存与备份

浏览器 localStorage 保存个人国家、时期、人物、事件、笔记与简介。刷新会保留；清理站点数据、切换浏览器或切换网址不会自动同步。请定期在设置中导出 JSON。导入会替换当前个人数据，页面会先提醒备份；格式校验失败时不会接受文件。

GitHub Pages 托管网页，不会替你把浏览器笔记提交到 GitHub。跨设备请用导出 / 导入迁移。旧版 `timeline.*` 存储键继续兼容。

## GitHub Pages

项目已包含 `.nojekyll` 与 `.github/workflows/pages.yml`：

1. 将项目推送到自己的 GitHub 仓库 `main` 分支。
2. 在仓库 Settings → Pages 中选择 **GitHub Actions** 作为部署来源。
3. 推送后等待 Deploy historical timeline 工作流完成，访问仓库 Pages 地址。

工作流仅发布 `index.html`、`.nojekyll`、`css`、`js`、`data`、`assets`，不发布测试结果或本地服务器。全部资源采用相对路径，兼容 `https://用户名.github.io/仓库名/`。

也可不使用工作流，选择 Deploy from a branch → main → /(root)。两种方式选择一种即可。部署说明参考 [GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。当前代码交付不包含向远程仓库推送或实际发布。

## 开发与验证

`js/bootstrap.js` 捕获模块加载和未处理错误；`main.js` 初始化数据和画布；`renderer.js` 负责统一排布与点击区域；`editor.js` 处理录入；`data.js` 管理校验和持久化。

浏览器回归测试需 Node.js、Playwright 和 Microsoft Edge（可通过 `BROWSER_CHANNEL=chrome` 换用 Chrome）。另一个终端保持 `node server.mjs` 运行后执行：

```sh
npm install --no-save playwright
node tests/smoke.cjs
node tests/regression.cjs
```

若使用已有 Playwright 安装，可设置 `PLAYWRIGHT_PATH` 为其模块绝对路径。测试使用隔离浏览器，不修改个人浏览器数据。测试截图写入已忽略的 `artifacts/`。AI 回归使用模拟响应，不消耗额度；真实服务需自行配置后验证。
