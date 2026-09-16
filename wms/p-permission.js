/* 권한관리 — 권한그룹 관리 / 사용자 관리 + 마이페이지 (마스터-디테일/폼 레이아웃) */
(function () {
  const { pick, POOL, ic } = WMS;
  window.WMS_PAGES = window.WMS_PAGES || [];

  const USERS = [
    ['admin','시스템관리자','최고관리자',true], ['kim.sw','김상우','영업1팀',true], ['lee.je','이지은','물류팀',true],
    ['park.dh','박도현','구매팀',true], ['jung.sm','정수민','재무팀',true], ['choi.yh','최영호','영업2팀',false],
    ['han.gr','한가람','물류팀',true], ['yoon.sy','윤서연','CS팀',true],
  ];
  function userList(){
    return USERS.map((u,i)=>`<div class="wms-submenu-item" style="height:auto;padding:10px 14px;border-radius:0;border-bottom:1px solid var(--gray-100);${i===1?'background:var(--cool-50)':''}">
      <div style="display:flex;flex-direction:column;gap:2px;width:100%">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-weight:600;color:var(--gray-900);font-size:13px">${u[1]}</span>${u[3]?'':'<span class="tag tag-gray" style="height:18px">비활성</span>'}</div>
        <div style="font-size:12px;color:var(--gray-500)"><span style="font-family:ui-monospace,monospace">${u[0]}</span> · ${u[2]}</div>
      </div></div>`).join('');
  }
  const f = (label,val,span)=>`<div class="f-field col-${span||6}"><label>${label}</label><div class="wms-input">${val}</div></div>`;
  const userDetail = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:var(--cool-100);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--cool-600)">김</div>
        <div><div style="font-size:18px;font-weight:600">김상우 <span class="tag tag-green" style="vertical-align:middle">활성</span></div><div style="font-size:13px;color:var(--gray-500)">kim.sw · 영업1팀</div></div>
      </div>
      <div style="display:flex;gap:8px"><button class="btn btn-default btn-sm">비활성화</button><button class="btn btn-default btn-sm">수정</button><button class="btn btn-danger btn-sm">삭제</button></div>
    </div>
    <div class="form-section"><div class="form-section-head" style="cursor:default"><span class="ttl">기본 정보</span></div>
      <div class="form-grid">${f('아이디','kim.sw',4)}${f('이름','김상우',4)}${f('연락처','010-2233-4455',4)}${f('이메일','kim.sw@martpro.co.kr',6)}${f('소속','영업1팀',6)}</div></div>
    <div class="form-section"><div class="form-section-head" style="cursor:default"><span class="ttl">권한그룹</span></div>
      <div style="padding:16px 24px;display:flex;flex-wrap:wrap;gap:8px">
        <span class="tag tag-blue" style="height:28px;padding:0 12px">주문관리 (담당)</span>
        <span class="tag tag-blue" style="height:28px;padding:0 12px">물류관리 (담당)</span>
        <span class="tag tag-gray" style="height:28px;padding:0 12px">+ 권한그룹 추가</span>
      </div></div>`;
  const permissionUser = {
    path:'/permission/user', crumb:['권한관리','사용자 관리'], table:false,
    custom:`<div style="flex:1;display:flex;min-height:0;border:1px solid var(--cool-200);border-radius:6px;overflow:hidden;background:#fff">
      <aside style="width:320px;border-right:1px solid var(--gray-200);display:flex;flex-direction:column;min-height:0">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--gray-100)">
          <span style="font-size:13px;font-weight:600;color:var(--gray-700)">사용자 <span style="font-weight:400;color:var(--gray-500)">${USERS.length}명</span></span>
          <button class="btn btn-primary btn-sm">+ 신규</button></div>
        <div style="padding:10px 14px;border-bottom:1px solid var(--gray-100)"><div class="wms-input-search"><input class="wms-input" placeholder="아이디·이름 검색"/>${ic('search','si')}</div></div>
        <div style="flex:1;overflow:auto">${userList()}</div>
      </aside>
      <section style="flex:1;overflow:auto;padding:24px;min-width:0">${userDetail}</section>
    </div>`,
  };

  /* ── 권한그룹 관리 (그룹 리스트 + 권한 매트릭스) ── */
  const GROUPS = [['최고관리자',8,true],['영업 담당',5,false],['물류 담당',4,false],['구매 담당',3,false],['재무 담당',3,false],['읽기 전용',1,false]];
  const MENUS = ['마스터 관리','주문관리','물류관리','구매관리','재고관리','대금관리','권한관리'];
  function groupList(){
    return GROUPS.map((g,i)=>`<div class="wms-submenu-item" style="height:auto;padding:11px 14px;border-radius:0;border-bottom:1px solid var(--gray-100);${i===1?'background:var(--cool-50)':''}">
      <div style="display:flex;flex-direction:column;gap:2px;width:100%"><span style="font-weight:600;color:var(--gray-900);font-size:13px">${g[0]}</span><span style="font-size:12px;color:var(--gray-500)">사용자 ${g[1]}명</span></div></div>`).join('');
  }
  function chk(on){ return `<label class="wms-check ${on?'is-checked':''}" style="justify-content:center"><span class="box">${ic('check')}</span></label>`; }
  function matrix(){
    return MENUS.map((m,i)=>`<tr><td>${m}</td>
      <td class="ctr">${chk(true)}</td><td class="ctr">${chk(i<4)}</td><td class="ctr">${chk(i<3)}</td><td class="ctr">${chk(i<2)}</td></tr>`).join('');
  }
  const permissionGroup = {
    path:'/permission/group', crumb:['권한관리','권한그룹 관리'], table:false,
    custom:`<div style="flex:1;display:flex;min-height:0;border:1px solid var(--cool-200);border-radius:6px;overflow:hidden;background:#fff">
      <aside style="width:300px;border-right:1px solid var(--gray-200);display:flex;flex-direction:column;min-height:0">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--gray-100)">
          <span style="font-size:13px;font-weight:600;color:var(--gray-700)">권한그룹 <span style="font-weight:400;color:var(--gray-500)">${GROUPS.length}개</span></span>
          <button class="btn btn-primary btn-sm">+ 신규</button></div>
        <div style="flex:1;overflow:auto">${groupList()}</div>
      </aside>
      <section style="flex:1;overflow:auto;padding:24px;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
          <div><div style="font-size:18px;font-weight:600">영업 담당</div><div style="font-size:13px;color:var(--gray-500)">사용자 5명 · 메뉴별 접근 권한</div></div>
          <div style="display:flex;gap:8px"><button class="btn btn-default btn-sm">이름 수정</button><button class="btn btn-primary btn-sm">저장</button></div>
        </div>
        <div class="wms-tablewrap"><table class="wms-table"><thead><tr><th>메뉴</th><th class="ctr" style="width:90px">조회</th><th class="ctr" style="width:90px">등록</th><th class="ctr" style="width:90px">수정</th><th class="ctr" style="width:90px">삭제</th></tr></thead><tbody>${matrix()}</tbody></table></div>
      </section>
    </div>`,
  };

  /* ── 마이페이지 ── */
  const myPage = {
    path:'/mypage', crumb:['마이페이지'], table:false,
    custom:`<div style="max-width:720px;margin:8px auto 0;width:100%">
      <div style="display:flex;align-items:center;gap:16px;padding:0 0 24px">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--cool-100);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:24px;color:var(--cool-600)">김</div>
        <div><div style="font-size:22px;font-weight:600">김상우</div><div style="font-size:14px;color:var(--gray-500)">kim.sw · 영업1팀 · 최고관리자</div></div>
      </div>
      <div class="form-section" style="border:1px solid var(--cool-200);border-radius:8px;overflow:hidden">
        <div class="form-section-head" style="cursor:default"><span class="ttl">내 정보</span></div>
        <div class="form-grid">
          <div class="f-field col-6"><label>아이디</label><div class="wms-input is-disabled">kim.sw</div></div>
          <div class="f-field col-6"><label>이름</label><div class="wms-input">김상우</div></div>
          <div class="f-field col-6"><label>이메일</label><div class="wms-input">kim.sw@martpro.co.kr</div></div>
          <div class="f-field col-6"><label>연락처</label><div class="wms-input">010-2233-4455</div></div>
        </div>
      </div>
      <div class="form-section" style="border:1px solid var(--cool-200);border-radius:8px;overflow:hidden;margin-top:16px">
        <div class="form-section-head" style="cursor:default"><span class="ttl">비밀번호 변경</span></div>
        <div class="form-grid">
          <div class="f-field col-12"><label>현재 비밀번호</label><div class="wms-input">••••••••</div></div>
          <div class="f-field col-6"><label>새 비밀번호</label><div class="wms-input">••••••••</div></div>
          <div class="f-field col-6"><label>새 비밀번호 확인</label><div class="wms-input">••••••••</div></div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px"><button class="btn btn-default">취소</button><button class="btn btn-primary">저장</button></div>
    </div>`,
  };

  window.WMS_PAGES.push({ '/permission/group':permissionGroup, '/permission/user':permissionUser, '/mypage':myPage });
})();
