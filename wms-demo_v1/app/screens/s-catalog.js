/* s-catalog.js — M3 상품 리스트 */
(function () {
  'use strict';

  var ui = { tab: '전용', cat: null, search: false, q: '' };

  function lineQty(s, id) {
    var l = s.cart.filter(function (c) { return c.id === id; })[0];
    return l ? l.qty : 0;
  }

  function setQty(s, id, qty) {
    qty = Math.max(0, qty);
    var l = s.cart.filter(function (c) { return c.id === id; })[0];
    if (qty === 0) {
      s.cart = s.cart.filter(function (c) { return c.id !== id; });
    } else if (l) {
      l.qty = qty;
    } else {
      s.cart.push({ id: id, qty: qty });
    }
    APP.save();
  }

  function filtered(s) {
    var d = DATA;
    var list = d.products.slice();
    if (ui.tab === '전용') list = list.filter(function (p) { return p.type === '전용'; });
    else if (ui.tab === '범용') list = list.filter(function (p) { return p.type === '범용'; });
    else if (ui.tab === '자주') list = list.filter(function (p) { return s.favorites.has(p.id); });
    if (ui.cat) list = list.filter(function (p) { return p.cat === ui.cat; });
    if (ui.q) {
      var q = ui.q.trim();
      if (q) list = list.filter(function (p) { return p.name.indexOf(q) >= 0; });
    }
    return list;
  }

  function catCounts(s) {
    var base = DATA.products;
    if (ui.tab === '전용') base = base.filter(function (p) { return p.type === '전용'; });
    else if (ui.tab === '범용') base = base.filter(function (p) { return p.type === '범용'; });
    else if (ui.tab === '자주') base = base.filter(function (p) { return s.favorites.has(p.id); });
    var map = {};
    base.forEach(function (p) { map[p.cat] = (map[p.cat] || 0) + 1; });
    return map;
  }

  function rowHTML(s, p) {
    var qty = lineQty(s, p.id);
    var fav = s.favorites.has(p.id);
    var tag = p.type === '전용' ? '<span class="badge b-orange" style="margin-left:6px">전용</span>' : '';
    return '' +
      '<div class="row" style="align-items:center">' +
        '<button class="star' + (fav ? ' on' : '') + '" data-act="catFav" data-id="' + p.id + '">' + (fav ? '★' : '☆') + '</button>' +
        '<span class="g">' +
          '<span class="tt">' + APP.esc(p.name) + ' <span class="muted">' + APP.esc(p.spec) + '</span></span>' +
          '<span class="st">' + APP.won(p.price) + ' · ' + APP.esc(p.unit) + tag + '</span>' +
        '</span>' +
        '<span class="qty' + (qty > 0 ? ' on' : '') + '">' +
          '<button data-act="catQty" data-id="' + p.id + '" data-d="-1">−</button>' +
          '<span class="n">' + qty + '</span>' +
          '<button data-act="catQty" data-id="' + p.id + '" data-d="1">+</button>' +
        '</span>' +
      '</div>';
  }

  APP.screens.catalog = {
    meta: {
      title: 'M3 상품 리스트',
      wbs: 'M3',
      hint: '상단 탭(전용/범용/자주 찾는)과 카테고리 칩으로 필터링하고, 수량 ± 로 장바구니에 담습니다. 하단 바가 담은 수량·금액을 실시간 반영하며 [장바구니]로 이동합니다.'
    },
    render: function (s) {
      var counts = catCounts(s);
      var totalCount = DATA.products.filter(function (p) {
        if (ui.tab === '전용') return p.type === '전용';
        if (ui.tab === '범용') return p.type === '범용';
        return s.favorites.has(p.id);
      }).length;
      var chips = '<button class="chip' + (!ui.cat ? ' on' : '') + '" data-act="catCat" data-cat="">전체 ' + totalCount + '</button>' +
        DATA.cats.map(function (c) {
          var n = counts[c] || 0;
          if (!n) return '';
          return '<button class="chip' + (ui.cat === c ? ' on' : '') + '" data-act="catCat" data-cat="' + c + '">' + c + ' ' + n + '</button>';
        }).join('');

      var list = filtered(s);
      var rows = list.map(function (p) { return rowHTML(s, p); }).join('');
      if (!rows) rows = '<div class="row"><span class="g cap" style="text-align:center;padding:20px 0">해당 상품이 없습니다</span></div>';

      var n = APP.cartCount(), amt = APP.cartAmount();
      var searchBar = ui.search
        ? '<div class="field" style="margin:0 12px 10px"><input class="input" id="catQ" placeholder="상품명 검색" value="' + APP.esc(ui.q) + '"></div>'
        : '';

      return '' +
      '<header class="hdr">' +
        '<button class="back" data-act="back">‹</button>' +
        '<h1>상품 리스트</h1>' +
        '<button class="rgt" data-act="catSearch" style="font-size:18px">🔍</button>' +
      '</header>' +
      '<div class="view pad" style="padding-top:12px">' +
        searchBar +
        '<div class="segs">' +
          '<button class="' + (ui.tab === '전용' ? 'on' : '') + '" data-act="catTab" data-tab="전용">전용</button>' +
          '<button class="' + (ui.tab === '범용' ? 'on' : '') + '" data-act="catTab" data-tab="범용">범용</button>' +
          '<button class="' + (ui.tab === '자주' ? 'on' : '') + '" data-act="catTab" data-tab="자주">자주 찾는</button>' +
        '</div>' +
        '<div class="chips">' + chips + '</div>' +
        '<div class="rows">' + rows + '</div>' +
      '</div>' +
      '<div class="btnbar">' +
        '<button class="btn primary block" data-act="catGoCart"' + (n === 0 ? ' disabled' : '') + '>' +
          '장바구니 담기 ' + n + ' · ' + APP.won(amt) +
        '</button>' +
      '</div>';
    },
    mount: function (el) {
      if (ui.search) {
        var inp = el.querySelector('#catQ');
        if (inp) {
          inp.focus();
          var v = inp.value.length; inp.setSelectionRange(v, v);
          inp.addEventListener('input', function () { ui.q = inp.value; APP.go(location.hash); });
        }
      }
    }
  };

  APP.on('catTab', function (d) { ui.tab = d.tab; ui.cat = null; APP.go(location.hash); });
  APP.on('catCat', function (d) { ui.cat = d.cat || null; APP.go(location.hash); });
  APP.on('catSearch', function () { ui.search = !ui.search; if (!ui.search) ui.q = ''; APP.go(location.hash); });
  APP.on('catFav', function (d) {
    if (APP.state.favorites.has(d.id)) APP.state.favorites.delete(d.id);
    else APP.state.favorites.add(d.id);
    APP.save();
    APP.go(location.hash);
  });
  APP.on('catQty', function (d) {
    var cur = lineQty(APP.state, d.id);
    setQty(APP.state, d.id, cur + Number(d.d));
    APP.go(location.hash);
  });
  APP.on('catGoCart', function () {
    if (APP.cartCount() === 0) return;
    APP.go('#/cart');
  });
})();
