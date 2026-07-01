# Norma — UX/UI Technical Standards Reference

A consolidated, **bilingual (English + Tiếng Việt)** technical reference for modern app & website design standards — the concrete numbers you can drop straight into an acceptance ticket, with every value tagged as a published **mandate** or an industry **convention**.

> *Tài liệu tham khảo kỹ thuật hợp nhất, **song ngữ Anh–Việt**, về chuẩn thiết kế web & ứng dụng hiện đại — những con số cụ thể đưa thẳng vào tiêu chí nghiệm thu, mỗi giá trị được gắn nhãn **bắt buộc** hay **quy ước**.*

## What's inside · Nội dung

| File | Description · Mô tả |
|------|---------------------|
| [`index.html`](index.html) | Interactive, self-contained reference — EN/VI language toggle and live widgets: modular type-scale slider, OKLCH ramp, WCAG contrast checker, Core Web Vitals gauges, easing visualizer, Fitts/Hick charts, and a focus-ring comparison. **Zero external dependencies** — no CDN, no web fonts, no network requests; works fully offline. |
| [`REFERENCE.md`](REFERENCE.md) | The full written reference, bilingual, with primary-source citations. |

## Covers · Bao gồm

14 domains · 14 mảng: design tokens (W3C DTCG 2025.10) · spacing & the 8px grid · typography (incl. Vietnamese & CJK) · color (OKLCH, WCAG/APCA contrast) · accessibility (WCAG 2.2 AA) · Core Web Vitals (INP) · motion (Material 3 tokens) · platform guidelines (iOS HIG vs Material 3) · components & states · forms · responsive design · HCI mathematical laws (Fitts, Hick, Miller…) · **AI-era design anti-patterns** (tagged VIOLATION vs TELL).

## View it · Xem

- **Locally · Cục bộ:** open `index.html` in any browser — it works offline. *(Mở `index.html` bằng trình duyệt bất kỳ — chạy được offline.)*
- **On the web · Trên web:** enable **GitHub Pages** (Settings → Pages → deploy from `main`, root folder). The page will be live at `https://anhquanpbc.github.io/norma/`.

## Design principles · Nguyên tắc thiết kế

`index.html` is a **reference implementation of its own content**: an 8px grid, a 1.25 modular type scale, an OKLCH palette, AA contrast, a single `:focus-visible` ring, `prefers-reduced-motion` respected, and no external requests — the very standards it documents.

> *`index.html` tự tuân thủ chính nội dung nó trình bày: lưới 8px, thang chữ modular 1.25, palette OKLCH, tương phản AA, một vòng `:focus-visible`, tôn trọng `prefers-reduced-motion`, không request mạng.*

## Sources · Nguồn

W3C WCAG 2.2 · W3C Design Tokens (DTCG) · Apple Human Interface Guidelines · Google Material Design 3 · web.dev / Chrome (Core Web Vitals) · HTTP Archive Web Almanac · Laws of UX. Full list inside the documents.

## License · Giấy phép

No license yet. Add one (e.g. [MIT](https://choosealicense.com/licenses/mit/) for code or [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) for the writing) if you want others to reuse it.

> *Chưa có giấy phép. Thêm một giấy phép (ví dụ MIT cho mã, hoặc CC BY 4.0 cho phần nội dung) nếu bạn muốn người khác được phép dùng lại.*
