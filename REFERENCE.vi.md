[English](REFERENCE.md) · **Tiếng Việt**

# Quy chuẩn Kỹ thuật Thiết kế UX/UI — Tài liệu Hợp nhất (2026)

> Kiểm chứng lần cuối với các nguồn sơ cấp: 03/07/2026.

> **Chú thích:** 🔒 = yêu cầu bắt buộc trong một spec đã ban hành (mandate) · 📐 = quy ước/heuristic ngành (không phải mandate của vendor).

---

## 0. Cách đọc tài liệu

Đây là tài liệu tra cứu, không phải bài luận. Mỗi con số đều có thể đưa thẳng vào tiêu chí nghiệm thu (acceptance ticket). Ba thay đổi giai đoạn 2023–2025 chi phối toàn bộ phần dưới, cần nắm trước: (1) **INP thay thế FID** trong bộ Core Web Vitals từ **12/03/2024** (web.dev/Chrome); (2) **WCAG 2.2** trở thành Khuyến nghị W3C ngày **05/10/2023**, bổ sung tiêu chí kích thước vùng chạm, hình thức focus, và xác thực; (3) **W3C Design Tokens Format Module** đạt phiên bản ổn định đầu tiên **2025.10** ngày **28/10/2025**. Con số nào là bắt buộc theo chuẩn thì đánh dấu 🔒; con số nào là quy ước mạnh thì đánh dấu 📐. Luôn xây theo nền tảng nghiêm ngặt nhất có liên quan, không xây theo mức sàn lỏng nhất.

**Phạm vi.** Norma là chuẩn **thiết kế** front-end cho HTML/CSS. Trong phạm vi: mọi mục bên dưới, cộng bảo mật markup front-end được lint (`security.external-rel`, `security.sri`). **Ngoài phạm vi:** backend/server, và bảo mật tầng header/runtime (CSP, HSTS, `frame-ancestors`/clickjacking, Trusted Types) — hãy thực thi ở server, không phải từ HTML/CSS.

---

## 1. Design Tokens & Hệ thống

Design tokens là các quyết định thiết kế nguyên tử, có tên (màu, khoảng cách, chữ, chuyển động, bo góc, độ nổi, thời lượng), lưu độc lập nền tảng để một nguồn sinh ra CSS, iOS, Android, Flutter… Thuật ngữ khởi nguồn từ đội Salesforce Lightning (~2014–2016).

Phân loại ba tầng:
- **Primitive / tham chiếu / global** — giá trị thô, không ngữ nghĩa: `color.blue.500 = #3b82f6`.
- **Semantic / alias** — trỏ tới primitive, mang ý nghĩa: `color.action.primary → color.blue.500`.
- **Component** — bó hẹp trong một thành phần: `button.primary.background → color.action.primary`.

Phân tầng này cho phép đổi theme (sáng/tối, thương hiệu A/B) bằng cách ánh xạ lại tầng semantic mà không đụng vào mọi nơi sử dụng.

**Chuẩn W3C DTCG 🔒 (chuẩn liên thông, bản 2025.10):** Định dạng trao đổi JSON. Khóa dành riêng có tiền tố `$`: `$value`, `$type`, `$description`. `$type` phân biệt hoa/thường, đặt ở cấp nhóm và được kế thừa; công cụ **KHÔNG ĐƯỢC** đoán kiểu từ giá trị. Alias dùng ngoặc nhọn `{group.tokenName}`. Bản 2025.10 bổ sung theming/đa thương hiệu, các không gian màu hiện đại (Display P3, OKLCH, toàn bộ CSS Color 4), và dạng đối tượng cho `dimension` (`{"value": 8, "unit": "px"}`). Xem ví dụ JSON ở khối tiếng Anh phía trên.

```json
{
  "color": {
    "brand": {
      "primary": { "$value": "oklch(0.58 0.16 252)", "$type": "color", "$description": "Primary brand color" }
    },
    "text": {
      "primary": { "$value": "{color.brand.primary}", "$type": "color" }
    }
  },
  "spacing": {
    "md": { "$value": { "value": 16, "unit": "px" }, "$type": "dimension" }
  }
}
```

**Công cụ 📐:** Style Dictionary (hỗ trợ DTCG từ v4), Tokens Studio for Figma (bật định dạng "W3C DTCG"), Terrazzo, Figma Variables, Supernova, zeroheight, Penpot. Kiểm tra bằng DTCG JSON Schema trước khi phát hành.

### Các thang token cốt lõi

Token hay bị quên nhất là những cái không có "hook thương hiệu" rõ ràng. Định nghĩa các thang này một lần để bóng, bo góc và trạng thái tương tác trở nên hệ thống — không phải làm lẻ từng component (điều này chặn tận gốc các "dấu hiệu" *halo/glow* và *bo góc lẫn lộn* ở §14).

**Thang elevation / bóng 📐:** thang 0–5, một nguồn sáng, đổ **xuống dưới**; y-offset và blur tăng theo cấp (blur ≈ 2× offset), mỗi cấp một **bóng mềm + một đường hairline** — không chồng bóng *màu*. Thang xấp xỉ (theme sáng): `0` không · `1` `0 1px 2px rgb(0 0 0/.06)` (card) · `2` `0 2px 4px /.08` (thanh nổi/dính) · `3` `0 4px 8px /.10` · `4` `0 8px 16px /.12` (dropdown/popover) · `5` `0 16px 32px /.16` (modal). Gán mỗi component một cấp (card 1, thanh dính 2, dropdown 4, modal 5). **Trên nền tối, bóng gần như không thấy — thể hiện độ nổi bằng bề mặt sáng hơn / lớp phủ tông** (Material dp→độ mờ overlay), xem §4.

**Thang bo góc & viền 📐:** bo góc `none 0 · xs 2 · sm 4 · md 8 · lg 12 · xl 16 · 2xl 24 · full 9999px`; độ dày viền `1 / 2 / 4px`. **Quy tắc bo góc lồng nhau:** bán kính góc trong = bán kính ngoài − khoảng cách giữa chúng (`trong = ngoài − padding`), để nút bên trong card không bị "bóp". Chọn một "cá tính" bo góc cho cả hệ và giữ nó; bo góc lộn xộn là dấu hiệu AI.

**Độ mờ state-layer tương tác 📐 (Material 3, dạng token):** biểu diễn hover/focus/pressed bằng lớp phủ mờ của màu foreground ở độ mờ cố định để mọi component phản ứng như nhau — **hover 8% · focus 10% · pressed 10% · dragged 16%**; **disabled = nội dung 38% / container 12%**. Selected/activated thêm lớp riêng. Token hoá các giá trị này giữ `:hover`/`:focus-visible`/`:active`/`[disabled]` không lệch giữa các component (xem danh sách trạng thái ở §9).

---

## 2. Khoảng cách, Lưới & Bố cục

Mặc định là **lưới 8px 📐 với lưới con 4px** cho khoảng cách nội bộ chật. Lý do: 8 có ước số nguyên gọn và đa số độ phân giải chia hết cho 8, tránh mờ sub-pixel. Material và IBM Carbon đều dựa trên nền này.

Thang khoảng cách khuyến nghị (token, px): **0 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128**. Hai quy tắc chi phối:
1. **Trong ≤ ngoài (định luật gần kề Gestalt):** padding bên trong nhóm ≤ margin bao quanh nó.
2. **Cỡ chữ KHÔNG theo lưới khoảng cách** — dùng thang chữ modular (§3); nhưng line-height tính ra nên khớp lưới (chữ 16px / line-height 24px).

**Breakpoint 🔒:** xem bảng ở khối tiếng Anh (Tailwind 640/768/1024/1280/1536; Bootstrap 576/768/992/1200/1400; Material 0/600/840/1240/1440dp).

| Framework | xs / sm | md | lg | xl | 2xl |
|---|---|---|---|---|---|
| **Tailwind CSS** (v3/v4) | 640px | 768px | 1024px | 1280px | 1536px |
| **Bootstrap 5** | 576px | 768px | 992px | 1200px | 1400px |
| **Material (window classes)** | Compact 0–599dp | Medium 600–839dp | Expanded 840–1239dp | Large 1240–1439dp | XLarge ≥1440dp |

**Lưới cột 📐:** 12 cột với gutter 24px là quy ước desktop phổ biến; khung 1440px thường lề hai bên ~60px. Dùng `max-width` thay vì `width` cố định để container co lại trên màn hẹp.

### Bố cục & thành phần hoá (layout)

**Chọn engine theo số chiều 📐:** **Flexbox** phân bố nội dung theo **một** trục (hàng hoặc cột có thể wrap) và co theo nội dung — dùng cho toolbar, hàng nút, nav, chip, media object. **Grid** kiểm soát **hai** trục cùng lúc (hàng *và* cột) — dùng cho khung trang, dải card, và mọi sắp xếp 2-D thật. `gap` chạy trong cả hai, thay cho mánh margin. Phản mẫu: lồng nhiều flex để giả grid; nếu bạn canh cả hàng lẫn cột thì đó là Grid.

