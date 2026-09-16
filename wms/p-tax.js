/* 대금관리 — 전자세금계산서 발행 (P1, 포트폴리오 07면 대응) NOTES.md §10 */
(function () {
  const { won, num, dstr, dt, pick, POOL, esc } = WMS;
  window.WMS_PAGES = window.WMS_PAGES || [];

  const HOLD_REASONS = ['사업자번호 미등록', '세금계산서 수신 이메일 없음', '공급가 0원(거래 없음)', '채권 조정 미확정'];
  const HOLD_ACTION = {
    '사업자번호 미등록': '거래처 관리에서 사업자번호를 등록한 뒤 재시도하세요.',
    '세금계산서 수신 이메일 없음': '거래처 담당자 이메일을 등록한 뒤 재시도하세요.',
    '공급가 0원(거래 없음)': '해당 월 거래 내역을 확인한 뒤 재시도하세요.',
    '채권 조정 미확정': '채권조정처리에서 조정 건을 확정한 뒤 재시도하세요.',
  };
  const CORP = ['본사 법인', '계열사 법인'];
  const PAYTYPE = ['충전형', '후입금'];
  const ST_MAP = { WAIT: ['대기', 'gold'], HOLD: ['홀드', 'red'], DONE: ['완료', 'green'], FIX: ['수정', 'purple'] };
  const MONTHS = ['2026-04', '2026-05', '2026-06'];
  const CLOSED_MONTHS = { '2026-04': true, '2026-05': false, '2026-06': false };

  // ---------- state ----------
  const state = {
    month: '2026-04',
    corp: '전체',
    q: '',
    status: '전체',
    seq: 1,
  };

  function mkRow(i) {
    const name = pick(POOL.store, i);
    const corp = i % 5 === 0 ? CORP[1] : CORP[0];
    const pay = pick(PAYTYPE, i);
    const hasTax = i % 6 !== 5;
    const hasFree = i % 4 === 0;
    const taxSupply = hasTax ? 1200000 + (i * 97311) % 6800000 : null;
    const taxVat = hasTax ? Math.round(taxSupply * 0.1) : null;
    const freeSupply = hasFree ? 300000 + (i * 51231) % 1500000 : null;
    const sheets = (hasTax ? 1 : 0) + (hasFree ? 1 : 0);
    let st = 'WAIT';
    let holdReason = null, issuedAt = null;
    if (i % 7 === 3) { st = 'HOLD'; holdReason = pick(HOLD_REASONS, i); }
    else if (i % 4 === 1) { st = 'DONE'; issuedAt = dt(i % 20, i); }
    return {
      no: 'TX-2604' + String(1000 + i),
      code: `S${(10240 - i * 3).toString().padStart(5, '0')}`,
      name, corp, pay,
      taxSupply, taxVat, freeSupply, sheets: sheets || 1,
      st, holdReason, issuedAt, sentMsg: st === 'DONE' ? '전송 완료' : null,
      __amend: false,
    };
  }

  let ROWS = Array.from({ length: 18 }, (_, i) => mkRow(i));

  function summary() {
    const target = ROWS.filter(r => !r.__amend);
    const wait = target.filter(r => r.st === 'WAIT').length;
    const hold = target.filter(r => r.st === 'HOLD').length;
    const done = target.filter(r => r.st === 'DONE').length;
    return { total: target.length, wait, hold, done };
  }
  function corpBreakdown() {
    const target = ROWS.filter(r => !r.__amend);
    const out = {};
    CORP.forEach(c => { out[c] = target.filter(r => r.corp === c).length; });
    return out;
  }

  function introHTML() {
    const s = summary();
    const cb = corpBreakdown();
    return `
    <div class="tax-summary" style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
      <div class="tax-cards" style="display:flex;gap:12px;flex:1 1 480px">
        ${[['대상 거래처', s.total, ''], ['발행 대기', s.wait, 'gold'], ['자동 홀드', s.hold, 'red'], ['발행 완료', s.done, 'green']]
          .map(([label, v, tone]) => `
          <div style="flex:1;background:#fff;border:1px solid var(--gray-200);border-radius:8px;padding:12px 16px">
            <div style="font-size:12px;color:var(--gray-500)">${label}</div>
            <div style="font-size:22px;font-weight:700;margin-top:4px;${tone ? `color:var(--${tone === 'gold' ? 'amber' : tone}-600)` : ''}">${num(v)}<span style="font-size:13px;font-weight:400;color:var(--gray-500)">건</span></div>
          </div>`).join('')}
      </div>
      <div style="flex:1 1 260px;background:#fff;border:1px solid var(--gray-200);border-radius:8px;padding:10px 14px">
        <div style="font-size:12px;color:var(--gray-500);margin-bottom:6px">발행 법인 분기</div>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tbody>
          ${CORP.map(c => `<tr><td style="padding:3px 0;color:var(--gray-700)">${c}</td><td style="padding:3px 0;text-align:right;font-weight:600">${num(cb[c] || 0)}건</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function filteredRows() {
    return ROWS.filter(r => {
      if (state.corp !== '전체' && r.corp !== state.corp) return false;
      if (state.q && !r.name.includes(state.q)) return false;
      if (state.status !== '전체') {
        const label = ST_MAP[r.st][0];
        if (label !== state.status) return false;
      }
      return true;
    });
  }

  function waitCount() { return ROWS.filter(r => r.st === 'WAIT' && !r.__amend).length; }
  function holdCount() { return ROWS.filter(r => r.st === 'HOLD' && !r.__amend).length; }

  function statusBadge(r) {
    const m = ST_MAP[r.st] || ['', 'gray'];
    return `<span class="badge-dot"><span class="dot dot-${m[1]}"></span>${m[0]}</span>`;
  }

  const cfg = {
    path: '/payment/tax-invoice',
    crumb: ['대금관리', '전자세금계산서 발행'],
    channel: true,
    clickable: true,
    get filters() {
      const closed = CLOSED_MONTHS[state.month];
      const badge = closed
        ? '<span class="tag tag-green" style="margin-left:6px">정산 마감 완료</span>'
        : '<span class="tag tag-gray" style="margin-left:6px">마감 후 발행 가능</span>';
      return [
        { label: `발행 대상월 ${badge}`, type: 'chips', options: MONTHS.slice(), active: MONTHS.indexOf(state.month) },
        { label: '발행 법인', type: 'chips', options: ['전체', ...CORP], active: ['전체', ...CORP].indexOf(state.corp) },
        { label: '거래처', type: 'input', placeholder: '거래처명 검색', value: state.q },
        { label: '상태', type: 'chips', options: ['전체', '대기', '홀드', '완료', '수정'], active: ['전체', '대기', '홀드', '완료', '수정'].indexOf(state.status) },
      ];
    },
    get actions() {
      const closed = CLOSED_MONTHS[state.month];
      const n = waitCount();
      return [
        { label: `전량 발행 ${n}건`, kind: 'primary', act: 'issue-all', disabled: !closed || n === 0 },
        'excel',
      ];
    },
    get rows() { return filteredRows(); },
    get total() { return filteredRows().length; },
    columns: [
      { title: '거래처', key: 'name', min: 150 },
      { title: '법인', key: 'corp', align: 'center', w: 100 },
      { title: '결제유형', key: 'pay', align: 'center', w: 90 },
      { title: '과세 공급가', align: 'right', w: 130, render: r => r.taxSupply == null ? '<span class="cell-muted">-</span>' : num(r.taxSupply) },
      { title: '세액', align: 'right', w: 110, render: r => r.taxVat == null ? '<span class="cell-muted">-</span>' : num(r.taxVat) },
      { title: '면세 공급가', align: 'right', w: 130, render: r => r.freeSupply == null ? '<span class="cell-muted">-</span>' : num(r.freeSupply) },
      { title: '발행 장수', key: 'sheets', align: 'center', w: 90, render: r => r.__amend ? '-' : `${r.sheets}장` },
      { title: '상태', align: 'center', w: 90, render: r => r.__amend ? `<span class="badge-dot"><span class="dot dot-purple"></span>수정</span>` : statusBadge(r) },
      { title: '홀드 사유', align: 'left', min: 160, render: r => r.holdReason ? esc(r.holdReason) : '<span class="cell-muted">-</span>' },
      { title: '발행일시', align: 'left', w: 150, cellCls: 'tnum', render: r => r.issuedAt ? esc(r.issuedAt) + (r.sentMsg ? ` <span class="tag tag-green" style="margin-left:4px">${r.sentMsg}</span>` : '') : '<span class="cell-muted">-</span>' },
    ],
    drawer: {
      type: 'detail', cols: 4,
      title: '전자세금계산서 상세',
      sub: r => ` · ${r.no}`,
      fields: r => [
        ['거래처', esc(r.name)], ['법인', r.corp], ['결제유형', r.pay],
        ['과세 공급가', r.taxSupply == null ? '-' : num(r.taxSupply) + '원'],
        ['세액', r.taxVat == null ? '-' : num(r.taxVat) + '원'],
        ['면세 공급가', r.freeSupply == null ? '-' : num(r.freeSupply) + '원'],
        ['상태', ST_MAP[r.st] ? ST_MAP[r.st][0] : '-'],
        ['발행일시', r.issuedAt || '-'],
      ],
      extra: r => {
        cfg.drawer._lastRow = r;
        if (r.st === 'HOLD') {
          return `<div style="padding:0 24px 20px">
            <div style="background:var(--red-50,#fef2f2);border:1px solid var(--red-200,#fecaca);border-radius:8px;padding:14px 16px">
              <div style="font-weight:600;color:var(--red-700,#b91c1c);font-size:13px;margin-bottom:6px">홀드 사유: ${esc(r.holdReason)}</div>
              <div style="font-size:12px;color:var(--gray-600);margin-bottom:12px">${esc(HOLD_ACTION[r.holdReason] || '조치 후 재시도하세요.')}</div>
              <button class="btn btn-primary" data-act="resolve-hold" data-no="${r.no}">사유 해소(시연)</button>
            </div>
          </div>`;
        }
        return '';
      },
      get footer() {
        const r = cfg.drawer._lastRow;
        if (r && r.st === 'DONE') {
          return `<div></div><div class="flex gap-2"><button class="btn btn-default" data-close>닫기</button><button class="btn btn-primary" data-act="amend" data-no="${r.no}">수정 발행</button></div>`;
        }
        return `<div></div><div class="flex gap-2"><button class="btn btn-default" data-close>닫기</button></div>`;
      },
    },
  };

  // drawer.footer/extra/fields need to be functions accepting row per engine (fields already is fn).
  // wms-render.js expects footer as a string or function? It uses d.footer directly as HTML string.
  // We normalize via __refresh wrapping in demo-patch style below (page-local refresh).
  cfg.__refresh = function () { /* rows/filters/actions are getters — always fresh */ };

  window.WMS_PAGES.push({ '/payment/tax-invoice': cfg });

  // expose internals for demo-patch.js to wire interactions without touching wms-render.js
  window.__WMS_TAX = {
    cfg, state, ROWS: () => ROWS, HOLD_REASONS,
    waitCount, holdCount, introHTML,
    issueAll() {
      const now = new Date();
      const ts = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') +
        ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      let n = 0;
      ROWS.forEach(r => { if (r.st === 'WAIT' && !r.__amend) { r.st = 'DONE'; r.issuedAt = ts; r.sentMsg = '전송 완료'; n++; } });
      return { n, m: holdCount() };
    },
    resolveHold(no) {
      const r = ROWS.find(x => x.no === no);
      if (r) { r.st = 'WAIT'; r.holdReason = null; }
    },
    amend(no, reason, amount) {
      const idx = ROWS.findIndex(x => x.no === no);
      if (idx < 0) return;
      const orig = ROWS[idx];
      const amt = Number(amount) || 0;
      const fixRow = {
        no: orig.no + '-F' + (state.seq++),
        code: orig.code, name: orig.name + ` (수정, ${esc(reason)} · 원본 ${orig.no})`,
        corp: orig.corp, pay: orig.pay,
        taxSupply: amt, taxVat: null, freeSupply: null, sheets: 0,
        st: 'FIX', holdReason: null, issuedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        sentMsg: null, __amend: true,
      };
      ROWS.splice(idx + 1, 0, fixRow);
    },
    setMonth(m) { state.month = m; },
    setCorp(c) { state.corp = c; },
    setQ(q) { state.q = q; },
    setStatus(s) { state.status = s; },
    MONTHS, CLOSED_MONTHS, CORP,
  };
})();
