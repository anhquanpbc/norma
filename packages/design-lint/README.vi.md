[English](README.md) · **Tiếng Việt**

# @norma/design-lint

Kiểm HTML/CSS theo chuẩn thiết kế web [Norma](https://github.com/anhquanpbc/norma) — tương phản, vòng
focus, HTML ngữ nghĩa, nhãn biểu mẫu, reduced-motion, và các "dấu hiệu" thiết kế do AI sinh thường gặp.
Thông báo song ngữ (EN/VI) qua `--lang`, xuất SARIF cho GitHub.

## Cách dùng

```bash
npx @norma/design-lint "**/*.{html,css}"
npx @norma/design-lint index.html --lang vi
npx @norma/design-lint src --format sarif > design-lint.sarif
```

Mã thoát khác 0 khi có bất kỳ phát hiện mức `error`, nên nó chặn được CI.

### Tùy chọn

| Tùy chọn | Mô tả |
|---|---|
| `--format <stylish\|json\|sarif>` | Định dạng đầu ra (mặc định `stylish`). |
| `--lang <en\|vi>` | Ngôn ngữ thông báo (mặc định `en`, hoặc `NORMA_LANG`). |
| `--config <path>` | File cấu hình (mặc định `.normarc.json` nếu có). |
| `--rules <path>` | Đường dẫn catalog rule (mặc định: `standard/rules.json` đóng kèm). |
| `--quiet` | Chỉ báo lỗi. |

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
mà phân tích tĩnh không kiểm chắc chắn được (kích thước vùng chạm khi render, thang khoảng cách, bề mặt
dark-mode) mặc định để `off` và được agent thiết kế Norma thực thi thay thế.

## API lập trình

```ts
import { lintFiles } from "@norma/design-lint";
const { findings, errorCount } = lintFiles(["index.html"]);
```

## Giấy phép

MIT.