**Cơ chế CSS Grid 🔒:** `fr` chia không gian dư; `minmax(min, max)` đặt sàn/trần một track; `grid-template-areas` đặt tên vùng bằng ASCII art; named line neo vị trí. **Responsive không cần media query — kỹ thuật RAM (Repeat, Auto, Minmax):** `grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr))` — card tối thiểu 16rem, tự wrap theo container, và `min(100%, 16rem)` bên trong chặn một card tràn khỏi cha hẹp. `auto-fit` gộp track rỗng (card giãn đầy); `auto-fill` giữ track (card giữ nguyên cỡ). Một dòng thay cả chồng breakpoint. **Subgrid** (Baseline 2023) cho con kế thừa track của cha để tiêu đề/thân/chân card thẳng hàng qua cả dải.

**Canh & gap 🔒:** các thuộc tính box-alignment chạy trong Flex lẫn Grid — `justify-*` theo trục inline, `align-*` theo trục block; `place-content`/`place-items`/`place-self` là shorthand. Canh giữa mọi thứ bằng `display:grid; place-items:center` (không cần `margin:auto`/transform). `justify-content: space-between | space-around | space-evenly` phân bố khoảng dư giữa/quanh/đều quanh các item.

**Primitive thành phần hoá 📐 (Every Layout / CUBE CSS):** dựng layout từ một bộ từ vựng nhỏ các primitive tự chứa, responsive nội tại — thay vì CSS ad-hoc từng component; giúp review được ("đây là Switcher ngưỡng 30rem"): **Stack** (dòng dọc một gap), **Cluster** (item wrap giữ nhóm — chip/tag/hàng nút), **Sidebar** (aside cố định + main co dãn, wrap khi main chạm min-width), **Switcher** (lật hàng↔cột ở **ngưỡng nội dung**, không phải breakpoint khung nhìn), **Cover** (canh giữa dọc payload, ghim header/footer), **Grid/RAM** (dải card auto-fit ở trên), **Center/Wrapper** (`width: min(100% - 2rem, 65ch); margin-inline: auto` — cột nội dung co dãn, an toàn lề, giới hạn measure), **Reel** (track cuộn ngang scroll-snap), **Frame** (hộp aspect-ratio cắt), **Imposter** (overlay canh giữa).

**Kích thước theo nội dung (intrinsic) 📐:** ưu tiên kích thước nội tại thay vì pixel cứng. `min-content`/`max-content`/`fit-content()` co theo nội dung; `min()`/`max()`/`clamp()` dựng bề rộng/gap co dãn không cần breakpoint (wrapper `width: min(100% - 2rem, 65ch)`; `clamp()` được nói cho chữ ở §3 nhưng áp cho mọi length). Bố cục trên **trục logic** — `inline-size`/`block-size`, `margin-inline`, `padding-block`, `inset` — không dùng `width`/`left`/`top` vật lý, để layout viết bằng EN lật đúng ở bản VI/RTL (mở rộng cam kết i18n §3 sang trục layout; lint qua `i18n.logical-properties`). Với media, `aspect-ratio` là công cụ **layout** (đặt sẵn hộp — cũng là fix CLS §6) và `object-fit: cover|contain` + `object-position` kiểm soát cắt ảnh để ảnh không kéo giãn/bóp méo.

**Container query 📐 (Baseline 2023):** tạo kiểu component theo kích thước **container của chính nó**, không phải khung nhìn — lý do component thật sự tái dùng được (một card thích ứng trong slot sidebar 300px và vùng main 900px như nhau). Đặt `container-type: inline-size` (+ `container-name` tuỳ chọn) trên cha, rồi `@container (min-width: 30rem){ … }`; đơn vị container `cqi`/`cqb`/`cqmin` tính theo container. Ưu tiên container query hơn media query khung nhìn bên trong component tái dùng. Style query (`@container style(--state: active)`) đang nổi (chưa Baseline).

**Tràn, cuộn & xếp lớp (stacking) 📐:** **z-index như thang token** — dừng cuộc đua `z-index: 9999` bằng các lớp có tên: `base 0 · dropdown 1000 · sticky 1100 · fixed 1200 · overlay 1300 · modal 1400 · popover 1500 · toast 1600 · tooltip 1700`. Một **stacking context** sinh ra bởi `position` + `z-index`, nhưng cũng bởi `opacity < 1`, `transform`, `filter`, `will-change`, `isolation: isolate` — một ancestor có transform sẽ **giam** z-index của con, lỗi "sao không nổi lên được" số 1. Dùng `isolation: isolate` để khoanh context có chủ đích. **Top layer** của trình duyệt (`<dialog>`, popover) nổi trên mọi `z-index`, nên ưu tiên overlay gốc (xem §9). **Cuộn** — `scroll-snap-type`/`scroll-snap-align` cho carousel/reel; `scrollbar-gutter: stable` đặt sẵn chỗ thanh cuộn (nguồn CLS §6 ẩn); `overscroll-behavior: contain` chặn cuộn lan ra khỏi modal/drawer; `position: sticky` ghim header trong container cuộn; `scroll-margin-top`/`scroll-padding-top` giữ mục được neo không bị header dính che.

---

## 3. Kiểu chữ

**Thang modular 📐:** `cỡ = gốc × tỷ_lệ^bước`. Gốc gần như luôn là **16px** (1rem; dùng 18px cho nội dung đọc nhiều). Các tỷ lệ phổ biến: xem bảng ở khối tiếng Anh — đáng nhớ nhất là **1.250 (major third)** cho UI ứng dụng và **1.333 (perfect fourth)** cho báo chí/thoáng. Dùng `rem` chứ không `px` để chữ tôn trọng thiết lập cỡ chữ của người dùng. Thường 6–8 bước; bước âm (gốc ÷ tỷ lệ) cho chú thích ≈ 12–13px.

| Ratio | Value | Best for |
|---|---|---|
| Minor second | 1.067 | Dense minor UI |
| Major second | 1.125 | Dense dashboards |
| Minor third | 1.200 | Text-heavy, compact UI |
| **Major third** | **1.250** | **General app UI (Material)** |
| **Perfect fourth** | **1.333** | **Editorial / spacious (safe default)** |
| Augmented fourth | 1.414 | Landing pages |
| Perfect fifth | 1.500 | Dramatic headlines |
| Golden ratio | 1.618 | Display / art-directed |

- **Line-height 📐:** thân bài ~1.5 (mức sàn WCAG đúng bằng 1.5× 🔒); tiêu đề chặt hơn 1.1–1.25.
- **Độ dài dòng (measure) 📐:** **45–75 ký tự/dòng** cho chữ Latin (~66 lý tưởng).
- **Ngắt dòng 📐:** `text-wrap: balance` cho tiêu đề (Baseline 2024); `text-wrap: pretty` cho rìa đoạn văn, dạng cải tiến lũy tiến (chưa Baseline).
- **Cỡ chữ thân tối thiểu 📐:** sàn thực tế 16px; 12px chỉ cho chú thích, không dùng cho văn bản dài. WCAG bắt buộc khả năng phóng to, **không** quy định cỡ pixel 🔒 (xem §5).
- **Chữ co giãn (fluid):** `font-size: clamp(min, ưu_tiên, max)`, nội suy tuyến tính theo bề rộng khung nhìn (phương pháp Utopia). Co giãn không cần breakpoint và vẫn qua zoom 200%.
- **Tải font:** `font-display: swap` cho thân bài (FOUT, bảo vệ LCP); `optional` cho hiệu năng tối đa; `block` chỉ cho font icon. Tốt nhất: `swap` **+ font dự phòng đã chỉnh số đo** (`size-adjust`, `ascent-override`) để triệt CLS khi hoán font. Dùng **WOFF2** (nhỏ hơn WOFF ~30%), tự host, cache bất biến 1 năm, preload font quan trọng. **Variable font** lợi khi dùng ≥3 độ đậm.

**CJK / Tiếng Trung Phồn thể 📐:** font CJK chứa 20.000–80.000+ glyph (5–20MB) so với ~200 của Latin — cốt lõi là bài toán phân phối. Chia CJK thành 100+ subset `unicode-range`. **Tăng line-height lên ~1.7** (glyph dày đặc). Khi trộn với Latin, phần Latin thường phải phóng to quang học. **Dùng font theo vùng (Phồn thể TC vs Giản thể SC)** — biến thể pan-CJK không đáng tin; độc giả Đài Loan/Hồng Kông không chấp nhận Giản thể. Phồn thể còn hay dùng bố cục dọc.

**Tiếng Việt 📐:** chữ Latin khó nhất — 134+ ký tự có dấu, với dạng dựng sẵn (precomposed) trải trên **bốn khối Unicode**: Latin-1 Supplement, Latin Extended-A, Latin Extended-B, và **Latin Extended Additional** (U+1E00–U+1EFF, chứa phần lớn nhất, ~90 ký tự). Font chỉ phủ Latin Extended Additional vẫn thiếu glyph tiếng Việt — font giá rẻ thường thiếu Extended-A/B/Additional, nên **kiểm tra độ phủ glyph trước khi triển khai** (Noto Sans/Serif và Be Vietnam Pro an toàn). Cho tiếng Việt line-height nhỉnh hơn để dấu chồng không dính nhau.

