/* wbs/app.js — 공개용 WBS 뷰어 */
(function () {
  'use strict';

  var DATA = null;
  var els = {};

  var state = {
    specs: { cat: null, q: '' },
    pages: { pri: null, domain: '', q: '' },
    openRow: { specs: null, pages: null }
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
    return esc(publicText(s));
  }
  function publicText(s) {
    return String(s || '')
      .replace(/dev 실구현/g, '실제 구현')
      .replace(/개발 참고 자료 dev/g, '개발 참고 자료')
      .replace(/PM·DEV/g, '기획·개발팀')
      .replace(/\bdev\b/gi, '개발 환경')
      .replace(/User Hierarchy/g, '사용자 권한 체계')
      .replace(/User=VAT/g, '점주 화면=부가세')
      .replace(/User VAT/g, '점주 화면 부가세')
      .replace(/\badmin=VAT/gi, '관리자 화면=부가세')
      .replace(/\bVAT\b/g, '부가세')
      .replace(/\bSSOT\b/g, '단일 기준')
      .replace(/\bbalance\b/g, '잔액')
      .replace(/\bsnapshot\b/g, '기준 시점 기록')
      .replace(/\bCTA\b/g, '동작 버튼')
      .replace(/\benum\b/g, '상태값 목록')
      .replace(/스키마/g, '데이터 구조')
      .replace(/프로드/g, '운영 환경')
      .replace(/트래킹/g, '진행 추적')
      .replace(/P0\.5(?:-(?:Core|Plus))?/g, '이후')
      .replace(/P0 외/g, '이후')
      .replace(/\bP0\b/g, '최우선(P0)').replace(/\bP1\b/g, '다음 단계(P1)')
      .replace(/\bP[23]\b/g, '이후')
      .replace(/S-\d+/g, '관련 사양')
      .replace(/#N?\d+/g, '관련 화면')
      .replace(/\bM\d+[A-Z]?(?:\/[A-Z])?\b/g, '점주 앱 화면')
      .replace(/\bN\d+\b/g, '관련 화면');
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
    bindTabs();
    bindFilters();
    window.addEventListener('hashchange', routeFromHash);
    routeFromHash();
  }

  function init() {
    if (window.WBS_DATA) { boot(window.WBS_DATA); }
    else { showNotice('데이터를 불러오지 못했습니다.'); }
  }

  // ---------- 요약 ----------
  function render_summary() {
    var c = DATA.meta.counts;
    byId('sumSpecs').textContent = c.specs;
    byId('sumPages').textContent = 56;
    byId('sumP0').textContent = 30;
    byId('tabCntSpecs').textContent = '(' + c.specs + ')';
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
    if (['specs', 'pages'].indexOf(tab) === -1) { tab = 'specs'; }
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
      chipsHtml += '<span class="chip' + (state.specs.cat === c ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(publicText(c)) + ' <span class="c">' + cats[c] + '</span></span>';
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
      var body = publicText(s.body);
      var bodyTrunc = body.length > 70 ? body.slice(0, 70) + '…' : body;
      return (
        '<div class="row" data-key="' + esc(s.id) + '" data-kind="specs">' +
          '<span class="badge cat-' + slug(s.cat) + '">' + esc(publicText(s.cat)) + '</span>' +
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
        return '<span class="chip" data-ref="' + esc(ref) + '">점주 앱 화면</span>';
      }
      return '<a class="chip" href="#/pages/' + esc(clean) + '">관련 화면</a>';
    }).join('');
    return (
      '<p class="body-full">' + nl2br(s.body) + '</p>' +
      (s.note ? '<div class="sec-lbl">비고</div><p class="body-full">' + nl2br(s.note) + '</p>' : '') +
      '<div class="sec-lbl">관련 페이지</div>' +
      '<div class="chiplinks">' + (chips || '<span class="chip">없음</span>') + '</div>'
    );
  }

  // ---------- 페이지 매핑 탭 ----------
  var PRI_ORDER = ['P0', 'P1', '이후'];
  function priorityLabel(p) { return p === 'P0' ? '최우선(P0)' : p === 'P1' ? '다음 단계(P1)' : '이후'; }
  function priorityGroup(p) { return p === 'P0' || p === 'P1' ? p : '이후'; }

  function render_pages() {
    var counts = {};
    DATA.pages.forEach(function (p) { var g = priorityGroup(p.pri); counts[g] = (counts[g] || 0) + 1; });
    var chipsHtml = '<span class="chip' + (state.pages.pri === null ? ' active' : '') + '" data-pri="">전체</span>';
    PRI_ORDER.forEach(function (p) {
      if (!counts[p]) { return; }
      chipsHtml += '<span class="chip' + (state.pages.pri === p ? ' active' : '') + '" data-pri="' + esc(p) + '">' + priorityLabel(p) + '</span>';
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
      if (state.pages.pri && priorityGroup(p.pri) !== state.pages.pri) { return false; }
      if (state.pages.domain && p.domain !== state.pages.domain) { return false; }
      if (q) {
        var hay = (p.no + ' ' + p.name + ' ' + p.domain + ' ' + p.decision).toLowerCase();
        if (hay.indexOf(q) === -1) { return false; }
      }
      return true;
    });

    byId('pagesResultCnt').textContent = '매핑 자료 ' + list.length + '행 / 전체 ' + DATA.pages.length + '행';

    var html = list.map(function (p) {
      return (
        '<div class="row" data-key="' + esc(p.no) + '" data-kind="pages">' +
          '<span class="badge dir-' + slug(p.direction) + '">' + esc(publicText(p.direction)) + '</span>' +
          '<span class="name">' + esc(publicText(p.name)) + '</span>' +
          '<span class="meta">' + esc(publicText(p.domain)) + '</span>' +
          '<span class="badge pri-' + slug(p.pri) + '" data-priority="' + esc(p.pri) + '">' + priorityLabel(p.pri) + '</span>' +
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
      return '<a class="chip" href="#/specs/' + esc(s) + '">관련 사양</a>';
    }).join('') || '<span class="chip">없음</span>';
    var demo = p.demo ?
      '<a class="demolink" target="_blank" rel="noopener" href="../wms/index.html#' + esc(p.demo) + '">목업 열기 →</a>' : '';
    return (
      '<dl class="dl">' +
        '<dt>기존 화면 위치</dt><dd>' + esc(publicText(p.oldDomain)) + ' › ' + esc(publicText(p.oldMenu)) + ' › ' + esc(publicText(p.oldPage)) + '</dd>' +
        '<dt>병합/통합 대상</dt><dd>' + nl2br(p.merged || '-') + '</dd>' +
        '<dt>DB 모델</dt><dd>' + esc(publicText(p.models || '-')) + '</dd>' +
        '<dt>출처</dt><dd>' + esc(publicText(p.src || '-')) + '</dd>' +
      '</dl>' +
      '<div class="sec-lbl">핵심 결정사항</div>' +
      '<p class="body-full">' + nl2br(p.decision || '-') + '</p>' +
      (p.detail ? '<div class="sec-lbl">세부 명세</div><p class="body-full">' + nl2br(p.detail) + '</p>' : '') +
      '<div class="sec-lbl">확정 사양 참조</div>' +
      '<div class="chiplinks">' + specChips + '</div>' +
      demo
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
          function (id) { return DATA.pages.find(function (p) { return p.no === id; }); };
        var renderer = kind === 'specs' ? renderSpecDetail : renderPageDetail;
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
  }

  document.addEventListener('DOMContentLoaded', init);
})();
