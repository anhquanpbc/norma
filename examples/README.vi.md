<!-- [English](README.md) · Tiếng Việt -->
# Ví dụ Norma

Hai project nhỏ cho thấy linter hoạt động — copy cái đầu, học từ cái sau.

| Thư mục | Là gì | Kết quả linter |
|--------|-----------|---------------|
| [`minimal-pass/`](minimal-pass) | Trang khởi đầu sạch, dựng đúng chuẩn (HTML ngữ nghĩa, một vòng focus, màu token, thuộc tính logic, tôn trọng reduced-motion). | **0 lỗi, exit 0** — copy cái này để bắt đầu. |
| [`catches-violations/`](catches-violations) | Trang "trước khi có Norma" do AI dựng, gieo sẵn các lỗi phổ biến nhất. | **4 lỗi + 9 cảnh báo trên 13 rule, exit 1** — bản "trước", không phải "sau". |

## Chạy thử

Từ mã nguồn (chạy được ngay, không cần npm):

```bash
npm ci && npm run build          # build linter một lần, từ gốc repo
node packages/design-lint/dist/cli.js examples/minimal-pass/index.html       # ✓ sạch
node packages/design-lint/dist/cli.js examples/catches-violations/index.html # ✗ exit khác 0
```

Sau khi [`norma-design-lint`](../packages/design-lint) được publish:

```bash
npx norma-design-lint examples/minimal-pass/index.html
```

## `catches-violations/` dạy gì

Mỗi khối kích hoạt một rule cụ thể, nên output ánh xạ lỗi → rule id → cách sửa: xem bảng trong bản
[tiếng Anh](README.md) (indigo gradient, chữ #999 trên #fff, `<div onclick>`, placeholder làm nhãn,
nút emoji không nhãn, `href="#"`, `tabindex="3"`, thiếu `lang`, thiếu viewport meta...).

## Gate trong CI

Copy [`ci-recipe.yml`](ci-recipe.yml) vào `.github/workflows/` — nó fail build khi có bất kỳ lỗi
error-severity. Hoặc dùng action tái sử dụng từ gốc repo:

```yaml
- uses: anhquanpbc/norma@v1
  with:
    globs: "src/**/*.{html,htm,css}"
    lang: vi          # hoặc en
    format: stylish   # hoặc json | sarif
```