**Thiết kế đa ngôn ngữ (i18n) 🔒📐:** khai báo `<html lang>` (WCAG 3.1.1 🔒) với **thẻ BCP-47 hợp lệ** (`en`, `vi`, `zh-Hant` — không phải `english` hay `en_US`), và gắn `lang` cho đoạn ngôn ngữ khác xen kẽ (SC 3.1.2). Bố cục bằng **thuộc tính logic** — `margin-inline`, `padding-inline`, `border-inline-start`, `text-align:start` — thay vì `margin/padding/border-left/right` vật lý, để RTL (Ả Rập, Do Thái) và chế độ viết dọc tự lật; đặt `dir` và tôn trọng `writing-mode`. Norma thực thi qua `i18n.html-lang` (🔒, sự hiện diện), `i18n.lang-valid` (🔒, BCP-47 hợp lệ), `i18n.logical-properties` (📐, CSS Logical Properties L1), và `i18n.inline-lang` (🔒, SC 3.1.2, agent kiểm).

**Định dạng theo locale, giãn text & bidi 📐:** đừng tự định dạng số, ngày, tiền tệ hay danh sách — dùng **ECMA-402 `Intl`** (`Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`) để `1,234.56` / `1.234,56` / `١٬٢٣٤` hiển thị đúng theo locale. Số nhiều **không phải** `n === 1 ? 'item' : 'items'` — tiếng Ả Rập có 6 nhóm số nhiều, Ba Lan 4, tiếng Việt 1; dùng **`Intl.PluralRules`** (CLDR). Dự trù **giãn text**: UI dịch dài thêm ~30% (Đức, Phần Lan), nhãn ngắn có thể gấp đôi — cho nút/tab tự xuống dòng hoặc cắt gọn, đừng đóng khung theo chuỗi tiếng Anh. Với văn bản hai chiều, cô lập đoạn trộn hướng hoặc do người dùng nhập bằng `unicode-bidi: isolate` / `<bdi>` và đặt `dir="auto"` trên input để tên Do Thái/Ả Rập trong câu LTR không làm đảo dấu câu xung quanh.

---

## 4. Màu sắc

**Không gian màu.** RGB gốc thiết bị nhưng vô nghĩa về tri giác. **Độ sáng của HSL KHÔNG đồng nhất tri giác** — vàng HSL(60,100%,50%) sáng hơn hẳn xanh HSL(240,100%,50%) dù cùng "độ sáng". **OKLCH** (OKLab dạng trụ, Björn Ottosson 2020) đồng nhất tri giác: bước số bằng nhau ở L (0–1), C (0–~0.4), H (0–360°) cho thay đổi cảm nhận bằng nhau. Hệ quả:
- Tạo dải tông bằng cách giữ H+C, bước L đều — không cần chỉnh tay.
- Sinh trạng thái hover/active/disabled bằng cách dịch L có quy luật; đảo L để có theme tối nhất quán.
- OKLCH biểu diễn được màu gam rộng (Display P3) mà HEX/RGB/HSL không thể. Nội suy bằng `color-mix(in oklch, …)`.

**Tương phản WCAG 2.x 🔒 (bắt buộc hiện nay):** chữ thường **4.5:1**; chữ lớn (≥18pt / ≥14pt đậm) **3:1**; thành phần UI & đồ họa (1.4.11) **3:1**; mức AAA **7:1 / 4.5:1**. Công thức = (L1+0.05)/(L2+0.05), phạm vi 1:1–21:1.

| Requirement | Ratio | Level |
|---|---|---|
| Normal text (<18pt / <14pt bold) | **4.5:1** | AA |
| Large text (≥18pt / ≥14pt bold) | **3:1** | AA |
| UI components & graphical objects (SC 1.4.11) | **3:1** | AA |
| Normal / large text | **7:1 / 4.5:1** | AAA |

**APCA (hướng WCAG 3.0) 📐:** cho ra giá trị **Lc** (≈ −108…+106), có xét cực tính và cỡ/độ đậm chữ. Ngưỡng đơn giản: **Lc 90 nên có / 75 tối thiểu cho thân bài; ~60 cho chữ lớn/đậm**. WCAG 2.x phóng đại tương phản với màu gần đen nên **không dẫn hướng tốt cho dark-mode** — APCA thì có. Lưu ý: APCA bị đưa về "Placeholder" trong bản nháp WCAG 3.0 ngày 02/06/2023; WCAG 3.0 chưa có ngày phát hành (ước chừng ~2030). **Giữ WCAG 2.x làm chuẩn bắt buộc.**

**Dark mode & độ nổi 📐:** thể hiện độ nổi bằng bề mặt sáng dần (không chỉ đổ bóng — bóng yếu trên nền tối). Tránh cặp đen/trắng thuần; dùng bề mặt gần-đen + chữ hơi-ngà để giảm chói (halation). Với theming ở tầng token, ghép `color-scheme` với hàm `light-dark()` (Baseline 2024) để một custom property biểu diễn cả hai theme.

**Trực quan hoá dữ liệu (data-viz) 📐/🔒:** biểu đồ là một phần của hệ thiết kế, không phải phần phụ — và là nơi AI hay ship palette cầu vồng, legend chỉ-bằng-màu, trục không nhãn, pie 10 lát. **Loại biểu đồ theo quan hệ dữ liệu:** so sánh → bar; xu hướng theo thời gian → line; phần-trong-tổng → stacked/100% bar (**tránh pie quá ~5 lát**); phân bố → histogram/box; tương quan → scatter. **Palette:** tối đa ~**6–8** tông phân loại, kiểm cho mù màu deuteranopia/protanopia (~8% nam giới); ramp tuần tự/phân kỳ theo thứ tự tri giác (ColorBrewer, viridis) — dựng bằng OKLCH theo mục này. **Không mã hoá dãy chỉ bằng màu** (1.4.1) — thêm nhãn trực tiếp, dash/pattern, hoặc marker hình. **Tương phản & cấu trúc:** thanh/đường/ô legend đạt **≥3:1 non-text** (1.4.11); ghi nhãn trục, trục bar bắt đầu từ **0** (không cắt trục đánh lừa); định dạng số bằng `Intl` (§3). **SVG tiếp cận:** `role="img"` + `<title>`/`<desc>`, hoặc `<table>` dữ liệu ẩn — biểu đồ `<canvas>` không có văn bản thay thế là vô hình với trợ năng.

---

## 5. Khả năng tiếp cận (đo được)

**WCAG 2.2** — Khuyến nghị W3C ngày **05/10/2023** (bản cập nhật **12/12/2024**; được phê duyệt thành **ISO/IEC 40500:2025**), 86 tiêu chí (31 A, 24 AA, 31 AAA); mức **AA** là mục tiêu pháp lý gần như phổ quát (Đạo luật Tiếp cận EU / Chỉ thị 2019/882 — có hiệu lực thi hành tại mọi nước thành viên EU từ **28/06/2025**; Section 508; EN 301 549; án lệ ADA). Mới trong 2.2: 2.4.11/2.4.12 Focus không bị che, 2.4.13 Hình thức Focus, 2.5.7 Thao tác kéo, 2.5.8 Kích thước vùng chạm (tối thiểu), 3.2.6 Trợ giúp nhất quán, 3.3.7 Nhập trùng lặp, 3.3.8/3.3.9 Xác thực tiếp cận. Bỏ 4.1.1 Parsing.

**Kích thước vùng chạm:** WCAG 2.5.8 (AA) 🔒 **24×24 CSS px** (5 ngoại lệ: khoảng cách/tương đương/inline/UA/thiết yếu); WCAG 2.5.5 (AAA) 🔒 44×44px; **Apple HIG** 🔒 **44×44pt**; **Material** 📐 **48×48dp**. Xây theo nền nghiêm ngặt nhất: native iOS = 44pt, Android = 48dp — không phải sàn 24px.

| Authority | Minimum | Notes |
|---|---|---|
| **WCAG 2.5.8 (AA)** 🔒 | **24×24 CSS px** | 5 exceptions: spacing (24px circle test), equivalent, inline, UA control, essential |
| **WCAG 2.5.5 (AAA)** 🔒 | 44×44 CSS px | |
| **Apple HIG** 🔒 | **44×44 pt** (≈59px) | visionOS 60pt |
| **Material** 📐 | **48×48 dp** (≈9mm) | pointer ≥44dp; ≥8dp separation |

**Chỉ báo focus:** 2.4.7 (AA) 🔒 phải có chỉ báo nhìn thấy; 2.4.11 (AA) 🔒 phần tử focus phải thấy được ít nhất một phần (agent kiểm qua `a11y.focus-not-obscured`); 2.4.13 (AAA) 🔒 chỉ báo ≥ **viền dày 2 CSS px** quanh thành phần, **tương phản ≥3:1 giữa trạng thái có/không focus** và ≥3:1 với màu kề. Dùng `:focus-visible`, outline ≥2px, `outline-offset`; đừng bao giờ `outline:none` mà không thay thế hợp chuẩn.

**Bàn phím / ARIA / trình đọc màn hình 🔒:** mọi chức năng thao tác được bằng bàn phím (2.1.1); thứ tự focus hợp lý (2.4.3); landmark (`banner`, `nav`, `main`, `contentinfo`); nhãn mô tả (không phải "Button"); thứ tự đọc DOM khớp thứ tự thị giác; `aria-live` cho cập nhật động như lỗi. Tên tiếp cận của điều khiển được lint tĩnh qua `a11y.control-name` (4.1.2).

**Chuyển động 🔒:** tôn trọng `prefers-reduced-motion: reduce` (2.3.3 AAA); chuyển động tự chạy kéo dài >5s phải có nút tạm dừng/dừng/ẩn nhìn thấy được cho **mọi** người dùng — thiết lập hệ điều hành không thay thế được (2.2.2 A); không chớp >3 lần/giây (2.3.1 A).

