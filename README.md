# 마트프로 WMS · 점주 앱(로지오) 시연 목업

포트폴리오 부속 정적 사이트. 빌드·서버·외부 CDN 없음. 폴더를 그대로 GitHub Pages에 올리면 동작합니다.

- `index.html` 진입 페이지 (WMS / 점주 앱 두 링크, WBS 기능 지도, 시연 시나리오 3개, 시연 데이터 초기화)
- `wms/` 관리자 웹 목업 (8군 28면, 해시 라우팅 `wms/index.html#/logistics/order-confirm`)
- `app/` 점주 앱 목업 (M1~M10, `app/index.html#/home`)
- `shared/bridge.js` 앱 ↔ WMS 연결(localStorage). 같은 도메인에 올려야 연결 시연이 됩니다.

## GitHub Pages 올리기 (개인 계정)
1. github.com 로그인 → 우상단 「+」 → New repository → 이름 `wms-demo` (Public) → Create.
2. 새 레포 화면에서 「uploading an existing file」 클릭 → 이 폴더의 **내용물 전체**(index.html, wms, app, shared, README.md)를 드래그 → Commit changes.
3. 레포 Settings → 왼쪽 Pages → Build and deployment: Source「Deploy from a branch」, Branch「main」/「/ (root)」 → Save.
4. 1~2분 뒤 `https://<아이디>.github.io/wms-demo/` 가 열립니다. 포트폴리오에는 이 주소를 넣습니다.
   - WMS 직접 링크: `https://<아이디>.github.io/wms-demo/wms/`
   - 점주 앱 직접 링크: `https://<아이디>.github.io/wms-demo/app/`

수정할 때는 바뀐 파일만 다시 업로드(같은 경로에 덮어쓰기)하면 됩니다.
