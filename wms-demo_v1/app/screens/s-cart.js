/* s-cart.js — M4 장바구니 */
(function () {
  'use strict';

  var bundleCheck = false;

  function fmtDate(d) {
    var w = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' (' + w + ')';
  }
  function iso(d) {
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function isHoliday(d) {
    return d.getDay() === 0 || (DATA.holidays || []).indexOf(iso(d)) >= 0;
  }
  function nowStamp() {
    var d = new Date(), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return fmtDate(d) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function lines(s) {
    return s.cart.map(function (c) {
      var p = DATA.byId(c.id);
      if (!p) return null;
      return { p: p, qty: c.qty, amt: p.price * c.qty };
    }).filter(Boolean);
  }

  function setQty(s, id, qty) {
    qty = Math.max(0, qty);
    var l = s.cart.filter(function (c) { return c.id === id; })[0];
    if (qty === 0) s.cart = s.cart.filter(function (c) { return c.id !== id; });
    else if (l) l.qty = qty;
    APP.save();
  }
  function removeLine(s, id) {
    s.cart = s.cart.filter(function (c) { return c.id !== id; });
    APP.save();
  }

  function dateSheetHTML() {
    var chips = [];
    var d = new Date();
    for (var i = 1; i <= 7; i++) {
      var dd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      var hol = isHoliday(dd);
      var isoStr = iso(dd);
      chips.push(
        '<button class="chip' + (hol ? '' : '') + '" style="height:auto;padding:10px 12px;flex-direction:column;align-items:flex-start;gap:2px;' +
          (hol ? 'opacity:.45;pointer-events:none;' : '') + '" data-act="cartPickDate" data-date="' + isoStr + '">' +
          '<span style="font-weight:700;font-size:14px;color:' + (hol ? 'var(--t3)' : 'var(--t1)') + '">' + fmtDate(dd) + '</span>' +
          (hol ? '<span class="badge b-red" style="margin-top:2px">휴일</span>' : '<span class="cap">배송 가능</span>') +
        '</button>'
      );
    }
    return '' +
      '<h2>배송 요청일 선택</h2>' +
      '<p class="cap" style="margin-bottom:12px">일요일·등록된 휴일은 배송이 불가합니다.</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px;max-height:52vh;overflow-y:auto">' + chips.join('') + '</div>';
  }

  APP.screens.cart = {
    meta: {
      title: 'M4 장바구니',
      wbs: 'M4',
      hint: '영수증 형태 카드에서 수량 수정·삭제, VAT 10% 계산, 배송 요청일(휴일 비활성)·배송지를 확인하고 [주문하기]로 발주 확정(M5)으로 이동합니다.'
    },
    render: function (s) {
      var ls = lines(s);
      var n = APP.cartCount();

      if (!ls.length) {
        return '' +
          '<header class="hdr"><button class="back" data-act="back">‹</button><h1>장바구니</h1><span class="rgt"></span></header>' +
          '<div class="view pad">' +
            '<div class="card" style="margin-top:80px;text-align:center">' +
              '<div style="font-size:34px">🛒</div>' +
              '<h2 style="margin-top:10px">장바구니가 비어 있습니다</h2>' +
              '<p class="cap">상품 리스트에서 담아 주세요.</p>' +
              '<button class="btn primary block" style="margin-top:14px" data-act="go" data-to="#/catalog">상품 리스트로</button>' +
            '</div>' +
          '</div>';
      }

      var sub = ls.reduce(function (a, l) { return a + l.amt; }, 0);
      var vat = Math.round(sub * 0.1);
      var total = Math.round(sub * 1.1);

      var rows = ls.map(function (l) {
        return '' +
          '<div class="row" style="align-items:center">' +
            '<span class="g">' +
              '<span class="tt">' + APP.esc(l.p.name) + ' <span class="muted">' + APP.esc(l.p.spec) + '</span></span>' +
              '<span class="st">' + APP.won(l.p.price) + ' × ' + l.qty + ' = ' + APP.won(l.amt) + '</span>' +
            '</span>' +
            '<span class="qty">' +
              '<button data-act="cartQty" data-id="' + l.p.id + '" data-d="-1">−</button>' +
              '<span class="n">' + l.qty + '</span>' +
              '<button data-act="cartQty" data-id="' + l.p.id + '" data-d="1">+</button>' +
            '</span>' +
            '<button data-act="cartDel" data-id="' + l.p.id + '" style="color:var(--red);font-size:18px;margin-left:4px">✕</button>' +
          '</div>';
      }).join('');

      var reqLabel = s.reqDate ? fmtDate(new Date(s.reqDate + 'T00:00:00')) : '날짜를 선택해 주세요';

      return '' +
      '<header class="hdr"><button class="back" data-act="back">‹</button><h1>장바구니</h1><span class="rgt"></span></header>' +
      '<div class="view pad">' +

        '<div class="card" style="margin-top:16px;border-top:2px dashed var(--line);border-radius:0 0 16px 16px;position:relative;overflow:visible">' +
          '<h2 style="display:flex;justify-content:space-between;align-items:center">오늘의 발주<span class="cap">' + nowStamp() + '</span></h2>' +
          '<div class="rows" style="box-shadow:none;margin-top:6px">' + rows + '</div>' +
          '<div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--line);font-size:14px">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span class="muted">공급가액</span><span>' + APP.won(sub) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:10px"><span class="muted">부가세(VAT 10%)</span><span>' + APP.won(vat) + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">합계</b><b style="font-size:22px;color:var(--pri)">' + APP.won(total) + '</b></div>' +
          '</div>' +
        '</div>' +

        '<div class="rows">' +
          '<button class="row" data-act="cartOpenDate">' +
            '<span class="g"><span class="tt">배송 요청일</span><span class="st">' + APP.esc(reqLabel) + '</span></span>' +
            '<span class="arw">›</span>' +
          '</button>' +
          '<div class="row">' +
            '<span class="g"><span class="tt">배송지 <span class="badge b-pri" style="margin-left:4px">기본</span></span>' +
              '<span class="st">' + APP.esc(DATA.store.name) + '</span></span>' +
          '</div>' +
        '</div>' +

        '<button class="row" style="background:#fff;border-radius:var(--r);box-shadow:var(--sh);margin-top:12px" data-act="cartToggleBundle">' +
          '<span style="width:20px;height:20px;border-radius:6px;border:1.5px solid ' + (bundleCheck ? 'var(--pri)' : 'var(--line)') + ';background:' + (bundleCheck ? 'var(--pri)' : '#fff') + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px">' + (bundleCheck ? '✓' : '') + '</span>' +
          '<span class="g tt">이 발주를 자주 찾는 묶음으로 저장</span>' +
        '</button>' +

      '</div>' +
      '<div class="btnbar">' +
        '<button class="btn primary block" data-act="cartOrder">주문하기 · ' + APP.won(total) + '</button>' +
      '</div>';
    }
  };

  APP.on('cartQty', function (d) {
    var cur = APP.state.cart.filter(function (c) { return c.id === d.id; })[0];
    setQty(APP.state, d.id, (cur ? cur.qty : 0) + Number(d.d));
    APP.go(location.hash);
  });
  APP.on('cartDel', function (d) { removeLine(APP.state, d.id); APP.go(location.hash); });
  APP.on('cartToggleBundle', function () { bundleCheck = !bundleCheck; APP.go(location.hash); });
  APP.on('cartOpenDate', function () {
    APP.sheet(dateSheetHTML());
  });
  APP.on('cartPickDate', function (d) {
    APP.state.reqDate = d.date;
    APP.save();
    APP.closeSheet();
    APP.go(location.hash);
  });
  APP.on('cartOrder', function () {
    if (APP.cartCount() === 0) { APP.toast('장바구니가 비어 있습니다'); return; }
    APP.go('#/confirm');
  });
})();