**Giãn chữ / reflow / phóng to:** 1.4.12 (AA) 🔒 không mất nội dung khi line-height **1.5×**, cách đoạn **2×**, giãn chữ **0.12×**, giãn từ **0.16×**; 1.4.10 Reflow (AA) 🔒 không cuộn 2 chiều ở **320 CSS px** (≈ 1280px @ zoom 400%); 1.4.4 (AA) 🔒 phóng chữ tới **200%** không mất nội dung. Không chặn zoom trong thẻ viewport — không `user-scalable=no`, không `maximum-scale` < 2 (lint qua `a11y.meta-viewport`).

**Cấu trúc tài liệu & bỏ qua khối 🔒:** **Skip link (2.4.1 Bypass Blocks, Level A)** — link "Tới nội dung chính" tới `#main`, là phần tử focus đầu tiên, hiện ra khi focus; hầu hết output AI thiếu dù đây là **Level A** — thắng lợi a11y rẻ nhất. **Landmark** — một `<header>`(banner), `<nav>`, một `<main>` (đích skip), `<footer>`(contentinfo); người dùng SR nhảy giữa chúng, không phải trang toàn `<div>`. **Tiêu đề (1.3.1 / 2.4.6 / 2.4.10)** — đúng một `<h1>`; không nhảy cấp (`h2→h4`); tiêu đề mô tả *cấu trúc*, không phải cỡ chữ — tạo kiểu bằng CSS (lint qua `a11y.heading-order`). **Vị trí hiện tại (aria-current)** — đánh dấu mục đang active trong nav/stepper/pagination bằng `aria-current="page"|"step"|"true"`, không chỉ bằng màu.

**Forced-colors & media theo tuỳ chọn người dùng 📐:** tôn trọng điều OS/người dùng yêu cầu — CSS thuần trong phạm vi. **Forced colors (Windows High Contrast, `forced-colors: active`)** — UA thay màu tác giả bằng palette hệ thống và **loại bỏ `box-shadow`, `background-image` và gradient**. Nên (a) không mã hoá trạng thái/focus *chỉ* bằng bóng/nền — luôn thêm `outline` (outline sống sót); (b) trong `@media (forced-colors: active)` khẳng định lại ý nghĩa bằng **từ khoá màu hệ thống** (`Canvas`, `CanvasText`, `ButtonText`, `ButtonBorder`, `Highlight`, `LinkText`, `GrayText`); (c) icon SVG dùng `fill`/`stroke: currentColor`; (d) chỉ dùng `forced-color-adjust: none` cho bề mặt mà màu *là* nội dung (biểu đồ, ô màu). **`prefers-contrast: more`** — dày viền, tăng tương phản. **`prefers-reduced-transparency`** — đổi kính/`backdrop-filter` sang bề mặt đục (phục vụ trực tiếp dấu hiệu glassmorphism §14 và rủi ro dễ đọc của Liquid-Glass §8). **`prefers-reduced-data`** — bỏ ảnh/font không thiết yếu. Nguồn: CSS Media Queries L5 + CSS Color Adjustment L1.

**Điều hướng & khả năng khám phá 📐:** **breadcrumb** là `<nav aria-label="Breadcrumb">` + danh sách có thứ tự với `aria-current="page"` ở mẩu cuối. Chọn **pagination vs "load more" vs cuộn vô hạn** có chủ đích: cuộn vô hạn phá nút Back, chặn tới footer và deep-link, cần phương án bàn phím/`aria-live` — ưu tiên pagination hoặc "load more" rõ ràng cho nội dung người dùng cần điều hướng.

**Technical SEO — bề mặt front-end (📐).** Ghi chú phạm vi: đây là chiều *markup* của SEO — cấu trúc và metadata mà crawler đọc. Nghiên cứu từ khoá, đi link và chiến lược nội dung **ngoài phạm vi** một chuẩn thiết kế.

- **Ngữ nghĩa crawl được = ngữ nghĩa truy cập được.** Bề mặt SEO và a11y là *cùng một DOM*: một `<h1>` + dàn heading logic, landmark thật, link là `<a href>` (crawler theo `href`, không theo `<div onClick>`), chữ link mô tả (không "click here"), và `alt` cho ảnh. Mọi thứ Norma đã lint cho a11y — `a11y.single-h1`, `a11y.heading-order`, `a11y.landmark-main`, `a11y.semantic-control`, `a11y.generic-link-text`, `a11y.img-alt`, `i18n.html-lang` — cũng là nền technical-SEO.
- **Metadata tài liệu.** `<title>` mô tả, duy nhất (từ đặc trưng lên đầu; ~50–60 ký tự không bị cắt) — vừa là mandate a11y mức A vừa là tín hiệu SEO on-page hàng đầu (`a11y.document-title`). `<meta name="description">` (~150–160 ký tự, hấp dẫn, không nhồi từ khoá) để đoạn snippet do bạn viết chứ không do máy bịa (`seo.meta-description`). Đúng một `<link rel="canonical">` tuyệt đối, tự trỏ để hợp nhất URL trùng (`seo.canonical`).
- **Chia sẻ / link preview.** Bộ Open Graph cốt lõi — `og:title`, `og:type`, `og:image` (~1200×630), `og:url` — cùng `twitter:card`. Thiếu chúng, link chia sẻ hiện trần trụi là URL.
- **Structured data.** Phát **JSON-LD** (`<script type="application/ld+json">`) dùng type schema.org (`Article`, `Product`, `BreadcrumbList`, `Organization`, `FAQPage`) để đạt rich result; ưu tiên JSON-LD hơn microdata và kiểm bằng Rich Results Test.
- **Chỉ thị crawl.** Dùng `<meta name="robots">` có chủ đích — footgun kinh điển là ship `noindex` của staging lên production. Cung cấp `robots.txt` + `sitemap.xml` XML (mức server), và đừng chặn CSS/JS với crawler (chúng render trang).
- **SEO đa ngôn ngữ** nối với §3: các link `hreflang` (tự trỏ + `x-default`) khớp thẻ `<html lang>` BCP-47 mỗi trang, để đúng locale nổi lên ở đúng thị trường.
- **Trải nghiệm trang.** Thân thiện mobile (đáp ứng, tap target đủ — §10–11) và Core Web Vitals (§6) là tín hiệu xếp hạng đã xác nhận — một tiebreak, không thay cho độ liên quan.

---

## 6. Hiệu năng & Core Web Vitals

**Ngưỡng 🔒 (Google, phân vị 75 dữ liệu người dùng thực CrUX):** LCP ≤ 2.5s (tốt) / 2.5–4s / >4s; INP ≤ 200ms / 200–500ms / >500ms; CLS ≤ 0.1 / 0.1–0.25 / >0.25.

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| **LCP** (loading) | ≤ 2.5s | 2.5–4s | > 4s |
| **INP** (responsiveness) | ≤ 200ms | 200–500ms | > 500ms |
| **CLS** (visual stability) | ≤ 0.1 | 0.1–0.25 | > 0.25 |

**INP thay FID từ 12/03/2024** (web.dev/Chrome). INP đo toàn bộ độ trễ của MỌI tương tác (input → lần vẽ kế tiếp) suốt phiên và báo giá trị tệ nhất (loại ngoại lệ); FID chỉ đo độ trễ đầu vào của tương tác đầu tiên. INP khó hơn hẳn — tại thời điểm chuyển đổi 2024, ~93% site mobile đạt FID tốt nhưng chỉ ~65% đạt INP tốt; HTTP Archive Almanac 2025: 77% origin mobile nay đạt INP tốt (2024: 74%), và 48% qua cả ba CWV. Nguyên nhân trượt: JS nặng, tác vụ dài (>50ms), script bên thứ ba. TTFB (<800ms) và TBT là chỉ số chẩn đoán, **không** phải Core Web Vitals. Soft navigation (đổi route trong SPA) đang được Chrome đo lường chính thức — origin trial cuối ở Chrome 147–149, Intent to Ship nhắm Chrome 151 (2026); cách CrUX báo cáo còn bỏ ngỏ, các ngưỡng không đổi.

**Tác động UX/kinh doanh:** đây là những chỉ số người dùng *cảm nhận trực tiếp* và là tín hiệu xếp hạng đã xác nhận (yếu tố phân định, không lấn át độ liên quan).

**Hiệu năng cảm nhận 📐:** skeleton screen, optimistic UI (phản ánh hành động trước khi server xác nhận), tải tuần tự/streaming, ưu tiên phần trên màn hình đầu tiên.

**Tối ưu ảnh 📐:** định dạng **AVIF → WebP → JPEG/PNG** qua `<picture>`; lợi thế AVIF so với WebP khiêm tốn (~10–12%), lợi lớn là so với JPEG/PNG cũ. Responsive: `srcset` + `sizes` khớp bố cục thật; **luôn đặt `width`/`height`** (hoặc `aspect-ratio`) để chống CLS. Lazy-load phần dưới màn hình, **đừng bao giờ** lazy-load ảnh hero/LCP — dùng `loading="eager"` + `fetchpriority="high"`.

---

## 7. Chuyển động & Tương tác

