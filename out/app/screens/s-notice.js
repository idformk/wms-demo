/* s-notice.js — M8 공지 목록 · 상세 */
(function () {
  'use strict';

  var ui = { filter: '전체' };

  function kindBadge(k) {
    var c = k === '긴급' ? 'b-red' : (k === '안내' ? 'b-pri' : 'b-gray');
    return '<span class="badge ' + c + '">' + k + '</span>';
  }

  APP.screens.notice = {
    meta: {
      title: 'M8 공지 목록',
      wbs: 'M8',
      hint: '긴급 공지는 상단 고정 카드로 노출됩니다. 칩으로 유형을 필터링하고, 읽지 않은 공지는 파란 점으로 표시됩니다.'
    },
    render: function (s) {
      var list = DATA.notices;
      var urgent = list.filter(function (n) { return n.kind === '긴급'; })[0];
      var counts = { 전체: list.length, 긴급: 0, 안내: 0, 상시: 0 };
      list.forEach(function (n) { counts[n.kind] = (counts[n.kind] || 0) + 1; });
      var chips = ['전체', '긴급', '안내', '상시'].map(function (k) {
        return '<button class="chip' + (ui.filter === k ? ' on' : '') + '" data-act="ntFilter" data-k="' + k + '">' + k + ' ' + counts[k] + '</button>';
      }).join('');
      var filtered = list.filter(function (n) { return ui.filter === '전체' || n.kind === ui.filter; });

      var urgentCard = urgent ? '' +
        '<button class="ucard" data-act="go" data-to="#/notice/' + urgent.id + '">' +
          '<div class="ucard-top"><span class="tag-urgent">지금 확인</span>' + kindBadge('긴급') + '</div>' +
          '<h2>' + APP.esc(urgent.title) + '</h2>' +
          '<p class="ucard-body">' + APP.esc(urgent.body.split('\n')[0]) + '</p>' +
          '<div class="ucard-bot"><span class="cap">' + urgent.date.replace(/-/g, '.') + '</span><span class="more">전문 보기 →</span></div>' +
        '</button>' : '';

      var rows = filtered.map(function (n) {
        var unread = !s.readNotices.has(n.id);
        return '<button class="row" data-act="go" data-to="#/notice/' + n.id + '">' +
          kindBadge(n.kind) +
          '<span class="g"><span class="tt">' + APP.esc(n.title) + '</span></span>' +
          (unread ? '<span class="dot" style="margin-right:6px"></span>' : '') +
          '<span class="rt">' + n.date.replace(/-/g, '.') + '</span>' +
        '</button>';
      }).join('');

      return '' +
      '<header class="hdr"><button class="back" data-act="back">‹</button><h1>공지사항</h1><span class="rgt"></span></header>' +
      '<div class="view pad">' +
        urgentCard +
        '<div class="chips">' + chips + '</div>' +
        '<div class="rows">' + (rows || '<div class="row"><span class="g cap">공지가 없습니다</span></div>') + '</div>' +
      '</div>';
    }
  };

  APP.on('ntFilter', function (d) { ui.filter = d.k; APP.render(); });

  APP.screens.noticeDetail = {
    meta: {
      title: 'M8 공지 상세',
      wbs: 'M8',
      hint: '진입 시 자동으로 읽음 처리됩니다(파란 점 사라짐). 변경 사항이 있는 공지는 요약 박스가 함께 노출됩니다.'
    },
    render: function (s, params) {
      var n = DATA.notices.filter(function (x) { return x.id === params.id; })[0];
      if (!n) {
        return '<header class="hdr"><button class="back" data-act="back">‹</button><h1>공지</h1><span class="rgt"></span></header>' +
          '<div class="view pad"><div class="card" style="margin-top:60px;text-align:center">공지를 찾을 수 없습니다.</div></div>';
      }
      var paras = n.body.split('\n').map(function (p) { return '<p>' + APP.esc(p) + '</p>'; }).join('');
      var summary = Array.isArray(n.summary) && n.summary.length
        ? '<div class="sumbox"><div class="sumbox-t">변경 사항 요약</div><ul>' +
            n.summary.map(function (x) { return '<li>' + APP.esc(x) + '</li>'; }).join('') +
          '</ul></div>' : '';
      return '' +
      '<header class="hdr"><button class="back" data-act="back">‹</button><h1>공지사항</h1><span class="rgt"></span></header>' +
      '<div class="view pad">' +
        '<div class="card">' +
          '<div class="ndet-top">' + kindBadge(n.kind) + '<span class="cap">' + n.date.replace(/-/g, '.') + ' · 본사</span></div>' +
          '<h2 class="ndet-title">' + APP.esc(n.title) + '</h2>' +
          summary +
          '<div class="ndet-body">' + paras + '</div>' +
        '</div>' +
        '<p class="cap" style="text-align:center;margin-top:16px">문의: 본사 운영팀 (평일 09:00–18:00)</p>' +
      '</div>';
    },
    mount: function (el, s, params) {
      if (!s.readNotices.has(params.id)) {
        s.readNotices.add(params.id);
        APP.save();
      }
    }
  };
})();
