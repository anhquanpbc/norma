[English](README.md) · **Tiếng Việt**

# Norma — một chuẩn thiết kế web cho **cả người lẫn AI**

[![CI](https://github.com/anhquanpbc/norma/actions/workflows/ci.yml/badge.svg)](https://github.com/anhquanpbc/norma/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/norma-design-lint?label=norma-design-lint)](https://www.npmjs.com/package/norma-design-lint)
[![standard](https://img.shields.io/badge/standard-v1.8.0-informational)](standard/rules.yaml)
[![code: MIT](https://img.shields.io/badge/code-MIT-blue)](LICENSE)
[![content: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-lightgrey)](LICENSE-CONTENT)

Một chuẩn kỹ thuật **thực thi được** cho thiết kế app & website hiện đại — những con số cụ thể có thể
đưa thẳng vào tiêu chí nghiệm thu, mỗi giá trị gắn nhãn **bắt buộc** (🔒) hay **quy ước** (📐), kèm bộ
công cụ để **agent AI** tuân theo và một **linter** chặn vi phạm trong CI.

Tiếng Anh là ngôn ngữ chủ đạo; bản dịch tiếng Việt đầy đủ nằm ở **[README.vi.md](README.vi.md)** (trang
này) và **[REFERENCE.vi.md](REFERENCE.vi.md)**.

## Vì sao

Công cụ code AI thường tạo ra hai loại lỗi thiết kế: **vi phạm WCAG/HIG khách quan**, và những **"dấu
hiệu"** thẩm mỹ lộ rõ do máy sinh (gradient indigo, lạm dụng hào quang/glow, `<div onClick>`). Norma
biến chuẩn thành ba tạo phẩm đồng bộ để cả người lẫn agent xây theo cùng một cách:

1. **Tài liệu tham chiếu** — cái gì đúng, và vì sao, kèm trích dẫn nguồn gốc.
2. **Agent** — luật nên/không-nên nghiêm ngặt, nạp thẳng vào Claude Code, Cursor, Copilot và mọi công cụ đọc `AGENTS.md`.
3. **Linter** — `norma-design-lint`, fail build khi có vi phạm thật.

## Nội dung

| Đường dẫn | Mục đích |
|-----------|----------|
| [`index.html`](index.html) | Trang tham chiếu tương tác, **tự chứa** (toggle EN/VI, mặc định tiếng Anh, widget trực tiếp, **không request mạng**). Trang tự pass linter của chính nó và là bản hiện thực tham chiếu cho chính nội dung nó. |
| [`REFERENCE.md`](REFERENCE.md) | Tài liệu tham chiếu đầy đủ (tiếng Anh) — 14 mục, trích dẫn nguồn gốc. Tiếng Việt: [`REFERENCE.vi.md`](REFERENCE.vi.md). |
| [`standard/`](standard) | **Nguồn sự thật duy nhất**: `tokens.tokens.json` (DTCG v2025.10) + `rules.yaml` → `rules.json`. |
| [`agents/`](agents) | Spec agent thiết kế gốc, chiếu ra các bề mặt bên dưới. |
| [`AGENTS.md`](AGENTS.md) · [`CLAUDE.md`](CLAUDE.md) · [`.cursor/rules`](.cursor/rules) · [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Các file luật agent **được sinh tự động** (tiếng Anh), mỗi bề mặt AI một file. |
| [`packages/design-lint`](packages/design-lint) | `norma-design-lint` — CLI thực thi chuẩn. |
| [`examples/`](examples) | Một starter sạch (lint xanh) + một trang "trước khi có Norma" gieo lỗi khiến 11 rule kích hoạt, kèm [CI recipe](examples/ci-recipe.yml) copy-paste. |
| [`action.yml`](action.yml) | GitHub Action tái sử dụng (`uses: anhquanpbc/norma@v1`) — build linter từ chính checkout của nó, nên gate CI được ngay cả trước khi publish npm. |

## Bắt đầu nhanh

**Kiểm dự án của bạn** theo chuẩn — `norma-design-lint` đã có trên npm, nhanh nhất là:

```bash
npx norma-design-lint "**/*.{html,css}"   # thêm --lang vi cho thông báo tiếng Việt
```

Cách khác:

- **Trong CI (một bước)** — action tái sử dụng tự build Norma từ checkout của nó, không cần cài:
  ```yaml
  - uses: anhquanpbc/norma@v1
    with: { globs: "**/*.{html,htm,css}" }   # lang: en|vi · format: stylish|json|sarif
  ```
  Workflow sẵn-để-copy ở [`examples/ci-recipe.yml`](examples/ci-recipe.yml).
- **Cục bộ (từ mã nguồn)**:
  ```bash
  npm ci && npm run build
  node packages/design-lint/dist/cli.js "**/*.{html,css}"   # thêm --lang vi cho thông báo tiếng Việt
  ```

Xem [`examples/`](examples) để có starter sạch và một trang "trước" bị lỗi.

**Trỏ agent AI vào Norma** bằng cách copy file luật tương ứng với công cụ của bạn vào dự án:
`AGENTS.md` (Codex/Cline/Gemini/…), `.cursor/rules/norma-design.mdc` (Cursor),
`.github/copilot-instructions.md` (Copilot), hoặc `.claude/agents/design-guardian.md` (Claude Code).

**Đọc tài liệu:** mở `index.html` trong trình duyệt bất kỳ (chạy offline), hoặc đọc [`REFERENCE.vi.md`](REFERENCE.vi.md).

## Áp dụng vào dự án của bạn

**1. Gate CI bằng linter** — fail build khi có vi phạm thật. Cách nhanh nhất là GitHub Action tái sử
dụng, tự build Norma từ checkout của nó (nên chạy được ngay, trước cả khi publish npm):

```yaml
# .github/workflows/design-lint.yml
- uses: actions/checkout@v4
- uses: anhquanpbc/norma@v1
  with:
    globs: "src/**/*.{html,htm,css}"   # lang: en|vi · format: stylish|json|sarif
```

Workflow sẵn-để-copy nằm ở [`examples/ci-recipe.yml`](examples/ci-recipe.yml). Hoặc chạy CLI trực tiếp
(`npx norma-design-lint "**/*.{html,css}"`, hoặc từ mã nguồn: `npm ci && npm run build`
rồi `node packages/design-lint/dist/cli.js "**/*.{html,css}"`) — exit khác 0 khi có phát hiện mức error.
Xem [`examples/`](examples) để có starter sạch và một trang "trước" bị lỗi.

**2. Nối agent AI của bạn** — copy file luật tương ứng với công cụ vào repo:

| Công cụ | File cần copy |
|---------|---------------|
| Claude Code | `.claude/agents/design-guardian.md` |
| Cursor | `.cursor/rules/norma-design.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` (+ `.github/instructions/*` theo phạm vi) |
| Codex / Cline / Gemini / mọi công cụ đọc `AGENTS.md` | `AGENTS.md` |

**3. Kiểm tra agent đã nối chưa** — yêu cầu nó review một component. Agent đã nối sẽ trả về phát hiện dạng `[SPEC] a11y.focus-ring-single — …` và từ chối tạo vi phạm mandate (🔒); nếu không, file chưa được đọc. Mọi file agent đều sinh từ một spec nên không bao giờ lệch — và `npx norma-design-lint` luôn là sự thật cuối cùng.

## Bao gồm

13 mảng: design tokens (W3C DTCG 2025.10) · khoảng cách & lưới 8px · typography (kể cả tiếng Việt &
CJK) · màu (OKLCH, tương phản WCAG/APCA) · accessibility (WCAG 2.2 AA) · Core Web Vitals (INP) · chuyển
động (token Material 3) · hướng dẫn nền tảng (iOS HIG vs Material 3) · component & states · biểu mẫu ·
responsive · các định luật toán học HCI (Fitts, Hick, Miller…) · **anti-pattern thời AI** (gắn nhãn
VIOLATION vs TELL).

## Cách giữ nhất quán

`standard/rules.yaml` + `standard/tokens.tokens.json` là **nguồn luật duy nhất được sửa tay**. Rule JSON,
mọi file agent, và cấu hình linter đều **được sinh tự động**; một job CI (`npm run check:drift`) tái tạo
mọi thứ và fail nếu lệch, nếu màu thương hiệu không nhất quán, hoặc nếu một rule chưa được cover. Để đổi
một rule: sửa file YAML, chạy `npm run build:rules && npm run gen`, rồi commit.

## Phát triển

```bash
npm ci
npm run build        # biên dịch rules.json + linter
npm test             # unit test + dogfood (index.html phải lint sạch)
npm run check:drift  # bộ chống lệch
```

Xem [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Nguồn

W3C WCAG 2.2 · W3C Design Tokens (DTCG) · Apple Human Interface Guidelines · Google Material Design 3 · web.dev / Chrome (Core Web Vitals) · HTTP Archive Web Almanac · Laws of UX. Danh sách đầy đủ trong [`REFERENCE.vi.md`](REFERENCE.vi.md).

## Giấy phép

**Mã nguồn** (công cụ, script, JS trong `index.html`): [MIT](LICENSE). **Nội dung** (chuẩn viết, `REFERENCE.md`, prose của trang): [CC BY 4.0](LICENSE-CONTENT).
