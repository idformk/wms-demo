/* 재고관리 — 창고출고관리 / 재고실사관리 / 현재고현황 / 종합입출고현황 */
(function () {
  const { won, num, dstr, dt, pick, POOL, esc } = WMS;
  window.WMS_PAGES = window.WMS_PAGES || [];
  const tagCell = (map,key) => r => { const m=map[r[key]]; return m?`<span class="tag ${m[1]}">${m[0]}</span>`:'<span class="cell-muted">-</span>'; };

  /* ── 창고출고관리 ── */
  function outRow(i){
    return { no:`OB-2605${(400-i).toString().padStart(4,'0')}`, date:dstr(i%20), wh:pick(POOL.warehouse,i),
      reason:pick(['타창고 이동','폐기 출고','샘플 출고','반품 출고','내부 소비'],i), cnt:2+(i*3)%24, amt:120000+(i*51237)%3200000,
      memo:pick(['-','담당 확인','긴급'],i), created:dt(i%20,i) };
  }
  const outbound = {
    path:'/inventory/outbound', crumb:['재고관리','창고 출고관리'],
    filters:[
      { label:'출고일자', type:'daterange' },
      { label:'출고창고', type:'select', placeholder:'출고창고' },
      { label:'검색', type:'input', placeholder:'출고번호, 사유, 품목' },
    ],
    actions:['excel','register','divider','search'], total:212,
    columns:[
      { title:'출고번호', key:'no', type:'link', w:150 },
      { title:'출고일자', key:'date', w:108, cellCls:'tnum' },
      { title:'출고창고', key:'wh', w:140 },
      { title:'출고사유', key:'reason', min:200 },
      { title:'품목수', key:'cnt', type:'num', align:'right', w:90 },
      { title:'총금액', key:'amt', type:'num', align:'right', w:140 },
      { title:'비고', w:140, render:r=> r.memo==='-'?'<span class="cell-muted">-</span>':esc(r.memo) },
      { title:'등록일시', key:'created', w:160, cellCls:'tnum' },
    ],
    rows:Array.from({length:13},(_,i)=>outRow(i)),
    drawer:{ type:'detail', title:'출고 상세', sub:r=>` · ${r.no}`, cols:4,
      fields:r=>[['출고번호',r.no],['출고일자',r.date],['출고창고',r.wh],['출고사유',r.reason],['품목수',num(r.cnt)+'건'],['총금액',won(r.amt)],['비고',r.memo],['등록일시',r.created]],
      extra:r=>{ const items=[['감자튀김 1kg','BX',40,2400],['어묵 모둠 5kg','BX',20,14200],['콜라 1.25L 12입','BX',15,11800]];
        return `<div style="padding:16px 24px"><div class="wms-listhead" style="margin-bottom:10px"><div class="l"><span class="ttl" style="font-size:15px">출고 품목</span></div></div>
        <div class="wms-tablewrap"><table class="wms-table"><thead><tr><th>품목코드</th><th>품명</th><th class="ctr" style="width:60px">단위</th><th class="num" style="width:80px">수량</th><th class="num" style="width:100px">단가</th><th class="num" style="width:120px">금액</th></tr></thead>
        <tbody>${items.map((it,k)=>`<tr><td>P${(20480-k*5).toString().padStart(5,'0')}</td><td>${it[0]}</td><td class="ctr">${it[1]}</td><td class="num">${num(it[2])}</td><td class="num">${num(it[3])}</td><td class="num">${won(it[2]*it[3])}</td></tr>`).join('')}</tbody></table></div></div>`; },
    },
  };

  /* ── 재고실사관리 ── */
  const AUDIT_ST = { DRAFT:['작성중','tag-gold'], CONFIRMED:['확정','tag-green'], CANCELLED:['취소','tag-gray'] };
  function audRow(i){
    return { date:dstr(i%30), wh:pick(POOL.warehouse,i), st: i%3===0?'CONFIRMED':i%7===0?'CANCELLED':'DRAFT',
      cnt:40+(i*7)%320, diff:(i%5===0)?0:(i*3)%18, confirmedAt: i%3===0?dt(i%30,i):null, created:dt(i%30,i) };
  }
  const audit = {
    path:'/inventory/audit', crumb:['재고관리','재고실사관리'],
    filters:[
      { label:'실사일자', type:'daterange' },
      { label:'창고', type:'select', placeholder:'창고 선택 (미선택=전사)' },
      { label:'상태', type:'select', placeholder:'전체' },
    ],
    actions:['excel','register','divider','search'], total:64,
    columns:[
      { title:'실사일자', key:'date', w:120, cellCls:'tnum' },
      { title:'창고', key:'wh', min:160 },
      { title:'상태', align:'center', w:100, render:tagCell(AUDIT_ST,'st') },
      { title:'품목수', key:'cnt', type:'num', align:'right', w:100 },
      { title:'차이라인', align:'right', w:100, render:r=> r.diff>0?`<span class="amt-neg amt-strong">${num(r.diff)}</span>`:`<span class="cell-muted">0</span>` },
      { title:'확정일시', w:160, cellCls:'tnum', render:r=> r.confirmedAt||'<span class="cell-muted">-</span>' },
      { title:'등록일시', key:'created', w:160, cellCls:'tnum' },
    ],
    rows:Array.from({length:13},(_,i)=>audRow(i)),
  };

  /* ── 현재고현황 ── */
  function stRow(i){
    const qty = 20+(i*17)%680, unit = 1800+(i*1237)%9000;
    return { kind:pick(['상온','냉장','냉동'],i), loc:`${'ABCD'[i%4]}-${String(1+i%9).padStart(2,'0')}-${String(1+(i*3)%24).padStart(2,'0')}`,
      code:`P${(20480-i*5).toString().padStart(5,'0')}`, name:pick(POOL.product,i), spec:pick(['1kg','2.5kg','3kg','18L'],i),
      unit2:pick(['BX','EA','KG'],i), price:unit, qty, amt:qty*unit, expire: i%6===0?(i%3)+1:0 };
  }
  const STS = Array.from({length:14},(_,i)=>stRow(i));
  const stTot = STS.reduce((a,r)=>({qty:a.qty+r.qty,amt:a.amt+r.amt,exp:a.exp+r.expire}),{qty:0,amt:0,exp:0});
  const status = {
    path:'/inventory/status', crumb:['재고관리','현재고현황'], clickable:false,
    filters:[
      { label:'조회일자', type:'date' },
      { label:'창고', type:'select', placeholder:'창고 선택 (미선택=전사)' },
      { label:'품목코드', type:'input', placeholder:'품목코드 일부' },
    ],
    actions:['excel','divider','search'], total:1842,
    columns:[
      { title:'구분', key:'kind', align:'center', w:80 },
      { title:'로케이션', key:'loc', align:'center', w:110 },
      { title:'품목코드', key:'code', w:110 },
      { title:'품명', key:'name', min:180 },
      { title:'규격', key:'spec', w:90 },
      { title:'단위', key:'unit2', align:'center', w:70 },
      { title:'재고단가', key:'price', type:'num', align:'right', w:110 },
      { title:'재고수량', key:'qty', type:'num', align:'right', w:100 },
      { title:'재고금액', key:'amt', type:'num', align:'right', w:140 },
      { title:'폐기필요수량', align:'right', w:120, render:r=> r.expire>0?`<span class="amt-neg amt-strong">${num(r.expire)}</span>`:`<span class="cell-muted">0</span>` },
    ],
    rows:STS,
    summary:[
      { html:'합계', align:'center', colspan:7 },
      { html:num(stTot.qty), align:'right' }, { html:won(stTot.amt), align:'right' },
      { html:`<span class="amt-neg amt-strong">${num(stTot.exp)}</span>`, align:'right' },
    ],
  };

  /* ── 종합입출고현황 ── */
  function rpRow(i){
    const bq=40+(i*7)%200, iq=20+(i*11)%160, oq=15+(i*9)%150, eq=bq+iq-oq;
    const up=1800+(i*1237)%9000;
    return { kind:pick(['상온','냉장','냉동'],i), code:`P${(20480-i*5).toString().padStart(5,'0')}`, name:pick(POOL.product,i),
      bq, ba:bq*up, iq, ia:iq*up, oq, oa:oq*up, eq, ea:eq*up };
  }
  const RP = Array.from({length:14},(_,i)=>rpRow(i));
  const rpTot = RP.reduce((a,r)=>({bq:a.bq+r.bq,ba:a.ba+r.ba,iq:a.iq+r.iq,ia:a.ia+r.ia,oq:a.oq+r.oq,oa:a.oa+r.oa,eq:a.eq+r.eq,ea:a.ea+r.ea}),{bq:0,ba:0,iq:0,ia:0,oq:0,oa:0,eq:0,ea:0});
  const report = {
    path:'/inventory/report', crumb:['재고관리','종합입출고현황'], clickable:false,
    filters:[
      { label:'조회기간', type:'daterange' },
      { label:'창고', type:'select', placeholder:'창고 선택 (미선택=전사)' },
      { label:'품목코드', type:'input', placeholder:'품목코드 일부' },
    ],
    actions:['excel','divider','search'], total:1842,
    columns:[
      { title:'구분', key:'kind', align:'center', w:80 },
      { title:'품목코드', key:'code', w:110 },
      { title:'품명', key:'name', min:200 },
      { title:'기초', children:[ { title:'수량', key:'bq', type:'num', align:'right', w:90 }, { title:'금액', key:'ba', type:'num', align:'right', w:120 } ]},
      { title:'입고', children:[ { title:'수량', key:'iq', type:'num', align:'right', w:90 }, { title:'금액', key:'ia', type:'num', align:'right', w:120 } ]},
      { title:'출고', children:[ { title:'수량', key:'oq', type:'num', align:'right', w:90 }, { title:'금액', key:'oa', type:'num', align:'right', w:120 } ]},
      { title:'기말', children:[ { title:'수량', key:'eq', type:'num', align:'right', w:90 }, { title:'금액', key:'ea', type:'num', align:'right', w:120 } ]},
    ],
    rows:RP,
    summary:[
      { html:'합계', align:'center', colspan:3 },
      { html:num(rpTot.bq), align:'right' }, { html:won(rpTot.ba), align:'right' },
      { html:num(rpTot.iq), align:'right' }, { html:won(rpTot.ia), align:'right' },
      { html:num(rpTot.oq), align:'right' }, { html:won(rpTot.oa), align:'right' },
      { html:num(rpTot.eq), align:'right' }, { html:won(rpTot.ea), align:'right' },
    ],
  };

  window.WMS_PAGES.push({ '/inventory/outbound':outbound, '/inventory/audit':audit, '/inventory/status':status, '/inventory/report':report });
})();
