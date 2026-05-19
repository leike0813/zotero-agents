// === State ===
window.__state = {
  section: 'overview',
  selectedEvidenceId: null,
  explorerOpen: false,
  sidebarExpanded: false,
  digestOpen: false,
};
const D = window.__TOPIC_DETAIL__;

// === Section renderers ===
function renderOverview(d) {
  const s = el('div','topic-section'); s.appendChild(el('h2','','Overview'));
  
  const st = d.summary?.text || d.summary?.brief || d.summary?.summary || d.positioning?.review_position;
  if (st) {
    const summaryCard = el('div', 'overview-summary-hero');
    summaryCard.appendChild(el('h3', 'hero-title', 'Synthesis Summary'));
    summaryCard.appendChild(renderParagraphs(st));
    s.appendChild(summaryCard);
  }
  
  const pos = d.positioning || {};
  if (hasStructuredContent(pos)) {
    const dash = el('div','overview-dashboard');
    ['importance','timeliness','review_position','concept_position','why_synthesize'].forEach(k => {
      const t = textValue(pos[k]); 
      if (t) {
        const metric = el('div', 'dashboard-metric');
        metric.appendChild(el('div', 'metric-label', k.replace(/_/g, ' ')));
        metric.appendChild(el('div', 'metric-value', t));
        dash.appendChild(metric);
      }
    });
    const bnd = pos.scope_boundary;
    if (hasStructuredContent(bnd)) {
      const metric = el('div', 'dashboard-metric span-2');
      metric.appendChild(el('div', 'metric-label', 'Scope Boundary'));
      metric.appendChild(renderKeyValueList(bnd));
      dash.appendChild(metric);
    }
    if (dash.childElementCount) s.appendChild(dash);
  }
  
  const outline = d.review_outline || {};
  const oRows = [...recordArray(outline.introduction_logic),...recordArray(outline.related_work_logic),...recordArray(outline.body_sections),...recordArray(outline.sections)];
  if (oRows.length) {
    const outlineSection = el('div', 'overview-outline-section');
    outlineSection.appendChild(el('h3', '', 'Review Outline'));
    
    const stepper = el('div', 'outline-stepper');
    oRows.slice(0,8).forEach((r,i) => {
      const step = el('div', 'outline-step');
      
      const marker = el('div', 'step-marker');
      marker.appendChild(el('span', 'step-number', `${i+1}`));
      step.appendChild(marker);
      
      const content = el('div', 'step-content');
      content.appendChild(el('h4', '', firstText(r,['title','heading','purpose','id'],`Step ${i+1}`)));
      
      const t = firstText(r,['summary','description','purpose','rationale']);
      if (t) content.appendChild(el('p', '', t));
      
      const refs = stringArray(r.evidence_map_refs||r.source_section_refs);
      if (refs.length) {
          const foot = el('div', 'step-footer');
          foot.appendChild(traceChips(refs));
          content.appendChild(foot);
      }
      
      step.appendChild(content);
      stepper.appendChild(step);
    });
    outlineSection.appendChild(stepper);
    s.appendChild(outlineSection);
  }
  
  if (s.childElementCount <= 1) s.appendChild(renderEmptyState('No overview data'));
  return s;
}

function renderTaxonomy(d) {
  const s = el('div','topic-section'); s.appendChild(el('h2','','Taxonomy'));
  const tax = d.taxonomy || {};
  const summ = recordValue(tax.summary);
  const st = firstText(summ,['text','analysis','overview']);
  if (st) s.appendChild(renderContentCard('Route Synthesis', renderParagraphs(st)));
  const axis = firstText(tax,['primary_axis','axis','classification_axis']);
  const rat = firstText(tax,['axis_rationale','rationale','reason']);
  if (axis||rat) {
    const h = el('div','taxonomy-head');
    if (axis) h.appendChild(badge(axis,'blue'));
    if (rat) h.appendChild(renderParagraphs(rat));
    s.appendChild(renderContentCard('Classification Axis', h));
  }
  const nodes = recordArray(tax.nodes||tax.categories||tax.taxonomy_nodes);
  if (nodes.length) {
    const list = el('div','taxonomy-list');
    nodes.forEach((n,i)=>{
      const card = el('article','taxonomy-list-item');
      
      const header = el('header','taxonomy-item-header');
      const titleWrap = el('div','taxonomy-item-title');
      titleWrap.appendChild(el('span','claim-index',`T${i+1}`));
      titleWrap.appendChild(el('h3','',firstText(n,['title','label','name','id'],`Node ${i+1}`)));
      header.appendChild(titleWrap);
      
      const maturity = firstText(n,['maturity','status','development_stage']);
      if (maturity) header.appendChild(badge(maturity, 'purple'));
      card.appendChild(header);

      const t = firstText(n,['description','summary','rationale','definition']);
      if (t) card.appendChild(el('p','taxonomy-item-desc',t));
      
      // Structure the details into a more visually distinct layout than simple KV
      const detailsWrap = el('div', 'taxonomy-item-details');
      
      const probMech = el('div', 'taxonomy-detail-group');
      const prob = firstText(n,['core_problem','problem','target_problem']);
      if (prob) {
          const pDiv = el('div', 'taxonomy-detail-row');
          pDiv.appendChild(el('span', 'muted', 'Problem'));
          pDiv.appendChild(el('strong', '', prob));
          probMech.appendChild(pDiv);
      }
      const mech = firstText(n,['mechanism','technical_mechanism','core_mechanism']);
      if (mech) {
          const mDiv = el('div', 'taxonomy-detail-row');
          mDiv.appendChild(el('span', 'muted', 'Mechanism'));
          mDiv.appendChild(el('strong', '', mech));
          probMech.appendChild(mDiv);
      }
      if (probMech.childElementCount) detailsWrap.appendChild(probMech);

      const prosCons = el('div', 'taxonomy-detail-group pros-cons');
      const strengths = stringArray(n.strengths||n.advantages);
      if (strengths.length) {
          const sDiv = el('div', 'taxonomy-detail-row');
          sDiv.appendChild(el('span', 'muted', 'Strengths'));
          const sList = el('ul', 'taxonomy-bullet-list');
          strengths.forEach(st => sList.appendChild(el('li', 'pro-item', st)));
          sDiv.appendChild(sList);
          prosCons.appendChild(sDiv);
      }
      const limits = stringArray(n.limitations||n.weaknesses);
      if (limits.length) {
          const lDiv = el('div', 'taxonomy-detail-row');
          lDiv.appendChild(el('span', 'muted', 'Limitations'));
          const lList = el('ul', 'taxonomy-bullet-list');
          limits.forEach(lt => lList.appendChild(el('li', 'con-item', lt)));
          lDiv.appendChild(lList);
          prosCons.appendChild(lDiv);
      }
      if (prosCons.childElementCount) detailsWrap.appendChild(prosCons);
      
      if (detailsWrap.childElementCount) card.appendChild(detailsWrap);

      const refs = n.evidence_refs||n.paper_refs||n.paper_unit_refs;
      if (stringArray(refs).length) {
          const foot = el('footer', 'taxonomy-item-footer');
          foot.appendChild(evidenceRefChips(d,refs,'blue'));
          if (stringArray(n.evidence_map_refs).length) foot.appendChild(traceChips(n.evidence_map_refs));
          card.appendChild(foot);
      } else if (stringArray(n.evidence_map_refs).length) {
          const foot = el('footer', 'taxonomy-item-footer');
          foot.appendChild(traceChips(n.evidence_map_refs));
          card.appendChild(foot);
      }
      
      list.appendChild(card);
    });
    s.appendChild(list);
  } else s.appendChild(renderEmptyState('No taxonomy data'));
  return s;
}

