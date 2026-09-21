// 笔记功能（localStorage 持久化）
import { store, saveData, validYear } from './data.js';
import { showPanel } from './panels.js';
import { uid, escapeHtml, formatYearFull, toast } from './utils.js';

let editingId = null;
let onDataChanged = () => {};
let onFocusYear = () => {};

export function initNotes(opts = {}) {
  onDataChanged = opts.onDataChanged || (() => {});
  onFocusYear = opts.onFocusYear || (() => {});

  document.getElementById('btnNewNote').addEventListener('click', () => {
    editingId = null;
    document.getElementById('noteForm').classList.remove('hidden');
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteYear').value = '';
    document.getElementById('noteText').value = '';
    document.getElementById('noteTitle').focus();
  });

  document.getElementById('noteCancel').addEventListener('click', () => {
    document.getElementById('noteForm').classList.add('hidden');
    editingId = null;
  });

  document.getElementById('noteSave').addEventListener('click', () => {
    const title = document.getElementById('noteTitle').value.trim();
    const text = document.getElementById('noteText').value.trim();
    if (!text) { toast('请填写笔记内容'); return; }
    const yearRaw = document.getElementById('noteYear').value.trim();
    let year=null;
    try { year=yearRaw===''?null:validYear(yearRaw); } catch(error){toast(error.message);return;}

    if (editingId) {
      const n = store.notes.find(x => x.id === editingId);
      if (n) {
        n.title = title; n.text = text; n.year = Number.isNaN(year) ? null : year;
        n.updatedAt = new Date().toISOString();
      }
    } else {
      store.notes.unshift({
        id: uid(),
        title,
        text,
        year: Number.isNaN(year) ? null : year,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    saveData.notes();
    document.getElementById('noteForm').classList.add('hidden');
    editingId = null;
    renderNotes();
    toast('笔记已保存');
  });

  document.addEventListener('datachanged',renderNotes);
  document.addEventListener('new-note',e=>{
    document.getElementById('btnNewNote').click();
    const p=e.detail.item;
    document.getElementById('noteTitle').value=p.name;
    document.getElementById('noteYear').value=p.start??p.birth??p.year??'';
    showPanel(document.getElementById('notesPanel'));
  });
  renderNotes();
}

function renderNotes() {
  const list = document.getElementById('noteList');
  if (!store.notes.length) {
    list.innerHTML = '<div class="note-empty">还没有笔记。点击「新建笔记」开始记录你的历史心得吧。</div>';
    return;
  }
  list.innerHTML = store.notes.map(n => {
    const yearStr = n.year != null ? `<div class="note-year">📍 ${formatYearFull(n.year)}</div>` : '';
    const titleStr = n.title ? `<div class="note-title">${escapeHtml(n.title)}</div>` : '';
    return `<div class="note-card">
      ${titleStr}
      ${yearStr}
      <div class="note-text">${escapeHtml(n.text)}</div>
      <div class="note-meta">${formatTime(n.updatedAt || n.createdAt)}</div>
      <div class="note-actions">
        ${n.year != null ? `<button class="btn" data-locate="${escapeHtml(n.id)}">定位到年份</button>` : ''}
        <button class="btn" data-edit="${escapeHtml(n.id)}">编辑</button>
        <button class="btn" data-ai-note="${escapeHtml(n.id)}">AI 整理</button>
        <button class="btn" data-del="${escapeHtml(n.id)}">删除</button>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => startEdit(btn.getAttribute('data-edit')));
  });
  list.querySelectorAll('[data-ai-note]').forEach(btn=>btn.onclick=()=>document.dispatchEvent(new CustomEvent('ai-note',{detail:store.notes.find(n=>n.id===btn.dataset.aiNote)})));
  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('确定删除这条笔记？')) return;
      store.notes = store.notes.filter(x => x.id !== btn.getAttribute('data-del'));
      saveData.notes();
      renderNotes();
      toast('笔记已删除');
    });
  });
  list.querySelectorAll('[data-locate]').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = store.notes.find(x => x.id === btn.getAttribute('data-locate'));
      if (n && n.year != null) onFocusYear(n.year);
    });
  });
}

function startEdit(id) {
  const n = store.notes.find(x => x.id === id);
  if (!n) return;
  editingId = id;
  document.getElementById('noteTitle').value = n.title || '';
  document.getElementById('noteYear').value = n.year != null ? n.year : '';
  document.getElementById('noteText').value = n.text || '';
  document.getElementById('noteForm').classList.remove('hidden');
  document.getElementById('noteText').focus();
}

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
