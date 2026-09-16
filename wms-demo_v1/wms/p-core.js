/* core 3 페이지 — 승인된 아키타입을 엔진 config 로 이식 */
(function () {
  const { won, num, dstr, dt, pick, POOL, ic, esc } = WMS;
  window.WMS_PAGES = window.WMS_PAGES || [];

  /* ===== 거래처 관리 (system/partner) — 목록 + 폼 드로어 ===== */
  const TYPE = { HEAD_OFFICE:['본사','tag-purple'], BRAND:['브랜드','tag-magenta'], CENTER:['물류센터','tag-cyan'], SUPPLIER:['매입처','tag-green'], CONTRACTOR:['도급사','tag-orange'], STORE:['매장','tag-blue'] };
  const PARTNERS = [
    ['F00001','HEAD_OFFICE','마트프로 본사',null,'김대표','123-45-67890',null,null,'02-1234-5678'],
    ['B00007','BRAND','다람쥐분식',['본사','마트프로 본사'],'이브랜드','211-88-44210',null,null,'02-555-0090'],
    ['S10042','STORE','다람쥐분식 강남점',['브랜드','다람쥐분식'],'박매장','220-11-77345','여신형','주문','010-2233-4455'],
    ['S10043','STORE','다람쥐분식 홍대점',['브랜드','다람쥐분식'],'정사장','118-22-33449','충전형',null,'010-9988-1122'],
    ['V00012','SUPPLIER','신선유통',null,'최매입','609-81-22113','여신형','물류','051-700-3300'],
    ['S10044','STORE','다람쥐분식 판교점',['브랜드','다람쥐분식'],'한점주','144-55-66789','여신형',null,'010-4567-8899'],
    ['C00003','CENTER','중부물류센터',null,'오센터','312-86-00021',null,null,'041-900-1200'],
    ['S10045','STORE','다람쥐분식 잠실점',['브랜드','다람쥐분식'],'윤대표','201-33-99887','여신형','주문','010-1212-3434'],
    ['B00009','BRAND','다람쥐카페',['본사','마트프로 본사'],'서브랜드','211-90-11223',null,null,'02-555-0099'],
    ['S10046','STORE','다람쥐분식 부평점',['브랜드','다람쥐분식'],'노점장','130-44-55667','충전형',null,'010-7788-9900'],
  ].map(r => ({ code:r[0], typeKey:r[1], name:r[2], parent:r[3], rep:r[4], bizno:r[5], pay:r[6], banned:r[7], phone:r[8] }));

  const parentCell = row => {
    if (!row.parent) return '<span class="cell-muted">-</span>';
    const pt = row.parent[0]==='본사'?'tag-purple':'tag-magenta';
    return `<span class="flex items-center gap-2"><span class="tag ${pt}">${row.parent[0]}</span>${row.parent[1]}</span>`;
  };
  const bannedCell = row => row.banned ? `<span class="tag ${row.banned==='주문'?'tag-red':'tag-volcano'}">${row.banned}</span>` : '<span class="cell-muted">-</span>';

  const partnerForm = {
    title:'거래처', editTitle:'거래처 수정', createTitle:'거래처 등록',
    sub:(row,create)=> create ? '· 매장 · 신규' : `· ${TYPE[row.typeKey][0]} · ${row.code}`,
    sections:[
      { title:'기본 정보', fields:[
        { label:'유형', span:3, kind:'chips', options:['본사','브랜드','매장'], active:2, help:'등록 후 유형 변경 불가' },
        { label:'상호', span:5, value:'다람쥐분식 강남점', req:true },
        { label:'대표자', span:4, value:'박매장' },
        { label:'본사/브랜드 (상위)', span:6, kind:'select', value:'다람쥐분식 (B00007)', req:true },
        { label:'사업자번호', span:6, value:'220-11-77345' },
        { label:'우편번호', span:3, value:'06236' },
        { label:'주소', span:9, value:'서울특별시 강남구 테헤란로 152' },
        { label:'상세주소', span:6, value:'강남파이낸스센터 3층' },
        { label:'업태', span:3, value:'음식점업' },
        { label:'종목', span:3, value:'분식' },
      ]},
      { title:'연락처 · 담당', fields:[
        { label:'이메일', span:6, value:'gangnam@daramzi.co.kr' },
        { label:'전화', span:3, value:'02-562-1004' },
        { label:'휴대폰', span:3, value:'010-2233-4455' },
        { label:'영업담당자', span:6, kind:'select', value:'김상우 (영업1팀)' },
      ]},
      { title:'결제 · 여신', sub:'매장 전용', fields:[
        { label:'결제유형', span:4, kind:'chips', options:['여신형','충전형'], active:0, req:true },
        { label:'여신한도', span:4, value:'5,000,000', help:'원' },
        { label:'입금주기', span:4, kind:'select', value:'월(1~말일)' },
        { label:'약정일수', span:4, value:'15', help:'주기 내 결제 기한(일)' },
        { label:'담보종류', span:4, kind:'select', value:'부동산' },
        { label:'담보액', span:4, value:'8,000,000', help:'원' },
      ]},
      { title:'상태 · 메모', fields:[
        { label:'주문 차단', span:6, kind:'switch', value:true, sub:'새 주문 등록 불가' },
        { label:'물류 차단', span:6, kind:'switch', value:false, sub:'배차/출고 제외' },
        { label:'메모', span:12, kind:'textarea', value:'한도 임박 거래처 · 영업1팀 김상우 주 1회 방문 관리.' },
      ]},
    ],
  };

  const partner = {
    path:'/system/partner', crumb:['마스터 관리','거래처 관리'], colToggle:true,
    filters:[
      { label:'검색', type:'input', placeholder:'상호, 코드, 사업자번호' },
      { label:'유형', type:'chips', options:['매장','브랜드','매입처','본사'], active:0 },
      { label:'본사', type:'select', placeholder:'전체' },
      { label:'폐기', type:'check', checked:false, value:'폐기 포함' },
    ],
    actions:['excelBulk','register','divider','search'],
    total:126,
    columns:[
      { title:'코드', key:'code', w:104 },
      { title:'유형', align:'center', w:90, render:r=>`<span class="tag ${TYPE[r.typeKey][1]}">${TYPE[r.typeKey][0]}</span>` },
      { title:'상호', key:'name', min:200 },
      { title:'상위', min:200, render:parentCell },
      { title:'대표자', key:'rep', w:120 },
      { title:'사업자번호', key:'bizno', w:140, cellCls:'tnum' },
      { title:'결제', key:'pay', align:'center', w:90 },
      { title:'차단', align:'center', w:110, render:bannedCell },
      { title:'연락처', key:'phone', w:140, cellCls:'tnum' },
    ],
    rows:PARTNERS,
    drawer:{ type:'form', ...partnerForm },
  };

  /* ===== 배송처리 (logistics/order-confirm) — 목록 + 상세 드로어 ===== */
  const STMAP = { ORDER:['주문','gold'], SHIPPED:['배송','green'], CANCELLED:['취소','red'] };
  function ocRow(i){
    const st = i%7===0 ? 'CANCELLED' : (i%3===0 ? 'SHIPPED' : 'ORDER');
    return {
      no:`SO-2605${(1000-i).toString().padStart(4,'0')}`, store:pick(POOL.store,i),
      date:dstr(3+(i%26)), req:dstr((i%26)), amt:184000+(i*37123)%2400000,
      st, confirmed: st==='ORDER'?null:dt(3+(i%26),i), by: st==='ORDER'?'-':pick(POOL.person,i),
      msg: pick(['오전 배송 요청','문 앞에 두고 가주세요','냉동 별도 포장','-','사장님 직접 수령','우천 시 실내 보관'], i),
    };
  }
  const orderConfirm = {
    path:'/logistics/order-confirm', crumb:['물류관리','배송처리'], channel:true, rowSelect:true,
    filters:[
      { label:'주문일자', type:'daterange' },
      { label:'주문거래처', type:'select', placeholder:'코드, 거래처명 검색' },
      { label:'진행상태', type:'select', value:'전체' },
    ],
    actions:[{label:'배송확정', kind:'default', disabled:true}, 'excel', 'divider', 'search'],
    total:1284, pageSize:50,
    columns:[
      { title:'거래처정보', children:[ {title:'주문번호', key:'no', type:'link', min:140}, {title:'주문거래처', key:'store', min:170} ]},
      { title:'주문', children:[ {title:'주문일자', key:'date', w:108, cellCls:'tnum'}, {title:'납기요청일', key:'req', w:108, cellCls:'tnum'}, {title:'주문금액', key:'amt', type:'num', align:'right', w:128} ]},
      { title:'진행', children:[ {title:'진행상태', key:'st', type:'badge', map:STMAP, align:'center', w:96}, {title:'확정일시', key:'confirmed', w:156, cellCls:'tnum'}, {title:'처리자', key:'by', align:'center', w:96} ]},
      { title:'주문메세지', key:'msg', min:200 },
    ],
    rows:Array.from({length:14},(_,i)=>ocRow(i)),
    drawer:{ type:'detail', title:'주문 상세', sub:(r)=>` · ${r.no}`, cols:4,
      fields:r=>[['주문거래처',r.store],['주문번호',r.no],['주문일자',r.date],['납기요청일',r.req],['진행상태',`<span class="badge-dot"><span class="dot dot-${STMAP[r.st][1]}"></span>${STMAP[r.st][0]}</span>`],['확정일시',r.confirmed||'-'],['처리자',r.by],['주문메세지',r.msg]],
      extra:r=>{ const items=[['감자튀김 1kg','BX',12,2400,28800],['모짜렐라치즈 2.5kg','EA',6,9800,58800],['떡볶이 떡 3kg','BX',4,7600,30400],['어묵 모둠 5kg','BX',3,14200,42600]];
        return `<div style="padding:16px 24px"><div class="wms-listhead" style="margin-bottom:10px"><div class="l"><span class="ttl" style="font-size:15px">주문 품목</span><span class="wms-count" style="font-size:13px;padding:2px 8px">${items.length}<span class="unit">건</span></span></div></div>
        <div class="wms-tablewrap"><table class="wms-table"><thead><tr><th>품목명</th><th class="ctr" style="width:64px">단위</th><th class="num" style="width:72px">수량</th><th class="num" style="width:96px">단가</th><th class="num" style="width:110px">금액</th></tr></thead>
        <tbody>${items.map(it=>`<tr><td>${it[0]}</td><td class="ctr">${it[1]}</td><td class="num">${it[2]}</td><td class="num">${num(it[3])}</td><td class="num">${num(it[4])}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="4" class="num">합계</td><td class="num">${won(r.amt)}</td></tr></tfoot></table></div></div>`; },
      footer:`<button class="btn btn-danger">주문 취소</button><div class="flex gap-2"><button class="btn btn-default" data-close>닫기</button><button class="btn btn-primary">배송확정</button></div>`,
    },
  };

  /* ===== 미수채권현황 (payment/receivables) — 대금/숫자형 ===== */
  const COLL = ['부동산','예금','보증보험',null];
  function rcRow(i){
    const storeOpen = i%4===0 ? (i*120000)%900000 : -(280000+(i*151237)%3200000);
    const orderCount = 4+(i*7)%58, orderAmount = 680000+(i*83217)%7400000;
    const receiptAmount = Math.floor(orderAmount*(0.45+(i%6)*0.11));
    const adjust = i%6===0 ? (i*4100)%180000+40000 : 0;
    const storeBal = storeOpen - orderAmount + receiptAmount - adjust;
    const creditLimit = i%5===0 ? 0 : (1100000+(i%6)*850000);
    let usage=null, creditOver=0;
    if (creditLimit>0){ usage = storeBal>=0?0:Math.round((-storeBal/creditLimit)*1000)/10; creditOver = creditLimit+storeBal; }
    const collateral = i%3===0 ? (5000000+(i%4)*3000000) : null;
    return { code:'S'+(10240-i*3).toString().padStart(5,'0'), name:pick(POOL.cafe,i), storeOpen, orderCount, orderAmount, receiptAmount, adjust, storeBal, creditLimit, usage, creditOver, collateral, collType: collateral?COLL[i%3]:null, banned: usage!=null&&usage>=100, terminated:i===13 };
  }
  let RC = Array.from({length:16},(_,i)=>rcRow(i)).sort((a,b)=> a.storeBal - b.storeBal);
  const sgn = v => v<0?'amt-neg':v>0?'amt-pos':'';
  const ubadge = u => u==null?'':u>=100?' <span class="mini-badge red">한도 초과</span>':u>=80?' <span class="mini-badge orange">⚠ 한도 임박</span>':'';
  const rcTotals = RC.reduce((a,r)=>({open:a.open+r.storeOpen,cnt:a.cnt+r.orderCount,ord:a.ord+r.orderAmount,rcp:a.rcp+r.receiptAmount,adj:a.adj+(-r.adjust),bal:a.bal+r.storeBal}),{open:0,cnt:0,ord:0,rcp:0,adj:0,bal:0});

  const receivables = {
    path:'/payment/receivables', crumb:['대금관리','미수채권현황'], channel:true,
    filters:[
      { label:'조회기간', type:'daterange' },
      { label:'채권기준', type:'select', value:'주문 (즉시 미수)' },
      { label:'거래처', type:'input', placeholder:'코드 / 거래처명' },
      { label:'폐기', type:'check', checked:false, value:'폐기 거래처 포함' },
    ],
    actions:['excel','search'],
    columns:[
      { title:'코드', key:'code', align:'center', w:90 },
      { title:'거래처명', min:210, render:r=> r.terminated?`<span class="cell-strike">${r.name} ⊘</span>`:`<span>${r.name}${ubadge(r.usage)}</span>` },
      { title:'기초 잔고', align:'right', w:128, render:r=>`<span class="${sgn(r.storeOpen)}">${won(r.storeOpen)}</span>` },
      { title:'주문건수', align:'right', w:84, render:r=>num(r.orderCount) },
      { title:'판매금액', align:'right', w:130, render:r=>won(r.orderAmount) },
      { title:'입금액', align:'right', w:124, render:r=>won(r.receiptAmount) },
      { title:'채권조정', align:'right', w:120, render:r=>`<span class="${r.adjust>0?'amt-neg':''}">${won(-r.adjust)}</span>` },
      { title:'기말 잔고', align:'right', w:130, sort:'desc', render:r=>`<span class="${r.storeBal<0?'amt-neg amt-strong':r.storeBal>0?'amt-pos':''}">${won(r.storeBal)}</span>` },
      { title:'여신한도', align:'right', w:112, render:r=> r.creditLimit?won(r.creditLimit):'<span class="cell-muted">-</span>' },
      { title:'사용률', align:'center', w:104, sortable:true, type:'pct', key:'usage' },
      { title:'여신초과액', align:'right', w:124, render:r=> !r.creditLimit?'<span class="cell-muted">-</span>':`<span class="${r.creditOver<0?'amt-neg amt-strong':''}" style="${r.creditOver>=0?'color:var(--emerald-600)':''}">${won(r.creditOver)}</span>` },
      { title:'주문차단', align:'center', w:88, type:'switch', key:'banned' },
      { title:'담보액', align:'right', w:110, render:r=> r.collateral?won(r.collateral):'<span class="cell-muted">-</span>' },
      { title:'담보종류', align:'center', w:96, render:r=> r.collType||'<span class="cell-muted">-</span>' },
    ],
    rows:RC, clickable:false,
    summary:[
      { html:'합계', align:'center', colspan:2 },
      { html:`<span class="${sgn(rcTotals.open)}">${won(rcTotals.open)}</span>`, align:'right' },
      { html:num(rcTotals.cnt), align:'right' },
      { html:won(rcTotals.ord), align:'right' },
      { html:won(rcTotals.rcp), align:'right' },
      { html:`<span class="${rcTotals.adj<0?'amt-neg':''}">${won(rcTotals.adj)}</span>`, align:'right' },
      { html:`<span class="${rcTotals.bal<0?'amt-neg amt-strong':'amt-pos'}">${won(rcTotals.bal)}</span>`, align:'right' },
      { html:'', colspan:6 },
    ],
  };

  window.WMS_PAGES.push({ '/system/partner':partner, '/logistics/order-confirm':orderConfirm, '/payment/receivables':receivables });
})();