function renderClaims(d) {
  const s = el('div','topic-section'); s.appendChild(el('h2','','Claims'));
  const claims = recordArray(d.claims);
  if (!claims.length) { s.appendChild(renderEmptyState('No claim data')); return s; }
  
  const list = el('div', 'claims-list');
  claims.forEach((c,i)=>{
    const card = el('article','claim-row');
    
    // Left column: Claim text and rationale
    const leftCol = el('div', 'claim-content');
    const header = el('div', 'claim-header');
    header.appendChild(el('span','claim-index',firstText(c,['id'],`C${i+1}`)));
    const str = firstText(c,['strength','claim_strength','support_level']);
    if (str) {
        const tone = str.toLowerCase() === 'strong' ? 'ok' : (str.toLowerCase() === 'weak' ? 'warn' : '');
        header.appendChild(badge(str, tone));
    }
    leftCol.appendChild(header);
    leftCol.appendChild(el('h3','',firstText(c,['text','claim','title','id'],`Claim ${i+1}`)));
    
    const rat = firstText(c,['analysis','rationale','support','summary','explanation']);
    if (rat) leftCol.appendChild(el('p','',rat));
    card.appendChild(leftCol);

    // Right column: Evidence cards
    const rightCol = el('div', 'claim-evidence');
    const eRefs = stringArray(c.evidence_refs);
    if (eRefs.length) {
      rightCol.appendChild(el('h4', 'evidence-group-title', 'Supporting Evidence'));
      const eList = el('div', 'claim-evidence-list');
      eRefs.forEach(ref => {
        const ev = evidenceForRef(d, ref);
        if (ev) {
            const eCard = el('button', 'mini-evidence-card');
            eCard.type = 'button';
            eCard.title = 'View in Evidence Explorer';
            eCard.addEventListener('click', () => {
              window.__state.selectedEvidenceId = evidenceId(ev);
              window.__state.explorerOpen = true;
              renderAll();
            });
            eCard.appendChild(el('span', 'evidence-code', evidenceCode(ev)));
            eCard.appendChild(el('span', 'evidence-title', evidenceTitle(ev)));
            eList.appendChild(eCard);
        } else {
            // Fallback to chip if not found in paper evidence
            eList.appendChild(badge(ref, 'green'));
        }
      });
      rightCol.appendChild(eList);
    }
    
    const tRefs = stringArray(c.evidence_map_refs);
    if (tRefs.length) {
       const tList = el('div', 'claim-evidence-list');
       tRefs.forEach(r => tList.appendChild(badge(r, 'purple')));
       rightCol.appendChild(tList);
    }
    
    card.appendChild(rightCol);
    list.appendChild(card);
  });
  s.appendChild(list);
  return s;
}

