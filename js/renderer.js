import { CONST, view, ui } from './state.js';
import { allCountries, allEvents, matchNationality } from './data.js';
import { formatYearShort, clamp, normalizeColor } from './utils.js';
// Historical dates have no year zero; convert at the coordinate boundary.
const axis = y => y < 0 ? y + 1 : y;
export const yearToX = y => axis(y) * view.scale + view.offsetX;
export const xToYear = x => { const y=(x-view.offsetX)/view.scale; return y<1?y-1:y; };
export const laneScreenY = i => view.offsetY + (ui.lanes[i]?.top || 0);
function pack(items, span, gap=5) {
  const ends=[];
  return items.map(item=>({item,span:span(item)})).sort((a,b)=>a.span[0]-b.span[0]).map(e=>{
    let row=ends.findIndex(end=>end<=e.span[0]-gap); if(row<0)row=ends.length;
    ends[row]=e.span[1]; return {...e,row};
  });
}
function layout() {
  let top=0; const events=allEvents();
  ui.lanes=allCountries().map(country=>{
    const periods=pack(country.periods||[],p=>[axis(p.start),axis(p.end)],0);
    const entries=pack(events.filter(e=>e.type==='person'?e.nationality.some(n=>matchNationality(n)?.id===country.id):e.country===country.id),e=>{
      const a=yearToX(e.type==='person'?e.birth:e.year), b=e.type==='person'&&e.death!=null?yearToX(e.death):a;
      return [a,Math.max(b,a+e.name.length*13+30)];
    });
    const periodRows=Math.max(1,...periods.map(p=>p.row+1));
    const height=44+periodRows*48+Math.max(1,...entries.map(e=>e.row+1))*32+22;
    const lane={country,periods,entries,periodRows,height,top}; top+=height+24; return lane;
  });
  return Math.max(0,top-24);
}
export function clampView() {
  view.scale=clamp(Number.isFinite(view.scale)?view.scale:1,view.minScale,view.maxScale);
  const height=layout(),upper=CONST.RULER_H+24;
  view.offsetY=clamp(Number.isFinite(view.offsetY)?view.offsetY:upper,Math.min(upper,view.ch-height-40),upper);
}
export function fitRange(start,end) {
  view.scale=clamp((view.cw-CONST.GUTTER_W-64)/Math.max(1,axis(end)-axis(start)),view.minScale,view.maxScale);
  view.offsetX=CONST.GUTTER_W+32-axis(start)*view.scale;view.offsetY=CONST.RULER_H+24;clampView();
}
export function fitView() {
  const years=allCountries().flatMap(c=>c.periods.flatMap(p=>[p.start,p.end]));
  allEvents().forEach(e=>years.push(...(e.type==='person'?[e.birth,e.death??e.birth]:[e.year])));
  const valid=years.filter(Number.isFinite);
  fitRange(valid.length?Math.min(...valid)-50:-2070,valid.length?Math.max(...valid)+50:new Date().getFullYear());
}
export function focusOn(item,country) {
  const a=item.type==='person'?item.birth:item.type==='event'?item.year:item.start;
  const b=item.type==='person'?item.death??a:item.type==='event'?a:item.end;
  const pad=Math.max(30,(b-a)*0.25);fitRange(a-pad,b+pad);
  const lane=ui.lanes.find(l=>l.country.id===country?.id);
  if(lane)view.offsetY=CONST.RULER_H+24-lane.top;clampView();
}
export function focusYear(year){fitRange(year-50,year+50);}
function box(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,Math.max(2,w),h,4);ctx.fill();}
export function draw(ctx,w,h) {
  clampView();ui.hits=[];ctx.clearRect(0,0,w,h);ctx.fillStyle='#fbf8f1';ctx.fillRect(0,0,w,h);
  ctx.font='12px "Microsoft YaHei",sans-serif';ctx.textBaseline='middle';ctx.textAlign='left';
  const step=[1,2,5,10,20,50,100,200,500,1000,2000,5000,10000,50000,100000].find(s=>s*view.scale>=100)||100000;
  const ticks=[],left=xToYear(CONST.GUTTER_W),right=xToYear(w);
  for(let y=Math.floor(left/step)*step;y<=right;y+=step){
    const year=y===0?1:y,x=yearToX(year);if(x<CONST.GUTTER_W)continue;ticks.push({year,x});
    ctx.strokeStyle='#e9e4d9';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,CONST.RULER_H);ctx.lineTo(x,h);ctx.stroke();
  }
  ctx.save();ctx.beginPath();ctx.rect(0,CONST.RULER_H,w,h-CONST.RULER_H);ctx.clip();
  for(const lane of ui.lanes){
    const {country,periods,entries,height,periodRows}=lane,top=view.offsetY+lane.top;
    if(top+height<CONST.RULER_H||top>h)continue;
    box(ctx,8,top,w-16,height,'#ffffffaa');
    ctx.save();ctx.beginPath();ctx.rect(CONST.GUTTER_W,top,w-CONST.GUTTER_W,height);ctx.clip();
    ctx.fillStyle='#8a7f6c';ctx.fillText(periods.length?'朝代与时期':'暂无时期 · 可添加自定义时期',CONST.GUTTER_W+12,top+20);
    for(const {item:p,row} of periods){
      const x=yearToX(p.start),end=yearToX(p.end),y=top+38+row*48;
      if(end<CONST.GUTTER_W||x>w)continue;
      const sx=Math.max(CONST.GUTTER_W,x),ex=Math.min(w,Math.max(x+3,end));
      box(ctx,sx,y,ex-sx-1,36,normalizeColor(p.color,country.color));
      if(ui.selection?.item.id===p.id&&ui.selection?.countryId===country.id){ctx.strokeStyle='#302a20';ctx.lineWidth=2;ctx.strokeRect(sx,y,Math.max(3,ex-sx-1),36);}
      ctx.save();ctx.beginPath();ctx.rect(sx,y,Math.max(3,ex-sx-1),36);ctx.clip();
      const tw=ctx.measureText(p.name).width;
      if(ex-sx>tw+14){box(ctx,sx+5,y+7,tw+8,22,'#ffffffed');ctx.fillStyle='#302a20';ctx.fillText(p.name,sx+9,y+18);}
      ctx.restore();ui.hits.push({x:sx,y,w:Math.max(3,ex-sx),h:36,kind:'period',item:p,country,countryId:country.id});
    }
    for(const {item:e,row} of entries){
      const y=top+44+periodRows*48+row*32,x=yearToX(e.type==='person'?e.birth:e.year);
      const end=e.type==='person'&&e.death!=null?yearToX(e.death):x;
      const labelEnd=Math.max(end,x+ctx.measureText(e.name).width+24);
      if(labelEnd<CONST.GUTTER_W||x>w)continue;
      const color=e.type==='person'?'#0e7c66':'#8e44ad';ctx.strokeStyle=color;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(end,y);ctx.stroke();box(ctx,x-4,y-4,8,8,color);
      const lx=Math.max(CONST.GUTTER_W+6,x+10);box(ctx,lx-2,y-10,ctx.measureText(e.name).width+8,20,'#fffdf8');
      ctx.fillStyle=color;ctx.fillText(e.name,lx+2,y);
      ui.hits.push({x:Math.max(CONST.GUTTER_W,x-6),y:y-12,w:Math.max(14,labelEnd-Math.max(CONST.GUTTER_W,x-6)),h:24,kind:e.type,item:e,country,countryId:country.id});
    }
    ctx.restore();ctx.save();ctx.beginPath();ctx.rect(8,top,CONST.GUTTER_W-8,height);ctx.clip();box(ctx,8,top,CONST.GUTTER_W-8,height,'#f4f0e6');box(ctx,20,top+20,4,28,country.color);
    ctx.fillStyle='#302a20';ctx.font='bold 16px "Microsoft YaHei",sans-serif';ctx.fillText(country.name,34,top+33);
    ctx.font='11px "Microsoft YaHei",sans-serif';ctx.fillStyle='#8a7f6c';ctx.fillText(country.nameEn||'自定义国家',22,top+61);
    ctx.fillText(`${periods.length} 个时期 · ${entries.length} 条记录`,22,top+85);ctx.font='12px "Microsoft YaHei",sans-serif';
    ctx.restore();ui.hits.push({x:8,y:top,w:CONST.GUTTER_W-8,h:height,kind:'country',item:country,country,countryId:country.id});
  }
  ctx.restore();ctx.fillStyle='#fffdf8';ctx.fillRect(0,0,w,CONST.RULER_H);ctx.fillStyle='#8a7f6c';ctx.fillText('国家 / 历史时期',22,CONST.RULER_H/2);
  for(const {year,x} of ticks)ctx.fillText(formatYearShort(year),x+4,CONST.RULER_H/2);
  ctx.strokeStyle='#e6dfd0';ctx.beginPath();ctx.moveTo(0,CONST.RULER_H);ctx.lineTo(w,CONST.RULER_H);ctx.stroke();
}
