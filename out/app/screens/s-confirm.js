/* s-confirm.js — M5 발주 확정 / M5C 완료 */
(function () {
  'use strict';

  function cartLines() {
    return APP.state.cart.map(function (l) {
      var p = window.DATA && DATA.byId(l.id);
      if (!p) return null;
      var amt = p.price * l.qty;
      return { id: p.id, name: p.name, unit: p.unit, qty: l.qty, price: p.price, amt: amt };
    }).filter(Boolean);
  }

  function subtotal(lines) { return lines.reduce(function (a, l) { return a + l.amt; }, 0); }
  function vat(sub) { return Math.round(sub * 0.1); }
  function tomorrow() {
    var d = new Date(); d.setDate(d.getDate() + 1);
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function ceilTo10000(n) { return Math.ceil(n / 10000) * 10000; }

  var timer = null;

  APP.screens.confirm = {
    meta: {
      title: 'M5 발주 확정',
      wbs: 'M5',
      hint: '결제 유형(충전형/후입금)에 따라 잔액 차감 미리보기 또는 여신 한도 사용 현황이 달라집니다. 부족·초과 시 확정 버튼이 막히거나 충전 시트로 이동합니다.'
    },
    render: function (s) {
      var lines = cartLines();
      var sub = subtotal(lines);
      var vt = vat(sub);
      var total = sub + vt;
      var w = APP.syncWallet();
      var isCredit = w.type === 'CREDIT';

      var chip = '<span class="badge ' + (isCredit ? 'b-orange' : 'b-pri') + '">' +
        (isCredit ? '후입금 결제' : '충전형 결제') + '</span>';

      var itemsHtml = lines.map(function (l) {
        return '<div class="row" style="padding:10px 0;border-bottom:1px solid #F1F3F6">' +
          '<span class="g"><span class="tt">' + APP.esc(l.name) + '</span>' +
          '<span class="st">' + l.qty + APP.esc(l.unit) + ' · ' + APP.won(l.price) + '</span></span>' +
          '<span class="rt">' + APP.won(l.amt) + '</span></div>';
      }).join('');

      var walletBlock = '', ctaDisabled = '', ctaLabel = '발주 확정하기 · ' + APP.won(total);
      var ctaAct = 'confirmSubmit';

      if (!isCredit) {
        var after = w.balance - total;
        var short = total - w.balance;
        walletBlock =
          '<div class="card">' +
            '<h2>충전 잔액 → 결제 후 잔액</h2>' +
            '<div class="bar" style="background:#EEF2F7">' +
              '<i style="width:' + Math.max(0, Math.min(100, (Math.max(after, 0) / Math.max(w.balance, total, 1)) * 100)).toFixed(1) + '%;background:var(--pri)"></i>' +
            '</div>' +
            '<div class="row" style="padding-top:10px"><span class="g cap">현재 잔액</span><span class="rt">' + APP.won(w.balance) + '</span></div>' +
            '<div class="row"><span class="g cap">결제 후 잔액</span><span class="rt" style="font-weight:700;color:' + (after < 0 ? 'var(--red)' : 'var(--t1)') + '">' + APP.won(after) + '</span></div>' +
          '</div>';

        if (w.balance < total) {
          walletBlock += '<div class="card" style="border:1px solid #FCA5A5;background:#FEF2F2">' +
            '<span class="badge b-red">잔액 부족</span>' +
            '<h2 style="margin-top:8px;color:#B91C1C">충전 잔액이 부족합니다</h2>' +
            '<div class="row"><span class="g cap">잔액</span><span class="rt">' + APP.won(w.balance) + '</span></div>' +
            '<div class="row"><span class="g cap">이번 발주</span><span class="rt">' + APP.won(total) + '</span></div>' +
            '<div class="row"><span class="g cap">부족 금액</span><span class="rt" style="color:#B91C1C;font-weight:700">' + APP.won(short) + '</span></div>' +
          '</div>';
          ctaLabel = APP.won(ceilTo10000(short)) + ' 충전하기';
          ctaAct = 'confirmCharge';
        }
      } else {
        var used = w.creditUsed, limit = w.creditLimit;
        var afterUsed = used + total;
        var over = afterUsed - limit;
        var pctUsed = Math.min(100, used / limit * 100);
        var pctThis = Math.min(100 - pctUsed, total / limit * 100);
        walletBlock =
          '<div class="card">' +
            '<h2>여신 한도 사용</h2>' +
            '<div class="bar" style="background:#EEF2F7">' +
              '<i style="width:' + pctUsed.toFixed(1) + '%;background:var(--t3)"></i>' +
              '<i style="left:' + pctUsed.toFixed(1) + '%;width:' + pctThis.toFixed(1) + '%;background:' + (afterUsed > limit ? 'var(--red)' : 'var(--pri)') + '"></i>' +
            '</div>' +
            '<div class="row" style="padding-top:10px"><span class="g cap">기사용</span><span class="rt">' + APP.won(used) + '</span></div>' +
            '<div class="row"><span class="g cap">이번 발주</span><span class="rt">' + APP.won(total) + '</span></div>' +
            '<div class="row"><span class="g cap">한도</span><span class="rt">' + APP.won(limit) + '</span></div>' +
          '</div>';
        if (afterUsed > limit) {
          walletBlock += '<div class="card" style="border:1px solid #FCA5A5;background:#FEF2F5">' +
            '<span class="badge b-red">한도 초과</span>' +
            '<p style="margin:10px 0 0;font-size:14px;color:#B91C1C;line-height:1.5">한도를 ' + APP.won(over) + ' 초과합니다 — 본사 정산이 완료되거나 일부 입금 후 다시 시도하세요.</p>' +
          '</div>';
          ctaDisabled = 'disabled';
        } else {
          walletBlock += '<div class="card" style="border:1px solid #86EFAC;background:#F0FDF4">' +
            '<span class="badge b-green">한도 내 정상 진행</span>' +
            '<p style="margin:10px 0 0;font-size:14px;color:#15803D">가용 ' + APP.won(limit - afterUsed) + '</p>' +
          '</div>';
        }
      }

      var reqDate = s.reqDate || tomorrow();

      return '' +
      '<header class="hdr"><button class="back" data-act="back">‹</button><h1>발주 확정</h1><span class="rgt"></span></header>' +
      '<div class="view pad">' +
        '<div class="row" style="padding:12px 0 0"><span class="g">' + chip + '</span>' +
          '<span class="rt" id="cfDeadline">마감까지 --:--</span></div>' +

        '<div class="card">' +
          '<h2>' + APP.esc((window.DATA && DATA.store.name) || '') + ' · ' + lines.length + '건</h2>' +
          '<div style="font-size:28px;font-weight:800;margin:4px 0 10px">' + APP.won(total) + '</div>' +
          itemsHtml +
          '<div class="row" style="padding-top:10px"><span class="g cap">공급가</span><span class="rt">' + APP.won(sub) + '</span></div>' +
          '<div class="row"><span class="g cap">부가세(10%)</span><span class="rt">' + APP.won(vt) + '</span></div>' +
        '</div>' +

        walletBlock +

        '<div class="card">' +
          '<div class="row"><span class="g cap">배송 요청일</span><span class="rt">' + reqDate + '</span></div>' +
          '<div class="row"><span class="g cap">배송지</span><span class="rt">' + APP.esc((window.DATA && DATA.store.name) || '') + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="btnbar"><button class="btn primary block" data-act="' + ctaAct + '" ' + ctaDisabled + '>' + ctaLabel + '</button></div>';
    },
    mount: function (el) {
      clearInterval(timer);
      var dd = el.querySelector('#cfDeadline');
      var tick = function () {
        if (!document.body.contains(dd)) { clearInterval(timer); return; }
        dd.textContent = '마감까지 ' + APP.hms(APP.deadline()).slice(0, 5);
      };
      tick();
      timer = setInterval(tick, 1000);
    }
  };

  APP.on('confirmCharge', function () {
    var w = APP.syncWallet();
    var lines = cartLines();
    var total = subtotal(lines) + vat(subtotal(lines));
    var short = ceilTo10000(total - w.balance);
    APP.sheet(
      '<h2>가상계좌 입금 안내</h2>' +
      '<p class="cap" style="margin-bottom:14px">아래 전용 가상계좌로 ' + APP.won(short) + ' 이상 입금해 주세요. (시연 화면에서는 입금 확인 버튼으로 즉시 반영됩니다.)</p>' +
      '<div class="card flat" style="margin-top:0">' +
        '<div class="row"><span class="g cap">전용 가상계좌</span><span class="rt" style="font-weight:700">***-***-4567 (전용 가상계좌)</span></div>' +
        '<div class="row"><span class="g cap">입금 필요 금액</span><span class="rt">' + APP.won(short) + '</span></div>' +
      '</div>' +
      '<button class="btn primary block" style="margin-top:14px" data-act="confirmChargeDone" data-amt="' + short + '">입금 완료(시연)</button>'
    );
  });

  APP.on('confirmChargeDone', function (d) {
    var w = APP.syncWallet();
    var amt = Number(d.amt) || 0;
    BRIDGE.saveWallet({ balance: w.balance + amt });
    APP.syncWallet();
    APP.closeSheet();
    APP.toast('입금이 확인됐어요 · ' + APP.won(amt) + ' 충전');
    APP.render();
  });

  APP.on('confirmSubmit', function () {
    var lines = cartLines();
    if (!lines.length) { APP.toast('장바구니가 비어 있습니다'); return; }
    var sub = subtotal(lines), vt = vat(sub), total = sub + vt;
    var w = APP.syncWallet();
    var store = (window.DATA && DATA.store) || {};
    var reqDate = APP.state.reqDate || tomorrow();

    var order = {
      items: lines.map(function (l) { return { name: l.name, unit: l.unit, qty: l.qty, price: l.price, amt: l.amt }; }),
      req: reqDate,
      amt: total,
      msg: '',
      st: 'ORDER',
      source: 'APP',
      store: store.name,
      storeCode: store.partnerCode
    };

    if (w.type === 'CREDIT') {
      var afterUsed = w.creditUsed + total;
      if (afterUsed > w.creditLimit) { APP.toast('한도를 초과하여 진행할 수 없습니다'); return; }
    } else {
      if (w.balance < total) { APP.toast('잔액이 부족합니다'); return; }
    }

    var saved = BRIDGE.addOrder(order);

    var before, after;
    if (w.type === 'CREDIT') {
      before = w.creditUsed;
      after = w.creditUsed + total;
      BRIDGE.saveWallet({ creditUsed: after });
    } else {
      before = w.balance;
      after = w.balance - total;
      BRIDGE.saveWallet({ balance: after });
    }
    APP.syncWallet();

    APP.state.cart = [];
    APP.save();

    APP.go('#/done?no=' + encodeURIComponent(saved.no) + '&before=' + before + '&after=' + after + '&type=' + w.type);
  });

  /* -------- M5C 완료 -------- */
  function qparams() {
    var q = (location.hash.split('?')[1] || '');
    var out = {};
    q.split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      out[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
    });
    return out;
  }

  APP.screens.done = {
    meta: { title: 'M5C 완료', wbs: 'M5C', hint: '주문 확정 완료 화면입니다. [주문내역]으로 방금 만든 주문을, [홈으로]로 홈 화면을 확인할 수 있습니다.' },
    render: function () {
      var q = qparams();
      var no = q.no || '';
      var order = BRIDGE.getOrders().filter(function (o) { return o.no === no; })[0];
      var amt = order ? order.amt : (Number(q.after) - Number(q.before)) * -1;
      var before = Number(q.before) || 0, after = Number(q.after) || 0;
      var isCredit = q.type === 'CREDIT';

      var receipt = isCredit
        ? '<div class="row"><span class="g cap">한도 사용(전)</span><span class="rt">' + APP.won(before) + '</span></div>' +
          '<div class="row"><span class="g cap">한도 사용(후)</span><span class="rt">' + APP.won(after) + '</span></div>'
        : '<div class="row"><span class="g cap">잔액(전 → 후)</span><span class="rt">' + APP.won(before) + ' → ' + APP.won(after) + '</span></div>';

      return '' +
      '<div class="view pad" style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:60px">' +
        '<div style="width:74px;height:74px;border-radius:50%;background:var(--pri);color:#fff;display:flex;align-items:center;justify-content:center;font-size:38px">✓</div>' +
        '<h2 style="margin:18px 0 6px;font-size:21px;font-weight:800">주문이 확정됐어요</h2>' +
        '<p class="cap" style="line-height:1.6">명일 도착 예정이에요.<br>출고가 완료되면 다시 알려드릴게요.</p>' +
        '<div class="card" style="width:100%;text-align:left">' +
          '<div class="row"><span class="g cap">주문번호</span><span class="rt" style="font-weight:700">' + APP.esc(no) + '</span></div>' +
          '<div class="row"><span class="g cap">결제 금액</span><span class="rt">' + APP.won(amt) + '</span></div>' +
          receipt +
        '</div>' +
        '<div style="display:flex;gap:8px;width:100%;margin-top:16px">' +
          '<button class="btn ghost block" data-act="go" data-to="#/history">주문내역</button>' +
          '<button class="btn primary block" data-act="go" data-to="#/home">홈으로</button>' +
        '</div>' +
      '</div>';
    }
  };
})();
