/* wms/demo-audit.js — 전수조사 보정 패치 (기존 파일 무수정, demo-patch.js 뒤에 로드)
   1) 메뉴 라벨과 화면 제목이 달라 안 열리던 메뉴(품목 등록·반품관리·창고출고관리·마이페이지) 연결
   2) 사이드바 이동도 __wmsGo(데이터 최신화 포함)로 통일
   3) 뒤로가기·경로(상위 메뉴) 링크 연결
   4) 시연에서 실제 동작이 없는 버튼·선택 상자·페이지 넘김에 안내 토스트 */
(function () {
  'use strict';
  var PAGES = window.PAGES;
  if (!PAGES || typeof window.__wmsGo !== 'function') return;

  var START = '/system/partner';
  // 화면 제목(crumb)으로 못 찾는 메뉴 라벨
  var LABEL_KEY = { '품목 등록': '/system/product', '반품관리': '/purchase/return', '창고출고관리': '/inventory/outbound', '마이페이지': '/mypage' };
  Object.keys(PAGES).forEach(function (k) { var c = PAGES[k]; if (c && c.crumb) LABEL_KEY[c.crumb[c.crumb.length - 1]] = k; });

  // ---------- toast (demo-patch.js 와 같은 #demoToast 사용) ----------
  var timer = null;
  function toast(msg) {
    var el = document.getElementById('demoToast');
    if (!el) { el = document.createElement('div'); el.id = 'demoToast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('is-show');
    clearTimeout(timer);
    timer = setTimeout(function () { el.classList.remove('is-show'); }, 2200);
  }

  // ---------- 현재 화면·이전 화면 추적 ----------
  var cur = (location.hash || '').replace('#', '');
  if (!PAGES[cur]) cur = START;
  var trail = [];
  var baseGo = window.__wmsGo;
  function go(path, isBack) {
    if (!PAGES[path]) return;
    if (!isBack && path !== cur) trail.push(cur);
    cur = path;
    history.replaceState(null, '', '#' + path);
    return baseGo(path);
  }
  window.__wmsGo = function (path) { return go(path); };

  // 비활성 버튼도 눌렀을 때 이유를 안내하도록 클릭만 허용(모양은 그대로)
  var st = document.createElement('style');
  st.textContent = '.wms-main .btn.is-disabled:not([data-act]){pointer-events:auto;}';
  document.head.appendChild(st);

  function drawerOpen() { return !!document.querySelector('#wmsDrawer.is-open'); }

  function msgFor(label) {
    if (/조회|초기화/.test(label)) return '시연용 화면이라 샘플 데이터를 그대로 보여 줍니다';
    if (/AI/.test(label)) return '시연용 화면이라 AI 일괄 등록은 실행되지 않습니다';
    if (/엑셀/.test(label)) return '시연용 화면이라 엑셀 파일을 내려받거나 올리지 않습니다';
    if (/인쇄/.test(label)) return '시연용 화면이라 인쇄되지 않습니다';
    return '시연용 화면이라 저장되지 않습니다';
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest) return;

    // 1) 사이드바
    var item = t.closest('.wms-submenu-item');
    if (item && !item.hasAttribute('data-tax-nav')) {
      var key = LABEL_KEY[item.textContent.trim()];
      if (key) { e.stopPropagation(); go(key); }
      return;
    }
    var parent = t.closest('.wms-menu-parent');
    if (parent) {
      var grp = parent.closest('.wms-menu-group');
      if (grp && !grp.querySelector('.wms-submenu')) {
        var k2 = LABEL_KEY[parent.textContent.trim()];
        if (k2) { e.stopPropagation(); go(k2); }
      }
      return;
    }

    // 2) 경로의 상위 메뉴 링크 → 그 메뉴의 첫 화면
    var crumb = t.closest('.wms-crumb a');
    if (crumb) {
      e.preventDefault(); e.stopPropagation();
      var name = crumb.textContent.trim();
      var groups = document.querySelectorAll('.wms-menu-group');
      for (var i = 0; i < groups.length; i++) {
        var p = groups[i].querySelector('.wms-menu-parent');
        var first = groups[i].querySelector('.wms-submenu-item');
        if (p && first && p.textContent.trim() === name) { var fk = LABEL_KEY[first.textContent.trim()]; if (fk === cur) toast('이미 ' + name + '의 첫 화면입니다'); else go(fk); return; }
      }
      return;
    }

    // 3) 뒤로가기
    if (t.closest('.wms-back')) {
      var prev = trail.pop();
      if (prev) go(prev, true); else toast('처음 연 화면입니다');
      return;
    }

    // 4) 안내 토스트 대상
    if (t.closest('#taxSheetScrim')) return;
    if (t.closest('.wms-channel .cs, .wms-select')) { toast('시연용 화면이라 선택 목록은 열리지 않습니다'); return; }
    var pg = t.closest('.wms-page');
    if (pg) { if (!pg.classList.contains('is-active') && !pg.classList.contains('is-disabled')) toast('시연용 화면이라 첫 쪽 샘플만 보여 줍니다'); return; }
    if (t.closest('.wms-coltoggle')) { toast('시연용 화면이라 열 표시 설정은 바꿀 수 없습니다'); return; }

    // 필터·권한표 체크 상자: 켜고 끄기만 (행 선택 상자는 원래 동작)
    var chk = t.closest('.wms-check');
    if (chk && !chk.classList.contains('rowchk') && !chk.classList.contains('selall') && !chk.closest('#wmsDrawer')) {
      chk.classList.toggle('is-checked');
      return;
    }

    var btn = t.closest('.wms-main .btn, #wmsDrawer .btn');
    if (!btn) return;
    if (btn.classList.contains('is-disabled')) {
      if (!btn.hasAttribute('data-act')) toast(cur === '/logistics/order-confirm' ? '목록에서 주문을 눌러 상세 화면에서 배송확정하세요' : '지금은 누를 수 없는 버튼입니다');
      return;
    }
    if (btn.hasAttribute('data-close') || btn.classList.contains('demo-fix-btn') || btn.hasAttribute('data-shortage-no')) return;
    var act = btn.getAttribute('data-act');
    if (act === 'create') {
      var cfg = PAGES[cur];
      if (!cfg || !cfg.drawer || cfg.drawer.type === 'detail') { e.stopPropagation(); toast('시연용 화면이라 등록 양식은 제공하지 않습니다'); }
      return;
    }
    if (act) return;
    // demo-patch.js 가 이미 처리해 드로어를 닫은 경우(앱 주문 배송확정)는 건너뜀
    if (btn.closest('#wmsDrawer') && !drawerOpen()) return;
    toast(msgFor(btn.textContent.trim()));
  }, true);

  // ---------- 정렬 가능한 열 머리(▲▼): 보이는 샘플 행을 그 열 기준으로 정렬 ----------
  document.addEventListener('click', function (e) {
    var th = e.target.closest && e.target.closest('th.sortable');
    if (!th) return;
    var table = th.closest('table'), tbody = table && table.tBodies[0];
    if (!tbody) return;
    var idx = Array.prototype.indexOf.call(th.parentElement.children, th);
    var desc = !th.classList.contains('sort-desc');
    th.parentElement.querySelectorAll('th.sortable').forEach(function (h) { h.classList.remove('sort-asc', 'sort-desc'); });
    th.classList.add(desc ? 'sort-desc' : 'sort-asc');
    var val = function (tr) { var c = tr.children[idx]; return c ? c.textContent.trim() : ''; };
    var num = function (t) { var n = parseFloat(t.replace(/[^0-9.\-]/g, '')); return isNaN(n) ? null : n; };
    Array.prototype.slice.call(tbody.rows).sort(function (a, b) {
      var x = val(a), y = val(b), nx = num(x), ny = num(y);
      var r = (nx !== null && ny !== null) ? nx - ny : x.localeCompare(y, 'ko');
      return desc ? -r : r;
    }).forEach(function (tr) { tbody.appendChild(tr); });
    toast('샘플 행을 ‘' + th.textContent.trim() + '’ 기준 ' + (desc ? '내림차순' : '오름차순') + '으로 정렬했습니다');
  });
})();