**Thời lượng 📐:** vi tương tác (nút, toggle) **100–300ms**; dải cảm nhận tối ưu **200–500ms**; <100ms thấy như tức thời, >1s thấy ì. Điều chỉnh (Material): desktop 150–200ms (nhanh hơn), tablet ~+30% so mobile, thiết bị đeo ~−30%. Thoát < vào; quãng di chuyển lớn hơn → lâu hơn.

**Chuyển động Material 3 — spring là chính từ M3 Expressive (Google I/O, 05/2025) 📐:** hệ *vật lý* motion nay là hệ chính của Material — token spring tổ hợp (damping + stiffness), chia **Spatial** (vị trí/kích thước/hình dạng; có thể vượt đà) vs **Effects** (màu/độ mờ; damping cao), mỗi nhóm fast/default/slow. Các token thời lượng/easing bên dưới vẫn được tài liệu hoá làm **dự phòng**, hiện dùng cho transition.

**Token thời lượng/easing Material 3 🔒 (nguyên văn, hệ dự phòng):**
- *Thời lượng (ms):* short1 50 · short2 100 · short3 150 · short4 200 · medium1 250 · medium2 300 · medium3 350 · medium4 400 · long1 450 · long2 500 · long3 550 · long4 600 · extra-long1 700 · extra-long2 800 · extra-long3 900 · extra-long4 1000.
- *Easing:* standard `cubic-bezier(0.2, 0, 0, 1)` · standard-decelerate `cubic-bezier(0, 0, 0, 1)` · standard-accelerate `cubic-bezier(0.3, 0, 1, 1)` · emphasized-decelerate `cubic-bezier(0.05, 0.7, 0.1, 1)` · emphasized-accelerate `cubic-bezier(0.3, 0, 0.8, 0.15)` · linear `cubic-bezier(0, 0, 1, 1)`. Token **emphasized** là đường hai đoạn (`M 0,0 C 0.05,0 0.133,0.06 0.166,0.4 C 0.208,0.82 0.25,1 1,1`) và **không thể** biểu diễn bằng một cubic-bezier duy nhất — các xấp xỉ trên web chỉ là xấp xỉ.
- *Cũ:* easing "standard" M2 = `cubic-bezier(0.4, 0, 0.2, 1)` (FastOutSlowIn), vẫn là interpolator mặc định trong các lớp transition của M3. Hệ spring là mặc định trong Jetpack Compose (21+ component; scheme expressive vs standard).

**Apple 📐:** chuyển động mượt, củng cố phân cấp không gian và thao tác trực tiếp, không gây phân tâm; tôn trọng Reduce Motion (thay chuyển động lớn bằng cross-fade).

**Khi nào KHÔNG animate 📐:** hành động lặp tần suất cao (motion thêm độ trễ); bounce/stretch trang trí trong ngữ cảnh công cụ (IBM Carbon khuyến cáo tránh); mọi thứ dưới `prefers-reduced-motion`.

**Cử chỉ (mobile) 📐:** dùng bộ từ vựng chuẩn (chạm, giữ, vuốt, chụm, xoay). Mỗi cử chỉ tùy biến phải có phương án một-chạm thay thế nhìn thấy được (WCAG 2.5.1 cho cử chỉ theo đường vẽ 🔒; 2.5.7 cho thao tác kéo, agent kiểm qua `a11y.dragging-alternative`). Đừng ghi đè cử chỉ hệ thống (vuốt mép, Trung tâm điều khiển/Thông báo). Thêm tay nắm (grabber) để gợi ý sheet kéo được.

---

## 8. Quy chuẩn Nền tảng

**Apple HIG (iOS):** font hệ thống **SF Pro** (Text ≤19pt, Display ≥20pt); Dynamic Type Body **17pt**, Large Title **34pt**, các text style phải co giãn theo Dynamic Type. Vùng chạm **44×44pt**, hàng list tối thiểu 44pt. Lưới 8pt + chia nhỏ 4pt là quy ước tin cậy 📐. Thiết kế theo **màu hệ thống semantic/thích ứng** 🔒 thay vì hex cứng để sáng/tối/tương phản tự có. Vùng an toàn 🔒: né status bar, Dynamic Island, tai thỏ, home indicator. Điều hướng: tab bar cho cấp cao nhất (**tối đa 3–5 tab trên iPhone**), nav bar cho đi sâu, modal cho tác vụ tập trung. Từ iOS 26 (2025), **Liquid Glass** là ngôn ngữ vật liệu toàn hệ thống; iOS 27 (WWDC 2026) giảm độ trong suốt mặc định, thêm thanh chỉnh trong↔đục cho người dùng và tinh chỉnh khuếch tán nội dung — một bước hiệu chỉnh vì độ dễ đọc, khiến tương phản-trên-kính thành rủi ro tuân thủ hạng nhất (TELL glassmorphism ở §14 phân biệt vật liệu nền tảng với kính CSS trang trí).

**Material Design 3 (Material You):** dynamic color sinh dải tông từ màu nguồn thành vai trò semantic; **độ nổi thể hiện bằng lớp phủ bề mặt tông màu**, không chỉ đổ bóng. Thông số 📐: nút chuẩn ~40dp thị giác / vùng chạm 48dp / padding ngang 16dp; text field ~56dp (outlined) / 48dp (filled); checkbox/radio 40dp trong vùng 48dp; chip ≥32dp (khuyến nghị 40dp); FAB nhỏ 40 / thường 56 / lớn 96dp. Lưới nền 4px, thành phần bội số của 8, thang chữ 1.25.

**Khác biệt iOS vs Android 📐:** điều hướng — iOS **tab bar** đáy vs Android **navigation bar/rail** + Back hệ thống; vùng chạm 44pt vs 48dp; font SF Pro vs Roboto; back — iOS góc trái + vuốt mép vs Android back hệ thống toàn cục; độ nổi — iOS blur/trong mờ vs Material tông+bóng. Tôn trọng share sheet, bộ chọn ngày, và thành phần hệ thống của từng nền tảng thay vì bê nguyên nền này sang nền kia.

---

## 9. Thành phần & Trạng thái

**Trạng thái cần thiết kế cho mọi thành phần tương tác 🔒/📐:** mặc định, hover (chỉ chuột), focus (`:focus-visible`), active/nhấn, vô hiệu (disabled), đang tải (loading), lỗi (error) — cùng selected/checked, read-only khi cần. Material thêm **state layer** (lớp phủ tông) phủ trọn vùng chạm 48dp.

**Thông số phổ biến 📐:** Nút cao 40–48px, padding ngang ~16px, rộng tối thiểu ~64–88px, phân cấp chính/phụ/ba rõ ràng, loading vô hiệu + hiện spinner, nhãn theo hành động. Input ≥44–56px, nhãn hiển thị cố định phía trên, chữ trợ giúp/lỗi phía dưới, không dùng placeholder làm nhãn. Modal: bẫy focus, khôi phục focus khi đóng, `Esc` để đóng, có backdrop, một lối đóng rõ ràng, tránh chồng modal. Ưu tiên phần tử `<dialog>` gốc và Popover API (Baseline 2025) — top layer cho sẵn quản lý focus, Esc, backdrop, light-dismiss; tự chế overlay `<div>` mới là phản mẫu. Định vị tooltip/menu bằng CSS anchor positioning ở dạng cải tiến lũy tiến (Chrome/Edge, Firefox 151+; Safari chưa hỗ trợ — chưa Baseline). Card: padding trong 16–24px, khoảng cách giữa các card 16–24px.

Nối hover/focus/pressed/disabled với **token độ mờ state-layer** ở §1 để trạng thái không lệch giữa các component.

### Widget patterns (WAI-ARIA APG) 🔒

Widget tương tác là nơi UI do AI tạo hỏng a11y nhất (`<div>`-làm-nút, không có mô hình bàn phím, sai role). Dựng theo **ARIA Authoring Practices Guide** — mỗi widget có role, trạng thái và hợp đồng bàn phím bắt buộc (bảng đầy đủ ở khối tiếng Anh). Ba quy tắc AI hay phá:

1. **Ưu tiên native.** `<select>`/`<datalist>`, `<details>`/`<summary>`, `<dialog>`, `<input type=…>` hơn mọi ARIA tự chế — combobox là widget bị làm sai nhiều nhất. Chỉ dùng ARIA khi không có phần tử native phù hợp.
2. **Mỗi composite một tab-stop.** Một tablist / menu / listbox / grid là **một** Tab stop; di chuyển *bên trong* bằng phím mũi tên qua **roving `tabindex`** (chỉ con đang active là `tabindex="0"`, còn lại `-1`) hoặc **`aria-activedescendant`** — không đặt `tabindex="0"` trên mọi con.
3. **Mọi điều khiển có tên tiếp cận** (kể cả nút chỉ-icon — 1.1.1 / 4.1.2, lint qua `a11y.control-name`).

Thông báo thay đổi động bằng `aria-live` (`polite`/`assertive`) hoặc `role=status`/`alert` — **WCAG 4.1.3 Status Messages (AA)**, tức cập nhật mà không dời focus.

### Thiết kế mọi trạng thái 🔒/📐

Danh sách trạng thái ở trên là micro-state của từng *điều khiển*; một **view chạy theo dữ liệu** còn phải thiết kế cả **vòng đời** — AI gần như luôn chỉ ship đường "đã tải/hạnh phúc", nên sản phẩm vỡ ngay khi gặp dữ liệu thật (hoặc không có dữ liệu):