function renderCompare(d) {
  const s = el('div','topic-section'); s.appendChild(el('h2','','Compare'));
  const matrix = d.comparison_matrix || {};
  const rows = recordArray(matrix.rows||matrix.items||matrix.dimensions);
  if (rows.length) {
    // 1. Extract all unique routes/methods to form columns
    const routeSet = new Set();
    rows.forEach(r => {
      recordArray(r.comparisons).forEach(c => {
        const route = firstText(c, ['route','method','name']);
        if (route && route !== '-') routeSet.add(route);
      });
    });
    const routes = Array.from(routeSet);

    // 2. Build the table
    const tableWrap = el('div', 'matrix-table-wrap');
    const table = el('table', 'matrix-table');
    
    // Header
    const thead = el('thead');
    const trHead = el('tr');
    trHead.appendChild(el('th', 'matrix-th matrix-dim-col', 'Dimension'));
    routes.forEach(route => {
      trHead.appendChild(el('th', 'matrix-th', route));
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Body
    const tbody = el('tbody');
    rows.forEach((r, i) => {
      const tr = el('tr');
      // Dimension column
      const tdDim = el('td', 'matrix-td matrix-dim-col');
      const dimTitle = el('div', 'matrix-dim-title');
      dimTitle.appendChild(el('span', 'claim-index', `M${i+1}`));
      dimTitle.appendChild(el('strong', '', firstText(r,['name','title','dimension','label','id'],`Dimension ${i+1}`)));
      tdDim.appendChild(dimTitle);
      const desc = firstText(r,['description','summary','rationale']);
      if (desc) tdDim.appendChild(el('p', 'matrix-dim-desc', desc));
      tr.appendChild(tdDim);

      // Value columns
      const comps = recordArray(r.comparisons);
      routes.forEach(route => {
        const td = el('td', 'matrix-td');
        const match = comps.find(c => firstText(c, ['route','method','name']) === route);
        if (match) {
          const val = firstText(match, ['value','result'], '-');
          td.appendChild(renderParagraphs(val));
          // Apply subtle coloring based on text content as a heuristic (just for mockup visual enhancement)
          const lowerVal = val.toLowerCase();
          if (lowerVal.includes('high') || lowerVal.includes('strong') || lowerVal.includes('good') || lowerVal.includes('better')) {
             td.classList.add('highlight-positive');
          } else if (lowerVal.includes('low') || lowerVal.includes('weak') || lowerVal.includes('poor') || lowerVal.includes('worse') || lowerVal.includes('limited') || lowerVal.includes('high cost')) {
             td.classList.add('highlight-negative');
          }
        } else {
          td.appendChild(el('span', 'muted', '-'));
        }
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    s.appendChild(tableWrap);
  } else s.appendChild(renderEmptyState('No comparison matrix'));
  const debates = recordArray(d.debates);
  if (debates.length) {
    s.appendChild(el('h3','','Debates'));
    debates.forEach((db,i)=>{
      const card = el('article','debate-card');
      card.appendChild(el('span','claim-index',`D${i+1}`));
      card.appendChild(el('h3','',firstText(db,['topic','name','title','text','id'],`Debate ${i+1}`)));
      const t = firstText(db,['synthesis_judgment','summary','description']);
      if (t) card.appendChild(el('p','',t));
      if (stringArray(db.evidence_map_refs).length) card.appendChild(traceChips(db.evidence_map_refs));
      s.appendChild(card);
    });
  }
  return s;
}

function renderExternal(d) {
  const s = el('div','topic-section');
  const ext = d.external_literature_analysis || {};
  s.appendChild(el('h2','','External Literature Analysis'));
  
  const summ = ext.summary || ext.contribution_to_topic;
  if (summ) {
    const hero = el('div', 'overview-summary-hero');
    hero.appendChild(el('h3', 'hero-title', 'External Context'));
    hero.appendChild(renderParagraphs(summ));
    s.appendChild(hero);
  }
  
  const verdict = firstText(ext,['coverage_verdict','coverage_judgment']);
  const reason = firstText(ext,['coverage_reason','reason','limitations']);
  if (verdict||reason) {
    const vc = el('div','coverage-verdict-card');
    if (verdict) {
      const line = el('div','verdict-line');
      line.style.display = 'flex';
      line.style.alignItems = 'center';
      line.style.gap = '8px';
      line.appendChild(el('strong','','Coverage Verdict:'));
      line.appendChild(badge(verdict,toneFor(verdict)));
      vc.appendChild(line);
    }
    if (reason) vc.appendChild(renderParagraphs(reason));
    s.appendChild(vc);
  }
  
  const themes = recordArray(ext.themes);
  if (themes.length) {
    s.appendChild(el('h3','','Themes'));
    const tGrid = el('div', 'topic-card-grid');
    themes.forEach(th=>{
      const card = el('article','external-theme-card');
      card.appendChild(el('strong','',firstText(th,['title','theme','label','id'],'Theme')));
      const t = firstText(th,['analysis','summary','description']);
      if (t) card.appendChild(el('p','',t));
      tGrid.appendChild(card);
    });
    s.appendChild(tGrid);
  }
  
  const refs = recordArray(ext.representative_references);
  if (refs.length) {
    s.appendChild(el('h3','','Representative References'));
    const tableWrap = el('div', 'matrix-table-wrap');
    const table = el('table', 'matrix-table');
    const thead = el('thead');
    const tr = el('tr');
    tr.appendChild(el('th', 'matrix-th', 'Reference'));
    tr.appendChild(el('th', 'matrix-th', 'Context'));
    tr.appendChild(el('th', 'matrix-th', 'Completeness'));
    thead.appendChild(tr);
    table.appendChild(thead);
    const tbody = el('tbody');
    refs.forEach(r=>{
      const trBody = el('tr');
      const tdRef = el('td', 'matrix-td'); tdRef.appendChild(el('strong','',firstText(r,['title','label','id'],'Reference')));
      const tdCtx = el('td', 'matrix-td'); tdCtx.appendChild(el('span','muted',firstText(r,['context','citation_context','reason'],'-')));
      const tdComp = el('td', 'matrix-td'); tdComp.appendChild(el('span','muted',firstText(r,['information_completeness','completeness','status'],'-')));
      trBody.appendChild(tdRef); trBody.appendChild(tdCtx); trBody.appendChild(tdComp);
      tbody.appendChild(trBody);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    s.appendChild(tableWrap);
  }
  
  const additions = recordArray(ext.suggested_additions);
  if (additions.length) {
    s.appendChild(el('h3','','Suggested Additions'));
    const tableWrap = el('div', 'matrix-table-wrap');
    const table = el('table', 'matrix-table');
    const thead = el('thead');
    const tr = el('tr');
    tr.appendChild(el('th', 'matrix-th', 'Candidate'));
    tr.appendChild(el('th', 'matrix-th', 'Reason'));
    tr.appendChild(el('th', 'matrix-th', 'Priority'));
    thead.appendChild(tr);
    table.appendChild(thead);
    const tbody = el('tbody');
    additions.forEach(r=>{
      const trBody = el('tr');
      const tdRef = el('td', 'matrix-td'); tdRef.appendChild(el('strong','',firstText(r,['title','label','id'],'Candidate')));
      const tdCtx = el('td', 'matrix-td'); tdCtx.appendChild(el('span','',firstText(r,['reason','rationale','why'],'-')));
      const pText = firstText(r,['priority','urgency'],'-');
      const tdComp = el('td', 'matrix-td'); tdComp.appendChild(badge(pText, pText.toLowerCase().includes('high')?'warn':''));
      trBody.appendChild(tdRef); trBody.appendChild(tdCtx); trBody.appendChild(tdComp);
      tbody.appendChild(trBody);
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    s.appendChild(tableWrap);
  }
  
  if (s.childElementCount <= 1) s.appendChild(renderEmptyState('No external literature data'));
  return s;
}

function renderCoverage(d) {
  const s = el('div','topic-section'); s.appendChild(el('h2','','Coverage'));
  
  if (hasStructuredContent(d.coverage)) {
      const metric = el('div', 'dashboard-metric span-2');
      metric.appendChild(el('div', 'metric-label', 'Coverage Status'));
      metric.appendChild(renderKeyValueList(d.coverage||{}));
      const dash = el('div', 'overview-dashboard');
      dash.appendChild(metric);
      s.appendChild(dash);
  }
  
  const gaps = recordArray(d.gaps);
  if (gaps.length) {
    s.appendChild(el('h3','','Identified Gaps'));
    const gList = el('div', 'claims-list');
    gaps.forEach((g,i)=>{
      const card = el('article','claim-row');
      const leftCol = el('div', 'claim-content');
      const header = el('div', 'claim-header');
      header.appendChild(el('span','claim-index',`G${i+1}`));
      const type = firstText(g,['gap_type','type']);
      if (type) header.appendChild(badge(type, type==='library_coverage_gap'?'orange':'warn'));
      leftCol.appendChild(header);
      leftCol.appendChild(el('h3','',firstText(g,['title','gap','id'],'Gap')));
      const t = firstText(g,['text','description','impact','summary']);
      if (t) leftCol.appendChild(el('p','',t));
      card.appendChild(leftCol);
      gList.appendChild(card);
    });
    s.appendChild(gList);
  }
  if (hasStructuredContent(d.diagnostics)) s.appendChild(renderContentCard('Diagnostics', renderKeyValueList(isRecord(d.diagnostics)?d.diagnostics:{value:d.diagnostics})));
  if (s.childElementCount <= 1) s.appendChild(renderEmptyState('No coverage data'));
  return s;
}

function renderStatistics(d) {
  const s = el('div','topic-section'); s.appendChild(el('h2','','Statistics'));
  const stats = d.statistics || {};
  if (hasStructuredContent(stats)) {
    const dash = el('div','overview-dashboard');
    [['Papers',stats.paper_count??d.paper_count],
     ['Time span',isRecord(stats.time_span)?`${stats.time_span.earliest||stats.time_span.start_year||'?'} - ${stats.time_span.latest||stats.time_span.end_year||'?'}`:stats.time_span],
     ['Coverage Verdict',stats.coverage_verdict]].forEach(([label,value])=>{
      if (!textValue(value)) return;
      const metric = el('div','dashboard-metric');
      metric.appendChild(el('div','metric-label',String(label)));
      metric.appendChild(el('div','metric-value',String(value)));
      dash.appendChild(metric);
    });
    if (dash.childElementCount) s.appendChild(dash);
    
    const dash2 = el('div','overview-dashboard');
    if (stats.route_coverage) {
        const rcCard = el('div', 'dashboard-metric span-2');
        rcCard.appendChild(el('div', 'metric-label', 'Route Coverage'));
        rcCard.appendChild(renderKeyValueList(isRecord(stats.route_coverage) ? stats.route_coverage : { value: stats.route_coverage }));
        dash2.appendChild(rcCard);
    }
    
    const metricCard = el('div', 'dashboard-metric span-2');
    metricCard.appendChild(el('div', 'metric-label', 'Full Statistics'));
    const filteredStats = {...stats};
    delete filteredStats.route_coverage; // already shown above
    delete filteredStats.coverage_verdict;
    delete filteredStats.time_span;
    delete filteredStats.paper_count;
    metricCard.appendChild(renderKeyValueList(filteredStats));
    dash2.appendChild(metricCard);
    
    s.appendChild(dash2);
  }
  if (s.childElementCount <= 1) s.appendChild(renderEmptyState('No statistics data'));
  return s;
}

function renderReport(d) {
  const s = el('div','topic-section'); s.appendChild(el('h2','','Synthesis Report'));
  const report = d.synthesis_report || {};
  const title = firstText(report,['title','heading']);
  if (title) s.appendChild(el('h3','',title));
  const body = firstText(report,['body','markdown','text','report']);
  if (body) {
      const doc = el('div', 'report-document');
      doc.appendChild(renderParagraphs(body));
      s.appendChild(doc);
  }
  const src = isRecord(report.source_section_chapters) ? report.source_section_chapters : {};
  if (hasStructuredContent(src)) {
      const dash = el('div', 'overview-dashboard');
      const metric = el('div', 'dashboard-metric span-2');
      metric.appendChild(el('div', 'metric-label', 'Source Chapters'));
      metric.appendChild(renderKeyValueList(src));
      dash.appendChild(metric);
      s.appendChild(dash);
  }
  if (s.childElementCount <= 1) s.appendChild(renderEmptyState('No synthesis report'));
  return s;
}

function renderSection(d) {
  const sec = window.__state.section;
  if (sec==='taxonomy') return renderTaxonomy(d);
  if (sec==='claims') return renderClaims(d);
  if (sec==='references') return renderReferences(d);
  if (sec==='compare') return renderCompare(d);
  if (sec==='external') return renderExternal(d);
  if (sec==='coverage') return renderCoverage(d);
  if (sec==='statistics') return renderStatistics(d);
  if (sec==='report') return renderReport(d);
  return renderOverview(d);
}

// === Timeline ===
function numericYear(value) {
  const text = textValue(value).trim();
  if (!text) return NaN;

  const match4 = text.match(/\b(?:1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  if (match4) return Number(match4[0]);

  const matchCh = text.match(/(\d{2})年/);
  if (matchCh) {
    const yr = Number(matchCh[1]);
    return yr >= 50 ? 1900 + yr : 2000 + yr;
  }

  const matchPrefix = text.match(/^(\d{2})[-/]\d{1,2}\b/);
  if (matchPrefix) {
    const yr = Number(matchPrefix[1]);
    if (yr >= 20 && yr <= 35) return 2000 + yr;
  }

  const matchQuote = text.match(/['’](\d{2})\b/);
  if (matchQuote) {
    const yr = Number(matchQuote[1]);
    return yr >= 50 ? 1900 + yr : 2000 + yr;
  }

  return NaN;
}
function evidenceYear(e) { return numericYear(e.year||e.publication_year||e.date); }
function eventYear(e) { return numericYear(e.year||e.date||e.publication_year); }
function timelineItemSortKey(item) {
  const evidence = item.evidence || {};
  const ref = firstText(evidence, ['paper_ref', 'id']);
  const itemKey = ref.includes(':') ? ref.split(':').pop() : ref;
  return (itemKey || item.key || item.label || item.title || '').toLowerCase();
}
function topicTimelineEvents(d) {
  const tl = d.timeline_events;
  if (recordValue(tl).events) return recordArray(recordValue(tl).events);
  return recordArray(tl);
}

function renderTimeline(d) {
  const events = topicTimelineEvents(d);
  const papers = evidenceRows(d);
  const items = [];
  const usedEvents = new Set();

  papers.forEach((ev,i)=>{
    const matched = events.find(e=>{
      const refs=[...stringArray(e.evidence_refs),...stringArray(e.paper_evidence_refs)];
      const keys=evidenceRefKeys(ev);
      return refs.some(r=>keys.has(r));
    });
    if (matched) usedEvents.add(matched);
    const year = matched ? eventYear(matched) || evidenceYear(ev) : evidenceYear(ev);
    items.push({ key:`paper:${evidenceId(ev)||i}`, kind: matched?'event':'paper', year, label: evidenceCode(ev,i),
      title: matched ? firstText(matched,['event','title','label','summary']) || evidenceTitle(ev,i) : evidenceTitle(ev,i),
      evidence: ev, event: matched,
      tone: matched ? 'milestone' : (firstText(ev,['synthesis_role']).match(/foundation/i)?'foundation':firstText(ev,['synthesis_role']).match(/frontier/i)?'frontier':'paper')
    });
  });
  events.forEach((e,i)=>{
    if (usedEvents.has(e)) return;
    items.push({ key:`event:${i}`, kind:'event', year:eventYear(e), label:firstText(e,['code','short_id'],`E${i+1}`),
      title:firstText(e,['event','title','label','summary'],`Event ${i+1}`), event:e, tone:'milestone' });
  });

  items.sort((a, b) => {
    const aFinite = Number.isFinite(a.year);
    const bFinite = Number.isFinite(b.year);
    if (aFinite && bFinite) return a.year - b.year;
    if (aFinite) return -1;
    if (bFinite) return 1;
    return 0;
  });

  const years = items.map(it=>it.year).filter(Number.isFinite);
  const minLim = years.length ? Math.min(...years) : NaN;
  const maxLim = years.length ? Math.max(...years) + 1 : NaN;

  const rail = el('section','topic-timeline');
  const head = el('div','timeline-head');
  head.appendChild(el('strong','','Timeline'));
  
  const legend = el('div','timeline-legend');
  const legEvent = el('div','legend-item');
  legEvent.appendChild(el('span','legend-icon legend-icon-event'));
  legEvent.appendChild(el('span','legend-label','Key Milestones'));
  legend.appendChild(legEvent);
  
  const legPaper = el('div','legend-item');
  legPaper.appendChild(el('span','legend-icon legend-icon-paper'));
  legPaper.appendChild(el('span','legend-label','Literature Papers'));
  legend.appendChild(legPaper);
  
  head.appendChild(legend);
  rail.appendChild(head);
  
  const tlSummary = recordValue(d.timeline_events?.summary);
  const sumText = firstText(tlSummary,['text','analysis','overview']);
  if (sumText) {
    const summBlock = el('div','timeline-summary');
    summBlock.appendChild(renderParagraphs(sumText));
    rail.appendChild(summBlock);
  }

  const scroll = el('div','timeline-scroll');
  const timeline = el('div','horizontal-timeline');
  const trackInner = el('div','timeline-inner-rail');

  // axis labels
  const axis = el('div','time-axis');
  if (Number.isFinite(minLim) && Number.isFinite(maxLim)) {
    const span = Math.max(1, maxLim-minLim);
    let stepInterval = 1;
    if (span > 15 && span <= 30) stepInterval = 2;
    else if (span > 30 && span <= 75) stepInterval = 5;
    else if (span > 75 && span <= 150) stepInterval = 10;
    else if (span > 150) stepInterval = Math.ceil(span / 10);

    const ticks = [];
    for (let y = minLim; y <= maxLim; y += stepInterval) {
      ticks.push({
        label: String(y),
        left: ((y - minLim) / span) * 100
      });
    }
    if (ticks.length > 0 && Math.round(ticks[ticks.length - 1].left) !== 100) {
      ticks.push({
        label: String(maxLim),
        left: 100
      });
    }

    ticks.forEach(tick => {
      const stepEl = el('span','');
      stepEl.style.position = 'absolute';
      stepEl.style.left = `${tick.left}%`;
      stepEl.style.transform = 'translateX(-50%)';
      stepEl.appendChild(document.createTextNode(tick.label));
      axis.appendChild(stepEl);
    });
  }
  trackInner.appendChild(axis);



  // cluster by year
  const byYear = new Map();
  items.forEach((it,i)=>{
    const k = Number.isFinite(it.year) ? String(Math.floor(it.year)) : `phase-${i+1}`;
    if (!byYear.has(k)) byYear.set(k,[]);
    byYear.get(k).push(it);
  });

  Array.from(byYear.entries()).forEach(([k,clusterItems],ci,all)=>{
    const year = Number(k);
    const sortedClusterItems = [...clusterItems].sort((a,b)=>timelineItemSortKey(a).localeCompare(timelineItemSortKey(b)));
    sortedClusterItems.forEach((it,ii)=>{
      const coordinate = Number.isFinite(year)
        ? year + (ii + 0.5) / sortedClusterItems.length
        : NaN;
      const left = Number.isFinite(coordinate)&&Number.isFinite(minLim)&&Number.isFinite(maxLim)&&maxLim>minLim
        ? ((coordinate-minLim)/(maxLim-minLim))*100
        : all.length<=1?50:(ci/(all.length-1))*100;
      const phase = el('section','timeline-phase');
      phase.style.left = `${left}%`;
      const title = el('div','phase-title');
      if (!Number.isFinite(year)) {
        title.appendChild(el('strong','',`Phase ${ci+1}`));
      }
      phase.appendChild(title);
      const marker = el('button',`timeline-marker timeline-${it.kind} timeline-tone-${it.tone}${clusterItems.length>4?' too-dense':''}${it.evidence&&evidenceId(it.evidence)===window.__state.selectedEvidenceId?' selected':''}`);
      marker.type='button'; marker.style.left='0';
      marker.style.setProperty('--pin-scale','1'); marker.title=it.title;
      marker.appendChild(el('span','timeline-code',it.label));
      const pin = el('span','timeline-pin');
      pin.appendChild(el('span','timeline-pin-body'));
      pin.appendChild(el('span','timeline-pin-dot'));
      marker.appendChild(pin);
      marker.appendChild(el('span','timeline-event-label',it.title));
      if (it.evidence) marker.addEventListener('click',()=>{
        window.__state.selectedEvidenceId=evidenceId(it.evidence);
        window.__state.explorerOpen=true;
        renderAll();
      });
      else marker.disabled=true;
      phase.appendChild(marker);
      trackInner.appendChild(phase);
    });
  });

  timeline.appendChild(trackInner);
  scroll.appendChild(timeline);
  rail.appendChild(scroll);
  
  // Quick fix: Set minimum width on scroll container to ensure scrolling works
  // And expand the track
  timeline.style.minWidth = Math.max(1080, items.length * 60) + 'px';
  
  return rail;
}

// === References Registry ===
function renderReferences(d) {
  const container = el('div', 'references-section');
  
  const header = el('div', 'references-header');
  const rows = evidenceRows(d);
  
  const titleContainer = el('div', 'references-title-row');
  titleContainer.appendChild(el('h3', '', `Associated Literature References (${rows.length})`));
  header.appendChild(titleContainer);
  
  const searchBar = el('div', 'references-search-bar');
  const input = el('input', 'references-search-input');
  input.type = 'text';
  input.placeholder = 'Search references by title, author, key, or summary...';
  searchBar.appendChild(input);
  header.appendChild(searchBar);
  container.appendChild(header);
  
  const grid = el('div', 'references-grid');
  container.appendChild(grid);
  
  function updateGrid(filterText = '') {
    clear(grid);
    const query = filterText.toLowerCase();
    
    rows.forEach((r, idx) => {
      const title = evidenceTitle(r, idx);
      const year = firstText(r, ['year', 'publication_year']) || '';
      const refKey = firstText(r, ['paper_ref', 'paperRef']) || '';
      const summary = firstText(r, ['summary', 'evidence_summary', 'topic_relevance', 'rationale']) || '';
      const code = evidenceCode(r, idx);
      const status = firstText(r, ['synthesis_role', 'status', 'freshness']) || '';
      const isSelected = window.__state.selectedEvidenceId === evidenceId(r);
      
      if (query && !title.toLowerCase().includes(query) && !year.toLowerCase().includes(query) && !refKey.toLowerCase().includes(query) && !summary.toLowerCase().includes(query) && !code.toLowerCase().includes(query)) {
        return;
      }
      
      const card = el('div', `reference-card${isSelected ? ' active' : ''}`);
      
      const cardHead = el('div', 'ref-card-head');
      const badgeContainer = el('div', 'ref-badge-container');
      
      // Code Badge
      const codeEl = el('span', 'ref-code-badge', code);
      badgeContainer.appendChild(codeEl);
      if (status) {
        badgeContainer.appendChild(badge(status, toneFor(status)));
      }
      cardHead.appendChild(badgeContainer);
      
      if (year) {
        cardHead.appendChild(el('span', 'ref-year-label', year));
      }
      card.appendChild(cardHead);
      
      card.appendChild(el('h4', 'ref-title', title));
      
      if (refKey) {
        card.appendChild(el('div', 'ref-key-badge', refKey));
      }
      
      if (summary) {
        const sumText = summary.length > 130 ? summary.substring(0, 127) + '...' : summary;
        card.appendChild(el('p', 'ref-summary', sumText));
      }
      
      card.addEventListener('click', () => {
        window.__state.selectedEvidenceId = evidenceId(r);
        window.__state.explorerOpen = true;
        renderAll();
      });
      
      grid.appendChild(card);
    });
    
    if (!grid.childElementCount) {
      grid.appendChild(el('div', 'empty', 'No matching references found.'));
    }
  }
  
  input.addEventListener('input', (e) => {
    updateGrid(e.target.value);
  });
  
  updateGrid();
  
  return container;
}

// === Evidence Explorer ===
function renderExplorer(d) {
  const explorer = el('aside','evidence-explorer');
  const head = el('div','explorer-head');
  head.appendChild(el('h2','','Evidence Explorer'));
  const close = el('button','icon-button evidence-drawer-close','Close');
  close.type = 'button';
  close.title = 'Close Evidence Explorer';
  close.addEventListener('click', () => { window.__state.explorerOpen = false; renderAll(); });
  head.appendChild(close);
  explorer.appendChild(head);
  const rows = evidenceRows(d);
  if (!rows.length) { explorer.appendChild(el('div','empty','No paper evidence linked.')); return explorer; }
  const selId = window.__state.selectedEvidenceId;
  const selected = selId ? rows.find(r=>evidenceRefKeys(r).has(selId)) : null;
  if (!selected) {
    const e = el('div','explorer-empty');
    e.appendChild(el('strong','','No evidence selected'));
    e.appendChild(el('p','muted','Select evidence from a claim, taxonomy node, comparison row, or timeline marker.'));
    explorer.appendChild(e);
    return explorer;
  }
  const card = el('div','selected-evidence-card');
  const idx = Math.max(0,rows.findIndex(r=>evidenceId(r)===evidenceId(selected)));
  const chipRow = el('div','chip-row');
  chipRow.appendChild(badge('selected evidence','blue'));
  const status = firstText(selected,['synthesis_role','status','freshness']);
  if (status) chipRow.appendChild(badge(status,toneFor(status)));
  card.appendChild(chipRow);
  card.appendChild(el('span','evidence-code',evidenceCode(selected,idx)));
  card.appendChild(el('h2','',evidenceTitle(selected,idx)));
  const meta = [firstText(selected,['year','publication_year']),firstText(selected,['paper_ref','paperRef'])].filter(Boolean).join(' | ');
  if (meta) card.appendChild(el('p','muted',meta));
  const summary = firstText(selected,['summary','evidence_summary','topic_relevance','rationale']);
  if (summary) card.appendChild(renderParagraphs(summary));
  // cross-links
  const keys = evidenceRefKeys(selected);
  const links = { claims:[], timeline:[], taxonomy:[] };
  recordArray(d.claims).forEach((c,i)=>{ if(stringArray(c.evidence_refs).some(r=>keys.has(r))) links.claims.push(firstText(c,['id','text'],`C${i+1}`)); });
  topicTimelineEvents(d).forEach((e,i)=>{ if(stringArray(e.evidence_refs).some(r=>keys.has(r))) links.timeline.push(firstText(e,['id','title'],`T${i+1}`)); });
  recordArray(d.taxonomy?.nodes).forEach((n,i)=>{ if(stringArray(n.evidence_refs||n.paper_refs||n.paper_unit_refs).some(r=>keys.has(r))) links.taxonomy.push(firstText(n,['id','label','title'],`N${i+1}`)); });
  const linkList = el('div','evidence-stack');
  Object.entries(links).forEach(([kind,refs])=>{
    if (!refs.length) return;
    const row = el('div','evidence-row');
    row.appendChild(el('strong','',kind));
    row.appendChild(el('span','muted',refs.join(', ')));
    linkList.appendChild(row);
  });
  if (linkList.childElementCount) card.appendChild(linkList);
  const open = el('button','primary','Open Digest Artifact');
  open.type = 'button';
  open.addEventListener('click', () => {
    window.__state.selectedEvidenceId = evidenceId(selected);
    window.__state.digestOpen = true;
    renderAll();
  });
  card.appendChild(open);
  explorer.appendChild(card);
  return explorer;
}

function renderEvidenceDrawer(d) {
  const drawer = el('div', `evidence-drawer${window.__state.explorerOpen ? ' open' : ''}`);
  drawer.setAttribute('aria-hidden', window.__state.explorerOpen ? 'false' : 'true');
  drawer.addEventListener('click', event => {
    if (event.target === drawer) {
      window.__state.explorerOpen = false;
      renderAll();
    }
  });
  const panel = el('div','evidence-drawer-panel');
  panel.appendChild(renderExplorer(d));
  drawer.appendChild(panel);
  return drawer;
}

function sampleDigestMarkdown() {
  return [
    '## Paper Digest',
    'This digest preview demonstrates scrollable modal content and outline navigation.',
    '### Research Problem',
    'The paper addresses detection robustness under data, scale, and annotation constraints.',
    '### Method',
    'The method combines representation learning, localization heads, and evaluation-driven iteration.',
    '### Evidence Notes',
    'Evidence should be opened from Evidence Explorer, not directly from timeline markers.',
    '### Long Section',
    Array.from({length: 16}, (_, i) => `Paragraph ${i + 1}: dense digest content remains scrollable inside the modal.`).join('\n\n'),
  ].join('\n\n');
}

function renderDigestMarkdown(markdown) {
  const article = el('article','reader-body markdown-body');
  markdown.split(/\n(?=#{1,4}\s)/).forEach((block, index) => {
    const heading = block.match(/^(#{1,4})\s+(.+)$/m);
    if (heading) {
      const level = Math.min(4, heading[1].length);
      const h = el(`h${level}`,'',heading[2]);
      h.id = `digest-heading-${index + 1}`;
      article.appendChild(h);
      const rest = block.replace(heading[0], '').trim();
      if (rest) article.appendChild(renderParagraphs(rest));
    } else if (block.trim()) {
      article.appendChild(renderParagraphs(block.trim()));
    }
  });
  return article;
}

function renderDigestModal() {
  if (!window.__state.digestOpen) return null;
  const overlay = el('div','paper-digest-modal');
  const dialog = el('section','paper-digest-dialog');
  const head = el('div','paper-digest-header');
  const selected = evidenceRows(D).find(r => evidenceRefKeys(r).has(window.__state.selectedEvidenceId)) || {};
  head.appendChild(el('strong','',evidenceTitle(selected,0) || 'Paper digest'));
  const close = el('button','','Close');
  close.type = 'button';
  close.addEventListener('click', () => { window.__state.digestOpen = false; renderAll(); });
  head.appendChild(close);
  dialog.appendChild(head);
  const markdown = renderDigestMarkdown(sampleDigestMarkdown());
  const body = el('div','paper-digest-body');
  const outline = el('nav','digest-outline');
  outline.appendChild(el('strong','','Outline'));
  Array.from(markdown.querySelectorAll('h1,h2,h3,h4')).forEach((heading) => {
    const level = Number(heading.tagName.replace(/\D/g,'')) || 2;
    const link = el('a',`digest-outline-link depth-${Math.max(1, Math.min(4, level))}`,heading.textContent);
    link.href = `#${heading.id}`;
    link.addEventListener('click', event => {
      event.preventDefault();
      heading.scrollIntoView({ block: 'start' });
    });
    outline.appendChild(link);
  });
  const scroll = el('div','digest-scroll-body');
  scroll.appendChild(markdown);
  body.appendChild(outline);
  body.appendChild(scroll);
  dialog.appendChild(body);
  overlay.appendChild(dialog);
  return overlay;
}

// === Main render ===
function renderAll() {
  const root = document.getElementById('app');
  clear(root);
  root.classList.toggle('sidebar-expanded', window.__state.sidebarExpanded);
  root.classList.toggle('sidebar-collapsed', !window.__state.sidebarExpanded);
  // Sidebar
  const sidebar = el('aside','sidebar');
  const brand = el('div','brand brand-icon-only');
  const logo = document.createElement('img');
  logo.src = '../addon/content/icons/favicon.png';
  logo.alt = 'Zotero Skills';
  brand.appendChild(logo);
  const toggle = el('button','sidebar-collapse-toggle icon-only');
  toggle.type = 'button';
  toggle.title = window.__state.sidebarExpanded ? 'Collapse navigation' : 'Expand navigation';
  toggle.setAttribute('aria-label', toggle.title);
  toggle.setAttribute('aria-expanded', window.__state.sidebarExpanded ? 'true' : 'false');
  toggle.appendChild(iconSvg(window.__state.sidebarExpanded ? 'panel-close' : 'panel-open'));
  toggle.addEventListener('click', () => {
    window.__state.sidebarExpanded = !window.__state.sidebarExpanded;
    renderAll();
  });
  brand.appendChild(toggle);
  sidebar.appendChild(brand);
  sidebar.appendChild(el('div','muted sidebar-library','Library 1'));
  const nav = el('div','nav');
  [['overview','Home','home'],['artifacts','Topics','topics'],['graph','Graph','graph'],['registry','Index','index']].forEach(([tab,label,iconName])=>{
    const btn = el('button',tab==='overview'?'active':''); btn.type='button';
    btn.title = label;
    btn.setAttribute('aria-label', label);
    const icon = el('span',`nav-icon nav-icon-${iconName}`);
    icon.appendChild(iconSvg(iconName));
    btn.appendChild(icon);
    btn.appendChild(el('span','nav-label',label));
    nav.appendChild(btn);
  });
  sidebar.appendChild(nav);
  root.appendChild(sidebar);
  // Content
  const content = el('main','content');
  const topbar = el('div','topbar');
  topbar.appendChild(el('h1','',D.topic?.title||'Object Detection'));
  const toolbar = el('div','toolbar');
  toolbar.appendChild(badge(D.language||'zh-CN','blue'));
  toolbar.appendChild(badge(`${numberValue(D.paper_evidence?.length||D.statistics?.paper_count||25)} papers`));
  toolbar.appendChild(badge(`${numberValue(D.external_literature_analysis?.representative_references?.length||3)} external refs`,'purple'));
  topbar.appendChild(toolbar);
  content.appendChild(topbar);
  const main = el('section','main');
  // Topic detail shell
  const app = el('div','topic-detail-shell');
  const body = el('section','topic-detail');
  const workbench = el('div','topic-detail-layout');
  // Tabs
  const tabs = el('nav','topic-detail-tabs');
  [['overview','Overview'],['taxonomy','Taxonomy'],['claims','Claims'],['references','References'],['compare','Compare'],['external','External'],['coverage','Coverage'],['statistics','Stats'],['report','Report']].forEach(([id,label])=>{
    const btn = el('button',window.__state.section===id?'active':'',label); btn.type='button';
    btn.addEventListener('click',()=>{ window.__state.section=id; renderAll(); });
    tabs.appendChild(btn);
  });
  workbench.appendChild(tabs);
  // Reading surface
  const reader = el('main','topic-reading-surface');
  reader.appendChild(renderSection(D));
  workbench.appendChild(reader);
  body.appendChild(workbench);
  body.appendChild(renderEvidenceDrawer(D));
  // Timeline
  body.appendChild(renderTimeline(D));
  app.appendChild(body);
  main.appendChild(app);
  content.appendChild(main);
  root.appendChild(content);
  const digest = renderDigestModal();
  if (digest) root.appendChild(digest);
}

window.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (window.__state.digestOpen) {
    window.__state.digestOpen = false;
    renderAll();
    return;
  }
  if (window.__state.explorerOpen) {
    window.__state.explorerOpen = false;
    renderAll();
  }
});

renderAll();
