/* s-login.js — M1 로그인 */
(function () {
  'use strict';

  APP.screens.login = {
    meta: {
      title: 'M1 로그인',
      wbs: 'M1',
      hint: '거래처 코드·비밀번호가 프리필되어 있습니다. [로그인]을 누르면 최초 로그인 시나리오(비밀번호 변경 시트 → 긴급 공지 읽음 확인)가 순서대로 재현됩니다.'
    },
    render: function () {
      var s = DATA.store;
      return '' +
        '<div class="login">' +
          '<div class="logo">로</div>' +
          '<h1>마트프로 점주앱</h1>' +
          '<p class="sub">거래처 코드로 로그인해 주세요</p>' +
          '<div class="field"><input class="input" id="lgCode" value="' + s.code + '" autocomplete="off"></div>' +
          '<div class="field"><input class="input" id="lgPw" type="password" value="lozio1234"></div>' +
          '<button class="btn primary block" style="margin-top:16px" data-act="login">로그인</button>' +
          '<div class="links">' +
            '<button data-act="lgHelp" data-m="아이디 찾기는 시연 범위에 없습니다">아이디 찾기</button>' +
            '<button data-act="lgHelp" data-m="비밀번호 재설정은 시연 범위에 없습니다">비밀번호 재설정</button>' +
            '<button data-act="lgHelp" data-m="고객센터 1588-0000 (시연용)">고객센터</button>' +
          '</div>' +
        '</div>';
    }
  };

  APP.on('lgHelp', function (d) { APP.toast(d.m || '시연용 화면입니다'); });

  APP.on('login', function () {
    var st = APP.state;
    st.loggedIn = true;
    APP.save();
    if (st.firstLogin) { pwSheet(); } else { afterLogin(); }
  });

  function pwSheet() {
    APP.sheet(
      '<h2>비밀번호 변경</h2>' +
      '<p class="cap" style="margin:0 0 12px">최초 로그인입니다. 안전을 위해 비밀번호를 변경해 주세요.</p>' +
      '<div class="field"><label>새 비밀번호</label><input class="input" type="password" id="pw1" value=""></div>' +
      '<div class="field"><label>새 비밀번호 확인</label><input class="input" type="password" id="pw2" value=""></div>' +
      '<button class="btn primary block" style="margin-top:16px" data-act="pwOk">확인</button>',
      { blocking: true }
    );
  }

  APP.on('pwOk', function () {
    APP.state.firstLogin = false;
    APP.save();
    APP.closeSheet();
    APP.toast('비밀번호가 변경되었습니다');
    setTimeout(urgentPopup, 350);
  });

  function urgentPopup() {
    var n = DATA.notices[0];
    APP.state.sessionPopupShown = true;
    APP.popup(
      '<span class="badge b-red">긴급 공지</span>' +
      '<h2>' + APP.esc(n.title) + '</h2>' +
      '<p>' + APP.esc(n.body) + '</p>' +
      '<button class="btn primary block" data-act="noticeRead" data-id="' + n.id + '">읽음 확인</button>'
    );
  }

  APP.on('noticeRead', function (d) {
    APP.state.readNotices.add(d.id);
    APP.save();
    APP.closeSheet();
    APP.go('#/home');
  });

  function afterLogin() { APP.go('#/home'); }
})();