- **Rỗng (empty)** — phân biệt bốn loại: **lần đầu** (giải thích giá trị + một CTA chính), **người dùng đã xoá**, **không kết quả** (mời reset/mở rộng — *không* giống lần đầu), **rỗng do lỗi**. Màn hình trắng là lỗi.
- **Đang tải** — **skeleton khớp bố cục cuối** (đặt sẵn chỗ → không CLS), không phải spinner giữa màn trơ; dùng `aria-busy`.
- **Một phần / lạc quan (optimistic)** — phản ánh hành động trước khi server xác nhận; hoàn tác nhìn thấy khi thất bại.
- **Lỗi** — nêu nguyên nhân **và** cách phục hồi/thử lại; không ngõ cụt hay "Oops" trơ.
- **Offline / cũ**, **thành công/xác nhận**, **không có quyền (403)**, và **cắt danh sách dài** (lộ giá trị đầy đủ).

Thông báo chuyển trạng thái qua **4.1.3 Status Messages** (vùng `role=status`/`aria-live`) để tới người dùng trình đọc màn hình mà không cướp focus.

### Phản hồi & trạng thái hệ thống 🔒/📐

Mỗi hành động async và thông điệp hệ thống cần đúng bề mặt **và** đúng role live-region:
- **Toast / snackbar** — tự đóng **4–10s** chỉ cho thông điệp **không quan trọng**; **không bao giờ tự đóng thứ có thể thao tác** (nút Undo hay "Thử lại" phải ở lại — WCAG 2.2.1 Timing Adjustable); **tạm dừng khi hover/focus**; giới hạn đồng thời (~1–3, xếp hàng phần còn lại). Role: **`role=status`** (polite) cho thành công/thông tin, **`role=alert`** (assertive) cho lỗi — theo **4.1.3 Status Messages (AA)**, tức thông báo **mà không dời focus**.
- **Progress** — `role=progressbar` + `aria-valuenow`/`min`/`max` (xác định) hoặc `aria-busy`/vô định; khác spinner trơ.
- **Banner / badge / skeleton** — banner nằm trong luồng cho ngữ cảnh lâu dài; badge là đếm/chỉ báo (cần văn bản thay thế); skeleton là placeholder `aria-hidden` trong vùng `aria-busy`.
- **Undo hơn confirm** — với hành động phá huỷ **có thể hoàn tác**, ưu tiên soft-delete + toast Undo (*không* tự đóng) hơn hộp xác nhận; chỉ để modal confirm cho việc **không thể hoàn tác**, và **gọi tên hành động** ("Xoá 3 tệp", không phải "Bạn chắc chứ?"). AI hay chôn nút Undo duy nhất trong toast 3 giây không có role.

### Overlay 🔒/📐

Chọn overlay theo mức độ ngắt quãng + cách đóng, không theo thói quen — **bảng quyết định đầy đủ ở khối tiếng Anh** (dialog / alertdialog / non-modal dialog / popover / tooltip / drawer-side-sheet / bottom-sheet). **Cơ chế AI hay tự chế sai:** đánh dấu nền **`inert`** (không chỉ "bẫy focus" — `inert` gỡ khỏi thứ tự tab *và* cây a11y), **khôi phục focus** về điều khiển gọi khi đóng, **khoá cuộn body** (`overflow:hidden` + `overscroll-behavior:contain`), và đặt **focus ban đầu** có chủ đích (phần tử focus đầu tiên, hoặc mặc định an toàn cho alertdialog). Ưu tiên `<dialog>` gốc + Popover API — **top layer** của trình duyệt lo sẵn nền-inert, Esc và focus (§2), và nổi trên mọi `z-index`. Với trường hợp "confirm-đè-form" mà "không chồng modal" cấm, dùng thang z-index (§2) — nhưng chỉ một cấp lồng.

### Content & UX writing 📐

Chữ trong giao diện là thiết kế — mọi hệ trưởng thành (HIG, Material, Polaris, GOV.UK) đều có chương content, và chữ là nơi các "dấu hiệu AI-slop" §14 trú ngụ. **Sentence case** cho nhãn/nút/tiêu đề (không Title Case); **nhãn nút theo hành động** ("Xoá tệp", "Tạo tài khoản" — không phải "OK"/"Gửi" trơ). **Công thức thông báo lỗi:** *chuyện gì + vì sao + cách sửa*, cụ thể và không đổ lỗi — không "Oops, có gì đó sai". **Chữ trạng thái rỗng** giải thích giá trị và mời một hành động kế; **placeholder không phải nhãn hay hướng dẫn**. **Số** định dạng bằng `Intl` (§3); ngôn ngữ đơn giản; cắt ở cuối và giữ giá trị đầy đủ tiếp cận được; dự trù giãn ~30% khi dịch (§3). **Cấm copy generic:** "Click here", "Learn more", "Submit", "Oops" — cùng lối chữ có-thể-thay-thế trượt bài "thử bỏ logo" (§14).

**Hệ thống thiết kế tham khảo 📐:** Material 3, Apple HIG, IBM Carbon, Shopify Polaris, Ant Design, Atlassian, Salesforce Lightning, cùng GOV.UK Design System và U.S. Web Design System (USWDS) dựa trên bằng chứng.

**Atomic Design (Brad Frost) 📐:** atom → molecule → organism → template → page. Ánh xạ đúng với ba tầng token primitive/semantic/component.

---

## 10. Biểu mẫu & Đáp ứng

> *§10 (Biểu mẫu) và §11 (Đáp ứng) được gộp làm một mục — không có §11 riêng; trang tham chiếu ghi là "§10–11".*

**📐** Bố cục một cột, nhãn căn trên (dễ quét + full-width mobile); tránh nhãn căn trái và placeholder làm nhãn. Mỗi input có `<label>` liên kết theo mã (`for`/`id`) 🔒. Kiểm tra hợp lệ **khi rời trường (on blur)**, không phải mỗi lần gõ; hiện xác nhận tích cực khi hữu ích. Thông báo lỗi: đặt ngay dưới trường, cụ thể và hành động được ("Nhập số điện thoại 10 chữ số, ví dụ 0912 345 678" — không phải "Dữ liệu không hợp lệ"); không chỉ dựa vào màu (màu + icon + chữ) 🔒 — agent kiểm qua `a11y.color-only-meaning`; thông báo qua `aria-live`. Đánh dấu trường bắt buộc rõ ràng; chỉ hỏi thông tin cần thiết. Mobile: đặt đúng `type`/`inputmode` để gọi đúng bàn phím; bật `autocomplete`/tự điền; hỗ trợ tự điền mã OTP. WCAG 3.3.7 🔒 — đừng bắt nhập lại thông tin đã cung cấp (agent kiểm qua `forms.redundant-entry`).

**Cấu trúc biểu mẫu & kiểm tra hợp lệ đầy đủ 🔒/📐** (nửa mà form do AI tạo hay bỏ): **Nhóm điều khiển liên quan** — bộ radio/checkbox và khối địa chỉ đặt trong `<fieldset>` + `<legend>` để trình đọc màn hình đọc tên nhóm kèm mỗi lựa chọn (1.3.1). **Bảng tóm tắt lỗi (kỹ thuật G83 / GOV.UK):** khi submit, hiện hộp tóm tắt ở đầu liệt kê từng lỗi thành link trong trang, **dời focus tới đó**, và lặp lại thông báo inline tại từng trường; báo qua `aria-live`. **Bắt buộc vs tuỳ chọn** — đánh dấu **phần thiểu số**; dùng chữ + `required`/`aria-required`, không chỉ dấu * bằng màu (gắn với 1.4.1). **Nút submit bị vô hiệu là phản mẫu** — giữ submit bật, kiểm khi submit, và dời focus tới bảng tóm tắt lỗi; nút disabled không cho lý do và không focus/đọc được. **Nhiều bước** — hiện tiến độ + số bước, lưu giữa các bước; **mật khẩu** — nút hiện/ẩn, `autocomplete="new-password"`, và **không chặn paste**.

**Đáp ứng & thích ứng (📐)** Mobile-first: viết style nền cho khung nhỏ nhất, rồi thêm media query `min-width` đi lên (khớp Tailwind/Bootstrap); nhớ thẻ `viewport` (lint qua `responsive.viewport-meta`; giá trị chặn zoom — `user-scalable=no`, `maximum-scale` < 2 — là lỗi `a11y.meta-viewport`). Bố cục co giãn: `max-width` (không `width` cố định), Flexbox/Grid, đơn vị tương đối, `clamp()` cho chữ/khoảng cách co giãn. **Container query** (CSS hiện đại): tạo kiểu theo kích thước *container* thay vì khung nhìn — công cụ đúng cho thành phần tái sử dụng ở nhiều ngữ cảnh. Adaptive vs responsive: responsive = co giãn liên tục; adaptive = các bố cục rời khớp theo breakpoint; sản phẩm hiện đại thường trộn cả hai. Bề rộng cần test: 320 (điện thoại nhỏ / sàn reflow WCAG), 360–414 (điện thoại thường), 768 (tablet dọc), 1024 (tablet ngang / laptop nhỏ), 1280–1440 (desktop), 1536+ (desktop lớn).

