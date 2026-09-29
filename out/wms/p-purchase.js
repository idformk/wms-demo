/* 구매관리 — 입고관리 / 입고반품처리 */
(function () {
  const { won, num, dstr, dt, pick, POOL, esc } = WMS;
  window.WMS_PAGES = window.WMS_PAGES || [];
  const RC_ST = { PENDING:['접수','tag-gold'], DONE:['입고완료','tag-green'], CANCELLED:['취소','tag-red'] };
  const RT_ST = { PENDING:['요청','tag-gold'], DONE:['완료','tag-green'], CANCELLED:['취소','tag-red'] };
  const tagCell = (map,key) => r => { const m=map[r[key]]; return m?`<span class="tag ${m[1]}">${m[0]}</span>`:'<span class="cell-muted">-</span>'; };

  function recvRow(i){
    const supply = 420000+(i*61237)%5200000, vat=Math.round(supply*0.1);
    return { no:`PI-2605${(800-i).toString().padStart(4,'0')}`, date:dstr(i%22), supplier:pick(POOL.supplier,i), wh:pick(POOL.warehouse,i),
      st: i%5===0?'PENDING':i%9===0?'CANCELLED':'DONE', supply, vat, total:supply+vat };
  }
  const receiving = {
    path:'/purchase/receiving', crumb:['구매관리','입고관리'], rowSelect:true,
    filters:[
      { label:'입고일자', type:'daterange' },
      { label:'매입처', type:'select', placeholder:'매입처 검색' },
      { label:'창고', type:'select', placeholder:'창고' },
      { label:'상태', type:'select', placeholder:'전체' },
    ],
    actions:['excel','register','divider','search'], total:486,
    columns:[
      { title:'입고정보', children:[
        { title:'입고번호', key:'no', type:'link', w:150 },
        { title:'입고일자', key:'date', w:108, cellCls:'tnum' },
        { title:'매입처', key:'supplier', min:160 },
        { title:'창고', key:'wh', w:130 },
        { title:'상태', align:'center', w:100, render:tagCell(RC_ST,'st') } ]},
      { title:'금액', children:[
        { title:'공급가', key:'supply', type:'num', align:'right', w:120 },
        { title:'부가세', key:'vat', type:'num', align:'right', w:100 },
        { title:'합계', key:'total', type:'num', align:'right', w:130 } ]},
    ],
    rows:Array.from({length:13},(_,i)=>recvRow(i)),
    drawer:{ type:'detail', title:'입고 상세', sub:r=>` · ${r.no}`, cols:4,
      fields:r=>[['입고번호',r.no],['입고일자',r.date],['매입처',r.supplier],['창고',r.wh],['상태',`<span class="tag ${RC_ST[r.st][1]}">${RC_ST[r.st][0]}</span>`],['공급가',won(r.supply)],['부가세',won(r.vat)],['합계',won(r.total)]],
      extra:r=>{ const items=[['감자튀김 1kg','1kg','BX',120,2400],['모짜렐라치즈 2.5kg','2.5kg','EA',60,9800],['튀김가루 2kg','2kg','BX',80,3600]];
        return `<div style="padding:16px 24px"><div class="wms-listhead" style="margin-bottom:10px"><div class="l"><span class="ttl" style="font-size:15px">입고 품목</span></div></div>
        <div class="wms-tablewrap"><table class="wms-table"><thead><tr><th>품목코드</th><th>품명</th><th class="ctr" style="width:80px">규격</th><th class="ctr" style="width:60px">단위</th><th class="num" style="width:80px">수량</th><th class="num" style="width:100px">매입단가</th><th class="num" style="width:120px">매입금액</th></tr></thead>
        <tbody>${items.map((it,k)=>`<tr><td>P${(20480-k*5).toString().padStart(5,'0')}</td><td>${it[0]}</td><td class="ctr">${it[1]}</td><td class="ctr">${it[2]}</td><td class="num">${num(it[3])}</td><td class="num">${num(it[4])}</td><td class="num">${won(it[3]*it[4])}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="6" class="num">공급가 합계</td><td class="num">${won(r.supply)}</td></tr></tfoot></table></div></div>`; },
    },
  };

  function retRow(i){
    const supply = 80000+(i*41237)%1800000, vat=Math.round(supply*0.1);
    return { no:`PR-2605${(300-i).toString().padStart(4,'0')}`, date:dstr(i%22), supplier:pick(POOL.supplier,i), wh:pick(POOL.warehouse,i),
      st: i%4===0?'DONE':i%8===0?'CANCELLED':'PENDING', supply, vat, total:supply+vat };
  }
  const purchaseReturn = {
    path:'/purchase/return', crumb:['구매관리','입고반품처리'], rowSelect:true,
    filters:[
      { label:'반품일자', type:'daterange' },
      { label:'매입처', type:'select', placeholder:'매입처 검색' },
      { label:'출고창고', type:'select', placeholder:'출고창고' },
      { label:'상태', type:'select', placeholder:'전체' },
    ],
    actions:['excel','register','divider','search'], total:142,
    columns:[
      { title:'반품정보', children:[
        { title:'반품번호', key:'no', type:'link', w:160 },
        { title:'반품일자', key:'date', w:108, cellCls:'tnum' },
        { title:'매입처', key:'supplier', min:160 },
        { title:'출고창고', key:'wh', w:130 },
        { title:'상태', align:'center', w:100, render:tagCell(RT_ST,'st') } ]},
      { title:'금액', children:[
        { title:'매입금액', key:'supply', type:'num', align:'right', w:120 },
        { title:'부가세', key:'vat', type:'num', align:'right', w:100 },
        { title:'합계', key:'total', type:'num', align:'right', w:130 } ]},
    ],
    rows:Array.from({length:12},(_,i)=>retRow(i)),
  };

  window.WMS_PAGES.push({ '/purchase/receiving':receiving, '/purchase/return':purchaseReturn });
})();
