/* 물류관리 — 배차확정 / 결품현황 / 반품승인처리 / 피킹리스트 / 거래명세표 / 매출원장
   (배송처리는 core.js) */
(function () {
  const { won, num, dstr, dt, pick, POOL, esc } = WMS;
  window.WMS_PAGES = window.WMS_PAGES || [];
  const dash = v => (v==null||v==='') ? '<span class="cell-muted">-</span>' : esc(v);
  const hocha = i => `${1 + (i % 8)}호차`;

  /* ── 배차확정 ── */
  function dispRow(i){
    return { req:dstr(i%20), no:`SO-2605${(1000-i).toString().padStart(4,'0')}`, base:hocha(i), conf: i%5===0?null:hocha(i),
      ton:pick(['1톤','2.5톤','3.5톤','5톤'],i), driver:pick(POOL.person,i), region:pick(['서울 강남권','경기 남부','인천권','대전권','부산권'],i),
      pcode:`S${(10240-i*3).toString().padStart(5,'0')}`, pname:pick(POOL.store,i), amt:184000+(i*37123)%2400000,
      cnt:3+(i*7)%40, weight:120+(i*31)%680, addr:pick(['서울 강남구 테헤란로 152','경기 성남시 분당구 판교로 20','인천 부평구 길주로 7'],i), memo:pick(['오전 배송','냉동 별도','-','직접 수령'],i) };
  }
  const dispatch = {
    path:'/logistics/dispatch', crumb:['물류관리','배차확정'], channel:true, rowSelect:true,
    filters:[
      { label:'검색', type:'input', placeholder:'주문번호, 거래처코드, 고객주소' },
      { label:'물류창고', type:'select', placeholder:'전체' },
      { label:'입고요청일', type:'daterange' },
      { label:'거래처', type:'select', placeholder:'코드, 거래처명' },
      { label:'일괄배차', type:'select', placeholder:'차량 선택' },
    ],
    actions:[{label:'배차'},{label:'배차 해제'},{label:'배차확정', kind:'primary'},'excel','divider','search'], total:412,
    columns:[
      { title:'입고요청일', key:'req', w:108, cellCls:'tnum' },
      { title:'주문번호', key:'no', type:'link', w:140 },
      { title:'기준호차', key:'base', align:'center', w:90 },
      { title:'확정호차', align:'center', w:90, render:r=> r.conf?`<span class="tag tag-green">${r.conf}</span>`:'<span class="cell-muted">미배차</span>' },
      { title:'톤수', key:'ton', align:'center', w:80 },
      { title:'기사명', key:'driver', w:100 },
      { title:'배송권역', key:'region', w:130 },
      { title:'거래처코드', key:'pcode', w:110 },
      { title:'거래처명', key:'pname', min:150 },
      { title:'매출금액', key:'amt', type:'num', align:'right', w:120 },
      { title:'배송건수', key:'cnt', type:'num', align:'right', w:90 },
      { title:'중량', key:'weight', type:'num', align:'right', w:90 },
      { title:'고객주소', key:'addr', min:200 },
      { title:'메모', key:'memo', w:160, render:r=>dash(r.memo==='-'?null:r.memo) },
    ],
    rows:Array.from({length:13},(_,i)=>dispRow(i)),
  };

  /* ── 결품현황 ── */
  const SHORT_ST = { OPEN:['미처리','tag-gold'], RESOLVED:['처리완료','tag-green'] };
  function shortRow(i){
    const ordered = 20+(i*7)%180, shipped = Math.max(0, ordered - (5+(i*3)%30));
    return { req:dstr(i%18), store:pick(['상온','냉장','냉동'],i), conf:hocha(i), code:`S${(10240-i*3).toString().padStart(5,'0')}`,
      name:pick(POOL.store,i), pcode:`P${(20480-i*5).toString().padStart(5,'0')}`, pname:pick(POOL.product,i), unit:pick(['BX','EA','KG'],i),
      ordered, shipped, short:ordered-shipped, conv:(ordered-shipped)*(1+(i%3)), reason:pick(['재고부족','파손','입고지연','피킹누락'],i), st: i%3===0?'RESOLVED':'OPEN' };
  }
  const shortage = {
    path:'/logistics/shortage', crumb:['물류관리','결품현황'], channel:true, clickable:false,
    filters:[
      { label:'물류센터', type:'select', placeholder:'물류센터 선택' },
      { label:'발생일', type:'daterange' },
      { label:'고객 (매장)', type:'select', placeholder:'코드, 거래처명 검색' },
      { label:'품목', type:'select', placeholder:'품목코드, 품목명 검색' },
      { label:'호차', type:'select', placeholder:'호차 선택' },
      { label:'미출고사유', type:'select', placeholder:'전체' },
      { label:'상태', type:'select', placeholder:'전체' },
    ],
    actions:['excel','divider','search'], total:96,
    columns:[
      { title:'입고요청일', key:'req', w:108, cellCls:'tnum' },
      { title:'저장구분', key:'store', align:'center', w:80 },
      { title:'확정호차', key:'conf', align:'center', w:90 },
      { title:'고객', key:'code', w:100 },
      { title:'고객명', key:'name', min:150 },
      { title:'품목코드', key:'pcode', w:110 },
      { title:'품목명', key:'pname', min:170 },
      { title:'판매단위', key:'unit', align:'center', w:80 },
      { title:'주문수량', key:'ordered', type:'num', align:'right', w:100 },
      { title:'출고수량', key:'shipped', type:'num', align:'right', w:100 },
      { title:'미출고수량', align:'right', w:110, render:r=>`<span class="amt-neg amt-strong">${num(r.short)}</span>` },
      { title:'재고환산수량', key:'conv', type:'num', align:'right', w:120 },
      { title:'미출고사유', key:'reason', w:120 },
      { title:'상태', align:'center', w:100, render:r=>{ const m=SHORT_ST[r.st]; return `<span class="tag ${m[1]}">${m[0]}</span>`; } },
    ],
    rows:Array.from({length:13},(_,i)=>shortRow(i)),
  };

  /* ── 반품승인처리 ── */
  const APPR = { PENDING:['대기','gold'], APPROVED:['승인','green'], REJECTED:['거절','red'] };
  function retRow(i){
    const supply = 80000+(i*23117)%1400000, vat = Math.round(supply*0.1);
    const st = i%4===0?'APPROVED':i%7===0?'REJECTED':'PENDING';
    return { no:`RT-2605${(500-i).toString().padStart(4,'0')}`, store:pick(POOL.store,i), supply, vat, total:supply+vat,
      st, approvedAt: st==='PENDING'?null:dt(i%14,i) };
  }
  const returnApproval = {
    path:'/logistics/return-approval', crumb:['물류관리','반품승인처리'], channel:true, rowSelect:true,
    filters:[
      { label:'반품요청일', type:'daterange' },
      { label:'주문거래처', type:'select', placeholder:'코드, 거래처명 검색' },
      { label:'출고창고', type:'select', placeholder:'출고창고' },
      { label:'승인상태', type:'select', placeholder:'전체' },
    ],
    actions:[{label:'반품 승인', kind:'primary'},{label:'반품 거절', kind:'danger'},'excel','divider','search'], total:128,
    columns:[
      { title:'거래처정보', children:[
        { title:'반품번호', key:'no', type:'link', w:150 },
        { title:'거래처', key:'store', min:180 } ]},
      { title:'금액', children:[
        { title:'판매가', key:'supply', type:'num', align:'right', w:120 },
        { title:'부가세', key:'vat', type:'num', align:'right', w:110 },
        { title:'합계금액', key:'total', type:'num', align:'right', w:130 } ]},
      { title:'승인', children:[
        { title:'승인상태', align:'center', w:100, render:r=>{ const m=APPR[r.st]; return `<span class="badge-dot"><span class="dot dot-${m[1]}"></span>${m[0]}</span>`; } },
        { title:'승인일시', w:160, cellCls:'tnum', render:r=> r.approvedAt||'<span class="cell-muted">-</span>' } ]},
    ],
    rows:Array.from({length:12},(_,i)=>retRow(i)),
  };

  /* ── 피킹리스트 ── */
  function pickRow(i){
    const ordered = 12+(i*5)%120;
    return { date:dstr(i%10), hocha:hocha(i), pcode:`S${(10240-i*3).toString().padStart(5,'0')}`, pname:pick(POOL.store,i),
      code:`P${(20480-i*5).toString().padStart(5,'0')}`, name:pick(POOL.product,i), loc:`${'ABCD'[i%4]}-${pad2(1+i%9)}-${pad2(1+(i*3)%24)}`,
      unit:pick(['BX','EA','KG'],i), ordered, picked: i%6===0?ordered-2:ordered, done:i%6!==0 };
  }
  function pad2(n){ return String(n).padStart(2,'0'); }
  const picking = {
    path:'/logistics/picking', crumb:['물류관리','피킹리스트'], channel:true, clickable:false, tabs:['품목별','거래처별','호차별'],
    filters:[
      { label:'출고일자', type:'daterange' },
      { label:'물류창고', type:'select', placeholder:'전체' },
      { label:'호차', type:'select', placeholder:'전체' },
    ],
    actions:['excel',{label:'인쇄'},{label:'저장', kind:'primary'},'divider','search'], total:642,
    columns:[
      { title:'출고일자', key:'date', w:108, cellCls:'tnum' },
      { title:'호차', key:'hocha', align:'center', w:80 },
      { title:'고객코드', key:'pcode', w:100 },
      { title:'고객명', key:'pname', min:150 },
      { title:'품목코드', key:'code', w:110 },
      { title:'품명', key:'name', min:170 },
      { title:'로케이션', key:'loc', align:'center', w:110 },
      { title:'단위', key:'unit', align:'center', w:70 },
      { title:'주문수량', key:'ordered', type:'num', align:'right', w:100 },
      { title:'피킹수량', key:'picked', type:'num', align:'right', w:100 },
      { title:'출고완료', align:'center', w:90, type:'switch', key:'done' },
    ],
    rows:Array.from({length:13},(_,i)=>pickRow(i)),
  };

  /* ── 거래명세표 ── */
  function tsRow(i){
    const supply = 320000+(i*81233)%4200000, vat=Math.round(supply*0.1);
    return { code:`S${(10240-i*3).toString().padStart(5,'0')}`, name:pick(POOL.store,i), period:`2026-05-01 ~ 2026-05-31`,
      cnt:4+(i*3)%40, supply, vat, total:supply+vat, printed:i%3===0 };
  }
  const tradeStatement = {
    path:'/logistics/trade-statement', crumb:['물류관리','거래명세표'], channel:true, rowSelect:true,
    filters:[
      { label:'발행기간', type:'daterange' },
      { label:'거래처', type:'select', placeholder:'코드, 거래처명 검색' },
      { label:'출고창고', type:'select', placeholder:'출고창고' },
    ],
    actions:[{label:'일괄인쇄', kind:'primary'},'excel','divider','search'], total:126,
    columns:[
      { title:'거래처코드', key:'code', w:110 },
      { title:'거래처명', key:'name', min:180 },
      { title:'발행기간', key:'period', align:'center', w:200, cellCls:'tnum' },
      { title:'건수', key:'cnt', type:'num', align:'right', w:90 },
      { title:'공급가액', key:'supply', type:'num', align:'right', w:140 },
      { title:'부가세', key:'vat', type:'num', align:'right', w:120 },
      { title:'합계금액', key:'total', type:'num', align:'right', w:150 },
      { title:'인쇄', align:'center', w:90, render:r=> r.printed?'<span class="tag tag-blue">출력</span>':'<span class="cell-muted">미출력</span>' },
    ],
    rows:Array.from({length:12},(_,i)=>tsRow(i)),
  };

  /* ── 매출원장 ── */
  const VIS = { GENERAL:'범용', EXCLUSIVE:'전용' };
  function slRow(i){
    const qty = 4+(i*7)%60, pcost=1800+(i*1237)%9000, scost=pcost+800+(i*311)%3000;
    const purchase = qty*pcost, supply = qty*scost, vat=Math.round(supply*0.1);
    return { code:`S${(10240-i*3).toString().padStart(5,'0')}`, name:pick(POOL.store,i), date:dstr(i%24),
      pcode:`P${(20480-i*5).toString().padStart(5,'0')}`, pname:pick(POOL.product,i), vis:i%3===0?'전용':'범용',
      spec:pick(['1kg','2.5kg','3kg','18L'],i), unit:pick(['BX','EA','KG'],i), supplier:pick(POOL.supplier,i),
      qty, pcost, purchase, scost, supply, vat, total:supply+vat, profit:supply-purchase };
  }
  const SL = Array.from({length:14},(_,i)=>slRow(i));
  const slTot = SL.reduce((a,r)=>({qty:a.qty+r.qty,pur:a.pur+r.purchase,sup:a.sup+r.supply,vat:a.vat+r.vat,tot:a.tot+r.total,pf:a.pf+r.profit}),{qty:0,pur:0,sup:0,vat:0,tot:0,pf:0});
  const salesLedger = {
    path:'/logistics/sales-ledger', crumb:['물류관리','매출원장'], channel:true, clickable:false, tabs:['품목별','거래처별','일자별'],
    filters:[
      { label:'매출일자', type:'daterange' },
      { label:'거래처', type:'select', placeholder:'코드, 거래처명 검색' },
      { label:'품목', type:'select', placeholder:'품목코드, 품명 검색' },
      { label:'거래유형', type:'select', placeholder:'전체' },
      { label:'보관온도', type:'select', placeholder:'전체' },
      { label:'출고창고', type:'select', placeholder:'출고창고' },
    ],
    actions:['excel','divider','search'], total:3284,
    columns:[
      { title:'고객코드', key:'code', w:110 },
      { title:'고객명', key:'name', min:150 },
      { title:'매출일자', key:'date', w:108, cellCls:'tnum' },
      { title:'품목코드', key:'pcode', w:110 },
      { title:'품명', key:'pname', min:170 },
      { title:'구분', key:'vis', align:'center', w:70 },
      { title:'규격', key:'spec', w:90 },
      { title:'단위', key:'unit', align:'center', w:70 },
      { title:'매입처', key:'supplier', w:130 },
      { title:'매출수량', key:'qty', type:'num', align:'right', w:90 },
      { title:'매입단가', key:'pcost', type:'num', align:'right', w:100 },
      { title:'매입금액', key:'purchase', type:'num', align:'right', w:120 },
      { title:'판매단가', key:'scost', type:'num', align:'right', w:100 },
      { title:'판매금액', key:'supply', type:'num', align:'right', w:120 },
      { title:'부가세', key:'vat', type:'num', align:'right', w:100 },
      { title:'합계', key:'total', type:'num', align:'right', w:130 },
      { title:'이익', align:'right', w:120, render:r=>`<span class="${r.profit>=0?'amt-pos':'amt-neg'} amt-strong">${won(r.profit)}</span>` },
    ],
    rows:SL,
    summary:[
      { html:'합계', align:'center', colspan:9 },
      { html:num(slTot.qty), align:'right' }, { html:'', align:'right' }, { html:won(slTot.pur), align:'right' },
      { html:'', align:'right' }, { html:won(slTot.sup), align:'right' }, { html:won(slTot.vat), align:'right' }, { html:won(slTot.tot), align:'right' },
      { html:`<span class="amt-pos amt-strong">${won(slTot.pf)}</span>`, align:'right' },
    ],
  };

  window.WMS_PAGES.push({
    '/logistics/dispatch':dispatch, '/logistics/shortage':shortage, '/logistics/return-approval':returnApproval,
    '/logistics/picking':picking, '/logistics/trade-statement':tradeStatement, '/logistics/sales-ledger':salesLedger,
  });
})();
