// === Utility functions (mirrors synthesisWorkbenchApp.ts) ===
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = String(text);
  return n;
}
function iconSvg(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const paths = {
    home: ['M3.5 10.5 12 3.5l8.5 7', 'M5.5 9.5V20h4.8v-5.7h3.4V20h4.8V9.5'],
    topics: ['M7 4.5h8.5L19 8v11.5H7z', 'M15.5 4.5V8H19', 'M5 7.5H3v12h2', 'M10 12h6', 'M10 15h4'],
    graph: ['M7 7.5 12 12l5-4.5', 'M7 16.5 12 12l5 4.5', 'M5.2 5.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6', 'M18.8 5.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6', 'M12 9.7a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6', 'M5.2 14.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6', 'M18.8 14.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6'],
    index: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
    'panel-open': ['M4 5h16v14H4z', 'M9 5v14', 'M13 9l3 3-3 3'],
    'panel-close': ['M4 5h16v14H4z', 'M9 5v14', 'M16 9l-3 3 3 3'],
  };
  (paths[name] || []).forEach(data => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', data);
    svg.appendChild(path);
  });
  return svg;
}
function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
function badge(text, tone) { return el('span', `badge ${tone||''}`.trim(), String(text||'-')); }
function toneFor(v) {
  if (v==='ready'||v==='fresh'||v==='complete') return 'ok';
  if (v==='missing'||v==='stale'||v==='dirty') return 'danger';
  return 'warn';
}
function isRecord(v) { return !!v && typeof v==='object' && !Array.isArray(v); }
function textValue(v, fb) { return String(v ?? (fb||'')).trim(); }
function recordArray(v) { return Array.isArray(v) ? v.filter(isRecord) : []; }
function recordValue(v) { return isRecord(v) ? v : {}; }
function stringArray(v) { return Array.isArray(v) ? v.map(e=>textValue(e)).filter(Boolean) : []; }
function firstText(row, keys, fb) {
  for (const k of keys) { const v = textValue(row[k]); if (v) return v; }
  return fb || '';
}
function hasStructuredContent(v) {
  if (Array.isArray(v)) return v.length > 0;
  if (isRecord(v)) return Object.entries(v).filter(([,e])=>{
    if (Array.isArray(e)) return e.length>0;
    if (isRecord(e)) return Object.keys(e).length>0;
    return !!textValue(e);
  }).length > 0;
  return !!textValue(v);
}
function numberValue(v, fb) { const n=Number(v); return Number.isFinite(n)?n:(fb||0); }

// === Rendering helpers ===
function renderParagraphs(v) {
  const box = el('div','topic-prose');
  if (Array.isArray(v)) { v.map(e=>textValue(e)).filter(Boolean).forEach(e=>box.appendChild(el('p','',e))); return box; }
  const t = textValue(v);
  if (t) t.split(/\n{2,}/).map(e=>e.trim()).filter(Boolean).forEach(e=>box.appendChild(el('p','',e)));
  return box;
}
function renderKeyValueList(v) {
  const list = el('div','topic-kv-list');
  Object.entries(v).forEach(([k,raw])=>{
    const row = el('div','topic-kv-row');
    row.appendChild(el('span','muted',k.replace(/_/g, ' ')));
    if (raw === null || raw === undefined) {
      row.appendChild(el('strong','','-'));
    } else if (typeof raw==='string'||typeof raw==='number'||typeof raw==='boolean') {
      row.appendChild(el('strong','',String(raw)));
    } else if (Array.isArray(raw)) {
      const arrWrap = el('div', 'kv-array-wrap');
      raw.forEach(item => {
        arrWrap.appendChild(badge(typeof item === 'object' ? JSON.stringify(item) : String(item)));
      });
      row.appendChild(arrWrap);
    } else if (typeof raw==='object') {
      const subList = el('div', 'kv-sub-list');
      Object.entries(raw).forEach(([subK, subV]) => {
        const subRow = el('div', 'kv-sub-row');
        subRow.appendChild(el('span', 'muted', subK.replace(/_/g, ' ') + ': '));
        subRow.appendChild(el('span', '', typeof subV === 'object' ? JSON.stringify(subV) : String(subV)));
        subList.appendChild(subRow);
      });
      row.appendChild(subList);
    }
    list.appendChild(row);
  });
  return list;
}
function renderContentCard(title, body, cls) {
  const card = el('section', cls||'content-card');
  card.appendChild(el('h3','',title));
  if (typeof body==='string') card.appendChild(renderParagraphs(body));
  else if (body) card.appendChild(body);
  return card;
}
function renderEmptyState(label) {
  const e = el('div','structured-empty');
  e.appendChild(el('strong','',label||'No structured data'));
  e.appendChild(el('p','muted','This section was not materialized in the current structured artifact.'));
  return e;
}

// === Evidence helpers ===
function evidenceRows(d) { return recordArray(d.paper_evidence); }
function evidenceTitle(e,i) { return firstText(e,['title','paper_title','label','paper_ref','id'],`Paper ${(i||0)+1}`); }
function evidenceCode(e,i) { return firstText(e,['short_id','code','label'],`P${(i||0)+1}`); }
function evidenceId(e) { return firstText(e,['id','paper_ref','paperRef','item_key','itemKey']); }
function evidenceRefKeys(e) {
  return new Set([evidenceId(e),textValue(e.paper_ref||e.paperRef),textValue(e.item_key||e.itemKey),textValue(e.id)].filter(Boolean));
}
function evidenceForRef(d,ref) {
  const id=textValue(ref); if(!id) return undefined;
  return evidenceRows(d).find(r=>{
    const keys=evidenceRefKeys(r);
    if(keys.has(id)) return true;
    return Array.from(keys).some(k=>id.endsWith(k)||k.endsWith(id));
  });
}
function evidenceRefChips(d, refs, tone) {
  const chips = el('div','evidence-chips');
  stringArray(refs).forEach(ref=>{
    const chip = el('button',`chip ${tone||'blue'}`,ref);
    chip.type='button'; chip.title=`Inspect evidence ${ref}`;
    chip.addEventListener('click',()=>{ window.__state.selectedEvidenceId=ref; window.__state.explorerOpen=true; renderAll(); });
    chips.appendChild(chip);
  });
  return chips;
}
function traceChips(refs) {
  const chips = el('div','evidence-chips');
  stringArray(refs).forEach(ref=>chips.appendChild(badge(ref,'purple')));
  return chips;
}
