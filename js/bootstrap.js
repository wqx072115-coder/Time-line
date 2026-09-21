// Classic entry catches module-linking errors too, before main.js can execute.
(() => {
  const fail = error => {
    console.error(error);
    const hint = document.getElementById('hint');
    hint.style.opacity = '1';
    hint.classList.add('fatal');
    hint.textContent = location.protocol === 'file:'
      ? '请在项目目录运行 node server.mjs，再访问 http://localhost:8000。直接双击 HTML 无法加载模块。'
      : `页面启动失败：${error.message || error}。请刷新重试，并检查静态资源是否完整。`;
  };
  window.addEventListener('error', e => { if (e.error) fail(e.error); });
  window.addEventListener('unhandledrejection', e => fail(e.reason));
  if (location.protocol === 'file:') fail(new Error('需要 HTTP 服务器'));
  else import('./main.js').catch(fail);
})();
