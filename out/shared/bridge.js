/* shared/bridge.js — localStorage 브리지 (점주 앱 ↔ WMS 데이터 연결)
   같은 origin(GitHub Pages)에서 양쪽 페이지가 공유하는 데모 데이터 저장소.
   외부 CDN·네트워크 의존 없음. 모든 storage 접근은 try/catch로 방어. */
(function () {
  'use strict';

  var KEY_ORDERS = 'lozio.orders';
  var KEY_WALLET = 'lozio.wallet';

  var DEFAULT_WALLET = { type: 'CHARGE', balance: 234500, creditLimit: 5000000, creditUsed: 3240000 };

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }

  function readJSON(key, fallback) {
    var raw = safeGet(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { return safeSet(key, JSON.stringify(val)); } catch (e) { return false; }
  }

  function pad(n, w) { return String(n).padStart(w, '0'); }

  // AO-yyMMdd + 4자리 시퀀스 (같은 날짜 내 기존 주문 수 기준으로 증가)
  function genOrderNo(existing) {
    var now = new Date();
    var ymd = pad(now.getFullYear() % 100, 2) + pad(now.getMonth() + 1, 2) + pad(now.getDate(), 2);
    var prefix = 'AO-' + ymd;
    var seq = 1;
    try {
      var sameDay = (existing || []).filter(function (o) { return o && typeof o.no === 'string' && o.no.indexOf(prefix) === 0; });
      seq = sameDay.length + 1;
    } catch (e) { seq = 1; }
    return prefix + pad(seq, 4);
  }

  function getOrders() {
    var arr = readJSON(KEY_ORDERS, []);
    return Array.isArray(arr) ? arr : [];
  }

  function saveOrders(arr) {
    return writeJSON(KEY_ORDERS, Array.isArray(arr) ? arr : []);
  }

  function addOrder(o) {
    var orders = getOrders();
    var order = Object.assign({
      source: 'APP',
      store: '다람쥐분식 강남점',
      storeCode: 'S10042',
      date: null,
      req: null,
      amt: 0,
      msg: '',
      items: [],
      st: 'ORDER',
      confirmed: null,
      by: null,
      shortage: [],
    }, o || {});
    if (!order.no) order.no = genOrderNo(orders);
    if (!order.date) {
      var d = new Date();
      order.date = d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
    }
    orders.unshift(order);
    saveOrders(orders);
    return order;
  }

  function updateOrder(no, patch) {
    var orders = getOrders();
    var idx = -1;
    for (var i = 0; i < orders.length; i++) { if (orders[i] && orders[i].no === no) { idx = i; break; } }
    if (idx === -1) return null;
    orders[idx] = Object.assign({}, orders[idx], patch || {});
    saveOrders(orders);
    return orders[idx];
  }

  function getWallet() {
    var w = readJSON(KEY_WALLET, null);
    if (!w || typeof w !== 'object') return Object.assign({}, DEFAULT_WALLET);
    return Object.assign({}, DEFAULT_WALLET, w);
  }

  function saveWallet(w) {
    return writeJSON(KEY_WALLET, Object.assign({}, DEFAULT_WALLET, w || {}));
  }

  function resetDemo() {
    try { window.localStorage.removeItem(KEY_ORDERS); } catch (e) {}
    try { window.localStorage.removeItem(KEY_WALLET); } catch (e) {}
    return true;
  }

  var changeHandlers = [];
  function onChange(fn) {
    if (typeof fn !== 'function') return;
    changeHandlers.push(fn);
  }
  try {
    window.addEventListener('storage', function (e) {
      if (!e || (e.key !== KEY_ORDERS && e.key !== KEY_WALLET)) return;
      changeHandlers.forEach(function (fn) {
        try { fn(e); } catch (err) {}
      });
    });
  } catch (e) {}

  window.BRIDGE = {
    getOrders: getOrders,
    saveOrders: saveOrders,
    addOrder: addOrder,
    updateOrder: updateOrder,
    getWallet: getWallet,
    saveWallet: saveWallet,
    resetDemo: resetDemo,
    onChange: onChange,
  };
})();
