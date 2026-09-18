/* wbs/app.js — WBS 뷰어 로직 (실물 산출물 뷰어). 데이터는 있는 그대로 표시, 재구성/신규 수치 생성 없음. */
(function () {
  'use strict';

  var DATA = null;
  var els = {};

  var state = {
    specs: { cat: null, q: '' },
    pages: { pri: null, domain: '', q: '' },
    track: { cat: null, st: null, q: '', collapsed: {} },
    openRow: { specs: null, pages: null, track: null }
  };

  // ---------- 유틸 ----------
  function esc(s) {
    if (s === null || s === undefined) { return ''; }
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function slug(s) {
    return String(s || '').replace(/[^0-9A-Za-z가-힣]/g, '');
  }
  function nl2br(s) {
    return esc(s);
  }

  function byId(id) { return document.getElementById(id); }

  // ---------- 배너/데이터 로드 ----------
  function showNotice(msg) {
    var n = byId('fetchNotice');
    n.textContent = msg;
    n.classList.add('show');
  }

  function boot(data) {
    DATA = data;
    render_summary();
    render_specs();
    render_pages();
    render_track();
    bindTabs();
    bindFilters();
    window.addEventListener('hashchange', routeFromHash);
    routeFromHash();
  }

  function init() {
    // file:// 에서는 fetch가 실패하므로 wbs-data.js(window.WBS_DATA)로 폴백
    if (location.protocol === 'file:') {
      if (window.WBS_DATA) {
        boot(window.WBS_DATA);
      } else {
        showNotice('이 페이지는 로컬 파일(file://)에서 데이터를 불러오지 못했습니다. wbs-data.js 로드에 실패했습니다.');
      }
      return;
    }
    fetch('wbs-data.json')
      .then(function (r) {
        if (!r.ok) { throw new Error('http ' + r.status); }
        return r.json();
      })
      .then(boot)
      .catch(function () {
        if (window.WBS_DATA) {
          boot(window.WBS_DATA);
        } else {
          showNotice('데이터를 불러오지 못했습니다. http(s) 또는 GitHub Pages로 열어주세요.');
        }
      });
  }

  // ---------- 요약 ----------
  function render_summary() {
    var c = DATA.meta.counts;
    byId('sumSpecs').textContent = c.specs;
    byId('sumPages').textContent = c.pages;
    byId('sumTrack').textContent = c.track;
    byId('sumDone').textContent = c.done;
    byId('tabCntSpecs').textContent = '(' + c.specs + ')';
    byId('tabCntPages').textContent = '(' + c.pages + ')';
    byId('tabCntTrack').textContent = '(' + c.track + ')';
    byId('srcNote').textContent =
      '원본: ' + DATA.meta.file + ' · 기준 ' + DATA.meta.asof + ' · 연계 대행사·금액 마스킹';
  }

  // ---------- 탭 ----------
  function bindTabs() {
    var btns = document.querySelectorAll('.tab-btn');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        location.hash = '#/' + b.getAttribute('data-tab');
      });
    });
  }

  function setActiveTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    document.querySelectorAll('.tabpanel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'panel-' + tab);
    });
  }

  // ---------- 라우팅 ----------
  function routeFromHash() {
    var h = location.hash.replace(/^#\/?/, ''); // "specs/S-40" 등
    var parts = h.split('/').filter(Boolean);
    var tab = parts[0] || 'specs';
    if (['specs', 'pages', 'track'].indexOf(tab) === -1) { tab = 'specs'; }
    setActiveTab(tab);
    var id = parts[1] ? decodeURIComponent(parts[1]) : null;
    if (id) {
      jumpTo(tab, id);
    }
  }

  function jumpTo(tab, id) {
    // 펼침 + 스크롤 + 하이라이트
    setTimeout(function () {
      var sel = '.row[data-key="' + cssEscape(id) + '"]';
      var panel = byId('panel-' + tab);
      if (!panel) { return; }
      var row = panel.querySelector(sel);
      if (!row) { return; }
      openRow(tab, row, id);
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      row.classList.add('highlight');
      setTimeout(function () { row.classList.remove('highlight'); }, 1700);
    }, 30);
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) { return CSS.escape(s); }
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  // ---------- 확정 사양 탭 ----------
  function render_specs() {
    var cats = {};
    DATA.specs.forEach(function (s) { cats[s.cat] = (cats[s.cat] || 0) + 1; });
    var chipsHtml = '<span class="chip' + (state.specs.cat === null ? ' active' : '') + '" data-cat="">전체 <span class="c">' + DATA.specs.length + '</span></span>';
    Object.keys(cats).forEach(function (c) {
      chipsHtml += '<span class="chip' + (state.specs.cat === c ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + ' <span class="c">' + cats[c] + '</span></span>';
    });
    byId('specsCatChips').innerHTML = chipsHtml;
    byId('specsCatChips').querySelectorAll('.chip').forEach(function (ch) {
      ch.addEventListener('click', function () {
        state.specs.cat = ch.getAttribute('data-cat') || null;
        render_specs();
      });
    });

    var q = state.specs.q.trim().toLowerCase();
    var list = DATA.specs.filter(function (s) {
      if (state.specs.cat && s.cat !== state.specs.cat) { return false; }
      if (q) {
        var hay = (s.id + ' ' + s.body + ' ' + s.pages).toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    });

    byId('specsResultCnt').textContent = list.length + '건 / 전체 ' + DATA.specs.length + '건';

    var html = list.map(function (s) {
      var bodyTrunc = s.body.length > 70 ? s.body.slice(0, 70) + '…' : s.body;
      return (
        '<div class="row" data-key="' + esc(s.id) + '" data-kind="specs">' +
          '<span class="id">' + esc(s.id) + '</span>' +
          '<span class="badge cat-' + slug(s.cat) + '">' + esc(s.cat) + '</span>' +
          '<span class="body-trunc">' + esc(bodyTrunc) + '</span>' +
          '<span class="caret">▶</span>' +
        '</div>' +
        '<div class="detail" hidden></div>'
      );
    }).join('');
    byId('specsList').innerHTML = html || '<div class="row"><span class="body-trunc">검색 결과가 없습니다.</span></div>';

    bindRowClicks('specsList', 'specs', function (s) { return renderSpecDetail(s); }, function (id) {
      return DATA.specs.find(function (s) { return s.id === id; });
    });
  }

  function renderSpecDetail(s) {
    var chips = s.pageRefs.map(function (ref) {
      var clean = ref.replace(/^#/, '');
      var isM = /^M\d+/i.test(clean);
      if (isM) {
        return '<span class="chip" title="목업 모듈 번호(페이지 행 없음)">' + esc(ref) + '</span>';
      }
      return '<a class="chip" href="#/pages/' + esc(clean) + '">' + esc(ref) + '</a>';
    }).join('');
    return (
      '<p class="body-full">' + nl2br(s.body) + '</p>' +
      (s.note ? '<div class="sec-lbl">비고</div><p class="body-full">' + nl2br(s.note) + '</p>' : '') +
      '<div class="sec-lbl">관련 페이지</div>' +
      '<div class="chiplinks">' + (chips || '<span class="chip">없음</span>') + '</div>'
    );
  }

  // ---------- 페이지 매핑 탭 ----------
  var PRI_ORDER = ['P0', 'P0.5-Core', 'P0.5-Plus', 'P1', 'P2', 'P3'];

  function render_pages() {
    var counts = {};
    DATA.pages.forEach(function (p) { counts[p.pri] = (counts[p.pri] || 0) + 1; });
    var chipsHtml = '<span class="chip' + (state.pages.pri === null ? ' active' : '') + '" data-pri="">전체 <span class="c">' + DATA.pages.length + '</span></span>';
    PRI_ORDER.forEach(function (p) {
      if (!counts[p]) { return; }
      chipsHtml += '<span class="chip' + (state.pages.pri === p ? ' active' : '') + '" data-pri="' + esc(p) + '">' + esc(p) + ' <span class="c">' + counts[p] + '</span></span>';
    });
    byId('pagesPriChips').innerHTML = chipsHtml;
    byId('pagesPriChips').querySelectorAll('.chip').forEach(function (ch) {
      ch.addEventListener('click', function () {
        state.pages.pri = ch.getAttribute('data-pri') || null;
        render_pages();
      });
    });

    var domains = Array.from(new Set(DATA.pages.map(function (p) { return p.domain; }))).sort();
    var domSel = byId('pagesDomainSel');
    if (!domSel.dataset.built) {
      var opts = '<option value="">전체 도메인</option>' + domains.map(function (d) {
        return '<option value="' + esc(d) + '">' + esc(d) + '</option>';
      }).join('');
      domSel.innerHTML = opts;
      domSel.dataset.built = '1';
    }
    domSel.value = state.pages.domain;

    var q = state.pages.q.trim().toLowerCase();
    var list = DATA.pages.filter(function (p) {
      if (state.pages.pri && p.pri !== state.pages.pri) { return false; }
      if (state.pages.domain && p.domain !== state.pages.domain) { return false; }
      if (q) {
        var hay = (p.no + ' ' + p.name + ' ' + p.domain + ' ' + p.decision).toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    });

    byId('pagesResultCnt').textContent = list.length + '건 / 전체 ' + DATA.pages.length + '건';

    var html = list.map(function (p) {
      return (
        '<div class="row" data-key="' + esc(p.no) + '" data-kind="pages">' +
          '<span class="id">#' + esc(p.no) + '</span>' +
          '<span class="name">' + esc(p.name) + '</span>' +
          '<span class="meta">' + esc(p.domain) + '</span>' +
          '<span class="badge dir-' + slug(p.direction) + '">' + esc(p.direction) + '</span>' +
          '<span class="badge pri-' + slug(p.pri) + '">' + esc(p.pri) + '</span>' +
          '<span class="caret">▶</span>' +
        '</div>' +
        '<div class="detail" hidden></div>'
      );
    }).join('');
    byId('pagesList').innerHTML = html || '<div class="row"><span class="body-trunc">검색 결과가 없습니다.</span></div>';

    bindRowClicks('pagesList', 'pages', function (p) { return renderPageDetail(p); }, function (id) {
      return DATA.pages.find(function (p) { return p.no === id; });
    });
  }

  function renderPageDetail(p) {
    var specChips = (p.specRefs || []).map(function (s) {
      return '<a class="chip" href="#/specs/' + esc(s) + '">' + esc(s) + '</a>';
    }).join('') || '<span class="chip">없음</span>';
    var demo = p.demo ?
      '<a class="demolink" target="_blank" rel="noopener" href="../wms/index.html#' + esc(p.demo) + '">목업 열기 →</a>' : '';
    return (
      '<dl class="dl">' +
        '<dt>발주고 원래 위치</dt><dd>' + esc(p.oldDomain) + ' › ' + esc(p.oldMenu) + ' › ' + esc(p.oldPage) + '</dd>' +
        '<dt>병합/통합 대상</dt><dd>' + nl2br(p.merged || '-') + '</dd>' +
        '<dt>DB 모델</dt><dd>' + esc(p.models || '-') + '</dd>' +
        '<dt>출처</dt><dd>' + esc(p.src || '-') + '</dd>' +
      '</dl>' +
      '<div class="sec-lbl">핵심 결정사항</div>' +
      '<p class="body-full">' + nl2br(p.decision || '-') + '</p>' +
      (p.detail ? '<div class="sec-lbl">세부 명세</div><p class="body-full">' + nl2br(p.detail) + '</p>' : '') +
      '<div class="sec-lbl">확정 사양 참조</div>' +
      '<div class="chiplinks">' + specChips + '</div>' +
      demo
    );
  }

  // ---------- 트래킹 탭 ----------
  var SECTION_ORDER = ['의사결정·컨펌 대기', '진행·예정 (개발·검수·후속)', '완료 인덱스 (전문 = 트래킹 아카이브)'];
  var ST_ORDER = ['예정', '미정', '진행 중', '완료'];

  function render_track() {
    var cats = {};
    var sts = {};
    DATA.track.forEach(function (t) {
      cats[t.cat] = (cats[t.cat] || 0) + 1;
      sts[t.st] = (sts[t.st] || 0) + 1;
    });

    var catChips = '<span class="chip' + (state.track.cat === null ? ' active' : '') + '" data-cat="">전체 <span class="c">' + DATA.track.length + '</span></span>';
    Object.keys(cats).forEach(function (c) {
      catChips += '<span class="chip' + (state.track.cat === c ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + ' <span class="c">' + cats[c] + '</span></span>';
    });
    byId('trackCatChips').innerHTML = catChips;
    byId('trackCatChips').querySelectorAll('.chip').forEach(function (ch) {
      ch.addEventListener('click', function () {
        state.track.cat = ch.getAttribute('data-cat') || null;
        render_track();
      });
    });

    var stChips = '<span class="chip' + (state.track.st === null ? ' active' : '') + '" data-st="">전체 상태</span>';
    ST_ORDER.forEach(function (s) {
      if (!sts[s]) { return; }
      stChips += '<span class="chip' + (state.track.st === s ? ' active' : '') + '" data-st="' + esc(s) + '">' + esc(s) + ' <span class="c">' + sts[s] + '</span></span>';
    });
    byId('trackStChips').innerHTML = stChips;
    byId('trackStChips').querySelectorAll('.chip').forEach(function (ch) {
      ch.addEventListener('click', function () {
        state.track.st = ch.getAttribute('data-st') || null;
        render_track();
      });
    });

    var q = state.track.q.trim().toLowerCase();
    function match(t) {
      if (state.track.cat && t.cat !== state.track.cat) { return false; }
      if (state.track.st && t.st !== state.track.st) { return false; }
      if (q) {
        var hay = (t.no + ' ' + t.title + ' ' + t.body + ' ' + (t.ref || '')).toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    }

    var filtered = DATA.track.filter(match);
    byId('trackResultCnt').textContent = filtered.length + '건 / 전체 ' + DATA.track.length + '건';

    var bySection = {};
    SECTION_ORDER.forEach(function (s) { bySection[s] = []; });
    filtered.forEach(function (t) {
      if (!bySection[t.section]) { bySection[t.section] = []; }
      bySection[t.section].push(t);
    });

    var html = '';
    SECTION_ORDER.forEach(function (sec) {
      var rows = bySection[sec] || [];
      var collapsed = !!state.track.collapsed[sec];
      html +=
        '<div class="group-head' + (collapsed ? ' collapsed' : '') + '" data-sec="' + esc(sec) + '">' +
          '<span>' + esc(sec) + '</span><span class="cnt">' + rows.length + '건</span><span class="caret">▼</span>' +
        '</div>' +
        '<div class="group-body list' + (collapsed ? ' collapsed' : '') + '" data-sec-body="' + esc(sec) + '">' +
          (rows.map(trackRowHtml).join('') || '<div class="row"><span class="body-trunc">해당 항목이 없습니다.</span></div>') +
        '</div>';
    });
    byId('trackList').innerHTML = html;

    byId('trackList').querySelectorAll('.group-head').forEach(function (gh) {
      gh.addEventListener('click', function () {
        var sec = gh.getAttribute('data-sec');
        state.track.collapsed[sec] = !state.track.collapsed[sec];
        gh.classList.toggle('collapsed', state.track.collapsed[sec]);
        var body = byId('trackList').querySelector('[data-sec-body="' + cssEscape(sec) + '"]');
        if (body) { body.classList.toggle('collapsed', state.track.collapsed[sec]); }
      });
    });

    bindRowClicks('trackList', 'track', function (t) { return renderTrackDetail(t); }, function (id) {
      return DATA.track.find(function (t) { return t.no === id; });
    });
  }

  function stBadgeClass(st) { return slug(st); }

  function trackRowHtml(t) {
    return (
      '<div class="row" data-key="' + esc(t.no) + '" data-kind="track">' +
        '<span class="id">#' + esc(t.no) + '</span>' +
        '<span class="badge st-' + stBadgeClass(t.st) + '">' + esc(t.st) + '</span>' +
        '<span class="badge owner">' + esc(t.owner) + '</span>' +
        '<span class="name">' + esc(t.title) + '</span>' +
        (t.archived ? '<span class="badge arch">아카이브 전문</span>' : '') +
        '<span class="caret">▶</span>' +
      '</div>' +
      '<div class="detail" hidden></div>'
    );
  }

  function renderTrackDetail(t) {
    return (
      '<dl class="dl">' +
        '<dt>날짜</dt><dd>' + esc(t.date) + '</dd>' +
        '<dt>분류</dt><dd>' + esc(t.cat) + '</dd>' +
        '<dt>참조</dt><dd>' + esc(t.ref || '-') + '</dd>' +
      '</dl>' +
      '<p class="body-full">' + nl2br(t.body) + '</p>' +
      (t.archived ? '<span class="badge arch">아카이브 전문 (완료 인덱스 병합)</span>' : '')
    );
  }

  // ---------- 공용: 행 펼침/닫힘 ----------
  function bindRowClicks(listId, kind, detailRenderer, finder) {
    var container = byId(listId);
    container.querySelectorAll('.row[data-kind="' + kind + '"]').forEach(function (row) {
      row.addEventListener('click', function () {
        var key = row.getAttribute('data-key');
        var isOpen = row.classList.contains('open');
        if (isOpen) {
          closeRow(row);
        } else {
          var item = finder(key);
          if (item) { openRow(kind, row, key, detailRenderer(item)); }
        }
      });
    });
  }

  function closeRow(row) {
    row.classList.remove('open');
    var d = row.nextElementSibling;
    if (d && d.classList.contains('detail')) { d.hidden = true; }
  }

  function openRow(kind, row, key, htmlMaybe) {
    row.classList.add('open');
    var d = row.nextElementSibling;
    if (d && d.classList.contains('detail')) {
      if (htmlMaybe !== undefined) { d.innerHTML = htmlMaybe; }
      else if (!d.innerHTML) {
        var finder = kind === 'specs' ? function (id) { return DATA.specs.find(function (s) { return s.id === id; }); } :
          kind === 'pages' ? function (id) { return DATA.pages.find(function (p) { return p.no === id; }); } :
          function (id) { return DATA.track.find(function (t) { return t.no === id; }); };
        var renderer = kind === 'specs' ? renderSpecDetail : kind === 'pages' ? renderPageDetail : renderTrackDetail;
        var item = finder(key);
        if (item) { d.innerHTML = renderer(item); }
      }
      d.hidden = false;
    }
  }

  // ---------- 검색 입력 바인딩 ----------
  function bindFilters() {
    byId('specsSearch').addEventListener('input', function (e) {
      state.specs.q = e.target.value;
      render_specs();
    });
    byId('pagesSearch').addEventListener('input', function (e) {
      state.pages.q = e.target.value;
      render_pages();
    });
    byId('pagesDomainSel').addEventListener('change', function (e) {
      state.pages.domain = e.target.value;
      render_pages();
    });
    byId('trackSearch').addEventListener('input', function (e) {
      state.track.q = e.target.value;
      render_track();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