**Năng lực thiết bị — kích thước màn hình chỉ là một nửa (📐).** Hai thiết bị cùng bề rộng có thể ngược nhau về *input*, *hành vi viewport* và *safe area*. Hãy truy vấn năng lực, không phải bề rộng:

- **Kiểu nhập — `pointer` / `hover`.** `@media (pointer: coarse)` = ngón tay (target ≥44px, giãn hơn); `(pointer: fine)` = chuột/bút. `@media (hover: hover)` = thiết bị hover được; **đừng bao giờ giấu hành động quan trọng sau `:hover`** — trên `(hover: none)` cảm ứng nó không tới được. Dùng `any-pointer`/`any-hover` cho máy lai. Thiết kế tap-first, tăng cường cho hover.
- **Đơn vị viewport hiện đại — `dvh` / `svh` / `lvh`.** `100vh` **tràn trên mobile**: nó bằng viewport *lớn nhất* nên thanh URL co lại che phần đáy. Dùng **`dvh`** (động — co theo chrome) cho layout full-height, **`svh`** (nhỏ — có chrome) khi nội dung phải chắc chắn thấy được. Anh em logic `vi`/`vb` tôn trọng chiều viết. Baseline 2023.
- **Safe area & tai thỏ.** Muốn UI tràn-viền trên máy notch/bo góc, đặt `<meta name="viewport" content="…, viewport-fit=cover">` **và** đệm nội dung tương tác bằng `env(safe-area-inset-top|right|bottom|left)` (kèm fallback `0px`) để không có gì lọt dưới tai thỏ hay thanh home. Thiếu `viewport-fit=cover` thì insets bằng `0` và padding vô hiệu (lint qua `responsive.viewport-fit`).
- **Hướng & reflow.** `@media (orientation: landscape)` chỉnh layout, nhưng **đừng khoá hướng** và đừng chỉ scale — hãy reflow. Nội dung phải sống được ở cả hai hướng tại 320 CSS px (WCAG 1.4.10 Reflow).
- **In.** Ship `@media print` cho trang dạng tài liệu: ẩn nav/chrome, ép đen-trên-trắng, mở `a[href]::after{ content:" (" attr(href) ")" }` để URL còn trên giấy, tránh `break-inside` cắt lửng.
- **Ảnh đáp ứng — độ phân giải vs art-direction.** Dùng `srcset` + `sizes` (w-descriptor, 3–5 biến thể) cho *cùng* ảnh ở độ phân giải/DPR khác nhau; dùng `<picture><source media="…">` khi khung/bố cục ảnh phải **đổi** theo breakpoint. Đặt sẵn `width`/`height` (CLS, §6); `loading="lazy"` + `decoding="async"` dưới màn, `fetchpriority="high"` + `loading="eager"` chỉ cho ảnh LCP.
- **Máy gập & hai màn** đang nổi: biến `viewport-segments` và `@media (spanning: …)` giúp nội dung tránh khe gập — hướng tới tương lai, chưa Baseline.

---

## 12. Định luật Toán học Tương tác (HCI)

Các mô hình dự báo này biến "cảm giác" thành ước lượng có thể thiết kế theo. Chúng là **mô hình thực nghiệm 📐**, không phải quy chuẩn bắt buộc, nhưng nền tảng và đã được kiểm chứng.

- **Định luật Fitts** — `MT = a + b · log₂(D/W + 1)`. Thời gian chạm mục tiêu tăng theo khoảng cách **D**, giảm theo bề rộng **W**. Hệ quả: đặt hành động chính to và gần; cạnh/góc màn hình "lớn vô hạn" (con trỏ dừng lại ở đó) → tốt cho menu và CTA. Số hạng `log₂(D/W + 1)` là **Chỉ số Khó (ID)** tính bằng bit.
- **Định luật Hick** — `T = a + b · log₂(n + 1)`. Thời gian quyết định tăng theo logarit số lựa chọn đồng xác suất **n**. Hệ quả: chia menu lớn thành tầng phân cấp; giảm số lựa chọn cùng lúc; hé lộ dần (progressive disclosure).
- **Định luật Miller** — trí nhớ làm việc giữ ~**7 ± 2** mục. Chia khối nội dung (số điện thoại, nhóm điều hướng); đừng coi là giới hạn cứng — cốt là "chunking", không phải con số thần kỳ.
- **Ngưỡng Doherty** — giữ phản hồi hệ thống **< 400ms** để duy trì dòng chảy và năng suất; dưới ngưỡng này người dùng làm nhanh hơn. Gắn trực tiếp với INP < 200ms.
- **Định luật Jakob** — người dùng dành phần lớn thời gian trên site *khác*, nên họ kỳ vọng site của bạn vận hành tương tự. Hệ quả: tôn trọng quy ước đã thiết lập trừ khi có bằng chứng mạnh để làm khác.
- **Định luật Tesler (Bảo toàn Độ phức tạp)** — mọi hệ thống có độ phức tạp bất khả giản; câu hỏi chỉ là ai gánh — người dùng hay lập trình viên. Đẩy về phía hệ thống khi có thể (mặc định thông minh, tự điền).
- **Nguyên lý Robustness (áp dụng cho UX)** — rộng rãi với đầu vào (chấp nhận định dạng số/ngày lộn xộn), chặt chẽ với đầu ra.

---

## 13. Lộ trình Triển khai & Lưu ý

**Lộ trình 5 giai đoạn:**
1. **Nền tảng.** File token DTCG (primitive/semantic/component); thang khoảng cách 8px; thang chữ modular gốc 16px (1.25 app / 1.333 báo chí); dải OKLCH trung tính+nhấn+semantic; áp breakpoint của framework bạn dùng. *Qua bước khi:* một nguồn sinh cả CSS + native, không còn hex/px cứng.
2. **Tiếp cận & nền tảng.** WCAG 2.2 AA: tương phản 4.5:1 / 3:1, vùng chạm 24px→44pt(iOS)/48dp(Android), `:focus-visible` ≥2px ≥3:1, bàn phím, reduced-motion, reflow@320px + phóng 200%. *Nếu native:* lấy 44pt/48dp làm sàn, không phải 24px.
3. **Ngân sách hiệu năng.** Mục tiêu thực tế LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 @ p75; cảnh báo ở 80% (LCP>2.0s, INP>160ms, CLS>0.08). AVIF+WebP + kích thước tường minh, ảnh LCP eager, `font-display:swap` + font dự phòng theo số đo + WOFF2. *Nếu INP trượt:* cắt JS/tác vụ dài trước khi tối ưu ảnh.
4. **Chuyển động & thành phần.** Token hóa motion (50–1000ms, standard `cubic-bezier(0.2,0,0,1)`) kèm hệ số reduced-motion; đặc tả đủ trạng thái mỗi thành phần; ghi tài liệu trong Storybook/zeroheight.
5. **Đa ngôn ngữ.** Tiếng Việt: kiểm tra độ phủ Latin Extended Additional, thêm line-height cho dấu chồng. Trung Phồn thể: dùng font TC theo vùng (không pan-CJK), line-height ~1.7, subset bằng `unicode-range`. *Nếu thị trường CJK:* coi phân phối font là hạng mục hiệu năng.

**Lưu ý (bắt buộc vs quy ước):**
- Lưới 8pt là bắt buộc ở Material nhưng chỉ là *quy ước* ở Apple; "45–75 ký tự/dòng" và "200–500ms tối ưu" là kinh nghiệm, không phải hằng số chuẩn.
- Lợi thế AVIF so với WebP ~10–12% (thử nghiệm có kiểm soát), không lớn; lợi lớn là so với JPEG/PNG cũ.
- Con số tỷ lệ thoát/chuyển đổi gắn với CWV đến từ nhà cung cấp SEO/hiệu năng — mang tính định hướng, không chính xác. Tỷ lệ đạt đã kiểm toán (77% INP tốt trên mobile, Almanac 2025) đến từ HTTP Archive/Google.
- APCA là mục tiêu di động (bị đưa về "Placeholder" trong nháp WCAG 3.0 06/2023); ngưỡng Lc từ tài liệu APCA/ARC; vai trò cuối trong WCAG 3.0 chưa chốt (~2030).
- Chuyển động Material 3: từ M3 Expressive (05/2025), spring là hệ chính được tài liệu hoá, easing/duration là dự phòng — kiểm tra bộ công cụ của bạn dùng loại nào.
- Giá trị breakpoint khác nhau theo framework/phiên bản — xác nhận theo bản bạn triển khai.

---

## 14. Phản mẫu Thiết kế thời đại AI

Công cụ AI thường sinh hai loại lỗi, và cần biết bạn đang xử lý loại nào:

- **VIOLATION (Vi phạm)** 🔒 — lỗi khách quan, kiểm chứng được theo một quy tắc WCAG 2.2 / HIG cụ thể. Đáng để chặn ở CI.
- **TELL (Dấu hiệu)** 📐 — tín hiệu thẩm mỹ chủ quan lộ rõ "do máy tạo." Không phải lỗi tuân thủ, nhưng làm mất bản sắc thương hiệu và có thể *kéo theo* một vi phạm.

**Cấp 1 — lỗi thị giác & CSS:**

