# TMCS-Demo

TMCS용 2D 레이아웃 디자이너 프로젝트입니다.

## Run

```bash
npm install
npm run dev
```

## DWG Import

DWG는 프론트에서 직접 파싱하지 않고 변환 API를 통해 2D(SVG/이미지)로 받아 캔버스 배경 오버레이로 표시합니다.

1. `/Users/lukekwak/Project/TMCS-Demo/.env.example`를 참고해 `.env.local` 생성
2. `VITE_DWG_CONVERTER_URL` 설정
3. 헤더의 `Import DWG` 버튼으로 업로드

```env
VITE_DWG_CONVERTER_URL=http://localhost:8001/convert-dwg
```

샘플 변환 서버는 `/Users/lukekwak/Project/TMCS-Demo/dwg-converter/README.md`를 참고하세요.
