[English](CONTRIBUTING.md) · **Tiếng Việt**

# Đóng góp cho Norma

Cảm ơn bạn giúp Norma tốt hơn. Dự án gồm một **chuẩn**, một **agent thiết kế**, và một **linter** được
đồng bộ từ một nguồn sự thật duy nhất — nên quy tắc vàng là về *chỗ* bạn sửa.

## Quy tắc vàng

**Không bao giờ sửa tay file được sinh tự động.** Các nguồn luật viết tay duy nhất là:

- `standard/rules.yaml` — catalog rule.
- `standard/tokens.tokens.json` — design tokens (màu thương hiệu nằm ở đây và không nơi nào khác).
- `agents/norma-design-agent.md` — hành vi agent gốc.

Mọi thứ còn lại — `standard/rules.json`, `AGENTS.md`, `CLAUDE.md`, `.claude/agents/design-guardian.md`,
`.cursor/rules/*`, `.github/copilot-instructions.md`, `.github/instructions/*` — đều **được sinh tự
động**. Sau khi sửa một nguồn, chạy:

```bash
npm run build:rules   # rules.yaml  -> rules.json
npm run gen           # spec + rules -> 7 file bề mặt agent
npm run check:drift   # phải pass trước khi commit
```

CI chạy `check:drift` và sẽ fail build nếu file sinh bị cũ, nếu màu thương hiệu lệch giữa các file, nếu
số lượng mảng không nhất quán, hoặc nếu một rule chưa được cover bởi spec agent.

## Thêm/đổi một rule

Sửa `standard/rules.yaml`. Mỗi rule cần: một `id` ổn định, `title` EN + VI, một `domain`, một `tag`
(`SPEC` cho mandate đã ban hành — **bắt buộc** kèm `source_url` nguồn gốc; `CONV` cho quy ước), một
`severity` (`error` | `warn` | `off`), `rationale` + `remediation` song ngữ, và một khối `check`. Nếu
cần máy thực thi, thêm phần hiện thực check trong `packages/design-lint/src/checks.ts` kèm **fixture pass
và fail** trong `packages/design-lint/test/`.

Ưu tiên `off` cho bất cứ gì linter tĩnh không kiểm chắc chắn được (ví dụ kích thước vùng chạm khi render)
— agent thiết kế sẽ thực thi thay. Chắc chắn hơn là bao phủ: một dương tính giả trên trang tham chiếu sẽ
làm hỏng `npm test`.

## Chính sách ngôn ngữ

**Tiếng Anh là ngôn ngữ chuẩn.** Mỗi tài liệu hướng tới người dùng có một bản tiếng Anh ở đường dẫn gốc
(`README.md`, `REFERENCE.md`, `CONTRIBUTING.md`, `packages/design-lint/README.md`) và một bản tiếng Việt
kế bên với hậu tố `.vi.md` (`README.vi.md`, `REFERENCE.vi.md`, …). Các file bề mặt agent được sinh tự
động (`AGENTS.md`, `CLAUDE.md`, `.claude/agents/design-guardian.md`, `.cursor/rules/*`,
`.github/copilot-instructions.md`, `.github/instructions/*`) **chỉ tiếng Anh**, vì công cụ AI dùng chúng
bằng tiếng Anh.

Catalog rule (`standard/rules.yaml`) vẫn giữ `title` / `rationale` / `remediation` song ngữ, vì linter
xuất phát hiện ở cả hai ngôn ngữ qua `--lang en|vi`; `index.html` vẫn giữ nút toggle EN/VI trong trang
(mặc định tiếng Anh). Khi bạn đổi một doc tiếng Anh, hãy cập nhật bản `.vi.md` kế bên trong cùng một PR —
đừng để hai bản lệch nhau.

## Commit & PR

- Chạy `npm ci && npm run build && npm test && npm run check:drift` cục bộ; tất cả phải pass.
- Giữ trang (`index.html`) **không phụ thuộc và chạy offline** — không CDN, font, hay request mạng.
- Điền checklist trong template PR (đã sửa nguồn, không phải file sinh? `check:drift` xanh?).

## Đánh phiên bản

**Chuẩn** được đánh phiên bản trong `standard/VERSION` (SemVer), độc lập với CLI:
MAJOR = thêm/bỏ một mandate hoặc siết severity; MINOR = một quy ước hoặc token mới;
PATCH = câu chữ/trích dẫn. Ghi lại thay đổi trong [`CHANGELOG.md`](CHANGELOG.md).

Khi đóng góp, bạn đồng ý mã nguồn của mình được cấp phép MIT và phần prose theo CC BY 4.0.
