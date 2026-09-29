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
      .replace(/User=VAT/g, '발주 앱=부가세')
      .replace(/User VAT/g, '발주 앱 부가세')
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
      .replace(/\bM\d+[A-Z]?(?:\/[A-Z])?\b/g, '발주 앱 화면')
      .replace(/\bN\d+\b/g, '관련 화면');
  }

  // ---------- 참조 해석: 내부 번호 대신 같은 데이터의 실제 이름으로 ----------
  function pageByNo(no) { return DATA.pages.find(function (p) { return p.no === no; }); }
  function specById(id) { return DATA.specs.find(function (s) { return s.id === id; }); }
  function pageName(p) {
    return publicText(String(p.name || '').replace(/\s*\([^)]*\)/g, '')).trim();
  }
  function specTitle(s, depth) {
    var t = String(s.body || '').split('\n')[0]
      .replace(/^\s*(?:\[[^\]]*\]\s*)+/, '')
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\*\*/g, '');
    if (!depth) {
      t = t.replace(/S-\d+/g, function (m) { var o = specById(m); return o && o !== s ? specTitle(o, 1) : ''; });
    }
    // 제목 속 화면 번호: 맨 앞이면 떼고, 중간이면 화면 이름으로
    t = t.replace(/^\s*(?:#N?\d+|[MN]\d+)\s*/, '')
      .replace(/#(N?\d+)|\b([MN]\d+)\b/g, function (m, a, b) { var p = pageByNo(a || b); return p ? pageName(p) : ''; });
    t = publicText(t).split(/\.\s|\.$|\s—\s|。/)[0].trim();
    return t.length > 24 ? t.slice(0, 24) + '…' : t;
  }
  // 본문 속 번호를 이름으로 바꾼다. 없는 번호는 '기존 화면'으로.
  function resolveRefs(s, selfId) {
    return String(s || '')
      .replace(/▶\s*참조 사양:\s*(?:-|S-\d+(?:\s*[,·]\s*S-\d+)*)\s*/g, '')
      .replace(/\bD-\d+→/g, '결정 안건→')
      .replace(/\bM\d+~M?\d+/g, '발주 앱 전 화면')
      .replace(/S-\d+/g, function (m) {
        if (m === selfId) { return '이 사양'; }
        var o = specById(m);
        return o ? '「' + specTitle(o) + '」' : '다른 사양';
      })
      .replace(/(구\s*)?#(N?\d+)/g, function (m, old, no) {
        var p = pageByNo(no);
        return p ? (old || '') + '「' + pageName(p) + '」' : '기존 화면';
      })
      .replace(/(구\s*)?\b([MN]\d+)\b/g, function (m, old, no) {
        var p = pageByNo(no);
        return p ? (old || '') + '「' + pageName(p) + '」' : (no.charAt(0) === 'M' ? '기존 앱 화면' : '기존 화면');
      });
  }
  function refText(s, selfId) { return esc(publicText(resolveRefs(s, selfId))); }
  function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }
  function pageRefsIn(text) {
    return (String(text || '').match(/#N?\d+|\b[MN]\d+\b/g) || []).map(function (r) { return r.replace(/^#/, ''); });
  }
  // 사양 → 화면: 사양의 참조 + 그 사양을 참조하는 화면 + 본문에 적힌 화면
  function specPages(s) {
    var refs = (s.pageRefs || []).map(function (r) { return r.replace(/^#/, ''); });
    DATA.pages.forEach(function (p) { if ((p.specRefs || []).indexOf(s.id) !== -1) { refs.push(p.no); } });
    refs = refs.concat(pageRefsIn(s.body), pageRefsIn(s.note));
    return uniq(refs).map(pageByNo).filter(Boolean);
  }
  // 사양 → 사양: 본문·비고에 적힌 다른 사양
  function specSpecs(s) {
    var ids = (String(s.body || '') + ' ' + String(s.note || '')).match(/S-\d+/g) || [];
    return uniq(ids).filter(function (id) { return id !== s.id; }).map(specById).filter(Boolean);
  }
  // 화면 → 사양: 화면의 참조 + 그 화면을 참조하는 사양 + 본문에 적힌 사양
  function pageSpecs(p) {
    var ids = (p.specRefs || []).slice();
    DATA.specs.forEach(function (s) {
      if ((s.pageRefs || []).some(function (r) { return r.replace(/^#/, '') === p.no; })) { ids.push(s.id); }
    });
    ids = ids.concat((String(p.decision || '') + ' ' + String(p.detail || '') + ' ' + String(p.merged || '')).match(/S-\d+/g) || []);
    return uniq(ids).map(specById).filter(Boolean);
  }
  var APP_ROUTE = { M1: '#/login', M2: '#/home', M3: '#/catalog', M4: '#/cart', M5: '#/confirm',
    M6: '#/history', M7: '#/balance', M8: '#/notice', M9: '#/mypage', M10: '#/notify' };

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
    // 이미 같은 주소인 링크를 다시 눌러도 이동하도록
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#/"]');
      if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); routeFromHash(); }
    });
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
      if (!row) {
        // 필터·검색에 가려진 행이면 필터를 풀고 다시 그린다
        if (tab === 'specs') { state.specs = { cat: null, q: '' }; byId('specsSearch').value = ''; render_specs(); }
        else { state.pages = { pri: null, domain: '', q: '' }; byId('pagesSearch').value = ''; render_pages(); }
        row = panel.querySelector(sel);
        if (!row) { return; }
      }
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
      var body = publicText(resolveRefs(s.body, s.id));
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
    var chips = specPages(s).map(function (p) {
      return '<a class="chip" href="#/pages/' + esc(p.no) + '">' + esc(pageName(p)) + '</a>';
    }).join('');
    var specChips = specSpecs(s).map(function (o) {
      return '<a class="chip" href="#/specs/' + esc(o.id) + '">' + esc(specTitle(o)) + '</a>';
    }).join('');
    return (
      '<p class="body-full">' + refText(s.body, s.id) + '</p>' +
      (s.note ? '<div class="sec-lbl">비고</div><p class="body-full">' + refText(s.note, s.id) + '</p>' : '') +
      (chips ? '<div class="sec-lbl">관련 페이지</div><div class="chiplinks">' + chips + '</div>' : '') +
      (specChips ? '<div class="sec-lbl">연결된 사양</div><div class="chiplinks">' + specChips + '</div>' : '')
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

    var appCnt = DATA.pages.filter(function (p) { return /^M/.test(p.no); }).length;
    byId('pagesResultCnt').textContent = list.length + '건 / 전체 ' + DATA.pages.length + '건 (관리자 웹 ' + (DATA.pages.length - appCnt) + ' · 발주 앱 ' + appCnt + ')';

    var html = list.map(function (p) {
      return (
        '<div class="row" data-key="' + esc(p.no) + '" data-kind="pages">' +
          '<span class="badge dir-' + slug(p.direction) + '">' + esc(publicText(p.direction)) + '</span>' +
          '<span class="name">' + refText(p.name) + '</span>' +
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
    var specChips = pageSpecs(p).map(function (s) {
      return '<a class="chip" href="#/specs/' + esc(s.id) + '">' + esc(specTitle(s)) + '</a>';
    }).join('');
    var demo = p.demo ?
      '<a class="demolink" target="_blank" rel="noopener" href="../wms/index.html#' + esc(p.demo) + '">관리자 웹 목업 열기 →</a>' :
      APP_ROUTE[p.no] ?
      '<a class="demolink" target="_blank" rel="noopener" href="../app/index.html' + APP_ROUTE[p.no] + '">발주 앱에서 보기 →</a>' : '';
    return (
      '<dl class="dl">' +
        ([p.oldDomain, p.oldMenu, p.oldPage].some(function (x) { return x && !/^[-\s]*$/.test(x); }) ?
          '<dt>기존 화면 위치</dt><dd>' + refText(p.oldDomain) + ' › ' + refText(p.oldMenu) + ' › ' + refText(p.oldPage) + '</dd>' : '') +
        '<dt>병합/통합 대상</dt><dd>' + refText(p.merged || '-') + '</dd>' +
        '<dt>DB 모델</dt><dd>' + refText(p.models || '-') + '</dd>' +
        '<dt>출처</dt><dd>' + refText(p.src || '-') + '</dd>' +
      '</dl>' +
      '<div class="sec-lbl">핵심 결정사항</div>' +
      '<p class="body-full">' + refText(p.decision || '-') + '</p>' +
      (p.detail ? '<div class="sec-lbl">세부 명세</div><p class="body-full">' + refText(p.detail) + '</p>' : '') +
      (specChips ? '<div class="sec-lbl">확정 사양 참조</div><div class="chiplinks">' + specChips + '</div>' : '') +
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
