/* s-home.js — M2 홈 */
(function () {
  'use strict';

  var timer = null;

  function today() {
    var d = new Date(), w = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' · ' + w + '요일';
  }

  /* 09:00 → 18:00 축에서의 현재 시각 위치(%) — 마감 16:00 마커는 77.8% */
  var MARK = (960 - 540) / (1080 - 540) * 100;
  function progress() {
    var now = new Date();
    var mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    return Math.max(0, Math.min(100, (mins - 540) / (1080 - 540) * 100));
  }

  function kindBadge(k) {
    var c = k === '긴급' ? 'b-red' : (k === '안내' ? 'b-pri' : 'b-gray');
    return '<span class="badge ' + c + '">' + k + '</span>';
  }

  APP.screens.home = {
    meta: {
      title: 'M2 홈',
      wbs: 'M2',
      hint: '발주 마감(16:00) 카운트다운이 실시간으로 갱신됩니다. [발주 시작하기]로 상품 리스트(M3)로 이동하고, 2×2 바로가기·공지·자주 찾는 상품이 이어집니다.'
    },
    render: function (s) {
      var d = DATA;
      var univ = d.products.filter(function (p) { return p.type === '범용'; }).length;
      var fav = s.favorites.size;
      var ing = APP.allOrders().filter(function (o) { return o.st === 'ORDER'; }).length;
      var cn = APP.cartCount(), ca = APP.cartAmount();
      var pr = progress();

      var notices = d.notices.slice(0, 4).map(function (n) {
        return '<button class="row" data-act="go" data-to="#/notice/' + n.id + '">' +
          kindBadge(n.kind) +
          '<span class="g"><span class="tt">' + APP.esc(n.title) + '</span></span>' +
          '<span class="rt">' + n.date.slice(5).replace('-', '.') + '</span></button>';
      }).join('');

      var favRows = Array.from(s.favorites).slice(0, 3).map(function (id) {
        var p = d.byId(id);
        if (!p) return '';
        return '<button class="row" data-act="go" data-to="#/catalog">' +
          '<span class="dot"></span>' +
          '<span class="g"><span class="tt">' + APP.esc(p.name) + ' <span class="muted">' + APP.esc(p.spec) + '</span></span>' +
          '<span class="st">' + APP.won(p.price) + ' · ' + APP.esc(p.unit) + '</span></span>' +
          '<span class="arw">›</span></button>';
      }).join('');

      return '' +
      '<header class="hdr" style="padding:0 16px">' +
        '<span class="g" style="flex:1;text-align:left">' +
          '<span class="cap" style="display:block;line-height:1.2">접속 매장</span>' +
          '<b style="font-size:16px">' + APP.esc(d.store.name) + '</b>' +
        '</span>' +
        '<button class="rgt" data-act="go" data-to="#/notify" style="font-size:19px">🔔</button>' +
      '</header>' +
      '<div class="view pad">' +

        '<div class="hero">' +
          '<div class="hrow"><span>' + today() + '</span><span class="hpill">영업 중</span></div>' +
          '<h2>오늘 발주를<br>시작해 볼까요?</h2>' +
          '<div class="bar"><i id="hBar" style="width:' + pr.toFixed(1) + '%"></i><span class="mk" style="left:' + MARK.toFixed(1) + '%"></span></div>' +
          '<div class="scale"><span>09:00</span><span id="hCd">마감 16:00 · --:--:--</span><span>18:00</span></div>' +
          '<button class="cta" data-act="go" data-to="#/catalog"><span>발주 시작하기</span><span>→</span></button>' +
        '</div>' +

        '<div class="grid2">' +
          '<button class="qbox" data-act="go" data-to="#/catalog"><div class="qic">📋</div>' +
            '<div class="qt">상품 리스트</div><div class="qs">범용 <b>' + univ + '</b></div></button>' +
          '<button class="qbox" data-act="go" data-to="#/catalog"><div class="qic">⭐</div>' +
            '<div class="qt">자주 찾는 상품</div><div class="qs"><b>' + fav + '</b>개 등록</div></button>' +
          '<button class="qbox" data-act="go" data-to="#/history"><div class="qic">🧾</div>' +
            '<div class="qt">주문내역</div><div class="qs">진행중 <b>' + ing + '</b>건</div></button>' +
          '<button class="qbox" data-act="go" data-to="#/cart"><div class="qic">🛒</div>' +
            '<div class="qt">장바구니</div><div class="qs"><b>' + cn + '</b>개 · ' + APP.won(ca) + '</div></button>' +
        '</div>' +

        '<div class="sec-t"><h2>공지</h2><button class="more" data-act="go" data-to="#/notice">더 보기 ›</button></div>' +
        '<div class="rows">' + notices + '</div>' +

        '<div class="sec-t"><h2>자주 찾는 상품</h2><button class="more" data-act="go" data-to="#/catalog">전체 ' + fav + ' ›</button></div>' +
        '<div class="rows">' + (favRows || '<div class="row"><span class="g cap">등록된 상품이 없습니다</span></div>') + '</div>' +

      '</div>';
    },
    mount: function (el, s) {
      clearInterval(timer);
      var cd = el.querySelector('#hCd'), bar = el.querySelector('#hBar');
      var tick = function () {
        if (!document.body.contains(cd)) { clearInterval(timer); return; }
        cd.textContent = '마감 16:00 · ' + APP.hms(APP.deadline());
        bar.style.width = progress().toFixed(1) + '%';
      };
      tick();
      timer = setInterval(tick, 1000);

      // 긴급 공지 팝업: 세션 1회 (로그인 시 이미 읽음 확인했으면 생략)
      var n = DATA.notices[0];
      if (!s.sessionPopupShown && !s.readNotices.has(n.id)) {
        s.sessionPopupShown = true;
        setTimeout(function () {
          APP.popup(
            '<span class="badge b-red">긴급 공지</span>' +
            '<h2>' + APP.esc(n.title) + '</h2>' +
            '<p>' + APP.esc(n.body) + '</p>' +
            '<button class="btn primary block" data-act="homeNoticeOk" data-id="' + n.id + '">확인</button>' +
            '<div class="skip"><button data-act="closeSheet">오늘 그만 보기</button></div>'
          );
        }, 250);
      }
    }
  };

  APP.on('homeNoticeOk', function (d) {
    APP.state.readNotices.add(d.id);
    APP.save();
    APP.closeSheet();
  });
})();
