/* 마트프로 WMS — config 기반 페이지 렌더 엔진
   각 페이지 = config 객체. 셸/필터바/테이블/페이지네이션/드로어를 일관되게 생성.
   app-shell.js(renderSider) 의존. */
(function () {
  'use strict';

  // ---------- formatting ----------
  const won = v => (v == null) ? '-' : new Intl.NumberFormat('ko-KR').format(v === 0 ? 0 : v);
  const num = v => (v == null) ? '-' : v.toLocaleString('ko-KR');
  const pad = (n, w) => String(n).padStart(w, '0');
  function dstr(off) { const base = new Date(2026, 4, 31); base.setDate(base.getDate() - off); return `${base.getFullYear()}-${pad(base.getMonth() + 1, 2)}-${pad(base.getDate(), 2)}`; }
  function dt(off, i) { return `${dstr(off)} ${pad(9 + (i % 9), 2)}:${pad((i * 13) % 60, 2)}`; }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ---------- icon set ----------
  const SVG = {
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    chevR: '<path d="M9 18l6-6-6-6"/>',
    chevD: '<path d="M6 9l6 6 6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    reload: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/>',
    check: '<path d="M5 12l5 5L20 6"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
    empty: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 10h18M8 14h4"/>',
  };
  const ic = (k, cls, style) => `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${k==='check'?3:1.9}" stroke-linecap="round" stroke-linejoin="round"${style?` style="${style}"`:''}>${SVG[k]}</svg>`;

  // ---------- data pools (한글 더미) ----------
  const POOL = {
    store: ['다람쥐분식 강남점','다람쥐분식 홍대점','다람쥐분식 판교점','다람쥐분식 잠실점','다람쥐분식 부평점','다람쥐분식 수원역점','다람쥐분식 일산점','다람쥐분식 노원점','다람쥐분식 서면점','다람쥐분식 대전둔산점','다람쥐분식 청주점','다람쥐분식 천안점','다람쥐분식 광주충장점','다람쥐분식 인천논현점'],
    cafe: ['스타벅스 역삼점','메가커피 사당점','컴포즈 강남점','이디야 종로점','빽다방 신촌점','투썸 광교점','폴바셋 여의도점','할리스 부산서면점','커피빈 분당점','파스쿠찌 일산점','엔제리너스 대구점','탐앤탐스 수원점'],
    person: ['김상우','이지은','박도현','정수민','최영호','한가람','윤서연','오태경','장미경','임재현','신동욱','권나래'],
    product: ['감자튀김 1kg','모짜렐라치즈 2.5kg','떡볶이 떡 3kg','어묵 모둠 5kg','튀김가루 2kg','순살치킨 1kg','콜라 1.25L 12입','단무지 10kg','김말이 2kg','만두 1kg','라면사리 30입','고추장 14kg','식용유 18L','종이컵 1000입'],
    supplier: ['신선유통','대한식자재','한울푸드','삼성물산식품','동원홈푸드','CJ프레시웨이','우성유통','풍년식품'],
    warehouse: ['중부물류센터','수도권1센터','영남센터','호남센터','강원센터'],
    vehicle: ['12가 3456','34나 7890','56다 1234','78라 5678','90마 2345','11바 6789','22사 0123','33아 4567'],
    bank: ['국민','신한','우리','하나','농협','기업'],
  };
  const pick = (arr, i) => arr[i % arr.length];

  // ---------- filter renderers ----------
  function filterField(f) {
    let ctrl = '';
    const v = f.value;
    if (f.type === 'date') ctrl = `<div class="wms-input">${v || dstr(30)}</div>`;
    else if (f.type === 'daterange') ctrl = `<div class="wms-daterange"><div class="wms-input">${(v&&v[0])||dstr(30)}</div><span class="tilde">~</span><div class="wms-input">${(v&&v[1])||dstr(0)}</div></div>`;
    else if (f.type === 'input') ctrl = `<div class="wms-input-search"><input class="wms-input" placeholder="${f.placeholder||''}" ${v?`value="${esc(v)}"`:''}/>${ic('search','si')}</div>`;
    else if (f.type === 'select') ctrl = `<div class="wms-select ${v?'':'is-placeholder'}"><span>${v||f.placeholder||'전체'}</span>${ic('chevD','chev')}</div>`;
    else if (f.type === 'chips') ctrl = `<div class="wms-chips">${f.options.map((o,i)=>`<div class="wms-chip ${i===(f.active??0)?'is-on':''}">${o}</div>`).join('')}</div>`;
    else if (f.type === 'check') return `<div class="wms-field" style="align-items:center"><div class="ctrl"><label class="wms-check ${f.checked?'is-checked':''}"><span class="box">${ic('check')}</span> ${f.label}</label></div></div>`;
    return `<div class="wms-field"><label>${f.label}</label><div class="ctrl">${ctrl}</div></div>`;
  }

  function actionBtn(a) {
    if (typeof a === 'string') {
      switch (a) {
        case 'search': return `<button class="btn btn-primary">조회 ${ic('search')}</button>`;
        case 'reset': return `<button class="btn btn-default">초기화 ${ic('reload')}</button>`;
        case 'excel': return `<button class="btn btn-default">${ic('download','',`color:var(--color-primary)`)} 엑셀 내보내기</button>`;
        case 'excelBulk': return `<button class="btn btn-default">${ic('upload','',`color:var(--color-primary)`)} 엑셀 일괄 등록</button>`;
        case 'aiBulk': return `<button class="btn btn-default">${ic('sparkles','',`color:var(--color-primary)`)} AI 일괄 등록</button>`;
        case 'register': return `<button class="btn btn-default" data-act="create">+ 등록 ${ic('plus')}</button>`;
        case 'print': return `<button class="btn btn-primary">${ic('print')} 일괄인쇄</button>`;
        case 'save': return `<button class="btn btn-primary">저장 ${ic('check')}</button>`;
        case 'divider': return `<span class="wms-vdiv"></span>`;
        default: return '';
      }
    }
    const cls = a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-default';
    return `<button class="btn ${cls} ${a.disabled?'is-disabled':''}"${a.act?` data-act="${a.act}"`:''}>${a.label}</button>`;
  }

  // ---------- cell renderer ----------
  function cellHTML(col, row) {
    if (col.render) return col.render(row);
    let v = row[col.key];
    const t = col.type || 'text';
    if (t === 'num') return v == null ? '<span class="cell-muted">-</span>' : num(v);
    if (t === 'amount') {
      if (v == null) return '<span class="cell-muted">-</span>';
      const cls = v < 0 ? 'amt-neg' : v > 0 ? 'amt-pos' : '';
      return `<span class="${cls} ${col.strong?'amt-strong':''}">${won(v)}</span>`;
    }
    if (t === 'link') return `<span class="cell-link">${esc(v)}</span>`;
    if (t === 'tag') { const m = col.map[v] || ['', 'tag-gray']; return `<span class="tag ${m[1]}">${m[0]}</span>`; }
    if (t === 'badge') { const m = col.map[v] || ['', 'gray']; return `<span class="badge-dot"><span class="dot dot-${m[1]}"></span>${m[0]}</span>`; }
    if (t === 'switch') return `<span class="wms-switch tg ${v?'is-on':''}"></span>`;
    if (t === 'pct') {
      if (v == null) return '<span class="cell-muted">-</span>';
      const color = v>=100?'color:var(--red-700);font-weight:600':v>=80?'color:var(--orange-600);font-weight:600':v>=50?'color:var(--amber-600)':'color:var(--gray-700)';
      return `<span class="tnum" style="${color}">${v.toFixed(1)}%</span>`;
    }
    if (v == null || v === '') return '<span class="cell-muted">-</span>';
    return esc(v);
  }

  function alignClass(a) { return a === 'right' ? 'num' : a === 'center' ? 'ctr' : ''; }

  // ---------- table header (supports group cols) ----------
  function tableHead(cfg) {
    const cols = cfg.columns;
    const hasGroup = cols.some(c => c.children);
    const sel = cfg.rowSelect ? `<th class="check" ${hasGroup?'rowspan="2"':''}><label class="wms-check selall" style="justify-content:center"><span class="box">${ic('check')}</span></label></th>` : '';
    if (!hasGroup) {
      return `<thead><tr>${sel}${cols.map(c => th(c)).join('')}</tr></thead>`;
    }
    let top = sel, bot = '';
    for (const c of cols) {
      if (c.children) { top += `<th class="group" colspan="${c.children.length}">${c.title}</th>`; bot += c.children.map(ch => th(ch)).join(''); }
      else { top += `<th ${'rowspan="2"'} class="${alignClass(c.align)}" style="${c.w?`width:${c.w}px`:''}">${c.title}</th>`; }
    }
    return `<thead><tr class="grouprow">${top}</tr><tr>${bot}</tr></thead>`;
  }
  function th(c) {
    const a = alignClass(c.align);
    const sort = c.sort ? ` sortable sort-${c.sort}` : '';
    const sortMark = c.sort ? `<span class="sort"><i class="up"></i><i class="dn"></i></span>` : (c.sortable ? `<span class="sort"><i class="up"></i><i class="dn"></i></span>` : '');
    return `<th class="${a}${sort}${c.sortable?' sortable':''}" style="${c.w?`width:${c.w}px;`:''}${c.min?`min-width:${c.min}px;`:''}">${c.title}${sortMark}</th>`;
  }

  function flatCols(cols) { const out = []; for (const c of cols) { if (c.children) out.push(...c.children); else out.push(c); } return out; }

  function tableBody(cfg) {
    const cols = flatCols(cfg.columns);
    const rows = cfg.rows;
    return `<tbody>${rows.map((row, ri) => {
      const sel = cfg.rowSelect ? `<td class="check" data-stop><label class="wms-check rowchk" data-i="${ri}" style="justify-content:center"><span class="box">${ic('check')}</span></label></td>` : '';
      return `<tr data-i="${ri}">${sel}${cols.map(c => `<td class="${alignClass(c.align)} ${c.cellCls||''}" ${c.type==='switch'?'data-stop':''}>${cellHTML(c, row)}</td>`).join('')}</tr>`;
    }).join('')}</tbody>`;
  }

  function tableFoot(cfg) {
    if (!cfg.summary) return '';
    return `<tfoot><tr>${cfg.summary.map(s => `<td class="${alignClass(s.align)}" ${s.colspan?`colspan="${s.colspan}"`:''}>${s.html||''}</td>`).join('')}</tr></tfoot>`;
  }

  // ---------- page render ----------
  function renderPage(host, cfg) {
    const channel = cfg.channel ? `<div class="wms-channel"><span class="cs">마트프로 본사 ${ic('chevD')}</span><span class="div">|</span><span class="cs">다람쥐분식 ${ic('chevD')}</span></div>` : '';
    const crumbs = cfg.crumb.map((c, i) => i === cfg.crumb.length - 1
      ? `<span class="cur">${c}</span>`
      : `<a href="#">${c}</a>${ic('chevR','sep')}`).join('');

    const filterRows = (cfg.filters || []).map(f => filterField(f)).join('');
    const actions = (cfg.actions || []).map(actionBtn).join('');
    const filterBar = (cfg.filters || cfg.actions) ? `
      <section class="wms-filterbar"><div class="wms-filter-grid">
        ${filterRows}
        <div style="grid-column:1 / -1" class="wms-filter-actions">${actions}</div>
      </div></section>` : '';

    const toggleBtn = cfg.colToggle ? `<button class="wms-coltoggle">${ic('dots')}</button>` : '';
    let preTable = '';
    if (cfg.tabs) preTable = `<div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:12px"><div class="wms-tabs">${cfg.tabs.map((t,i)=>`<div class="wms-tab ${i===0?'is-active':''}">${t}</div>`).join('')}</div>${toggleBtn}</div>`;
    else if (cfg.colToggle) preTable = `<div style="display:flex;justify-content:flex-end;margin-bottom:12px;">${toggleBtn}</div>`;

    const empty = (!cfg.rows || cfg.rows.length === 0);
    const table = cfg.table === false ? (cfg.custom || '') : `
      <div class="table-scroll">
        <table class="wms-table ${cfg.clickable!==false?'clickable':''} ${cfg.zebra?'zebra':''}">
          ${tableHead(cfg)}
          ${empty ? '' : tableBody(cfg)}
          ${tableFoot(cfg)}
        </table>
        ${empty ? `<div class="wms-empty">${ic('empty')}<div class="msg">조회 결과가 없어요</div></div>` : ''}
      </div>
      <div class="wms-pagination">
        <span class="total">총 ${num(cfg.total != null ? cfg.total : (cfg.rows ? cfg.rows.length : 0))}건</span>
        <span class="wms-page is-disabled">‹</span><span class="wms-page is-active">1</span>${(cfg.total||0)>(cfg.rows?cfg.rows.length:0)?'<span class="wms-page">2</span><span class="wms-page">3</span>':''}<span class="wms-page">›</span>
        <span class="wms-select wms-pagesize" style="width:104px;height:32px"><span>${cfg.pageSize||100} / 쪽</span>${ic('chevD','chev')}</span>
      </div>`;

    host.innerHTML = `
      <header class="wms-pagehead">
        <div class="wms-pagehead-l"><button class="wms-back">${ic('back')}</button><nav class="wms-crumb">${crumbs}</nav></div>
        ${channel}
      </header>
      ${filterBar}
      <div class="wms-content"><div class="table-region">${preTable}${table}</div></div>`;

    wireTable(host, cfg);
  }

  // ---------- interactions ----------
  function wireTable(host, cfg) {
    // switches
    host.querySelectorAll('.tg').forEach(s => s.addEventListener('click', e => { e.stopPropagation(); s.classList.toggle('is-on'); }));
    // row checkboxes
    const selall = host.querySelector('.selall');
    host.querySelectorAll('[data-stop]').forEach(td => td.addEventListener('click', e => e.stopPropagation()));
    host.querySelectorAll('.rowchk').forEach(c => c.addEventListener('click', e => {
      e.stopPropagation(); c.classList.toggle('is-checked'); c.closest('tr').classList.toggle('is-selected', c.classList.contains('is-checked'));
    }));
    if (selall) selall.addEventListener('click', () => {
      selall.classList.toggle('is-checked'); const on = selall.classList.contains('is-checked');
      host.querySelectorAll('.rowchk').forEach(c => { c.classList.toggle('is-checked', on); c.closest('tr').classList.toggle('is-selected', on); });
    });
    // chips (single select within group)
    host.querySelectorAll('.wms-chips').forEach(grp => grp.querySelectorAll('.wms-chip').forEach(ch => ch.addEventListener('click', () => { grp.querySelectorAll('.wms-chip').forEach(x => x.classList.remove('is-on')); ch.classList.add('is-on'); })));
    // tabs
    host.querySelectorAll('.wms-tabs').forEach(bar => bar.querySelectorAll('.wms-tab').forEach(tab => tab.addEventListener('click', () => { bar.querySelectorAll('.wms-tab').forEach(x => x.classList.remove('is-active')); tab.classList.add('is-active'); })));
    // row click → drawer
    if (cfg.drawer) {
      host.querySelectorAll('tbody tr').forEach(tr => tr.addEventListener('click', () => openDrawer(cfg, cfg.rows[+tr.dataset.i])));
    }
    const createBtn = host.querySelector('[data-act="create"]');
    if (createBtn && cfg.drawer) createBtn.addEventListener('click', () => openDrawer(cfg, null));
  }

  // ---------- drawer (detail or form) ----------
  function ensureDrawer() {
    if (document.getElementById('wmsDrawer')) return;
    const el = document.createElement('div');
    el.innerHTML = `<div class="wms-scrim" id="wmsScrim"></div>
      <aside class="wms-drawer" id="wmsDrawer">
        <div class="wms-drawer-head"><h2 id="wmsDwTitle"></h2><button class="wms-x" id="wmsDwX">${ic('x')}</button></div>
        <div class="wms-drawer-body" id="wmsDwBody"></div>
        <div class="wms-drawer-foot" id="wmsDwFoot"></div>
      </aside>`;
    document.body.appendChild(el);
    const close = () => { document.getElementById('wmsDrawer').classList.remove('is-open'); document.getElementById('wmsScrim').classList.remove('is-open'); };
    document.getElementById('wmsDwX').onclick = close;
    document.getElementById('wmsScrim').onclick = close;
    window.__wmsCloseDrawer = close;
  }

  function field(f) {
    const span = f.span || 4;
    const inp = (v, ph) => `<div class="wms-input">${v != null && v !== '' ? esc(v) : `<span style="color:var(--gray-500)">${ph || ''}</span>`}</div>`;
    const sel = (v, ph) => `<div class="wms-select ${v?'':'is-placeholder'}"><span>${v || ph || '선택'}</span>${ic('chevD','chev')}</div>`;
    let ctrl;
    if (f.kind === 'select') ctrl = sel(f.value, f.placeholder);
    else if (f.kind === 'chips') ctrl = `<div class="wms-chips" style="max-width:${(f.options.length)*70}px">${f.options.map((o,i)=>`<div class="wms-chip ${i===(f.active??0)?'is-on':''}">${o}</div>`).join('')}</div>`;
    else if (f.kind === 'textarea') ctrl = `<textarea class="wms-input" style="height:72px;white-space:normal;padding:8px 10px;align-items:flex-start;line-height:20px">${f.value||''}</textarea>`;
    else if (f.kind === 'switch') return `<div class="f-field col-${span}"><div class="switch-row" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid var(--gray-200);border-radius:6px"><div style="font-size:13px">${f.label}${f.sub?`<div style="font-size:11px;color:var(--gray-500)">${f.sub}</div>`:''}</div><span class="wms-switch tg ${f.value?'is-on':''}"></span></div></div>`;
    else ctrl = inp(f.value, f.placeholder);
    return `<div class="f-field col-${span}"><label>${f.label}${f.req?'<span class="req">*</span>':''}</label>${ctrl}${f.help?`<span class="f-help">${f.help}</span>`:''}</div>`;
  }

  function openDrawer(cfg, row) {
    ensureDrawer();
    const d = cfg.drawer;
    const isCreate = !row;
    document.getElementById('wmsDwTitle').innerHTML = `${isCreate ? (d.createTitle || d.title) : (d.editTitle || d.title)}${d.sub ? `<span class="sub">${typeof d.sub==='function'?d.sub(row,isCreate):d.sub}</span>` : ''}`;
    let body = '';
    if (d.type === 'detail') {
      const kvs = d.fields(row).map(([k, v]) => `<div class="f-field"><label>${k}</label><div style="font-size:14px;color:var(--gray-900)">${v}</div></div>`).join('');
      body = `<div class="form-section"><div class="form-grid" style="grid-template-columns:repeat(${d.cols||4},1fr);gap:14px 16px;padding:18px 24px">${kvs}</div></div>`;
      if (d.extra) body += d.extra(row);
    } else { // form
      body = d.sections.map(sec => `
        <section class="form-section">
          <button class="form-section-head">${ic('chevR','caret')}<span class="ttl">${sec.title}</span>${sec.sub?`<span class="sub">${sec.sub}</span>`:''}</button>
          <div class="form-grid">${sec.fields.map(field).join('')}</div>
        </section>`).join('');
      if (d.extra) body += d.extra(row);
    }
    document.getElementById('wmsDwBody').innerHTML = body;
    const foot = d.footer || (d.type === 'detail' ? `<div></div><div class="flex gap-2"><button class="btn btn-default" data-close>닫기</button></div>` : `<button class="btn btn-danger">폐기</button><div class="flex gap-2"><button class="btn btn-default" data-close>닫기</button><button class="btn btn-primary">저장</button></div>`);
    document.getElementById('wmsDwFoot').innerHTML = foot;
    // wire
    const body2 = document.getElementById('wmsDwBody');
    body2.querySelectorAll('.form-section-head').forEach(h => h.addEventListener('click', () => h.closest('.form-section').classList.toggle('collapsed')));
    body2.querySelectorAll('.tg').forEach(s => s.addEventListener('click', () => s.classList.toggle('is-on')));
    body2.querySelectorAll('.wms-chips').forEach(grp => grp.querySelectorAll('.wms-chip').forEach(ch => ch.addEventListener('click', () => { grp.querySelectorAll('.wms-chip').forEach(x => x.classList.remove('is-on')); ch.classList.add('is-on'); })));
    document.querySelectorAll('#wmsDwFoot [data-close]').forEach(b => b.onclick = window.__wmsCloseDrawer);
    document.getElementById('wmsScrim').classList.add('is-open');
    document.getElementById('wmsDrawer').classList.add('is-open');
  }

  // ---------- mount SPA ----------
  function mountApp(pages, startPath) {
    const app = document.getElementById('app');
    function go(path) {
      const cfg = pages[path];
      app.querySelector('.wms-sider')?.remove();
      app.insertAdjacentHTML('afterbegin', window.renderSider(path));
      window.__wmsCloseDrawer && window.__wmsCloseDrawer();
      const main = document.getElementById('wmsMain');
      if (cfg) renderPage(main, cfg);
      else main.innerHTML = `<header class="wms-pagehead"><div class="wms-pagehead-l"><nav class="wms-crumb"><span class="cur">${path}</span></nav></div></header><div class="wms-empty" style="margin-top:80px">${ic('empty')}<div class="msg">준비 중인 페이지</div></div>`;
      // wire sider nav
      app.querySelectorAll('.wms-submenu-item').forEach(it => it.addEventListener('click', () => {
        const key = findKey(it.textContent.trim());
        if (key) { history.replaceState(null, '', '#' + key); go(key); }
      }));
      app.querySelectorAll('.wms-menu-group').forEach(g => { const p = g.querySelector('.wms-menu-parent'); if (g.querySelector('.wms-submenu')) p.addEventListener('click', () => { app.querySelectorAll('.wms-menu-group').forEach(o => { if (o !== g) o.classList.remove('is-open'); }); g.classList.toggle('is-open'); }); });
      document.getElementById('wmsMain').scrollTop = 0;
    }
    const labelToKey = {};
    Object.values(pages).forEach(c => { if (c) labelToKey[c.crumb[c.crumb.length - 1]] = c.path; });
    function findKey(label) { return labelToKey[label]; }
    const initial = (location.hash || '').replace('#', '') || startPath;
    go(pages[initial] ? initial : startPath);
    window.__wmsGo = go;
  }

  // expose helpers for configs
  window.WMS = { won, num, dstr, dt, pick, POOL, ic, esc, renderPage, mountApp };
})();
