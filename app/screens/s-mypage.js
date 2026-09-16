/* s-mypage.js — M9 마이페이지 · M10 알림 */
(function () {
  'use strict';

  var SALES = [32, 48, 41, 60, 55, 70, 64]; // 시연용 일별 매출 샘플(단위: 만원)

  function salesChart() {
    var max = Math.max.apply(null, SALES);
    var days = ['월', '화', '수', '목', '금', '토', '일'];
    var bars = SALES.map(function (v, i) {
      var h = Math.round(v / max * 100);
      return '<div class="sbar-col"><div class="sbar-track"><div class="sbar-fill" style="height:' + h + '%"></div></div><span class="cap">' + days[i] + '</span></div>';
    }).join('');
    return '<div class="sbar-row">' + bars + '</div>';
  }

  APP.screens.mypage = {
    meta: {
      title: 'M9 마이페이지',
      wbs: 'M9',
      hint: '시연 스위치로 결제 유형(충전형/후입금)을 전환하면 잔액 화면(M7) 카드가 즉시 바뀝니다.'
    },
    render: function (s) {
      var d = DATA;
      var thisMonthAmt = d.transactions
        .filter(function (t) { return t.kind === '발주 사용' && t.date.slice(0, 7) === '2026-09'; })
        .reduce(function (a, t) { return a + Math.abs(t.amt); }, 0);
      var totalOrders = APP.allOrders().length;
      var favN = s.favorites.size;
      var isCredit = s.wallet.type === 'CREDIT';

      return '' +
      '<header class="hdr" style="padding:0 16px"><span class="g"><b style="font-size:17px">마이페이지</b></span></header>' +
      '<div class="view pad">' +

        '<div class="card mp-profile">' +
          '<div class="mp-ava">다</div>' +
          '<div class="g">' +
            '<div class="mp-name">' + APP.esc(d.store.name) + ' 사장님</div>' +
            '<div class="cap">거래처 코드 ' + APP.esc(d.store.code) + '</div>' +
          '</div>' +
          '<button class="btn ghost sm">편집</button>' +
        '</div>' +

        '<div class="mp-stats">' +
          '<div class="mp-stat"><b>' + totalOrders + '</b><span>누적 주문(건)</span></div>' +
          '<div class="mp-stat"><b>' + APP.won(thisMonthAmt) + '</b><span>이번달 주문금액</span></div>' +
          '<div class="mp-stat"><b>' + favN + '</b><span>자주 찾는(개)</span></div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="sec-t" style="margin:0 0 4px"><h2>매출 현황</h2><span class="badge b-gray">WMS 기준</span></div>' +
          salesChart() +
        '</div>' +

        '<div class="card">' +
          '<h2>결제 유형 (시연용 전환)</h2>' +
          '<div class="segs">' +
            '<button class="' + (!isCredit ? 'on' : '') + '" data-act="mpWalletType" data-t="CHARGE">충전형</button>' +
            '<button class="' + (isCredit ? 'on' : '') + '" data-act="mpWalletType" data-t="CREDIT">후입금</button>' +
          '</div>' +
          '<p class="cap" style="margin-top:8px">전환 시 잔액 화면(M7)의 카드가 즉시 반영됩니다.</p>' +
        '</div>' +

        '<div class="rows" style="margin-top:16px">' +
          '<button class="row" data-act="go" data-to="#/balance"><span class="g tt">잔액 · 거래 내역</span><span class="arw">›</span></button>' +
          '<button class="row" data-act="go" data-to="#/notice"><span class="g tt">공지사항</span><span class="arw">›</span></button>' +
          '<button class="row" data-act="go" data-to="#/notify"><span class="g tt">알림</span><span class="arw">›</span></button>' +
        '</div>' +
        '<div class="rows" style="margin-top:12px">' +
          '<button class="row" data-act="mpToast"><span class="g tt">비밀번호 변경</span><span class="arw">›</span></button>' +
          '<button class="row" data-act="mpToast"><span class="g tt">서비스제공자 정보</span><span class="arw">›</span></button>' +
          '<button class="row" data-act="mpLogout"><span class="g tt" style="color:var(--red)">로그아웃</span><span class="arw">›</span></button>' +
        '</div>' +

      '</div>';
    }
  };

  APP.on('mpWalletType', function (d) {
    BRIDGE.saveWallet({ type: d.t });
    APP.syncWallet();
    APP.toast(d.t === 'CREDIT' ? '결제 유형이 후입금으로 전환되었습니다' : '결제 유형이 충전형으로 전환되었습니다');
    APP.render();
  });
  APP.on('mpToast', function () { APP.toast('시연용 화면에서는 지원하지 않습니다'); });
  APP.on('mpLogout', function () {
    APP.state.loggedIn = false;
    APP.save();
    APP.go('#/login');
  });

  /* ---------------- M10 알림 ---------------- */

  function notifIcon(kind) {
    if (kind === '배송') return '🚚';
    if (kind === '공지') return '📢';
    if (kind === '결제') return '💳';
    if (kind === '결품') return '⚠️';
    return '🔔';
  }

  function orderNotifs() {
    return BRIDGE.getOrders().filter(function (o) { return o.source === 'APP'; }).map(function (o) {
      if (o.st === 'SHIPPED') {
        return { id: 'ord-' + o.no, kind: '배송', title: '출고됐어요', body: o.no + ' · 배송이 시작되었습니다', at: '방금', unread: true, group: '오늘', orderNo: o.no };
      }
      return { id: 'ord-' + o.no, kind: '배송', title: '접수됐어요', body: o.no + ' · 발주가 접수되었습니다', at: '방금', unread: true, group: '오늘', orderNo: o.no };
    });
  }

  function groupOf(at) {
    if (/^오늘/.test(at)) return '오늘';
    if (/^어제/.test(at)) return '어제';
    return '이전';
  }

  APP.screens.notify = {
    meta: {
      title: 'M10 알림',
      wbs: 'M10',
      hint: '오늘/어제/이전으로 그룹핑됩니다. 배송 관련 알림을 탭하면 해당 주문 상세(M6)로 이동합니다.'
    },
    render: function () {
      var seed = DATA.notifications.map(function (n) {
        return Object.assign({ group: groupOf(n.at) }, n);
      });
      var list = orderNotifs().concat(seed);
      var unread = list.filter(function (n) { return n.unread; }).length;

      var groups = ['오늘', '어제', '이전'];
      var body = groups.map(function (g) {
        var items = list.filter(function (n) { return n.group === g; });
        if (!items.length) return '';
        var rows = items.map(function (n) {
          return '<button class="row nrow" data-act="' + (n.orderNo ? 'notiGoOrder' : 'notiNoop') + '" data-no="' + (n.orderNo || '') + '">' +
            '<span class="nic">' + notifIcon(n.kind) + '</span>' +
            '<span class="g"><span class="tt">' + APP.esc(n.title) + (n.unread ? '<span class="dot" style="margin-left:6px;display:inline-block"></span>' : '') + '</span>' +
            '<span class="st">' + APP.esc(n.body) + '</span></span>' +
            '<span class="rt">' + APP.esc(n.at) + '</span>' +
          '</button>';
        }).join('');
        return '<div class="sec-t"><h2>' + g + '</h2></div><div class="rows">' + rows + '</div>';
      }).join('');

      return '' +
      '<header class="hdr"><button class="back" data-act="back">‹</button><h1>알림</h1>' +
        '<button class="rgt" style="font-size:12px;color:var(--pri);width:auto" data-act="notiReadAll">모두 읽음</button>' +
      '</header>' +
      '<div class="view pad">' +
        (unread > 0 ? '<div class="unreadbanner">읽지 않은 알림 ' + unread + '개</div>' : '') +
        body +
      '</div>';
    }
  };

  APP.on('notiGoOrder', function (d) { if (d.no) APP.go('#/order/' + d.no); });
  APP.on('notiNoop', function () {});
  APP.on('notiReadAll', function () { APP.toast('모두 읽음으로 처리했습니다'); APP.render(); });
})();
