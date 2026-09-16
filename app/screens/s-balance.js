/* s-balance.js — M7 잔액 · 거래 내역 */
(function () {
  'use strict';

  var ui = { filter: '전체' };

  function txKind(k) {
    if (k === '충전') return { ic: '💰', cls: 'b-green' };
    if (k === '조정') return { ic: '🔧', cls: 'b-orange' };
    return { ic: '🧾', cls: 'b-pri' };
  }

  function allTx() {
    var seed = (DATA.transactions || []).map(function (t) { return Object.assign({}, t); });
    var appTx = BRIDGE.getOrders()
      .filter(function (o) { return o.source === 'APP' && o.st !== 'CANCELLED'; })
      .map(function (o) {
        return { date: o.date, kind: '발주 사용', memo: o.no, amt: -(o.amt || 0), bal: null };
      });
    var merged = seed.concat(appTx);
    merged.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    return merged;
  }

  function avgOrderCount(balance) {
    var seed = DATA.transactions.filter(function (t) { return t.kind === '발주 사용'; });
    if (!seed.length) return 0;
    var avg = seed.reduce(function (a, t) { return a + Math.abs(t.amt); }, 0) / seed.length;
    if (!avg) return 0;
    return Math.max(0, Math.round(balance / avg));
  }

  function chargeCard(w) {
    var n = avgOrderCount(w.balance);
    return '' +
      '<div class="wcard wcard-blue">' +
        '<div class="wc-top"><span>충전 잔액</span><span class="badge b-white">충전형</span></div>' +
        '<div class="wc-amt">' + APP.won(w.balance) + '</div>' +
        '<div class="wc-sub">발주 약 <b>' + n + '</b>회 정도 가능 (지난 30일 평균)</div>' +
        '<div class="wc-va">' +
          '<span class="g"><span class="cap-w">전용 가상계좌</span><b>***-***-4567 (입금 전용)</b></span>' +
          '<button class="btn sm ghost-w" data-act="balCopy">복사</button>' +
        '</div>' +
        '<button class="btn block wc-cta" data-act="go" data-to="#/cart">충전하기</button>' +
      '</div>';
  }

  function creditCard(w) {
    var pct = w.creditLimit ? Math.min(100, Math.round(w.creditUsed / w.creditLimit * 100)) : 0;
    var avail = Math.max(0, w.creditLimit - w.creditUsed);
    return '' +
      '<div class="wcard wcard-green">' +
        '<div class="wc-top"><span>외상 잔액</span><span class="badge b-white">후입금</span></div>' +
        '<div class="wc-amt">' + APP.won(w.creditUsed) + '</div>' +
        '<div class="wc-sub">한도 사용률 <b>' + pct + '%</b></div>' +
        '<div class="wc-limbar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="wc-va"><span class="g"><span class="cap-w">가용 한도</span><b>' + APP.won(avail) + '</b></span></div>' +
      '</div>';
  }

  function breakdown(w) {
    var settled = 0, transit = Math.round(w.creditUsed * 0.18), adj = 7900;
    var used = w.type === 'CREDIT' ? w.creditUsed : w.balance;
    var rows = [
      ['여신 한도', w.creditLimit],
      ['배송 완료 미정산', Math.max(0, w.creditUsed - transit)],
      ['배송 예정(배송 중)', transit],
      ['반품/조정', -adj],
      ['외상 잔액', w.creditUsed]
    ];
    return '' +
      '<div class="card">' +
        '<h2>잔액 구성 · VAT 포함</h2>' +
        '<div class="bkrows">' + rows.map(function (r) {
          return '<div class="bkrow"><span>' + r[0] + '</span><span class="num' + (r[1] < 0 ? ' neg' : '') + '">' + APP.won(r[1]) + '</span></div>';
        }).join('') + '</div>' +
      '</div>';
  }

  function txRow(t) {
    var k = txKind(t.kind);
    var sign = t.amt >= 0 ? '+' : '';
    return '<div class="row">' +
      '<span class="txic ' + k.cls + '">' + k.ic + '</span>' +
      '<span class="g"><span class="tt">' + APP.esc(t.kind) + '</span><span class="st">' + APP.esc(t.memo || '') + ' · ' + t.date.slice(5).replace('-', '.') + '</span></span>' +
      '<span class="rt num ' + (t.amt < 0 ? 'neg' : 'pos') + '">' + sign + APP.won(t.amt) + '</span>' +
    '</div>';
  }

  APP.screens.balance = {
    meta: {
      title: 'M7 잔액·거래 내역',
      wbs: 'M7A/B',
      hint: '결제 유형(충전형/후입금)에 따라 카드가 바뀝니다. 마이페이지의 [결제 유형 전환] 스위치로 시연 전환할 수 있습니다.'
    },
    render: function (s) {
      var w = s.wallet;
      var card = w.type === 'CREDIT' ? creditCard(w) : chargeCard(w);
      var tx = allTx();
      var kinds = ['전체', '발주', '충전', '조정'];
      var chips = kinds.map(function (k) {
        return '<button class="chip' + (ui.filter === k ? ' on' : '') + '" data-act="balFilter" data-k="' + k + '">' + k + '</button>';
      }).join('');
      var list = tx.filter(function (t) {
        if (ui.filter === '전체') return true;
        if (ui.filter === '발주') return t.kind === '발주 사용';
        return t.kind === ui.filter;
      });
      return '' +
      '<header class="hdr"><button class="back" data-act="back">‹</button><h1>잔액 · 거래 내역</h1><span class="rgt"></span></header>' +
      '<div class="view pad">' +
        card +
        (w.type === "CREDIT" ? breakdown(w) : "") +
        '<div class="sec-t"><h2>거래 내역</h2></div>' +
        '<div class="chips">' + chips + '</div>' +
        '<div class="rows">' + (list.length ? list.map(txRow).join('') : '<div class="row"><span class="g cap">해당 내역이 없습니다</span></div>') + '</div>' +
      '</div>';
    }
  };

  APP.on('balFilter', function (d) { ui.filter = d.k; APP.render(); });
  APP.on('balCopy', function () { APP.toast('계좌번호가 복사되었습니다'); });
})();
