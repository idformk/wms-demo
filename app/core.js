/* core.js — window.APP : 상태·라우터·헬퍼·탭바 (NOTES.md §5-3) */
(function () {
  'use strict';

  var LS_KEY = 'lozio.app.state';

  /* ---- BRIDGE 폴백 shim (shared/bridge.js 미로드 시) ---- */
  if (!window.BRIDGE) {
    var _o = [], _w = { type: 'CHARGE', balance: 234500, creditLimit: 5000000, creditUsed: 3240000 };
    window.BRIDGE = {
      getOrders: function () { return _o.slice(); },
      saveOrders: function (a) { _o = (a || []).slice(); return true; },
      addOrder: function (o) { o = o || {}; if (!o.no) o.no = 'AO-' + Date.now(); _o.unshift(o); return o; },
      updateOrder: function (no, p) {
        for (var i = 0; i < _o.length; i++) if (_o[i].no === no) { _o[i] = Object.assign({}, _o[i], p || {}); return _o[i]; }
        return null;
      },
      getWallet: function () { return Object.assign({}, _w); },
      saveWallet: function (w) { _w = Object.assign(_w, w || {}); return true; },
      resetDemo: function () { _o = []; return true; },
      onChange: function () {}
    };
  }

  var APP = window.APP = {};

  /* ---------------- 상태 ---------------- */
  var persisted = (function () {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; }
  })();

  APP.state = {
    loggedIn: !!persisted.loggedIn,
    firstLogin: persisted.firstLogin === undefined ? true : !!persisted.firstLogin,
    wallet: BRIDGE.getWallet(),
    cart: Array.isArray(persisted.cart) ? persisted.cart : [],
    favorites: new Set(Array.isArray(persisted.favorites) ? persisted.favorites : ['A101', 'A102', 'A103', 'F101']),
    reqDate: persisted.reqDate || null,
    readNotices: new Set(Array.isArray(persisted.readNotices) ? persisted.readNotices : []),
    ordersCache: [],
    sessionPopupShown: false,
    lastTab: '#/home'
  };

  APP.save = function () {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        loggedIn: APP.state.loggedIn,
        firstLogin: APP.state.firstLogin,
        cart: APP.state.cart,
        favorites: Array.from(APP.state.favorites),
        reqDate: APP.state.reqDate,
        readNotices: Array.from(APP.state.readNotices)
      }));
    } catch (e) { /* 저장 불가 환경 무시 */ }
  };

  APP.syncWallet = function () { APP.state.wallet = BRIDGE.getWallet(); return APP.state.wallet; };

  /* ---------------- 헬퍼 ---------------- */
  APP.won = function (n) {
    n = Number(n) || 0;
    return (n < 0 ? '-' : '') + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원';
  };
  APP.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  APP.cartCount = function () {
    return APP.state.cart.reduce(function (a, l) { return a + (l.qty || 0); }, 0);
  };
  APP.cartAmount = function () {
    return APP.state.cart.reduce(function (a, l) {
      var p = window.DATA && DATA.byId(l.id); return a + (p ? p.price * l.qty : 0);
    }, 0);
  };
  APP.allOrders = function () {
    var seed = (window.DATA && DATA.orders) ? DATA.orders : [];
    return BRIDGE.getOrders().concat(seed);
  };

  /* 오늘 16:00까지 남은 ms. 지났으면 다음 영업일(평일) 16:00 */
  APP.deadline = function () {
    var now = new Date();
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0, 0, 0);
    if (now.getTime() >= d.getTime()) {
      do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
    }
    return d.getTime() - now.getTime();
  };
  APP.hms = function (ms) {
    ms = Math.max(0, ms);
    var h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(h) + ':' + p(m) + ':' + p(s);
  };

  /* ---------------- 토스트 ---------------- */
  var toastTimer = null;
  APP.toast = function (msg) {
    var host = document.getElementById('phone');
    if (!host) return;
    var el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; host.appendChild(el); }
    el.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, 1900);
  };

  /* ---------------- 바텀시트 / 팝업 ---------------- */
  APP.sheet = function (html, opt) {
    opt = opt || {};
    APP.closeSheet();
    var host = document.getElementById('phone');
    if (!host) return;
    var scrim = document.createElement('div');
    scrim.className = 'scrim' + (opt.center ? ' center' : '');
    scrim.id = 'scrim';
    scrim.innerHTML = opt.center
      ? '<div class="popup">' + html + '</div>'
      : '<div class="sheet"><div class="grab"></div>' + html + '</div>';
    if (!opt.blocking) {
      scrim.addEventListener('click', function (e) { if (e.target === scrim) APP.closeSheet(); });
    }
    host.appendChild(scrim);
    if (typeof opt.onMount === 'function') opt.onMount(scrim);
  };
  APP.popup = function (html, opt) {
    opt = Object.assign({ center: true, blocking: true }, opt || {});
    APP.sheet(html, opt);
  };
  APP.closeSheet = function () {
    var s = document.getElementById('scrim');
    if (s && s.parentNode) s.parentNode.removeChild(s);
  };

  /* ---------------- 액션 위임 ---------------- */
  var acts = {};
  APP.on = function (name, fn) { acts[name] = fn; };
  APP.screens = {};

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    var name = t.getAttribute('data-act');
    e.preventDefault();
    if (name === 'go') { APP.go(t.getAttribute('data-to')); return; }
    if (name === 'back') { history.back(); return; }
    if (name === 'closeSheet') { APP.closeSheet(); return; }
    var fn = acts[name];
    if (typeof fn === 'function') { fn(t.dataset, t, e); }
  });

  /* ---------------- 라우팅 ---------------- */
  var ROUTES = [
    ['#/login', 'login'], ['#/home', 'home'], ['#/catalog', 'catalog'], ['#/cart', 'cart'],
    ['#/confirm', 'confirm'], ['#/done', 'done'], ['#/history', 'history'], ['#/order/:no', 'order'],
    ['#/balance', 'balance'], ['#/notice/:id', 'noticeDetail'], ['#/notice', 'notice'],
    ['#/mypage', 'mypage'], ['#/notify', 'notify']
  ];

  function match(hash) {
    hash = (hash || '#/home').split('?')[0];
    for (var i = 0; i < ROUTES.length; i++) {
      var pat = ROUTES[i][0], name = ROUTES[i][1];
      var pp = pat.split('/'), hp = hash.split('/');
      if (pp.length !== hp.length) continue;
      var params = {}, ok = true;
      for (var j = 0; j < pp.length; j++) {
        if (pp[j].charAt(0) === ':') params[pp[j].slice(1)] = decodeURIComponent(hp[j]);
        else if (pp[j] !== hp[j]) { ok = false; break; }
      }
      if (ok) return { name: name, params: params, hash: hash };
    }
    return { name: 'home', params: {}, hash: '#/home' };
  }

  APP.go = function (path) {
    if (!path) return;
    if (location.hash === path) APP.render();
    else location.hash = path;
  };

  /* ---------------- 탭바 ---------------- */
  var TABS = [
    { to: '#/home', ic: '⌂', label: '홈' },
    { to: '#/catalog', ic: '☰', label: '주문하기' },
    { to: '#/cart', ic: '🛒', label: '장바구니', badge: true },
    { to: '#/history', ic: '📄', label: '주문내역' },
    { to: '#/mypage', ic: '👤', label: '마이페이지' }
  ];
  var TABMAP = { home: '#/home', catalog: '#/catalog', cart: '#/cart', history: '#/history',
                 order: '#/history', mypage: '#/mypage', notify: '#/mypage', balance: '#/mypage' };

  function tabbarHTML(routeName) {
    var active = TABMAP[routeName] || '';
    var n = APP.cartCount();
    return '<nav class="tabbar">' + TABS.map(function (t) {
      var badge = (t.badge && n > 0) ? '<span class="tbadge">' + (n > 99 ? '99+' : n) + '</span>' : '';
      return '<button data-act="go" data-to="' + t.to + '" class="' + (t.to === active ? 'on' : '') + '">' +
        badge + '<span class="ic">' + t.ic + '</span><span>' + t.label + '</span></button>';
    }).join('') + '</nav>';
  }

  var STATUSBAR = '<div class="statusbar"><span>9:41</span><span class="sb-r">●●●● ᯤ ▮</span></div>';

  /* ---------------- 렌더 ---------------- */
  APP.current = null;

  APP.render = function () {
    var r = match(location.hash);
    if (!APP.state.loggedIn && r.name !== 'login') { location.hash = '#/login'; return; }
    if (APP.state.loggedIn && r.name === 'login') { location.hash = '#/home'; return; }

    var host = document.getElementById('phone');
    if (!host) return;
    APP.closeSheet();

    var mod = APP.screens[r.name];
    var noTabs = (r.name === 'login' || r.name === 'done');
    var body, meta;

    if (!mod || typeof mod.render !== 'function') {
      meta = { title: '준비 중', wbs: '—', hint: '이 화면 모듈(' + r.name + ')은 아직 준비 중입니다.' };
      body = '<header class="hdr"><button class="back" data-act="back">‹</button><h1>준비 중</h1><span class="rgt"></span></header>' +
             '<div class="view pad"><div class="card" style="margin-top:80px;text-align:center">' +
             '<div style="font-size:34px">🚧</div><h2 style="margin-top:10px">준비 중인 화면입니다</h2>' +
             '<p class="cap">화면 모듈 <b>' + APP.esc(r.name) + '</b> 은(는) 아직 등록되지 않았습니다.</p>' +
             '<button class="btn primary block" style="margin-top:14px" data-act="go" data-to="#/home">홈으로</button>' +
             '</div></div>';
    } else {
      meta = mod.meta || { title: r.name, wbs: '—', hint: '' };
      body = mod.render(APP.state, r.params) || '';
    }

    host.innerHTML = '<div class="screen">' + STATUSBAR + body + (noTabs ? '' : tabbarHTML(r.name)) + '</div>';
    APP.current = r;

    if (mod && typeof mod.mount === 'function') {
      try { mod.mount(host.querySelector('.screen'), APP.state, r.params); }
      catch (err) { console.error('[screen mount] ' + r.name, err); }
    }
    renderPanel(meta, r);
  };

  function renderPanel(meta, r) {
    var p = document.getElementById('panel');
    if (!p) return;
    p.innerHTML =
      '<div class="cap">지금 보는 화면</div>' +
      '<h3>' + APP.esc(meta.title) + '</h3>' +
      '<span class="wbs">' + APP.esc(meta.wbs) + '</span>' +
      '<p class="cap" style="margin-bottom:12px">라우트 <b>' + APP.esc(r.hash) + '</b></p>' +
      '<div class="hintbox">' + APP.esc(meta.hint || '') + '</div>';
  }

  /* ---------------- 부팅 ---------------- */
  window.addEventListener('hashchange', APP.render);
  window.addEventListener('DOMContentLoaded', function () {
    if (!location.hash) location.hash = APP.state.loggedIn ? '#/home' : '#/login';
    else APP.render();
  });
  if (document.readyState !== 'loading') {
    if (!location.hash) location.hash = APP.state.loggedIn ? '#/home' : '#/login';
    else APP.render();
  }
})();
