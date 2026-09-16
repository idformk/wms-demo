/* 마트프로 WMS — 공용 앱 셸 (사이드바) 렌더러
   menu.tsx 의 sideMenuItems 와 1:1. lucide 라인 아이콘 셋. */
(function () {
  const I = {
    store: '<path d="M2 7l1-4h18l1 4M3 7h18v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>',
    cart: '<circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M1 1h3l2.6 13.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 6H5"/>',
    boxes: '<path d="M3 8l9-5 9 5-9 5-9-5zM3 8v8l9 5 9-5V8M12 13v8"/>',
    tags: '<path d="M9 3H4a1 1 0 0 0-1 1v5l9 9 6-6-9-9zM7 7h.01"/><path d="M14 6l6 6-5 5"/>',
    case: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  };
  const MENU = [
    { key: '/system', icon: 'store', label: '마스터 관리', children: [
      { key: '/system/partner', label: '거래처 관리' },
      { key: '/system/virtual-account', label: '가상계좌 풀 관리' },
      { key: '/system/product', label: '품목 등록' },
      { key: '/system/brand-price-match', label: '브랜드단가그룹매칭' },
      { key: '/system/vehicle', label: '차량등록' },
      { key: '/system/vehicle-routes', label: '차량운행등록' },
      { key: '/system/vehicle-status', label: '차량운행현황' },
      { key: '/system/warehouse', label: '창고등록' },
    ]},
    { key: '/order', icon: 'doc', label: '주문관리', children: [
      { key: '/order/register', label: '주문등록' },
      { key: '/order/bulk-register', label: '일괄주문등록' },
    ]},
    { key: '/logistics', icon: 'truck', label: '물류관리', children: [
      { key: '/logistics/dispatch', label: '배차확정' },
      { key: '/logistics/order-confirm', label: '배송처리' },
      { key: '/logistics/shortage', label: '결품현황' },
      { key: '/logistics/return-approval', label: '반품승인처리' },
      { key: '/logistics/picking', label: '피킹리스트' },
      { key: '/logistics/trade-statement', label: '거래명세표' },
      { key: '/logistics/sales-ledger', label: '매출원장' },
    ]},
    { key: '/purchase', icon: 'cart', label: '구매관리', children: [
      { key: '/purchase/receiving', label: '입고관리' },
      { key: '/purchase/return', label: '반품관리' },
    ]},
    { key: '/inventory', icon: 'boxes', label: '재고관리', children: [
      { key: '/inventory/outbound', label: '창고출고관리' },
      { key: '/inventory/audit', label: '재고실사관리' },
      { key: '/inventory/status', label: '현재고현황' },
      { key: '/inventory/report', label: '종합입출고현황' },
    ]},
    { key: '/payment', icon: 'tags', label: '대금관리', children: [
      { key: '/payment/receivables', label: '미수채권현황' },
      { key: '/payment/charge-balance', label: '대금입금 현황' },
      { key: '/payment/credit-adjustment', label: '채권조정처리' },
    ]},
    { key: '/permission', icon: 'case', label: '권한관리', children: [
      { key: '/permission/group', label: '권한그룹 관리' },
      { key: '/permission/user', label: '사용자 관리' },
    ]},
    { key: '/mypage', icon: 'user', label: '마이페이지' },
  ];

  function svg(p) { return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + I[p] + '</svg>'; }
  const chev = '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';

  window.renderSider = function (activePath) {
    const parent = '/' + activePath.split('/')[1];
    let html = '<aside class="wms-sider"><div class="wms-logo"><img src="assets/logo/with-name.svg" alt="마트프로 WMS"/></div><nav class="wms-nav">';
    for (const m of MENU) {
      const isParent = m.key === parent;
      if (!m.children) {
        html += '<div class="wms-menu-group"><div class="wms-menu-parent' + (isParent ? ' is-selected' : '') + '">' + svg(m.icon) + '<span>' + m.label + '</span></div></div>';
        continue;
      }
      html += '<div class="wms-menu-group' + (isParent ? ' is-open' : '') + '">';
      html += '<div class="wms-menu-parent' + (isParent ? ' is-selected' : '') + '">' + svg(m.icon) + '<span>' + m.label + '</span>' + chev + '</div>';
      html += '<div class="wms-submenu">';
      for (const c of m.children) {
        html += '<div class="wms-submenu-item' + (c.key === activePath ? ' is-active' : '') + '">' + c.label + '</div>';
      }
      html += '</div></div>';
    }
    html += '</nav></aside>';
    return html;
  };

  // 사이드바 메뉴 토글(데모용)
  window.wireSider = function (root) {
    root.querySelectorAll('.wms-menu-group').forEach(g => {
      const p = g.querySelector('.wms-menu-parent');
      if (g.querySelector('.wms-submenu')) {
        p.addEventListener('click', () => {
          root.querySelectorAll('.wms-menu-group').forEach(o => { if (o !== g) o.classList.remove('is-open'); });
          g.classList.toggle('is-open');
        });
      }
    });
  };
})();
