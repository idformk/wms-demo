/* 마스터 관리 — 가상계좌 / 품목 / 브랜드단가 / 차량 / 차량운행 / 차량운행현황 / 창고 */
(function () {
  const { won, num, dstr, dt, pick, POOL, esc } = WMS;
  window.WMS_PAGES = window.WMS_PAGES || [];
  const TEMP = { COLD:['냉장','tag-blue'], FROZEN:['냉동','tag-cyan'], AMBIENT:['상온','tag-orange'] };
  const tagCell = (map,key) => r => { const m = map[r[key]]; return m ? `<span class="tag ${m[1]}">${m[0]}</span>` : '<span class="cell-muted">-</span>'; };
  const dash = v => (v==null||v==='') ? '<span class="cell-muted">-</span>' : esc(v);
  const TEMPS = ['COLD','FROZEN','AMBIENT'];

  /* ── 가상계좌 풀 관리 ── */
  const ACCT = { NORMAL:['정상','tag-green'], SUSPENDED:['사용중지','tag-gold'], CLOSED:['폐쇄','tag-gray'] };
  function vaRow(i){
    const assigned = i%3!==0;
    const bank = pick(POOL.bank,i);
    return { bankCode:String(['004','088','020','081','011','003'][i%6]), inst:String(11000+i*7),
      account:`3${(330021+i*137).toString().padStart(10,'0')}`, holder: assigned?pick(POOL.cafe,i):'마트프로(주)',
      status: i%7===0?'SUSPENDED':i%11===0?'CLOSED':'NORMAL', bank:bank,
      linked: assigned?`<span style="font-family:ui-monospace,monospace;font-size:12px;color:var(--gray-500)">S${(10240-i*3).toString().padStart(5,'0')}</span> ${pick(POOL.cafe,i)} <button type="button" style="margin-left:8px;font-size:12px;color:var(--red-500);background:none;border:none;cursor:pointer">해제</button>`:'<span class="cell-muted">(미할당)</span>',
      created:dt(20+i,i) };
  }
  const virtualAccount = {
    path:'/system/virtual-account', crumb:['마스터 관리','가상계좌 풀 관리'], colToggle:true,
    tabs:['전체가상계좌','거래처별가상계좌'],
    filters:[
      { label:'검색', type:'input', placeholder:'계좌번호, 계좌주, 거래처명, 사업자번호' },
      { label:'할당상태', type:'chips', options:['전체','미할당','할당'], active:0 },
      { label:'계좌상태', type:'select', placeholder:'전체' },
    ],
    actions:['aiBulk','excel','register','divider','search'], total:842,
    columns:[
      { title:'은행코드', key:'bankCode', w:100, sortable:true },
      { title:'기관코드', key:'inst', w:110 },
      { title:'발급계좌', key:'account', w:170, cellCls:'tnum' },
      { title:'계좌주', key:'holder', w:140 },
      { title:'계좌상태', align:'center', w:110, render:tagCell(ACCT,'status') },
      { title:'은행', key:'bank', align:'center', w:80 },
      { title:'연결 거래처', min:240, render:r=>r.linked },
      { title:'입력일자', key:'created', w:170, cellCls:'tnum' },
    ],
    rows:Array.from({length:13},(_,i)=>vaRow(i)),
    drawer:{ type:'form', title:'가상계좌', editTitle:'가상계좌 수정', createTitle:'가상계좌 등록', sub:'',
      sections:[{ title:'계좌 정보', fields:[
        { label:'은행', span:4, kind:'select', value:'국민', req:true },
        { label:'은행코드', span:4, value:'004' },
        { label:'기관코드', span:4, value:'11007' },
        { label:'발급계좌', span:6, value:'3330021045', req:true },
        { label:'계좌주', span:6, value:'마트프로(주)' },
        { label:'계좌상태', span:4, kind:'chips', options:['정상','사용중지','폐쇄'], active:0 },
        { label:'비고', span:12, kind:'textarea', value:'' },
      ]}] },
  };

  /* ── 품목등록 ── */
  const TAX = { Y:['과세','tag-blue'], N:['면세','tag-gray'] };
  const REST = { AVAILABLE:['가능','tag-green'], UNAVAILABLE:['불가','tag-red'] };
  function prdRow(i){
    return { code:`P${(20480-i*5).toString().padStart(5,'0')}`, name:pick(POOL.product,i),
      spec: pick(['1kg','2.5kg','3kg','5kg','12입','18L','1000입','30입'],i), cat:pick(['냉동','냉장','상온','부자재'],i),
      unit:pick(['BX','EA','KG'],i), tax: i%4===0?'N':'Y', storage:TEMPS[i%3],
      rest: i%6===0?'UNAVAILABLE':'AVAILABLE', cost:1800+(i*1237)%14000, price:2400+(i*1733)%18000 };
  }
  const product = {
    path:'/system/product', crumb:['마스터 관리','품목등록'], channel:true, colToggle:true,
    filters:[
      { label:'검색', type:'input', placeholder:'품목코드, 품명, 보조명' },
      { label:'매입처', type:'select', placeholder:'전체' },
      { label:'브랜드그룹', type:'select', placeholder:'전체' },
      { label:'폐기', type:'check', checked:false, value:'폐기 포함' },
    ],
    actions:['aiBulk','excel','register','divider','search'], total:1842,
    columns:[
      { title:'품목기본정보', children:[
        { title:'품목코드', key:'code', w:110, sortable:true },
        { title:'품명', key:'name', min:200 },
        { title:'규격', key:'spec', w:100 },
        { title:'분류', key:'cat', w:90 },
        { title:'단위', key:'unit', align:'center', w:70 },
        { title:'과세', align:'center', w:80, render:tagCell(TAX,'tax') },
        { title:'보관온도', align:'center', w:90, render:tagCell(TEMP,'storage') },
      ]},
      { title:'주문제한', children:[ { title:'상태', align:'center', w:90, render:tagCell(REST,'rest') } ]},
      { title:'매입단가', children:[ { title:'매입단가', key:'cost', type:'num', align:'right', w:110 } ]},
      { title:'표준판매단가', children:[ { title:'표준판매단가', key:'price', type:'num', align:'right', w:120 } ]},
    ],
    rows:Array.from({length:14},(_,i)=>prdRow(i)),
    drawer:{ type:'form', title:'품목', editTitle:'품목 수정', createTitle:'품목 등록', sub:'',
      sections:[
        { title:'품목 기본정보', fields:[
          { label:'품목코드', span:4, value:'P20480' }, { label:'품명', span:5, value:'감자튀김 1kg', req:true }, { label:'보조명', span:3, value:'크리스피' },
          { label:'규격', span:3, value:'1kg' }, { label:'분류', span:3, kind:'select', value:'냉동' }, { label:'단위', span:3, kind:'select', value:'BX' }, { label:'원산지', span:3, value:'국내산' },
          { label:'과세', span:3, kind:'chips', options:['과세','면세'], active:0 }, { label:'보관온도', span:3, kind:'chips', options:['냉장','냉동','상온'], active:1 }, { label:'전용/범용', span:3, kind:'chips', options:['범용','전용'], active:0 }, { label:'수급담당', span:3, kind:'select', value:'김상우' },
        ]},
        { title:'바코드 · 재고', fields:[
          { label:'출고바코드', span:4, value:'8801234567890' }, { label:'입고바코드', span:4, value:'8809876543210' }, { label:'창고위치', span:4, value:'A-03-12' },
          { label:'재고관리', span:4, kind:'chips', options:['관리','미관리'], active:0 }, { label:'유통기한(제조일로부터)', span:4, value:'180', help:'일' },
        ]},
        { title:'단가', fields:[
          { label:'매입단가', span:4, value:'2,400', help:'원' }, { label:'표준판매단가', span:4, value:'3,200', help:'원' }, { label:'최대주문', span:4, value:'500', help:'BX' },
        ]},
      ] },
  };

  /* ── 브랜드단가그룹매칭 (인라인 그리드) ── */
  const VIS = { GENERAL:['범용','tag-gray'], EXCLUSIVE:['전용','tag-blue'] };
  function bpmRow(i){
    const price = 2400+(i*1733)%18000;
    return { code:`P${(20480-i*5).toString().padStart(5,'0')}`, name:pick(POOL.product,i), sub:pick(['크리스피','오리지널','-','대용량'],i),
      center:pick(POOL.warehouse,i), unit:pick(['BX','EA','KG'],i), vis: i%3===0?'EXCLUSIVE':'GENERAL', active:i%9!==0,
      price, exc: i%4===0?price+800:null, tax:Math.round(price*0.1),
      feeType:pick(['정률','정액'],i), saleFee: (i%5)+2+'%', logiFee:'1.5%', endType:pick(['지정','무기한'],i),
      from:dstr(60+i), to: i%4===0?dstr(0):'무기한' };
  }
  const brandPriceMatch = {
    path:'/system/brand-price-match', crumb:['마스터 관리','브랜드단가그룹매칭'], channel:true, colToggle:true, clickable:false,
    filters:[
      { label:'브랜드', type:'select', value:'다람쥐분식' },
      { label:'검색', type:'input', placeholder:'품목코드 / 품목명 / 보조명' },
      { label:'범용/전용', type:'select', placeholder:'전체' },
      { label:'사용', type:'select', placeholder:'전체' },
      { label:'기간', type:'daterange' },
    ],
    actions:['excel', {label:'품목 추가', act:'create'}, {label:'저장', kind:'primary'}, 'divider','search'], total:486,
    columns:[
      { title:'품목코드', key:'code', w:104 },
      { title:'품목명', key:'name', min:180 },
      { title:'보조명', key:'sub', w:120, render:r=>dash(r.sub==='-'?null:r.sub) },
      { title:'물류센터', key:'center', w:120 },
      { title:'판매단위', key:'unit', align:'center', w:80 },
      { title:'범용/전용', align:'center', w:90, render:tagCell(VIS,'vis') },
      { title:'사용', align:'center', w:70, type:'switch', key:'active' },
      { title:'표준판매단가', key:'price', type:'num', align:'right', w:120 },
      { title:'예외단가', key:'exc', type:'num', align:'right', w:110 },
      { title:'세액', key:'tax', type:'num', align:'right', w:100 },
      { title:'수수료율선택', key:'feeType', align:'center', w:96 },
      { title:'판매수수료', key:'saleFee', align:'right', w:96 },
      { title:'물류수수료', key:'logiFee', align:'right', w:96 },
      { title:'시작일자', key:'from', w:110, cellCls:'tnum' },
      { title:'종료일자', key:'to', w:110, cellCls:'tnum' },
    ],
    rows:Array.from({length:13},(_,i)=>bpmRow(i)),
  };

  /* ── 차량등록 ── */
  function vehRow(i){
    return { code:`CAR${(1024-i).toString().padStart(4,'0')}`, name:`${pick(POOL.vehicle,i)} (${pick(['1톤','2.5톤','3.5톤','5톤'],i)})`,
      vtype:pick(['윙바디','탑차','냉동탑차','카고'],i), driver:pick(POOL.person,i)+' / 010-'+(1000+i*7),
      temp:TEMPS[i%3], center:pick(POOL.warehouse,i), region:pick(['서울 강남권','경기 남부','인천권','대전권','부산권'],i),
      partners:`${pick(POOL.store,i)} 외 ${3+(i%9)}건` };
  }
  const vehicle = {
    path:'/system/vehicle', crumb:['마스터 관리','차량등록'], colToggle:true,
    filters:[
      { label:'검색', type:'input', placeholder:'차량코드, 차량명, 기사' },
      { label:'온도구분', type:'select', value:'전체' },
      { label:'폐기', type:'select', value:'제외' },
    ],
    actions:['aiBulk','excel','register','divider','search'], total:62,
    columns:[
      { title:'차량코드', key:'code', w:110, sortable:true },
      { title:'차량명', key:'name', min:180 },
      { title:'차종', key:'vtype', w:120 },
      { title:'기사', key:'driver', w:160 },
      { title:'온도구분', align:'center', w:90, render:tagCell(TEMP,'temp') },
      { title:'물류센터', key:'center', w:130 },
      { title:'배송권역', key:'region', w:140 },
      { title:'거래처리스트', key:'partners', min:180, render:r=>`<span style="text-decoration:underline dotted;text-underline-offset:2px;cursor:help">${r.partners}</span>` },
    ],
    rows:Array.from({length:12},(_,i)=>vehRow(i)),
    drawer:{ type:'form', title:'차량', editTitle:'차량 수정', createTitle:'차량 등록', sub:'',
      sections:[{ title:'차량 정보', fields:[
        { label:'차량코드', span:4, value:'CAR1024' }, { label:'차량명', span:5, value:'12가 3456 (2.5톤)', req:true }, { label:'차종', span:3, kind:'select', value:'냉동탑차' },
        { label:'기사', span:4, value:'김상우' }, { label:'기사 연락처', span:4, value:'010-2233-4455' }, { label:'스펙/적재량', span:4, value:'2.5톤 / 8파렛' },
        { label:'온도구분', span:4, kind:'chips', options:['냉장','냉동','상온'], active:1 }, { label:'물류센터', span:4, kind:'select', value:'중부물류센터' }, { label:'배송권역', span:4, value:'서울 강남권' },
      ]}] },
  };

  /* ── 차량운행등록 (그룹헤더 + 폼) ── */
  function routeRow(i){
    return { pcode:`S${(10240-i*3).toString().padStart(5,'0')}`, pname:pick(POOL.store,i), bizno:`220-${10+i}-${(50000+i*131)}`,
      rep:pick(POOL.person,i), brand:'다람쥐분식', pterm: i%8===0?dstr(i):null, center:pick(POOL.warehouse,i),
      vcode:`CAR${(1024-(i%12)).toString().padStart(4,'0')}`, vname:`${pick(POOL.vehicle,i)} (${pick(['1톤','2.5톤','3.5톤'],i)})`,
      vtype:pick(['윙바디','탑차','냉동탑차'],i), load:pick(['1톤/4파렛','2.5톤/8파렛','3.5톤/12파렛'],i), temp:TEMPS[i%3], vterm:null };
  }
  const routeGroups = (extra) => ([
    { title:'거래처정보', children:[
      { title:'거래처', key:'pcode', w:110 }, { title:'상호', key:'pname', min:180 },
      { title:'사업자번호', key:'bizno', w:130, cellCls:'tnum' }, { title:'대표자', key:'rep', w:100 } ]},
    { title:'거래처추가정보', children: extra },
    { title:'차량정보', children:[
      { title:'차량코드', key:'vcode', w:110 }, { title:'차량명', key:'vname', min:170 },
      { title:'차종', key:'vtype', w:120 }, { title:'스펙/적재량', key:'load', w:130 },
      { title:'구분', align:'center', w:80, render:tagCell(TEMP,'temp') },
      { title:'종료일자', w:100, cellCls:'tnum', render:r=> r.vterm?r.vterm:'<span class="cell-muted">-</span>' } ]},
  ]);
  const vehicleRoutes = {
    path:'/system/vehicle-routes', crumb:['마스터 관리','차량운행등록'], colToggle:true,
    filters:[
      { label:'검색', type:'input', placeholder:'차량코드/차량명/거래처/사업자번호' },
      { label:'창고', type:'select', placeholder:'전체 창고' },
      { label:'거래처유형', type:'select', placeholder:'전체' },
      { label:'온도', type:'select', value:'전체' },
      { label:'폐기', type:'select', value:'제외' },
    ],
    actions:['aiBulk','excel','register','divider','search'], total:318,
    columns:routeGroups([
      { title:'브랜드', key:'brand', w:130 },
      { title:'폐기일자', w:100, cellCls:'tnum', render:r=> r.pterm?r.pterm:'<span class="cell-muted">-</span>' },
      { title:'물류센터', key:'center', w:130 },
    ]),
    rows:Array.from({length:13},(_,i)=>routeRow(i)),
    drawer:{ type:'form', title:'차량 운행', editTitle:'운행 수정', createTitle:'운행 등록', sub:'',
      sections:[{ title:'운행 매핑', fields:[
        { label:'차량', span:6, kind:'select', value:'CAR1024 · 12가 3456', req:true },
        { label:'물류센터', span:6, kind:'select', value:'중부물류센터' },
        { label:'배송 거래처', span:12, kind:'select', value:'다람쥐분식 강남점 외 8건', help:'순번 드래그로 운행 순서 지정' },
      ]}] },
  };

  /* ── 차량운행현황 (읽기 전용) ── */
  const vehicleStatus = {
    path:'/system/vehicle-status', crumb:['마스터 관리','차량운행현황'], colToggle:true, clickable:false,
    filters:[
      { label:'검색', type:'input', placeholder:'거래처/차량코드/차량명/상호/사업자번호' },
      { label:'창고', type:'select', placeholder:'전체 창고' },
      { label:'거래처유형', type:'select', placeholder:'전체' },
      { label:'온도', type:'select', value:'전체' },
      { label:'폐기', type:'select', value:'제외' },
    ],
    actions:['excel','divider','search'], total:318,
    columns:routeGroups([
      { title:'브랜드', key:'brand', w:130 },
      { title:'차량명', key:'vname', min:170 },
      { title:'폐기일자', w:100, cellCls:'tnum', render:r=> r.pterm?r.pterm:'<span class="cell-muted">-</span>' },
    ]),
    rows:Array.from({length:13},(_,i)=>routeRow(i)),
  };

  /* ── 창고등록 ── */
  const WTYPE = ['자가','임대','위탁'];
  function whRow(i){
    return { code:`WH${(105-i).toString().padStart(3,'0')}`, name:pick(POOL.warehouse,i), brand:'다람쥐분식', wtype:pick(WTYPE,i),
      addr:pick(['경기 이천시 마장면 물류로 12','서울 송파구 동남로 100','부산 강서구 명지국제로 55','대전 유성구 테크노로 7','광주 광산구 평동산단로 9'],i),
      term: i%9===0?dstr(i):null, memo: i%3===0?'상온/냉장 겸용':'-' };
  }
  const warehouse = {
    path:'/system/warehouse', crumb:['마스터 관리','창고등록'], colToggle:true,
    filters:[
      { label:'검색', type:'input', placeholder:'창고코드 또는 창고명' },
      { label:'종료', type:'check', checked:false, value:'종료 포함' },
    ],
    actions:['excel','register','divider','search'], total:5,
    columns:[
      { title:'창고코드', key:'code', w:110, sortable:true },
      { title:'창고명', key:'name', min:160 },
      { title:'브랜드그룹', key:'brand', w:160 },
      { title:'유형', key:'wtype', align:'center', w:90 },
      { title:'주소', key:'addr', min:240 },
      { title:'종료일자', w:110, cellCls:'tnum', render:r=> r.term?r.term:'<span class="cell-muted">-</span>' },
      { title:'기타사항', w:150, render:r=>dash(r.memo==='-'?null:r.memo) },
    ],
    rows:Array.from({length:5},(_,i)=>whRow(i)),
    drawer:{ type:'form', title:'창고', editTitle:'창고 수정', createTitle:'창고 등록', sub:'',
      sections:[{ title:'창고 정보', fields:[
        { label:'창고코드', span:4, value:'WH105' }, { label:'창고명', span:5, value:'중부물류센터', req:true }, { label:'유형', span:3, kind:'select', value:'자가' },
        { label:'브랜드그룹', span:6, kind:'select', value:'다람쥐분식' }, { label:'종료일자', span:6, kind:'select', value:'' },
        { label:'주소', span:12, value:'경기 이천시 마장면 물류로 12' },
        { label:'기타사항', span:12, kind:'textarea', value:'상온/냉장 겸용' },
      ]}] },
  };

  window.WMS_PAGES.push({
    '/system/virtual-account':virtualAccount, '/system/product':product, '/system/brand-price-match':brandPriceMatch,
    '/system/vehicle':vehicle, '/system/vehicle-routes':vehicleRoutes, '/system/vehicle-status':vehicleStatus, '/system/warehouse':warehouse,
  });
})();
