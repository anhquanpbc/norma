[English](README.md) · **Tiếng Việt**

# Norma — một chuẩn thiết kế web cho **cả người lẫn AI**

[![CI](https://github.com/anhquanpbc/norma/actions/workflows/ci.yml/badge.svg)](https://github.com/anhquanpbc/norma/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/norma-design-lint?label=norma-design-lint)](https://www.npmjs.com/package/norma-design-lint)
[![standard](https://img.shields.io/badge/standard-v1.9.0-informational)](standard/rules.yaml)
[![code: MIT](https://img.shields.io/badge/code-MIT-blue)](LICENSE)
[![content: CC BY 4.0](https://img.shields.io/badge/content-CC%20BY%204.0-lightgrey)](https://creativecommons.org/licenses/by/4.0/)

Norma là một **chuẩn thiết kế web thực thi được, song ngữ (EN/VI)** cho con người và agent code AI —
những con số cụ thể về WCAG 2.2, Core Web Vitals và design token mà bạn có thể đưa thẳng vào tiêu chí
nghiệm thu. Kèm bộ máy để chúng có hiệu lực: một **linter** fail CI khi có vi phạm thật, và các **file
luật** giúp agent AI xây theo đúng chuẩn đó.

**[Mở trang tham chiếu trực tiếp →](https://anhquanpbc.github.io/norma/)** — một trang tự chứa, không
request mạng, tự tuân thủ mọi rule nó ghi (sáng/tối, EN/VI).

## Thử ngay

```bash
npx norma-design-lint "**/*.{html,css}"   # thêm --lang vi cho thông báo tiếng Việt
```

```text
index.html
  13:  error  Contrast 2.85:1 for ".muted" is below 4.5:1.                 color.contrast.text
  11:  warn   Forbidden value "#667eea" — no default indigo/purple gradient  antipattern.indigo-default
  25:  error  <div onclick> is not a semantic control — use <button>/<a>.   a11y.semantic-control
✗ 2 errors, 1 warning
```

Exit khác 0 khi có bất kỳ phát hiện mức error, nên gate CI được ngay. Tài liệu CLI đầy đủ:
**[`norma-design-lint` trên npm](https://www.npmjs.com/package/norma-design-lint)**.

## Vì sao

Công cụ code AI thường tạo ra hai loại lỗi thiết kế: **vi phạm WCAG/HIG khách quan**, và những **"dấu
hiệu"** thẩm mỹ lộ rõ do máy sinh — gradient indigo, lạm dụng hào quang/glow, `<div onClick>`. Norma
biến một chuẩn thành ba tạo phẩm đồng bộ để cả người lẫn agent xây theo cùng một cách:

1. **Tài liệu tham chiếu** — cái gì đúng và vì sao, có trích dẫn nguồn gốc ([`REFERENCE.vi.md`](REFERENCE.vi.md) hoặc [trang trực tiếp](https://anhquanpbc.github.io/norma/)).
2. **Agent** — luật nên/không-nên nghiêm ngặt cho Claude Code, Cursor, Copilot và mọi công cụ đọc `AGENTS.md`.
3. **Linter** — `norma-design-lint`, fail build khi có vi phạm thật.

## Sáu trụ cột

Norma là sự **kiểm soát toàn diện** chất lượng thiết kế, không chỉ là một danh sách rule — mỗi trụ cột đều có code chạy được:

| Trụ cột | Làm gì | Norma cung cấp qua |
|---------|--------|--------------------|
| **Define** | một nguồn sự thật duy nhất | catalog rule ([`standard/rules.yaml`](standard/rules.yaml)) + design token DTCG ([`tokens.tokens.json`](standard/tokens.tokens.json), v2025.10) |
| **Enforce** | fail build khi có vi phạm | CLI `norma-design-lint`, plugin **Stylelint** (`norma-design-lint/stylelint`) và plugin **ESLint** (`norma-design-lint/eslint`) — chạy ngay trong linter bạn đã dùng |
| **Generate** | sinh mọi artifact tiêu thụ | file rule agent theo từng tool, một **MCP server** zero-dependency cho AI agent, và biến CSS đã biên dịch ([`standard/tokens.css`](standard/tokens.css)) |
| **Govern** | giao phát hiện tới nơi team làm việc | **SARIF 2.1.0** đầy đủ → GitHub code scanning (annotation trên PR + danh sách alert tab Security) |
| **Sync** | áp dụng & đồng bộ, không lệch | ratchet `--baseline` (chỉ fail trên nợ *mới*), **validator token DTCG** (`tokens validate`), và guard chống-lệch tự sinh + diff mọi file dẫn xuất |
| **Measure** | thấy trạng thái mỗi lần chạy | bản tóm tắt Markdown (`--format markdown` → GitHub Step Summary) + xu hướng cross-commit qua code scanning |

## Dùng thế nào

**Gate CI.** Chạy lệnh `npx` bên trên, hoặc dùng GitHub Action tái sử dụng — nó tự build Norma từ
checkout, nên không cần cài gì và luật được ghim theo đúng phiên bản đó:

```yaml
# .github/workflows/design-lint.yml
- uses: actions/checkout@v4
- uses: anhquanpbc/norma@v1
  with: { globs: "src/**/*.{html,htm,css}" }   # lang: en|vi · format: stylish|json|sarif
```

Workflow sẵn-để-copy ở [`examples/ci-recipe.yml`](examples/ci-recipe.yml).

**Nối agent AI của bạn.** Copy file luật tương ứng với công cụ vào repo:

| Công cụ | File cần copy |
|---------|---------------|
| Claude Code | `.claude/agents/design-guardian.md` |
| Cursor | `.cursor/rules/norma-design.mdc` |
| GitHub Copilot | `.github/copilot-instructions.md` (+ `.github/instructions/*` theo phạm vi) |
| Codex / Cline / Gemini / mọi công cụ đọc `AGENTS.md` | `AGENTS.md` |

**Đọc tài liệu.** Mở [`index.html`](index.html) trong trình duyệt bất kỳ (chạy offline), hoặc đọc
[`REFERENCE.vi.md`](REFERENCE.vi.md).

## Nội dung

| Đường dẫn | Mục đích |
|-----------|----------|
| [`standard/`](standard) | **Nguồn sự thật duy nhất** — `tokens.tokens.json` (DTCG v2025.10) + `rules.yaml` → `rules.json`. |
| [`REFERENCE.md`](REFERENCE.md) | Chuẩn viết đầy đủ (tiếng Anh), trích dẫn nguồn gốc. Tiếng Việt: [`REFERENCE.vi.md`](REFERENCE.vi.md). |
| [`index.html`](index.html) | Trang tham chiếu tự chứa — EN/VI, widget trực tiếp, không request mạng. |
| [`packages/design-lint`](packages/design-lint) | `norma-design-lint` — CLI + MCP server thực thi chuẩn. |
| [`agents/`](agents) · [`AGENTS.md`](AGENTS.md) · [`.cursor/rules`](.cursor/rules) · [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Spec agent gốc + các file luật per-tool sinh tự động. |
| [`examples/`](examples) | Starter sạch (lint xanh) + một trang "trước" gieo lỗi, kèm [CI recipe](examples/ci-recipe.yml). |
| [`action.yml`](action.yml) | GitHub Action tái sử dụng (`uses: anhquanpbc/norma@v1`). |

Mỗi giá trị gắn nhãn 🔒 **SPEC** (mandate WCAG/nền tảng đã công bố) hoặc 📐 **CONV** (quy ước ngành), để
bạn luôn biết một rule là yêu cầu cứng hay một mặc định mạnh.

## Bao gồm

**13 mảng** — design tokens · khoảng cách & lưới 8px · typography (kể cả tiếng Việt & CJK) · màu (OKLCH,
tương phản WCAG/APCA) · accessibility (WCAG 2.2 AA) · Core Web Vitals · chuyển động (token Material 3) ·
nền tảng (iOS HIG vs Material 3) · component & states · biểu mẫu · responsive · định luật HCI (Fitts,
Hick, Miller…) · **anti-pattern thời AI**.

## Phát triển

```bash
npm ci
npm run build        # biên dịch rules.json + linter
npm test             # unit test + dogfood (index.html phải lint sạch)
npm run check:drift  # bộ chống lệch (tái tạo và so mọi file được sinh)
```

`standard/rules.yaml` + `standard/tokens.tokens.json` là nguồn luật duy nhất sửa tay; rule JSON, các file
agent và cấu hình linter đều được sinh tự động. Xem [`CONTRIBUTING.md`](CONTRIBUTING.md) cho quy trình
sinh và [`RELEASING.md`](RELEASING.md) cho việc release.

## Nguồn

W3C WCAG 2.2 · W3C Design Tokens (DTCG) · Apple Human Interface Guidelines · Google Material Design 3 ·
web.dev / Chrome (Core Web Vitals) · HTTP Archive Web Almanac · Laws of UX. Danh sách đầy đủ trong
[`REFERENCE.vi.md`](REFERENCE.vi.md).

## Giấy phép

**Mã nguồn** (công cụ, script, JS trong `index.html`) theo [MIT](LICENSE). **Chuẩn viết và prose**
(`REFERENCE.md`, phần chữ đọc-được của `standard/rules.yaml`, và bản sao tài liệu trong `index.html` và
`README.md`) theo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — vui lòng ghi công là
*"Norma — a web design standard for humans and AI" by anhquanpbc and the Norma contributors*.