| Mục | Loại | Sửa |
|---|---|---|
| **Vòng focus chồng** — `border` + `outline` + `box-shadow` chồng nhau | VIOLATION (2.4.11/2.4.13) | một vòng `:focus-visible`, ≥2px, ≥3:1 |
| **Chữ xám thiếu tương phản** — `#999` trên `#fff`; ~84% trang chủ (WebAIM Million) | VIOLATION (1.4.3) | ≥4.5:1 (3:1 chữ lớn/UI) |
| **Animation vô tội vạ** — cái gì cũng động, bỏ qua reduced-motion; gồm hero gõ chữ, trường hạt, vệt con trỏ | VIOLATION (2.3.3) | chỉ animate khi có nghĩa; tôn trọng `prefers-reduced-motion` |
| **Emoji làm icon** — 🚀🔥 làm nút; hiển thị + tên đọc màn hình khác nhau | VIOLATION (1.1.1) | SVG inline + nhãn thật |
| **Placeholder làm nhãn** — gợi ý biến mất khi gõ | VIOLATION (3.3.2/4.1.2) | `<label>` cố định, liên kết theo mã |
| **Lạm dụng halo / glow** — nhiều bóng màu chồng | TELL | thang độ nổi trung tính, một nguồn sáng |
| **Gradient tím→chàm** — `#667eea → #764ba2` indigo mặc định | TELL | token thương hiệu (tác giả Tailwind đã công khai xin lỗi năm 2025 vì mặc định indigo-500 "khiến mọi UI do AI tạo trên đời cũng tím indigo") |
| **Glassmorphism khắp nơi** — `backdrop-filter` tràn lan, tương phản động fail, tốn GPU | TELL | 2–3 bề mặt kính + lớp phủ, không mặc định (vật liệu nền tảng như Liquid Glass của Apple do HIG quản — kính CSS trang trí thì không) |
| **Spacing tùy tiện / bo góc quá đà** — `mt-[13px]`, bo góc lẫn lộn | TELL | thang token |
| **Dark mode `#000`/`#fff` thuần** — chói (halation) với loạn thị | TELL | nền `#121212` + chữ `#E4E4E7` |
| **Font mặc định na ná nhau** — bộ Inter/Roboto/Space Grotesk theo phản xạ, không chiến lược ghép cặp | TELL | cặp typeface có chủ đích gắn với thương hiệu (§3) |
| **Tiêu đề chữ-gradient** — `background-clip: text` trên nền gradient | TELL | mực đặc / token thương hiệu — chữ gradient không có tương phản tính được, 1.4.3 có thể fail ngầm |
| **Ảnh AI công nghiệp** — minh họa bóng nhựa quá đối xứng, blob gradient 3D, ảnh đội ngũ giả ánh sáng phi thực | TELL | ảnh sản phẩm thật hoặc hệ minh họa có chủ đích |
| **Điều khiển chết** — link `href="#"`, CTA không nối vào đâu | TELL | mọi điều khiển làm đúng điều nó nói, hoặc ship dạng disabled kèm lý do |

**Cấp 2 — bệnh UX & sản phẩm:**

- **Mặc định bất khả tiếp cận** 🔒 — `<div onClick>` thay vì `<button>`, thiếu ARIA/bàn phím → HTML ngữ nghĩa (4.1.2).
- **"AI slop" / na ná nhau** 📐 — bộ khung template: hero căn giữa + lưới card bo tròn đều tăm tắp + dải logo + carousel lời chứng thực + bento-theo-mặc-định, dáng vẻ shadcn/Tailwind mặc định, theme tối viền glow "cao cấp" theo phản xạ. Áp "thử bỏ logo": có bị nhầm với đối thủ? → dựng hệ thương hiệu trước; dark mode là một theme, không phải mặc định.
- **Nhồi chatbot** 📐 — gắn chat vào nơi thao tác trực tiếp nhanh hơn → UI tác vụ; chỉ dùng chat khi giúp diễn đạt ý định.
- **Gắn tính năng AI cho có** 📐 — nút ✨ để tiếp thị → chỉ làm khi nhu cầu người dùng × thế mạnh AI (Google PAIR).
- **Tự động hóa quá / mất kiểm soát** 🔒 — không undo/giám sát, thiên kiến tự động → giữ người trong vòng lặp, điều khiển toàn cục (MS HAX, HIG).
- **Dark pattern tự phát** 🔒 — khẩn cấp giả / phí ẩn; 55.8% trong 1K thành phần TMĐT do LLM tạo chứa ít nhất một dark pattern (arXiv 2502.13499 v2, "Deception at Scale", 2026) → kiểm toán + cấm.
- **Nội dung bịa bị phát hành** 📐 — lorem ipsum, số liệu/thuật ngữ bịa, lời chứng thực hay dải logo "được tin dùng" tự chế → không phát hành placeholder hay bằng chứng xã hội bịa; kiểm chứng.
- **Thiếu minh bạch AI** 🔒 — không tiết lộ / độ tin cậy / cách kiểm chứng → gắn nhãn AI, hiện nguồn + undo (HIG, PAIR, MS G11).

**Khắc phục (ba tầng):**
1. **Chặn VIOLATION ở CI** — kiểm tra tự động tương phản (1.4.3), focus (2.4.7/2.4.11), nhãn (3.3.2/4.1.2), reduced-motion và vai trò ngữ nghĩa — fail thì chặn build. Công cụ chỉ bắt ~57% lỗi, nên thêm lượt kiểm bằng bàn phím + trình đọc màn hình. *(Đây chính là việc `@norma/design-lint` làm — xem repo.)*
2. **Hệ thống hóa đầu vào** — cấp cho agent file token 3 tầng cùng các file rule (`AGENTS.md`, `.cursor/rules/*.mdc`, `.github/copilot-instructions.md`) bắt buộc HTML ngữ nghĩa, một vòng focus, chỉ dùng token cho màu/khoảng cách, và anti-default rõ ràng ("không gradient indigo, không chỉ Inter, không px tùy tiện, không glass mặc định").
3. **Quản trị tầng sản phẩm** — biện minh mỗi tính năng AI (nhu cầu × thế mạnh AI); bắt buộc tiết lộ + độ tin cậy + undo/giám sát; kiểm toán TMĐT/biểu mẫu theo phân loại dark pattern; cấm nội dung bịa.

---

## Nguồn (authoritative primary sources)

- **W3C WCAG 2.2** — Recommendation 2023-10-05, updated 2024-12-12; ISO/IEC 40500:2025 · https://www.w3.org/TR/WCAG22/
- **W3C WAI-ARIA Authoring Practices Guide (APG)** — role, trạng thái & mẫu bàn phím của widget · https://www.w3.org/WAI/ARIA/apg/
- **W3C Design Tokens Format Module** (DTCG), v2025.10 (stable) · https://www.designtokens.org/TR/2025.10/format/
- **Apple Human Interface Guidelines** · https://developer.apple.com/design/human-interface-guidelines/
- **Google Material Design 3** · https://m3.material.io/ · Motion tokens: material-components-android (GitHub) `docs/theming/Motion.md`
- **web.dev / Chrome — Core Web Vitals & INP** · https://web.dev/articles/vitals · "INP becomes a Core Web Vital on March 12" (2024-01-31)
- **HTTP Archive Web Almanac 2025 — Performance** · https://almanac.httparchive.org/en/2025/performance
- **OKLCH / OKLab** — Björn Ottosson (2020) · https://bottosson.github.io/posts/oklab/ · APCA: https://git.apcacontrast.com/
- **CSS Values and Units Level 4** (clamp/fluid) · https://www.w3.org/TR/css-values-4/
- **Các module CSS dựa vào** — Grid L1/L2 (subgrid), Flexbox L1, Containment L3 (container query), Color 4 & 5 (oklch/color-mix/light-dark), Logical Properties L1, Media Queries L5 (forced-colors/prefers-*), Cascade Layers & Nesting · https://www.w3.org/TR/?tag=css
- **Web Platform Baseline / web-features** — nguồn xác định trạng thái interop "feature X có Baseline tính đến NGÀY" · https://web.dev/baseline
- **W3C ACT Rules + ARIA in HTML** — chuẩn hoá các kiểm tra a11y tĩnh · https://www.w3.org/WAI/standards-guidelines/act/rules/ · https://www.w3.org/TR/html-aria/
- **GOV.UK Design System & U.S. Web Design System (USWDS)** — hướng dẫn component + biểu mẫu dựa trên bằng chứng · https://design-system.service.gov.uk/ · https://designsystem.digital.gov/
- **ECMA-402 (Intl) · Unicode CLDR · RFC 5646 (BCP-47) · UAX #9 (bidi) / #14 (ngắt dòng)** — nguồn i18n · https://tc39.es/ecma402/ · https://cldr.unicode.org/
- **ISO 9241** (ergonomics tương tác người–hệ thống) & **10 Heuristic của Nielsen** — tầng chuẩn dưới Laws of UX · https://www.nngroup.com/articles/ten-usability-heuristics/
- **Laws of UX** (Fitts, Hick, Miller, Doherty, Jakob, Tesler) · https://lawsofux.com/

> **Ghi chú về trích dẫn:** Các mandate số (tỷ lệ WCAG, ngưỡng CWV, kích thước vùng chạm, token chuyển động Material, khóa DTCG) đều truy được về các spec gốc ở trên. Một số con số (thang khoảng cách, tỷ lệ thang chữ, dải animation "tối ưu", số ký tự mỗi dòng) là quy ước được áp dụng rộng rãi, không có một cơ quan chuẩn duy nhất, và được đánh dấu 📐 xuyên suốt.
