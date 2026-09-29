/* s-history.js — M6 주문내역 목록·상세 */
(function () {
  'use strict';

  var PERIODS = [
    { key: '1d', label: '당일', days: 1 },
    { key: '1w', label: '1주', days: 7 },
    { key: '1m', label: '1개월', days: 30 },
    { key: '3m', label: '3개월', days: 90 }
  ];
  var curPeriod = '1w';

  function daysAgo(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var now = new Date();
    return Math.floor((now - d) / 86400000);
  }

  function statusInfo(o) {
    if (o.st === 'CANCELLED') return { label: '취소', cls: 'b-gray', step: -1 };
    if (o.st === 'SHIPPED') {
      if (daysAgo(o.date) >= 2) return { label: '도착완료', cls: 'b-green', step: 4 };
      return { label: '출고완료', cls: 'b-pri', step: 3 };
    }
    return { label: '접수', cls: 'b-orange', step: 1 };
  }

  function timelineHtml(step) {
    var steps = ['접수', '준비', '출고', '도착'];
    return '<div class="timeline">' + steps.map(function (label, i) {
      return '<div class="tstep' + (step > i ? ' done' : '') + '"><div class="tdot"></div>' + label + '</div>';
    }).join('') + '</div>';
  }

  function sortedOrders() {
    return APP.allOrders().slice().sort(function (a, b) {
      return (b.date || '').localeCompare(a.date || '') || (b.no || '').localeCompare(a.no || '');
    });
  }

  function filterByPeriod(orders, key) {
    var p = PERIODS.filter(function (x) { return x.key === key; })[0] || PERIODS[1];
    return orders.filter(function (o) { return daysAgo(o.date) < p.days; });
  }

  APP.screens.history = {
    meta: { title: 'M6 주문내역', wbs: 'M6', hint: '기간 탭으로 필터링하고, 카드별로 4단 타임라인·다시 주문·영수증·주문 취소를 확인할 수 있습니다. 앱에서 확정한 주문은 취소가 가능합니다.' },
    render: function () {
      var orders = filterByPeriod(sortedOrders(), curPeriod);

      var tabs = PERIODS.map(function (p) {
        return '<button class="chip' + (p.key === curPeriod ? ' on' : '') + '" data-act="histPeriod" data-key="' + p.key + '">' + p.label + '</button>';
      }).join('');

      var cards = orders.map(function (o) {
        var si = statusInfo(o);
        var items = o.items || [];
        var first = items[0] ? items[0].name : '';
        var more = items.length > 1 ? ' 외 ' + (items.length - 1) + '건' : '';
        var canCancel = o.st === 'ORDER' && o.source === 'APP';
        var shortageNote = (o.shortage && o.shortage.length)
          ? '<div class="cap" style="color:var(--orange, #B45309);margin-top:6px">대체 발생 · ' + o.shortage.map(function (s) { return APP.esc(s.name) + ' → 대체'; }).join(', ') + '</div>'
          : '';

        return '<div class="card">' +
          '<div class="row" style="padding:0 0 8px"><span class="badge ' + si.cls + '">' + si.label + '</span>' +
            '<span class="g"></span><span class="rt">' + APP.esc(o.date || '') + '</span></div>' +
          '<button class="row" style="padding:0" data-act="go" data-to="#/order/' + APP.esc(o.no) + '">' +
            '<span class="g"><span class="tt">' + APP.esc(o.no) + '</span>' +
            '<span class="st">' + APP.esc(first) + more + '</span></span>' +
            '<span class="rt" style="font-weight:700">' + APP.won(o.amt) + '</span>' +
            '<span class="arw">›</span></button>' +
          timelineHtml(si.step) +
          shortageNote +
          '<div style="display:flex;gap:8px;margin-top:12px">' +
            '<button class="btn ghost sm" style="flex:1" data-act="histReorder" data-no="' + APP.esc(o.no) + '">다시 주문</button>' +
            '<button class="btn ghost sm" style="flex:1" data-act="histReceipt" data-no="' + APP.esc(o.no) + '">영수증</button>' +
            (canCancel ? '<button class="btn ghost sm" style="flex:1;color:var(--red)" data-act="histCancel" data-no="' + APP.esc(o.no) + '">주문 취소</button>' : '') +
          '</div>' +
        '</div>';
      }).join('');

      return '' +
      '<header class="hdr"><button class="back" data-act="back">‹</button><h1>주문내역</h1><span class="rgt"></span></header>' +
      '<div class="view pad">' +
        '<div class="chips">' + tabs + '</div>' +
        (cards || '<div class="card" style="text-align:center;color:var(--t2)">해당 기간 주문이 없습니다</div>') +
      '</div>';
    },
    mount: function (el) {
      if (window.BRIDGE && typeof BRIDGE.onChange === 'function') {
        BRIDGE.onChange(function () { if (APP.current && APP.current.name === 'history') APP.render(); });
      }
    }
  };

  APP.on('histPeriod', function (d) { curPeriod = d.key; APP.render(); });

  function findOrder(no) {
    return APP.allOrders().filter(function (o) { return o.no === no; })[0];
  }

  function reorder(no) {
    var o = findOrder(no);
    if (!o) return;
    var added = 0;
    (o.items || []).forEach(function (it) {
      var prod = (window.DATA && DATA.products || []).filter(function (p) { return it.name.indexOf(p.name) === 0; })[0];
      if (!prod) return;
      var line = APP.state.cart.filter(function (l) { return l.id === prod.id; })[0];
      if (line) line.qty += it.qty; else APP.state.cart.push({ id: prod.id, qty: it.qty });
      added++;
    });
    APP.save();
    APP.toast(added ? '장바구니에 담았어요 · ' + added + '건' : '담을 수 있는 상품이 없습니다');
  }

  APP.on('histReorder', function (d) { reorder(d.no); });
  APP.on('histReorderDetail', function (d) { reorder(d.no); });

  APP.on('histReceipt', function (d) {
    var o = findOrder(d.no);
    if (!o) return;
    var rows = (o.items || []).map(function (it) {
      return '<div class="row"><span class="g"><span class="tt">' + APP.esc(it.name) + '</span>' +
        '<span class="st">' + it.qty + APP.esc(it.unit) + ' · ' + APP.won(it.price) + '</span></span>' +
        '<span class="rt">' + APP.won(it.amt) + '</span></div>';
    }).join('');
    APP.sheet('<h2>영수증 · ' + APP.esc(o.no) + '</h2><div class="card flat" style="margin-top:0">' + rows +
      '<div class="row" style="padding-top:10px"><span class="g" style="font-weight:700">합계</span><span class="rt" style="font-weight:700">' + APP.won(o.amt) + '</span></div></div>');
  });

  APP.on('histCancel', function (d) {
    BRIDGE.updateOrder(d.no, { st: 'CANCELLED' });
    APP.toast('주문이 취소됐어요 — 관리자 웹에도 반영');
    APP.render();
  });

  /* -------- 상세 -------- */
  function headline(o, si) {
    if (o.st === 'CANCELLED') return '주문이 취소됐어요';
    if (si.step >= 4) return '배송이 완료됐어요';
    if (si.step === 3) return '물류센터에서 출고했어요';
    return '주문이 접수됐어요';
  }

  APP.screens.order = {
    meta: { title: 'M6 주문 상세', wbs: 'M6', hint: '주문 1건의 타임라인·품목·결제 금액과 결품/대체 안내를 확인합니다.' },
    render: function (s, params) {
      var o = findOrder(params.no);
      if (!o) {
        return '<header class="hdr"><button class="back" data-act="back">‹</button><h1>주문 상세</h1><span class="rgt"></span></header>' +
          '<div class="view pad"><div class="card" style="text-align:center;color:var(--t2)">주문을 찾을 수 없습니다</div></div>';
      }
      var si = statusInfo(o);
      var items = (o.items || []).map(function (it) {
        return '<div class="row"><span class="g"><span class="tt">' + APP.esc(it.name) + '</span>' +
          '<span class="st">' + it.qty + APP.esc(it.unit) + ' · ' + APP.won(it.price) + '</span></span>' +
          '<span class="rt">' + APP.won(it.amt) + '</span></div>';
      }).join('');

      var shortageHtml = '';
      if (o.shortage && o.shortage.length) {
        shortageHtml = '<div class="card" style="border:1px solid #FDE68A;background:#FFFBEB">' +
          '<h2 style="color:#B45309">결품·대체 안내</h2>' +
          o.shortage.map(function (sh) {
            return '<div class="row"><span class="g"><span class="tt">' + APP.esc(sh.name) + '</span>' +
              '<span class="st">' + sh.qty + '건</span></span><span class="rt cap">' + APP.esc(sh.reason) + '</span></div>';
          }).join('') +
        '</div>';
      }

      return '' +
      '<header class="hdr"><button class="back" data-act="back">‹</button><h1>주문 상세</h1><span class="rgt"></span></header>' +
      '<div class="view pad">' +
        '<div class="card">' +
          '<span class="badge ' + si.cls + '">' + si.label + '</span>' +
          '<h2 style="margin-top:8px">' + headline(o, si) + '</h2>' +
          '<div class="cap">' + APP.esc(o.no) + ' · ' + APP.esc(o.date || '') + '</div>' +
          timelineHtml(Math.max(si.step, 0)) +
        '</div>' +
        '<div class="card"><h2>품목</h2>' + items + '</div>' +
        shortageHtml +
        '<div class="card">' +
          '<div class="row"><span class="g cap">결제 금액</span><span class="rt" style="font-weight:700">' + APP.won(o.amt) + '</span></div>' +
          '<div class="row"><span class="g cap">배송 요청일</span><span class="rt">' + APP.esc(o.req || '') + '</span></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:14px">' +
          '<button class="btn ghost block" data-act="orderArrive" data-no="' + APP.esc(o.no) + '">도착 확인</button>' +
          '<button class="btn primary block" data-act="histReorderDetail" data-no="' + APP.esc(o.no) + '">이대로 다시 주문</button>' +
        '</div>' +
      '</div>';
    },
    mount: function (el, s, params) {
      if (window.BRIDGE && typeof BRIDGE.onChange === 'function') {
        BRIDGE.onChange(function () { if (APP.current && APP.current.name === 'order' && APP.current.params.no === params.no) APP.render(); });
      }
    }
  };

  APP.on('orderArrive', function () { APP.toast('도착이 확인됐어요'); });
})();
