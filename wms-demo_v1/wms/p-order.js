/* 주문관리 — 주문등록 / 일괄주문등록 */
(function () {
  const { won, num, dstr, dt, pick, POOL, esc } = WMS;
  window.WMS_PAGES = window.WMS_PAGES || [];
  const STMAP = { ORDER:['주문','gold'], SHIPPED:['배송','green'], CANCELLED:['취소','red'] };

  /* ── 주문등록 (건별 목록 + 주문등록 드로어) ── */
  function ordRow(i){
    const st = i%7===0 ? 'CANCELLED' : (i%3===0 ? 'SHIPPED' : 'ORDER');
    return { date:dstr(i%24), no:`SO-2605${(1000-i).toString().padStart(4,'0')}`, code:`S${(10240-i*3).toString().padStart(5,'0')}`,
      name:pick(POOL.store,i), cnt:2+(i*3)%14, qty:20+(i*13)%240, amt:184000+(i*37123)%2400000, st };
  }
  const orderItemGrid = `
    <div style="padding:4px 24px 18px">
      <div class="wms-listhead" style="margin-bottom:10px"><div class="l"><span class="ttl" style="font-size:15px">주문 품목</span></div>
        <div class="r"><button class="btn btn-default btn-sm">+ 품목 추가</button></div></div>
      <div class="wms-tablewrap"><table class="wms-table"><thead><tr><th>품목코드</th><th>품명</th><th class="ctr" style="width:60px">단위</th><th class="num" style="width:90px">수량</th><th class="num" style="width:100px">단가</th><th class="num" style="width:120px">금액</th></tr></thead>
      <tbody>
        ${[['P20480','감자튀김 1kg','BX',12,2400],['P20475','모짜렐라치즈 2.5kg','EA',6,9800],['P20470','떡볶이 떡 3kg','BX',4,7600]].map(it=>`<tr><td>${it[0]}</td><td>${it[1]}</td><td class="ctr">${it[2]}</td><td class="num"><div class="wms-input" style="height:30px;width:74px;margin-left:auto;justify-content:flex-end">${it[3]}</div></td><td class="num">${num(it[4])}</td><td class="num">${won(it[3]*it[4])}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="5" class="num">합계</td><td class="num">${won(12*2400+6*9800+4*7600)}</td></tr></tfoot></table></div>
    </div>`;
  const orderRegister = {
    path:'/order/register', crumb:['주문관리','주문등록'], channel:true, tabs:['건별','거래처별','품목별','기간별'],
    filters:[
      { label:'주문일자', type:'daterange' },
      { label:'거래처', type:'select', placeholder:'코드, 거래처명 검색' },
      { label:'품목', type:'select', placeholder:'품목코드, 품명 검색' },
    ],
    actions:['excel',{label:'주문등록', act:'create', kind:'primary'},'divider','search'], total:1842,
    columns:[
      { title:'주문일자', key:'date', w:108, cellCls:'tnum' },
      { title:'주문번호', key:'no', type:'link', w:140 },
      { title:'거래처코드', key:'code', w:110 },
      { title:'거래처명', key:'name', min:180 },
      { title:'품목수', key:'cnt', type:'num', align:'right', w:90 },
      { title:'주문수량', key:'qty', type:'num', align:'right', w:100 },
      { title:'주문금액', key:'amt', type:'num', align:'right', w:140 },
      { title:'진행상태', align:'center', w:100, render:r=>{ const m=STMAP[r.st]; return `<span class="badge-dot"><span class="dot dot-${m[1]}"></span>${m[0]}</span>`; } },
    ],
    rows:Array.from({length:14},(_,i)=>ordRow(i)),
    drawer:{ type:'form', title:'주문', editTitle:'주문 상세', createTitle:'주문 등록', sub:'',
      sections:[{ title:'주문 정보', fields:[
        { label:'주문거래처', span:6, kind:'select', value:'다람쥐분식 강남점 (S10240)', req:true },
        { label:'납기요청일', span:3, kind:'select', value:'2026-06-02' },
        { label:'주문일자', span:3, kind:'select', value:'2026-05-31' },
        { label:'주문메세지', span:12, kind:'textarea', value:'오전 배송 요청' },
      ]}],
      extra:()=>orderItemGrid,
      footer:`<button class="btn btn-danger">주문 취소</button><div class="flex gap-2"><button class="btn btn-default" data-close>닫기</button><button class="btn btn-primary">주문 등록</button></div>`,
    },
  };

  /* ── 일괄주문등록 (검증 그리드) ── */
  const VAL = { OK:['정상','tag-green'], WARN:['확인','tag-gold'], ERR:['오류','tag-red'] };
  function bulkRow(i){
    const v = i%9===0?'ERR':i%4===0?'WARN':'OK';
    const qty=10+(i*7)%180, price=2400+(i*1733)%18000;
    return { code:`S${(10240-i*3).toString().padStart(5,'0')}`, name:pick(POOL.store,i), pcode:`P${(20480-i*5).toString().padStart(5,'0')}`,
      pname:pick(POOL.product,i), qty, price, amt:qty*price, val:v, msg: v==='ERR'?'거래처 코드 없음':v==='WARN'?'단가 상이':'-' };
  }
  const bulkRegister = {
    path:'/order/bulk-register', crumb:['주문관리','일괄주문등록'], channel:true, clickable:false,
    filters:[
      { label:'주문일자', type:'date' },
      { label:'거래처', type:'select', placeholder:'코드, 거래처명' },
    ],
    actions:[{label:'엑셀 양식', },'excelBulk',{label:'검증', },{label:'일괄 등록', kind:'primary'},'divider','search'], total:48,
    columns:[
      { title:'거래처코드', key:'code', w:110 },
      { title:'거래처명', key:'name', min:160 },
      { title:'품목코드', key:'pcode', w:110 },
      { title:'품명', key:'pname', min:170 },
      { title:'수량', key:'qty', type:'num', align:'right', w:90 },
      { title:'단가', key:'price', type:'num', align:'right', w:110 },
      { title:'금액', key:'amt', type:'num', align:'right', w:130 },
      { title:'검증', align:'center', w:90, render:r=>{ const m=VAL[r.val]; return `<span class="tag ${m[1]}">${m[0]}</span>`; } },
      { title:'메세지', w:160, render:r=> r.msg==='-'?'<span class="cell-muted">-</span>':`<span class="${r.val==='ERR'?'amt-neg':''}">${esc(r.msg)}</span>` },
    ],
    rows:Array.from({length:13},(_,i)=>bulkRow(i)),
  };

  window.WMS_PAGES.push({ '/order/register':orderRegister, '/order/bulk-register':bulkRegister });
})();
