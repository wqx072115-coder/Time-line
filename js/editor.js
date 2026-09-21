import { allCountries, findCountry, matchNationality, saveEntry, savePeriod, validYear, periodDescription } from './data.js';
import { escapeHtml, toast } from './utils.js';
import { showPanel, hidePanel } from './panels.js';
let editing=null, callbacks={};
const el=id=>document.getElementById(id);
export function initEditor(opts){
  callbacks=opts;
  el('aeType').insertAdjacentHTML('beforeend','<option value="period">朝代 / 时期</option>');
  el('aeDesc').insertAdjacentHTML('beforebegin',`<div id="aePeriodFields" class="hidden"><label for="aeStart">起始年份</label><input id="aeStart" type="number"><label for="aeEnd">结束年份</label><input id="aeEnd" type="number"><label for="aeColor">时期颜色</label><input id="aeColor" type="color" value="#527d88"><label for="aeMap">历史地图图片网址（可选）</label><input id="aeMap" type="url" placeholder="https://…"><label for="aeMapSource">地图来源 / 年代说明</label><input id="aeMapSource" placeholder="例如：某某图集，1820 年疆域"></div><label for="aeSource">资料来源网址（可选）</label><input id="aeSource" type="url" placeholder="https://…">`);
  el('aePersonFields').insertAdjacentHTML('beforeend','<label for="aeBirthDate">出生日期（可选，YYYY-MM-DD）</label><input id="aeBirthDate" placeholder="1879-03-14"><label for="aeDeathDate">逝世日期（可选，YYYY-MM-DD）</label><input id="aeDeathDate" placeholder="1955-04-18">');
  el('aeType').onchange=sync;
  el('aeSubmit').onclick=()=>{
    try{
      const type=el('aeType').value,name=el('aeName').value.trim(),country=el('aeCountry').value;
      const item={...editing,type,name,description:el('aeDesc').value.trim(),source:editing?.source||'manual',sourceUrl:safeURL(el('aeSource').value)};
      if(type==='period'){
        Object.assign(item,{start:el('aeStart').value,end:el('aeEnd').value,ongoing:editing?.ongoing===true && Number(el('aeEnd').value)===new Date().getFullYear(),color:el('aeColor').value,mapImage:safeURL(el('aeMap').value),mapSource:el('aeMapSource').value.trim()});
        savePeriod(country,item);
      }else{
        if(type==='person'){
          const birth=validYear(el('aeBirth').value,'出生年份'),death=el('aeDeath').value===''?null:validYear(el('aeDeath').value,'逝世年份');
          Object.assign(item,{birth,death,nationality:el('aeNat').value.trim()?el('aeNat').value.split(/[,，、]/).map(s=>s.trim()).filter(Boolean):[country],birthDate:validDate(el('aeBirthDate').value,birth),deathDate:validDate(el('aeDeathDate').value,death)});
        }else Object.assign(item,{year:el('aeYear').value,country});
        saveEntry(item);
      }
      hidePanel(el('addEventModal'));
      callbacks.onFocus?.(item,findCountry(type==='person'?item.nationality[0]:country));callbacks.render?.();toast('已保存');
    }catch(error){toast(error.message);}
  };
}
function safeURL(raw){const text=String(raw||'').trim();if(!text)return '';const url=new URL(text);if(!['https:','http:'].includes(url.protocol))throw new Error('资料和地图地址须为 HTTP(S) 网址');return url.href;}
function validDate(raw,year){
  const value=raw.trim();if(!value)return '';
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value),d=new Date(value+'T00:00:00Z');
  if(!m||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value||Number(m[1])!==year)throw new Error('完整日期须有效且与年份一致');
  return value;
}
function sync(){const type=el('aeType').value;el('aePersonFields').classList.toggle('hidden',type!=='person');el('aeEventFields').classList.toggle('hidden',type!=='event');el('aePeriodFields').classList.toggle('hidden',type!=='period');}
export function openEditor(item=null,countryId=null){
  editing=item?structuredClone(item):null;
  el('aeCountry').innerHTML=allCountries().map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
  el('aeType').value=item?.type|| (item?.start!=null?'period':'event');el('aeType').disabled=!!item?.id;
  el('aeCountry').value=countryId||item?.country||item?.nationality?.map(n=>matchNationality(n)?.id).find(Boolean)||allCountries()[0]?.id;
  const fields={aeName:'name',aeDesc:'description',aeYear:'year',aeBirth:'birth',aeDeath:'death',aeStart:'start',aeEnd:'end',aeMap:'mapImage',aeMapSource:'mapSource',aeSource:'sourceUrl',aeBirthDate:'birthDate',aeDeathDate:'deathDate'};
  for(const [id,key]of Object.entries(fields))el(id).value=item?.[key]??'';
  if(item?.start!=null && countryId)el('aeDesc').value=periodDescription(countryId,item.id)??item.description??'';
  el('aeNat').value=(item?.nationality||[]).map(n=>matchNationality(n)?.name||n).join('，');
  el('aeColor').value=item?.color||'#527d88';el('aeSubmit').textContent=item?.id?'保存修改':'添加';sync();showPanel(el('addEventModal'));
}
