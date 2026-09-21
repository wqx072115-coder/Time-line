import { CONST, view, ui } from './state.js';
import { clampView, fitView } from './renderer.js';
import { clamp } from './utils.js';
export function hitTest(x,y){if(y<CONST.RULER_H)return null;return [...ui.hits].reverse().find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)||null;}
export function zoomAt(x,y,factor){const time=(x-view.offsetX)/view.scale;view.scale=clamp(view.scale*factor,view.minScale,view.maxScale);view.offsetX=x-time*view.scale;clampView();}
export function initInteraction(canvas,{onSelect,onHover,onViewChange}){
  let drag=null;const pos=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
  canvas.addEventListener('wheel',e=>{e.preventDefault();const p=pos(e);zoomAt(p.x,p.y,Math.exp(clamp(-e.deltaY,-200,200)*0.003));onHover(null);onViewChange();},{passive:false});
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');onHover(null);});
  canvas.addEventListener('pointermove',e=>{const p=pos(e);if(drag){drag.moved ||= Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>4;view.offsetX+=e.clientX-drag.x;view.offsetY+=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;clampView();onViewChange();}else onHover(hitTest(p.x,p.y),p);});
  const end=()=>{drag=null;canvas.classList.remove('dragging');};
  canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const p=pos(e);onSelect(hitTest(p.x,p.y));}end();});
  canvas.addEventListener('pointercancel',end);canvas.addEventListener('lostpointercapture',end);canvas.addEventListener('pointerleave',()=>onHover(null));
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','0'].includes(e.key))return;e.preventDefault();if(e.key==='0')fitView();else if(e.key==='+'||e.key==='-')zoomAt(view.cw/2,view.ch/2,e.key==='+'?1.3:1/1.3);else{view.offsetX+=e.key==='ArrowLeft'?60:e.key==='ArrowRight'?-60:0;view.offsetY+=e.key==='ArrowUp'?60:e.key==='ArrowDown'?-60:0;}onViewChange();});
}
