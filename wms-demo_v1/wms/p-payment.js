/* 대금관리 — 대금입금 현황 / 채권조정처리  (미수채권현황은 core.js) */
(function () {
  const { won, num, dstr, dt, pick, POOL, esc } = WMS;
  window.WMS_PAGES = window.WMS_PAGES || [];
  const PAY_ST = { CONFIRMED:['수금확인','tag-green'], PENDING:['미확인','tag-gold'], ERROR:['오류','tag-red'] };
  const ROUTE = ['가상계좌','계좌이체','카드','현금','상계'];
  const tagCell = (map,key) => r => { const m=map[r[key]]; return m?`<span class="tag ${m[1]}">${m[0]}</span>`:'<span class="cell-muted">-</span>'; };

  /* ── 대금입금 현황 ── */
  function cbRow(i){
    const st = i%9===0?'ERROR':i%4===0?'PENDING':'CONFIRMED';
    return { paidAt:dt(i%24,i), st, code:`S${(10240-i*3).toString().padStart(5,'0')}`, name:pick(POOL.cafe,i),
      bizno:`220-${10+i}-${50000+i*131}`, rep:pick(POOL.person,i), amt:120000+(i*81237)%4200000, route:pick(ROUTE,i),
      bank:pick(POOL.bank,i), account:`3${(330021+i*137).toString().padStart(10,'0')}`, payer: i%3===0?pick(POOL.cafe,i):pick(POOL.person,i),
      confirmedAt: st==='CONFIRMED'?dt(i%24,i):null, no:`RC-2605${(900-i).toString().padStart(4,'0')}`, memo:pick(['-','자동매칭','수기확인'],i),
      err: st==='ERROR'?'계좌주 불일치':null };
  }
  const CB = Array.from({length:14},(_,i)=>cbRow(i));
  const cbTot = CB.reduce((a,r)=>a+r.amt,0);
  const chargeBalance = {
    path:'/payment/charge-balance', crumb:['대금관리','대금입금 현황'], channel:true, clickable:false,
    filters:[
      { label:'조회기간', type:'daterange' },
      { label:'거래처', type:'input', placeholder:'코드 / 거래처명 (현 페이지)' },
      { label:'입금경로', type:'select', placeholder:'전체' },
    ],
    actions:['excel','divider','search'], total:1024,
    columns:[
      { title:'수금일시', key:'paidAt', w:150, cellCls:'tnum' },
      { title:'입금상태', align:'center', w:100, render:tagCell(PAY_ST,'st') },
      { title:'거래처코드', key:'code', w:100 },
      { title:'거래처명', key:'name', min:150 },
      { title:'사업자번호', key:'bizno', w:130, cellCls:'tnum' },
      { title:'대표자', key:'rep', w:90 },
      { title:'입금금액', key:'amt', type:'num', align:'right', w:130 },
      { title:'입금경로', key:'route', align:'center', w:90 },
      { title:'은행', key:'bank', align:'center', w:70 },
      { title:'거래계좌', key:'account', w:150, cellCls:'tnum' },
      { title:'입금자', key:'payer', w:110 },
      { title:'수금확인일시', w:150, cellCls:'tnum', render:r=> r.confirmedAt||'<span class="cell-muted">-</span>' },
      { title:'수금번호', key:'no', w:130, cellCls:'tnum' },
      { title:'적요', w:120, render:r=> r.memo==='-'?'<span class="cell-muted">-</span>':esc(r.memo) },
      { title:'오류', w:120, render:r=> r.err?`<span class="amt-neg">${esc(r.err)}</span>`:'<span class="cell-muted">-</span>' },
    ],
    rows:CB,
    summary:[
      { html:'합계', align:'center', colspan:6 },
      { html:won(cbTot), align:'right' },
      { html:'', colspan:8 },
    ],
  };

  /* ── 채권조정처리 ── */
  function caRow(i){
    const amt = (i%2===0?1:-1)*(80000+(i*41237)%1800000);
    return { no:`CA-2605${(200-i).toString().padStart(4,'0')}`, date:dstr(i%24), code:`S${(10240-i*3).toString().padStart(5,'0')}`,
      name:pick(POOL.cafe,i), amt, memo:pick(['연체 이자 조정','반품 차감','오입금 정정','할인 적용','채권 상계'],i) };
  }
  const creditAdjustment = {
    path:'/payment/credit-adjustment', crumb:['대금관리','채권조정처리'], channel:true,
    filters:[
      { label:'조정일자', type:'daterange' },
      { label:'거래처', type:'input', placeholder:'코드 / 거래처명 (현 페이지)' },
    ],
    actions:['excel','register','divider','search'], total:86,
    columns:[
      { title:'조정번호', key:'no', type:'link', w:150 },
      { title:'조정일자', key:'date', w:120, cellCls:'tnum' },
      { title:'거래처코드', key:'code', w:110 },
      { title:'거래처명', key:'name', min:180 },
      { title:'조정금액', key:'amt', type:'amount', align:'right', w:150, strong:true },
      { title:'적요', key:'memo', min:200 },
    ],
    rows:Array.from({length:13},(_,i)=>caRow(i)),
    drawer:{ type:'form', title:'채권 조정', editTitle:'채권 조정 수정', createTitle:'채권 조정 등록', sub:'',
      sections:[{ title:'조정 정보', fields:[
        { label:'거래처', span:6, kind:'select', value:'스타벅스 역삼점 (S10240)', req:true },
        { label:'조정일자', span:6, kind:'select', value:'2026-05-31' },
        { label:'조정금액', span:6, value:'-250,000', help:'음수=채권 차감 / 양수=채권 증가' },
        { label:'적요', span:12, kind:'textarea', value:'반품 건 채권 차감' },
      ]}] },
  };

  window.WMS_PAGES.push({ '/payment/charge-balance':chargeBalance, '/payment/credit-adjustment':creditAdjustment });
})();
