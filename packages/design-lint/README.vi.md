[English](README.md) · **Tiếng Việt**

# norma-design-lint

Kiểm HTML/CSS theo chuẩn thiết kế web [Norma](https://github.com/anhquanpbc/norma) — tương phản, vòng
focus, HTML ngữ nghĩa, nhãn biểu mẫu, reduced-motion, và các "dấu hiệu" thiết kế do AI sinh thường gặp.
Thông báo song ngữ (EN/VI) qua `--lang`, xuất SARIF cho GitHub.

## Cách dùng

```bash
npx norma-design-lint "**/*.{html,css,jsx,tsx}"
npx norma-design-lint index.html --lang vi
npx norma-design-lint src --format sarif > design-lint.sarif
```

Mã thoát khác 0 khi có bất kỳ phát hiện mức `error`, nên nó chặn được CI.

**Áp dụng lên codebase có sẵn:** chạy `--update-baseline` một lần để đóng băng các phát hiện hiện tại vào
`.norma-baseline.json` (commit nó), rồi truyền `--baseline .norma-baseline.json` để CI chỉ fail trên nợ
thiết kế **mới**. **GitHub code scanning:** `--format sarif` xuất SARIF 2.1.0 đầy đủ (metadata rule,
`helpUri`, fingerprint độc-lập-với-dòng) — upload bằng `github/codeql-action/upload-sarif` để có annotation
trên PR và danh sách alert ở tab Security. **Tóm tắt một lần chạy:** `--format markdown` in bảng theo
domain / theo rule (kèm delta baseline) — append vào `$GITHUB_STEP_SUMMARY` để có ảnh chụp dễ đọc trong
Actions UI (xem [`examples/ci-recipe.yml`](https://github.com/anhquanpbc/norma/blob/main/examples/ci-recipe.yml)).

### Tùy chọn

| Tùy chọn | Mô tả |
|---|---|
| `--format <stylish\|json\|sarif\|markdown>` | Định dạng đầu ra (mặc định `stylish`). `json` = báo cáo máy đọc gọn (đường dẫn tương đối repo, message theo một `--lang`). `markdown` = bảng tóm tắt theo domain / rule cho GitHub Step Summary hoặc PR comment. |
| `--lang <en\|vi>` | Ngôn ngữ thông báo (mặc định `en`, hoặc `NORMA_LANG`). |
| `--config <path>` | File cấu hình (mặc định `.normarc.json` nếu có). |
| `--rules <path>` | Đường dẫn catalog rule (mặc định: `standard/rules.json` đóng kèm). |
| `--tokens <path>` | File token DTCG → bật **token-binding**: cờ một giá trị CSS thô trùng khít token đã định nghĩa (ví dụ `oklch(…)` hard-code bằng `color.brand.azure`) và trỏ tới token. Bản này chỉ xét màu; vô hiệu nếu không có cờ này. |
| `--quiet` | Chỉ báo lỗi. |
| `--max-warnings <n>` | Exit khác 0 nếu số cảnh báo vượt `n` (để CI gate cả rule mức warn, không chỉ error). |
| `--max-per-rule <n>` | Giới hạn số phát hiện mỗi rule LIỆT KÊ trong `stylish`/`json`, để một rule nổ hàng nghìn lần không làm ngập context của agent hay log CI. Số liệu đếm + exit code vẫn là tổng thật; `json` thêm map `truncated` theo rule cho phần bị ẩn. Danh sách là mẫu theo rule (có thể bỏ sót cả file) — chạy lại không cap để xem đầy đủ. |
| `--fix` | Tự sửa các rule xác định ngay tại chỗ, rồi lint phần còn lại. |
| `--baseline <path>` | Ẩn các phát hiện đã có trong baseline; chỉ fail trên phát hiện MỚI (áp dụng lên code cũ). |
| `--update-baseline` | (Ghi lại) baseline từ các phát hiện hiện tại (đường dẫn từ `--baseline`, else `.norma-baseline.json`). |
| `-h`, `--help` | Hiện hướng dẫn dùng rồi thoát. |

`--fix` chỉ đụng các sửa **không cần phán đoán**: thuộc tính CSS vật lý→logic
(`margin-left`→`margin-inline-start`, `text-align:left`→`start`, …) trong file `.css`, và trong HTML là
`tabindex` dương→`0` cùng `rel="noopener noreferrer"` cho link ngoài `target="_blank"` chưa có `rel`.
Mọi thứ khác (tương phản, vùng chạm, nhãn, `lang`, alt, link chết) cần con người quyết định nên chỉ báo,
không tự viết lại. Sửa HTML là phẫu-thuật-từng-byte — phần còn lại của file không đổi.

### Cấu hình (`.normarc.json`)

```json
{ "lang": "vi", "rules": { "perf.img-dimensions": "error", "a11y.emoji-icon": "off" } }
```

### Tắt một rule nội tuyến

Trang tham chiếu đánh dấu các demo anti-pattern có chủ đích bằng comment:

```css
/* norma-disable a11y.focus-ring-single -- intentional VIOLATION demo */
.demo:focus-visible { outline: 2px solid blue; box-shadow: 0 0 0 4px red; }
```

Với HTML, thêm `data-norma-disable="rule.id"` vào phần tử.

## Dùng bên trong Stylelint

Đã dùng [Stylelint](https://stylelint.io)? Áp dụng nhóm kiểm CSS của Norma (tương phản, focus ring,
reduced-motion, thuộc tính logic, thang z-index, tell indigo mặc định, …) chỉ bằng một dòng cấu hình —
không cần công cụ CI riêng. Nó kiểm mọi cú pháp Stylelint phân tích được: CSS thuần, và **SCSS / Less** qua
`customSyntax` (chạy trên chính stylesheet đã parse của Stylelint). `stylelint` là peer dependency tùy chọn;
plugin xuất qua một subpath export.

```js
// stylelint.config.js
export default {
  plugins: ["norma-design-lint/stylelint"],
  rules: {
    "norma/design": true,
    // hoặc truyền tùy chọn: [true, { lang: "vi", rules: { "color.contrast.text": "warn" } }]
  },
};
```

Mỗi phát hiện của Norma thành một cảnh báo Stylelint ở đúng dòng vi phạm, kèm rule id, theo đúng mức
severity của rule (rule mức error làm fail build). Các kiểm dựa trên DOM (label, landmark, heading, …)
không áp cho stylesheet — chạy chúng trên HTML bằng CLI ở trên.

## Dùng bên trong ESLint

Với component JSX/TSX, chạy hai "tell" thiết kế chuyển được của Norma — tell màu **indigo mặc định** và
tell **`<div onClick>` không phải control ngữ nghĩa** — bên trong ESLint hiện có của bạn (flat config):

```js
// eslint.config.js
import norma from "norma-design-lint/eslint";

export default [
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: { norma },
    // hoặc ["error", { lang: "vi", rules: { "antipattern.indigo-default": "off" } }]
    rules: { "norma/design": "error" },
  },
];
```

Khối này gắn vào flat config **có sẵn** của bạn — parser JSX/TSX của dự án (`typescript-eslint`, hoặc espree
với `languageOptions.parserOptions.ecmaFeatures.jsx`) lo việc parse; plugin chỉ đọc source text. `eslint` là
peer dependency tùy chọn; plugin xuất qua subpath và không import gì từ ESLint lúc chạy. Phạm vi
ở đây cố ý hẹp — component không phải một trang đã render, nên a11y cấu trúc (landmark, label, tương phản,
thứ tự heading) **không** được kiểm. Kiểm HTML đã build bằng CLI, và CSS bằng plugin Stylelint, để có đủ bộ rule.

## Kiểm những gì

Các kiểm tra tĩnh chắc chắn, ít dương tính giả, ánh xạ tới catalog rule của Norma (`standard/rules.yaml`):
tương phản (cặp giá trị đặt cùng chỗ và giải được, kể cả `var()` + OKLCH), một vòng focus duy nhất,
sự hiện diện reduced-motion, nhãn biểu mẫu / placeholder-làm-nhãn, điều khiển ngữ nghĩa (`<div onclick>`),
emoji-làm-icon, kích thước ảnh, kích thước vùng chạm, và "dấu hiệu" gradient indigo mặc định. Những rule
mà phân tích tĩnh không kiểm chắc chắn được (thang khoảng cách 8px, sàn chữ thân 16px, ngân sách hiệu
năng runtime, và bốn mandate WCAG 2.2 do agent kiểm như 2.4.11 Focus Not Obscured) mang `check: manual`
trong catalog — engine bỏ qua chúng và agent thiết kế Norma thực thi thay.

## Kiểm được gì và không kiểm được gì

Linter phân tích đầy đủ **HTML và CSS** (gồm cả khối `<style>` và thuộc tính `style="…"` inline) — mọi rule
chạy ở đó.

**Template component (`.jsx`/`.tsx`/`.vue`/`.svelte`) hỗ trợ một phần (MVP):** source được quét, chính xác
theo dòng, cho hai "dấu hiệu" chuyển được mà không cần DOM đầy đủ — **dấu hiệu màu indigo mặc định**
(`antipattern.indigo-default`: `#667eea`/`#764ba2`/`indigo-500` trong `class`/`className`/`:class`, object
`style`, hay giá trị Tailwind tùy ý như `bg-[#667eea]`) và **dấu hiệu click trên `<div>`**
(`a11y.semantic-control`: phần tử HTML thường có xử lý click — `onClick` / `@click` / `v-on:click` /
`on:click` — mà không có `role` ARIA; `<Component>` được bỏ qua). A11y cấu trúc phụ thuộc cây render —
landmark, thứ tự heading, nhãn, tương phản — **không** kiểm ở đây, vì file component không phải một trang;
hãy chạy chúng trên HTML/CSS đã build. Khối `<style>` trong SFC Vue/Svelte chưa được lint như CSS.

CSS-in-JS và ngữ nghĩa class Tailwind tổng quát nằm ngoài phạm vi ở đây **theo thiết kế**: ngữ nghĩa cây
component sâu thuộc về **tầng agent** (`AGENTS.md`, các file rule Cursor/Copilot/Claude) sinh từ cùng
catalog — không phải một parser nặng hơn bên trong linter. Hãy lint HTML/CSS đã build bằng CLI để có đủ bộ rule.

## Kiểm tra design token

Ngoài HTML/CSS, Norma còn kiểm một file [W3C DTCG](https://tr.designtokens.org/format/) theo **hồ sơ
Norma** — cấu trúc DTCG (kế thừa `$type`, phân biệt group/token, hình dạng giá trị theo từng kiểu) cộng
**tính toàn vẹn tham chiếu alias** (một `{group.token}` không phân giải được, hay một vòng lặp tham chiếu,
sẽ bị bắt — JSON Schema thuần không làm được). Màu chấp nhận dạng chuỗi CSS `oklch()`/hex, quy ước dễ đọc
của Norma:

```bash
npx norma-design-lint tokens validate tokens.tokens.json
```

Mã thoát 0 khi hợp lệ, 1 khi có lỗi cấu trúc. `$type` sai, dimension/duration hỏng, alias treo/vòng lặp là
lỗi; một khóa `$`-prefix lạ là cảnh báo (tương thích với các bản spec tương lai).

## MCP server (cho AI agent)

Gói kèm một server [Model Context Protocol](https://modelcontextprotocol.io) **zero-dependency** qua stdio,
để agent truy vấn chuẩn và lint source ngay trong vòng lặp. Trỏ MCP client tới bin `norma-mcp`:

```json
{ "mcpServers": { "norma": { "command": "npx", "args": ["-y", "norma-design-lint", "norma-mcp"] } } }
```

Tool: **`lint_source`** (lint chuỗi HTML/CSS/JSX → findings), **`list_rules`** (catalog, lọc theo
`domain`/`tag`), **`get_rule`** (một rule theo id, kèm rationale + remediation), **`fix_source`**
(tự sửa các rule xác định trong chuỗi HTML/CSS → nguồn đã sửa + số lần sửa, khép vòng lint→fix→lint-lại),
**`validate_tokens`** (kiểm chuỗi JSON token DTCG → `{ valid, tokenCount, errors, warnings }`), và
**`get_tokens`** (bộ design token đã resolve để sinh UI — tên CSS custom-property + giá trị + giá trị
concrete sau khi resolve alias, kèm bản đồ theme light/dark, để agent dùng đúng token thay vì giá trị thô;
có thể lọc theo `group`).

## API lập trình

```ts
import { lintFiles } from "norma-design-lint";
const { findings, errorCount } = lintFiles(["index.html"]);
```

## Giấy phép

MIT.
