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
trên PR và danh sách alert ở tab Security (xem [`examples/ci-recipe.yml`](https://github.com/anhquanpbc/norma/blob/main/examples/ci-recipe.yml)).

### Tùy chọn

| Tùy chọn | Mô tả |
|---|---|
| `--format <stylish\|json\|sarif>` | Định dạng đầu ra (mặc định `stylish`). |
| `--lang <en\|vi>` | Ngôn ngữ thông báo (mặc định `en`, hoặc `NORMA_LANG`). |
| `--config <path>` | File cấu hình (mặc định `.normarc.json` nếu có). |
| `--rules <path>` | Đường dẫn catalog rule (mặc định: `standard/rules.json` đóng kèm). |
| `--quiet` | Chỉ báo lỗi. |
| `--max-warnings <n>` | Exit khác 0 nếu số cảnh báo vượt `n` (để CI gate cả rule mức warn, không chỉ error). |
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

CSS-in-JS và ngữ nghĩa class Tailwind tổng quát vẫn ngoài phạm vi. Với chúng, dựa vào **tầng agent**
(`AGENTS.md`, các file rule Cursor/Copilot/Claude) sinh từ cùng catalog. Bộ trích xuất dựa trên AST sâu hơn
là bước kế tiếp.

## MCP server (cho AI agent)

Gói kèm một server [Model Context Protocol](https://modelcontextprotocol.io) **zero-dependency** qua stdio,
để agent truy vấn chuẩn và lint source ngay trong vòng lặp. Trỏ MCP client tới bin `norma-mcp`:

```json
{ "mcpServers": { "norma": { "command": "npx", "args": ["-y", "norma-design-lint", "norma-mcp"] } } }
```

Tool: **`lint_source`** (lint chuỗi HTML/CSS/JSX → findings), **`list_rules`** (catalog, lọc theo
`domain`/`tag`), **`get_rule`** (một rule theo id, kèm rationale + remediation), và **`fix_source`**
(tự sửa các rule xác định trong chuỗi HTML/CSS → nguồn đã sửa + số lần sửa, khép vòng lint→fix→lint-lại).

## API lập trình

```ts
import { lintFiles } from "norma-design-lint";
const { findings, errorCount } = lintFiles(["index.html"]);
```

## Giấy phép

MIT.
