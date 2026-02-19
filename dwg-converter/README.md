# TMCS DWG Converter (Sample)

이 서버는 TMCS-Demo 프론트엔드가 DWG 업로드 시 호출하는 변환 API 샘플입니다.

## Endpoint

- `POST /convert-dwg`
- multipart field: `file`
- 응답:
  - 성공: `image/svg+xml` 또는 이미지 바이너리
  - 실패: JSON `{ message, detail }`

## Quick Start

```bash
cd /Users/lukekwak/Project/TMCS-Demo/dwg-converter
npm install
npm start
```

기본 포트는 `8001`이며 프론트는 `/Users/lukekwak/Project/TMCS-Demo/.env.example`의 값처럼 다음을 사용합니다.

```env
VITE_DWG_CONVERTER_URL=http://localhost:8001/convert-dwg
```

## Default Converter

기본적으로 서버는 `@mlightcad/libredwg-web`(WASM)으로 `DWG -> SVG` 변환을 수행합니다.

즉, `npm start`만으로 실제 DWG 변환이 동작합니다.

대용량 SVG(기본 6MB 초과)는 브라우저 렌더 안정성을 위해 자동으로 PNG로 래스터라이즈되어 반환됩니다.

## Optional External Converter Command

필요 시 외부 변환기를 우선 사용하도록 `DWG_TO_SVG_CMD`를 지정할 수 있습니다.

지원 플레이스홀더:

- `{input}`: 업로드된 DWG 절대경로
- `{output}`: 생성해야 할 SVG 절대경로
- `{workdir}`: 임시 작업 디렉터리

예시:

```bash
export DWG_TO_SVG_CMD="python3 /opt/dwg_to_svg.py {input} {output}"
export ALLOWED_ORIGIN="http://localhost:5173"
export PORT=8001
npm start
```

## Mock Mode (Troubleshooting)

실제 DWG 엔진이 아직 없을 때 업로드 흐름을 확인하려면 아래로 실행하세요.

```bash
npm run start:mock
```

이 모드는 실제 CAD 형상을 렌더링하지 않고, 업로드 파일명을 포함한 샘플 SVG를 반환합니다.

## Notes

- `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`는 변환 없이 그대로 반환됩니다.
- `.dwg`는 `DWG_TO_SVG_CMD`가 없으면 실패합니다.
