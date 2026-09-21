const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://commons.wikimedia.org/**',r=>r.abort());
  await page.goto('http://127.0.0.1:8000/preview/');
  await page.waitForFunction(()=>document.querySelector('#atlasStats').textContent.includes('2 个国家'));
  const canvas=await page.locator('#timeline').boundingBox();
  const x0=await page.evaluate(async()=>(await import('./js/state.js')).view.offsetX);
  await page.mouse.move(canvas.x+500,canvas.y+100);await page.mouse.down();await page.mouse.move(canvas.x+650,canvas.y+100,{steps:8});await page.mouse.up();
  assert(Math.abs((await page.evaluate(async()=>(await import('./js/state.js')).view.offsetX))-x0-150)<1);
  await page.locator('#btnFit').click();
  const hit=await page.evaluate(async()=>{const {ui}=await import('./js/state.js');const r=ui.hits.find(h=>h.item.id==='tang');return {x:r.x+r.w/2,y:r.y+18};});
  await page.mouse.click(canvas.x+hit.x,canvas.y+hit.y);assert((await page.locator('#detailTitle').innerText()).includes('唐朝'));
  await page.locator('#periodMapWrap img').waitFor();
  await page.waitForFunction(()=>{const im=document.querySelector('#periodMapWrap img');return im.complete&&im.naturalWidth>0;});
  fs.mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/timeline-detail.png'});
  await page.getByRole('button',{name:'记一条笔记'}).click();assert.equal(await page.locator('#noteTitle').inputValue(),'唐朝');
  await page.locator('[data-close="notesPanel"]').click();
  // Adding a period uses the same data model as editing; verify persistence.
  await page.locator('#btnAddEvent').click();await page.locator('#aeType').selectOption('period');await page.locator('#aeName').fill('自定义时期');await page.locator('#aeStart').fill('2000');await page.locator('#aeEnd').fill('2010');await page.locator('#aeSubmit').click();
  await page.reload();await page.waitForFunction(()=>document.querySelector('#atlasStats').textContent.includes('31 个时期'));
  await page.locator('#searchInput').fill('自定义时期');await page.locator('.search-item').click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'删除记录',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#atlasStats').textContent.includes('30 个时期'));
  const validation=await page.evaluate(async()=>{
    const d=await import('./js/data.js'),r=await import('./js/renderer.js');
    const backup=d.exportAll();let rejected=false;try{d.importAll({...JSON.parse(backup),userEvents:[{type:'person',name:'bad',birth:null}]});}catch{rejected=true;}
    return {rejected,same:d.exportAll().replace(/"exportedAt": "[^"]+"/,'')===backup.replace(/"exportedAt": "[^"]+"/,''),distance:r.yearToX(1)-r.yearToX(-1),scale:(await import('./js/state.js')).view.scale};
  });assert(validation.rejected&&validation.same);assert(Math.abs(validation.distance-validation.scale)<1e-8);
  // Bad optional storage must not prevent initial rendering.
  const damaged=await browser.newPage();await damaged.addInitScript(()=>{localStorage.setItem('timeline.userEvents','{broken');localStorage.setItem('timeline.notes','[null,42]');});
  await damaged.goto('http://127.0.0.1:8000/');await damaged.waitForFunction(()=>document.querySelector('#atlasStats').textContent.includes('2 个国家'));await damaged.close();
  // Missing essential dataset and entry module must expose an actionable error.
  for(const resource of ['data/countries.json','js/main.js']){
    const p=await browser.newPage();await p.route('**/'+resource,r=>r.fulfill({status:404,body:'missing'}));await p.goto('http://127.0.0.1:8000/');await p.locator('#hint.fatal').waitFor();assert((await p.locator('#hint').innerText()).includes('失败'));await p.close();
  }
  const clean=await browser.newPage({viewport:{width:1440,height:1000}});await clean.goto('http://127.0.0.1:8000/');await clean.waitForFunction(()=>document.querySelector('#atlasStats').textContent.includes('2 个国家'));
  await clean.screenshot({path:'artifacts/timeline-desktop.png'});await clean.locator('#btnModern').click();await clean.screenshot({path:'artifacts/timeline-modern.png'});
  await clean.setViewportSize({width:390,height:844});await clean.locator('#btnFit').click();await clean.screenshot({path:'artifacts/timeline-mobile.png'});
  assert(await clean.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log('PASS: drag, canvas hit testing, local historical map, linked note, period create/delete/reload, invalid backup atomic rejection, BCE/CE, damaged storage, visible fatal errors, clean screenshots');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
