/* wms/demo-patch.js — WMS 목업 시연 패치 (기존 파일 무수정, 몽키패치 전용)
   실행 시점: wms-render.js WMS.mountApp() 이 이미 페이지를 1회 렌더한 뒤.
   §3(브리지)·§4(WMS 패치) 참고. */
(function () {
  'use strict';
  if (!window.BRIDGE) { return; } // bridge.js 미로드 시 안전 종료

  var STMAP_APP = { ORDER: ['주문', 'gold'], SHIPPED: ['배송', 'green'], CANCELLED: ['취소', 'red'] };

  // ---------- 1. 상단 고정 배너 ----------
  function injectBanner() {
    var style = document.createElement('style');
    style.textContent = [
      '#demoBanner{position:fixed;top:0;left:0;right:0;height:32px;z-index:9999;',
      'display:flex;align-items:center;justify-content:space-between;',
      'padding:0 16px;background:#111827;color:#fff;font-size:12px;',
      'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;box-sizing:border-box;}',
      '#demoBanner .l{opacity:.92;}',
      '#demoBanner .r{display:flex;gap:14px;}',
      '#demoBanner a{color:#93c5fd;text-decoration:none;}',
      '#demoBanner a:hover{text-decoration:underline;}',
      '.wms-app{box-sizing:border-box;padding-top:32px;}',
      '#demoToast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,12px);',
      'background:#111827;color:#fff;font-size:13px;padding:10px 18px;border-radius:8px;',
      'z-index:10000;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;',
      'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);}',
      '#demoToast.is-show{opacity:1;transform:translate(-50%,0);}',
      '.demo-fix-btn{border:1px solid var(--red-300,#fca5a5);background:#fff;color:var(--red-700,#b91c1c);',
      'font-size:12px;padding:4px 10px;border-radius:6px;cursor:pointer;}',
      '.demo-fix-btn:hover{background:#fef2f2;}',
    ].join('');
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.id = 'demoBanner';
    bar.innerHTML =
      '<span class="l">시연용 샘플 데이터 · 관리자 웹(WMS) 목업</span>' +
      '<span class="r"><a href="../index.html">진입 페이지</a><a href="../app/index.html">점주 앱 열기</a></span>';
    document.body.appendChild(bar);
  }

  // ---------- toast ----------
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'demoToast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-show'); }, 2200);
  }

  // ---------- 2. hashchange → __wmsGo ----------
  function wireHashRouting() {
    window.addEventListener('hashchange', function () {
      var path = (location.hash || '').replace('#', '');
      if (path && typeof window.__wmsGo === 'function') window.__wmsGo(path);
    });
  }

  // ---------- 앱 주문 → 배송처리 행 매핑 ----------
  function ocRowFromAppOrder(o) {
    return {
      no: o.no,
      store: o.store || '다람쥐분식 강남점',
      date: o.date,
      req: o.req || o.date,
      amt: o.amt || 0,
      st: STMAP_APP[o.st] ? o.st : 'ORDER',
      confirmed: o.confirmed || null,
      by: o.by || (o.st === 'ORDER' ? '-' : '물류담당'),
      msg: '[앱 접수] ' + (o.msg || ''),
      items: Array.isArray(o.items) ? o.items : [],
      __appOrder: true,
    };
  }

  var lastOCRow = null; // 드로어 배송확정 델리게이션용: 마지막으로 연 배송처리 드로어 행

  function patchOrderConfirm(PAGES) {
    var cfg = PAGES['/logistics/order-confirm'];
    if (!cfg || cfg.__demoPatched) return;
    cfg.__demoPatched = true;
    var baseRows = cfg.rows.slice(); // 원본 더미 행 보존

    cfg.__refresh = function () {
      var appRows = window.BRIDGE.getOrders().map(ocRowFromAppOrder);
      cfg.rows = appRows.concat(baseRows);
    };

    var origExtra = cfg.drawer.extra;
    cfg.drawer.extra = function (row) {
      lastOCRow = row;
      if (row && row.__appOrder && Array.isArray(row.items) && row.items.length) {
        var items = row.items;
        var rowsHtml = items.map(function (it) {
          return '<tr><td>' + (it.name || '') + '</td><td class="ctr">' + (it.unit || 'EA') + '</td>' +
            '<td class="num">' + (it.qty != null ? it.qty : '-') + '</td>' +
            '<td class="num">' + (it.price != null ? WMS.num(it.price) : '-') + '</td>' +
            '<td class="num">' + (it.amt != null ? WMS.num(it.amt) : '-') + '</td></tr>';
        }).join('');
        return '<div style="padding:16px 24px"><div class="wms-listhead" style="margin-bottom:10px">' +
          '<div class="l"><span class="ttl" style="font-size:15px">주문 품목</span>' +
          '<span class="wms-count" style="font-size:13px;padding:2px 8px">' + items.length + '<span class="unit">건</span></span></div></div>' +
          '<div class="wms-tablewrap"><table class="wms-table"><thead><tr><th>품목명</th><th class="ctr" style="width:64px">단위</th>' +
          '<th class="num" style="width:72px">수량</th><th class="num" style="width:96px">단가</th><th class="num" style="width:110px">금액</th></tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
          '<tfoot><tr><td colspan="4" class="num">합계</td><td class="num">' + WMS.won(row.amt) + '</td></tr></tfoot></table></div></div>';
      }
      return origExtra(row);
    };
  }

  function patchShortage(PAGES) {
    var cfg = PAGES['/logistics/shortage'];
    if (!cfg || cfg.__demoPatched) return;
    cfg.__demoPatched = true;
    var baseRows = cfg.rows.slice();
    // 결품 처리 액션 열 추가 (앱 주문 행에만 버튼 노출)
    cfg.columns = cfg.columns.concat([{
      title: '앱 결품 처리', align: 'center', w: 120,
      render: function (r) {
        if (!r.__appOrderNo) return '<span class="cell-muted">-</span>';
        return '<button type="button" class="demo-fix-btn" data-shortage-no="' + r.__appOrderNo + '" data-shortage-name="' + WMS.esc(r.pname) + '">결품 처리</button>';
      },
    }]);

    cfg.__refresh = function () {
      var appOrders = window.BRIDGE.getOrders();
      var appRows = appOrders.filter(function (o) { return Array.isArray(o.items) && o.items.length; }).map(function (o, i) {
        var it = o.items[0];
        return {
          req: o.req || o.date, store: '상온', conf: '1호차', code: o.storeCode || 'S10042', name: o.store || '다람쥐분식 강남점',
          pcode: 'P' + (99000 + i), pname: it.name || '상품', unit: it.unit || 'EA', ordered: it.qty || 1, shipped: 0,
          short: it.qty || 1, conv: it.qty || 1, reason: '재고부족', st: 'OPEN', __appOrderNo: o.no,
        };
      });
      cfg.rows = appRows.concat(baseRows);
    };
  }

  // ---------- 이벤트 위임: 배송확정 / 결품 처리 ----------
  function wireDelegatedClicks() {
    document.addEventListener('click', function (e) {
      var confirmBtn = e.target.closest && e.target.closest('#wmsDwFoot .btn-primary');
      if (confirmBtn) {
        if (lastOCRow && lastOCRow.__appOrder) {
          var now = new Date();
          var ts = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0') +
            ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
          window.BRIDGE.updateOrder(lastOCRow.no, { st: 'SHIPPED', confirmed: ts, by: '물류담당' });
          toast('배송확정 처리 — 점주 앱에 반영');
          window.__wmsCloseDrawer && window.__wmsCloseDrawer();
          var path = (location.hash || '').replace('#', '') || '/logistics/order-confirm';
          window.__wmsGo && window.__wmsGo(path);
        }
        return;
      }
      var fixBtn = e.target.closest && e.target.closest('[data-shortage-no]');
      if (fixBtn) {
        e.stopPropagation();
        var no = fixBtn.getAttribute('data-shortage-no');
        var name = fixBtn.getAttribute('data-shortage-name');
        window.BRIDGE.updateOrder(no, { shortage: [{ name: name, qty: 1, reason: '센터 재고 부족' }] });
        toast('결품 처리 완료 — 점주 앱에 대체 안내 반영');
        var path2 = (location.hash || '').replace('#', '') || '/logistics/shortage';
        window.__wmsGo && window.__wmsGo(path2);
      }
    }, true);
  }

  // ---------- go() 래핑: 각 페이지 진입 전 데이터 최신화 ----------
  function wrapGo(PAGES) {
    var origGo = window.__wmsGo;
    if (typeof origGo !== 'function') return;
    window.__wmsGo = function (path) {
      var cfg = PAGES[path];
      if (cfg && typeof cfg.__refresh === 'function') cfg.__refresh();
      return origGo(path);
    };
  }

  function init() {
    var PAGES = window.PAGES;
    if (!PAGES) return;
    injectBanner();
    wireHashRouting();
    wireDelegatedClicks();
    patchOrderConfirm(PAGES);
    patchShortage(PAGES);
    wrapGo(PAGES);
    // 최초 화면이 배송처리/결품현황일 경우를 대비해 즉시 1회 갱신 + 재렌더
    var initial = (location.hash || '').replace('#', '');
    if (PAGES[initial] && typeof PAGES[initial].__refresh === 'function') {
      PAGES[initial].__refresh();
      window.__wmsGo(initial);
    }
  }

  init();
})();
