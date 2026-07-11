import type { HTMLElement } from "node-html-parser";
import type { Check, Finding } from "../types.js";
import { elementLine } from "../parse.js";
import {
  elDisabled, mk, labelledInputs, NON_TEXT_INPUT, semanticControlJsx, SEMANTIC, EMOJI, EMOJI_STRIP,
  inlinePx, INTERACTIVE, nonEmptyAttr, accessibleText, isExternalUrl, isFullDocument, notInTemplate,
  mainRelated, GENERIC_NAMES, isValidRole, isInteractiveEl,
} from "./helpers.js";

// ---------- HTML checks ----------
export const formLabel: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const ok = labelledInputs(ctx.dom);
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("input, select, textarea").forEach((el) => {
    const type = (el.getAttribute("type") ?? "text").toLowerCase();
    if (NON_TEXT_INPUT.has(type)) return;
    if (ok.has(el) || elDisabled(el, r.id)) return;
    const ph = el.hasAttribute("placeholder");
    out.push(mk(ctx, r, elementLine(ctx, el),
      ph ? `<${el.rawTagName}> uses a placeholder as its only label.` : `<${el.rawTagName}> has no associated label.`,
      ph ? `<${el.rawTagName}> dùng placeholder làm nhãn duy nhất.` : `<${el.rawTagName}> không có nhãn liên kết.`));
  });
  return out;
};

export const semanticControl: Check = (ctx, rules) => {
  if (ctx.type === "jsx") return semanticControlJsx(ctx, rules);
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("[onclick]").forEach((el) => {
    const tag = el.rawTagName?.toUpperCase() ?? "";
    // <a> counts as semantic only with an href — an href-less <a onclick> has no link role
    // (mirrors the a[href] in the INTERACTIVE selector below). An explicit ARIA retrofit
    // (role + tabindex) satisfies 4.1.2, so conforming markup is not flagged.
    const retrofitted = el.hasAttribute("tabindex") && (el.getAttribute("role") ?? "").trim() !== "";
    const isSemantic = tag === "A" ? (el.hasAttribute("href") || retrofitted) : SEMANTIC.has(tag);
    if (isSemantic || elDisabled(el, r.id)) return;
    if (tag === "A") {
      out.push(mk(ctx, r, elementLine(ctx, el),
        `<a onclick> without href exposes no link role — use <button> or add a real href.`,
        `<a onclick> không có href nên không có role liên kết — dùng <button> hoặc thêm href thật.`));
    } else {
      out.push(mk(ctx, r, elementLine(ctx, el),
        `<${el.rawTagName} onclick> is not a semantic control — use <button> or <a>.`,
        `<${el.rawTagName} onclick> không phải điều khiển ngữ nghĩa — dùng <button> hoặc <a>.`));
    }
  });
  return out;
};

export const emojiIcon: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("button, a, [role=button]").forEach((el) => {
    if (!EMOJI.test(el.text)) return;
    const named = el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") || el.hasAttribute("title");
    const visibleText = el.text.replace(EMOJI_STRIP, "").trim(); // text left after removing the emoji glyphs
    if (named || visibleText.length > 0 || elDisabled(el, r.id)) return; // an accessible name is present
    out.push(mk(ctx, r, elementLine(ctx, el),
      `Interactive <${el.rawTagName}> uses an emoji with no text or aria label.`,
      `<${el.rawTagName}> tương tác dùng emoji mà không có nhãn chữ/aria.`));
  });
  return out;
};

export const imgDimensions: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("img").forEach((el) => {
    const style = el.getAttribute("style") ?? "";
    // Inline width/height reserve space just as well as the attributes (consistent with targetSize).
    const hasWH = (el.hasAttribute("width") && el.hasAttribute("height"))
      || (inlinePx(style, "width") != null && inlinePx(style, "height") != null);
    const ar = /aspect-ratio/i.test(style);
    if (hasWH || ar || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<img> has no width/height or aspect-ratio — reserve space to prevent CLS.`,
      `<img> thiếu width/height hoặc aspect-ratio — đặt sẵn kích thước để chống CLS.`));
  });
  return out;
};

export const imgAlt: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("img").forEach((el) => {
    if (el.hasAttribute("alt") || elDisabled(el, r.id)) return; // alt="" (decorative) is allowed; a MISSING alt is not
    const role = (el.getAttribute("role") ?? "").toLowerCase();
    if (el.getAttribute("aria-hidden") === "true" || role === "presentation" || role === "none") return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<img> has no alt attribute — add alt text (alt="" if purely decorative).`,
      `<img> không có thuộc tính alt — thêm alt (alt="" nếu chỉ trang trí).`));
  });
  return out;
};

export const headingOrder: Check = (ctx, rules) => {
  if (!ctx.dom || !/<h[1-6]\b/i.test(ctx.source)) return []; // only files that actually have headings
  const r = rules[0];
  const out: Finding[] = [];
  let prev = 0;
  ctx.dom.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
    const level = parseInt((el.rawTagName ?? "").slice(1), 10);
    if (!level) return;
    if (prev && level > prev + 1 && !elDisabled(el, r.id)) {
      out.push(mk(ctx, r, elementLine(ctx, el),
        `Heading <${el.rawTagName}> skips a level (from <h${prev}>) — descend one level at a time.`,
        `<${el.rawTagName}> nhảy cấp tiêu đề (từ <h${prev}>) — chỉ xuống một cấp mỗi lần.`));
    }
    prev = level;
  });
  return out;
};

export const targetSize: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  // native_warn_px (44/48) can't be verified from HTML alone — native platform sizing is
  // an agent-enforced note carried in the rule title, not a static check.
  const min = (r.check as unknown as { min_px: number }).min_px ?? 24;
  const out: Finding[] = [];
  ctx.dom.querySelectorAll(INTERACTIVE).forEach((el) => {
    if (elDisabled(el, r.id)) return;
    const style = el.getAttribute("style") ?? "";
    const w = inlinePx(style, "min-width", "width");
    const h = inlinePx(style, "min-height", "height");
    // WCAG 2.5.8 needs a 24x24 CSS px square to fit — any known dimension below the minimum fails.
    const small: string[] = [];
    if (w != null && w < min) small.push(`${w}px wide`);
    if (h != null && h < min) small.push(`${h}px tall`);
    if (!small.length) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `Interactive <${el.rawTagName}> is ${small.join(" and ")} — below the ${min}x${min} CSS px minimum.`,
      `<${el.rawTagName}> tương tác ${small.join(" và ")} — dưới tối thiểu ${min}x${min} CSS px.`));
  });
  return out;
};

export const controlName: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("button, a[href], [role=button]").forEach((el) => {
    // aria-hidden controls are out of the a11y tree; <template> content is inert (named at clone time).
    if (el.getAttribute("aria-hidden") === "true" || el.closest("template") || elDisabled(el, r.id)) return;
    // An EMPTY aria-label/labelledby/title contributes no name per accname — require non-empty.
    const named = nonEmptyAttr(el, "aria-label") || nonEmptyAttr(el, "aria-labelledby") || nonEmptyAttr(el, "title")
      || accessibleText(el).trim().length > 0;
    if (named) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<${el.rawTagName}> has no accessible name — add text content or an aria-label (SR users hear only "${(el.rawTagName ?? "").toLowerCase() === "a" ? "link" : "button"}").`,
      `<${el.rawTagName}> không có tên tiếp cận — thêm chữ hoặc aria-label (trình đọc màn hình chỉ đọc "${(el.rawTagName ?? "").toLowerCase() === "a" ? "liên kết" : "nút"}").`));
  });
  return out;
};

// ---------- AI-tell markup/style checks ----------
export const deadHref: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("a[href]").forEach((el) => {
    const href = (el.getAttribute("href") ?? "").trim();
    if ((href !== "#" && href !== "") || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<a href="${href}"> is wired to nothing — link to a real target or use a <button>.`,
      `<a href="${href}"> không nối vào đâu — trỏ tới đích thật hoặc dùng <button>.`));
  });
  return out;
};

export const positiveTabindex: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("[tabindex]").forEach((el) => {
    const n = parseInt((el.getAttribute("tabindex") ?? "").trim(), 10);
    if (!(n >= 1) || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<${el.rawTagName} tabindex="${n}"> forces tab order — use tabindex="0"/"-1" and DOM order instead.`,
      `<${el.rawTagName} tabindex="${n}"> ép thứ tự tab — dùng tabindex="0"/"-1" và thứ tự DOM.`));
  });
  return out;
};

// ---------- frontend-markup security checks ----------
export const externalRel: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("a[target]").forEach((el) => {
    if ((el.getAttribute("target") ?? "").toLowerCase() !== "_blank") return;
    if (!isExternalUrl(el.getAttribute("href") ?? "")) return; // only external links
    const rel = (el.getAttribute("rel") ?? "").toLowerCase();
    if (rel.includes("noopener") || rel.includes("noreferrer") || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `External <a target="_blank"> has no rel="noopener" — reverse-tabnabbing risk.`,
      `<a target="_blank"> ra ngoài thiếu rel="noopener" — rủi ro reverse-tabnabbing.`));
  });
  return out;
};

export const sri: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("script").forEach((el) => {
    const src = el.getAttribute("src") ?? "";
    if (!isExternalUrl(src) || el.hasAttribute("integrity") || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `External <script src> has no Subresource Integrity (integrity=...).`,
      `<script src> ngoài thiếu Subresource Integrity (integrity=...).`));
  });
  ctx.dom.querySelectorAll("link").forEach((el) => {
    const rel = (el.getAttribute("rel") ?? "").toLowerCase();
    if (!/stylesheet|preload|modulepreload/.test(rel)) return;
    if (!isExternalUrl(el.getAttribute("href") ?? "") || el.hasAttribute("integrity") || elDisabled(el, r.id)) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `External <link rel="${rel}"> has no Subresource Integrity (integrity=...).`,
      `<link rel="${rel}"> ngoài thiếu Subresource Integrity (integrity=...).`));
  });
  return out;
};

// ---------- structure / enforcement of the expanded reference content ----------
export const landmarkMain: Check = (ctx, rules) => {
  if (!isFullDocument(ctx)) return [];
  const r = rules[0];
  const mains = ctx.dom!.querySelectorAll("main, [role=main]").filter(notInTemplate);
  if (mains.length === 1) return [];
  const html = ctx.dom!.querySelector("html");
  if (!html || elDisabled(html, r.id)) return [];
  const line = mains.length > 1 ? elementLine(ctx, mains[1]) : elementLine(ctx, html);
  return [mk(ctx, r, line,
    mains.length === 0
      ? "Document has no <main> landmark — SR users can't jump to the main content."
      : `Document has ${mains.length} <main> landmarks — there must be exactly one.`,
    mains.length === 0
      ? "Tài liệu không có landmark <main> — người dùng SR không nhảy tới nội dung chính được."
      : `Tài liệu có ${mains.length} landmark <main> — phải đúng một.`)];
};

export const skipLink: Check = (ctx, rules) => {
  if (!isFullDocument(ctx)) return [];
  const r = rules[0];
  const main = ctx.dom!.querySelectorAll("main, [role=main]").filter(notInTemplate)[0];
  if (!main || elDisabled(main, r.id)) return []; // no <main> → a11y.landmark-main owns that gap
  const byId = new Map<string, HTMLElement>();
  for (const el of ctx.dom!.querySelectorAll("[id]").filter(notInTemplate)) {
    const id = el.getAttribute("id");
    if (id && !byId.has(id)) byId.set(id, el);
  }
  // A valid skip link is an in-page <a href="#id"> whose target is at/around the main content. First-
  // focusable / visible-on-focus can't be checked statically, so this ships at warn (heuristic presence).
  const hasSkip = ctx.dom!.querySelectorAll("a[href]").filter(notInTemplate).some((a) => {
    const href = (a.getAttribute("href") ?? "").trim();
    if (!href.startsWith("#") || href.length < 2) return false; // "#" / "" is not a real bypass target
    const target = byId.get(href.slice(1));
    return !!target && mainRelated(target, main);
  });
  if (hasSkip) return [];
  return [mk(ctx, r, elementLine(ctx, main),
    "Document has a <main> but no skip link — add a first-focusable \"Skip to main content\" link to #main (WCAG 2.4.1, Level A).",
    "Tài liệu có <main> nhưng thiếu skip link — thêm liên kết \"Bỏ qua tới nội dung chính\" focus-đầu-tiên tới #main (WCAG 2.4.1, Mức A).")];
};

export const singleH1: Check = (ctx, rules) => {
  if (!isFullDocument(ctx)) return [];
  const r = rules[0];
  const h1s = ctx.dom!.querySelectorAll("h1").filter(notInTemplate);
  if (h1s.length === 1) return [];
  const html = ctx.dom!.querySelector("html");
  if (!html || elDisabled(html, r.id)) return [];
  const line = h1s.length > 1 ? elementLine(ctx, h1s[1]) : elementLine(ctx, html);
  return [mk(ctx, r, line,
    h1s.length === 0
      ? "Document has no <h1> — every page needs one top-level heading."
      : `Document has ${h1s.length} <h1> headings — use exactly one; demote the rest.`,
    h1s.length === 0
      ? "Tài liệu không có <h1> — mỗi trang cần một tiêu đề cấp cao nhất."
      : `Tài liệu có ${h1s.length} <h1> — chỉ dùng một; hạ cấp phần còn lại.`)];
};

export const fieldsetGroup: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  // Radio/checkbox grouping is scoped to the owning <form> (or the document for form-less controls),
  // so key by (form, name) — two separate forms sharing a name are NOT one group.
  const DOC = {};
  const groups = new Map<unknown, Map<string, HTMLElement[]>>();
  ctx.dom.querySelectorAll("input[type=radio], input[type=checkbox]").forEach((el) => {
    const name = el.getAttribute("name");
    if (!name || el.closest("template")) return;
    const formKey = el.closest("form") ?? DOC;
    let byName = groups.get(formKey);
    if (!byName) { byName = new Map(); groups.set(formKey, byName); }
    (byName.get(name) ?? byName.set(name, []).get(name)!).push(el);
  });
  const allGroups = [...groups.values()].flatMap((byName) => [...byName.entries()]);
  for (const [name, els] of allGroups) {
    if (els.length < 2) continue;
    const grouped = els.every((el) => el.closest("fieldset") || el.closest("[role=group]") || el.closest("[role=radiogroup]"));
    if (grouped || elDisabled(els[0], r.id)) continue;
    out.push(mk(ctx, r, elementLine(ctx, els[0]),
      `The "${name}" radio/checkbox group isn't in a <fieldset> + <legend> — the group name is lost to screen readers (1.3.1).`,
      `Nhóm radio/checkbox "${name}" không nằm trong <fieldset> + <legend> — trình đọc màn hình mất tên nhóm (1.3.1).`));
  }
  return out;
};

export const genericLinkText: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("a[href], button").forEach((el) => {
    if (el.getAttribute("aria-hidden") === "true" || elDisabled(el, r.id)) return;
    const label = (el.getAttribute("aria-label") ?? "").trim() || accessibleText(el).trim();
    if (!GENERIC_NAMES.has(label.toLowerCase())) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      `<${el.rawTagName}> text "${label}" isn't descriptive out of context — say where it goes (WCAG 2.4.4).`,
      `Chữ "${label}" của <${el.rawTagName}> không mô tả khi tách ngữ cảnh — nói rõ nó dẫn tới đâu (WCAG 2.4.4).`));
  });
  return out;
};

export const iframeTitle: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("iframe").forEach((el) => {
    if (el.closest("template") || el.getAttribute("aria-hidden") === "true" || el.hasAttribute("hidden") || elDisabled(el, r.id)) return;
    if (nonEmptyAttr(el, "title") || nonEmptyAttr(el, "aria-label") || nonEmptyAttr(el, "aria-labelledby")) return;
    out.push(mk(ctx, r, elementLine(ctx, el),
      "<iframe> has no title — screen readers announce it as an unnamed frame (WCAG 4.1.2).",
      "<iframe> không có title — trình đọc màn hình đọc là frame vô danh (WCAG 4.1.2)."));
  });
  return out;
};

export const tableHeaders: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("table").forEach((el) => {
    const role = (el.getAttribute("role") ?? "").toLowerCase();
    if (role === "presentation" || role === "none" || elDisabled(el, r.id)) return; // layout tables exempt
    // Attribute cells to their nearest enclosing <table> so a nested table's <th> doesn't mask a header-less outer table.
    const owns = (tag: string) => el.querySelectorAll(tag).filter((c) => c.closest("table") === el);
    if (owns("td").length === 0 || owns("th").length > 0) return; // no data cells, or has its own headers
    out.push(mk(ctx, r, elementLine(ctx, el),
      "<table> has data cells but no <th> — add header cells (with scope) so the data is navigable (1.3.1).",
      "<table> có ô dữ liệu nhưng không có <th> — thêm ô tiêu đề (kèm scope) để dữ liệu điều hướng được (1.3.1)."));
  });
  return out;
};

export const duplicateIdRefs: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  // <template> content is an inert, separate node tree — its ids don't collide with the live document.
  const referenced = new Set<string>();
  ctx.dom.querySelectorAll("label[for]").filter(notInTemplate).forEach((l) => { const v = l.getAttribute("for"); if (v) referenced.add(v); });
  for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
    ctx.dom.querySelectorAll(`[${attr}]`).filter(notInTemplate).forEach((el) => {
      (el.getAttribute(attr) ?? "").trim().split(/\s+/).forEach((id) => { if (id) referenced.add(id); });
    });
  }
  if (referenced.size === 0) return [];
  const byId = new Map<string, HTMLElement[]>();
  ctx.dom.querySelectorAll("[id]").filter(notInTemplate).forEach((el) => {
    const id = el.getAttribute("id");
    if (id) (byId.get(id) ?? byId.set(id, []).get(id)!).push(el);
  });
  const out: Finding[] = [];
  for (const id of referenced) {
    const els = byId.get(id);
    if (!els || els.length < 2 || elDisabled(els[1], r.id)) continue;
    out.push(mk(ctx, r, elementLine(ctx, els[1]),
      `id="${id}" is referenced by a label/aria attribute but appears ${els.length} times — the association is ambiguous.`,
      `id="${id}" được tham chiếu bởi label/aria nhưng xuất hiện ${els.length} lần — liên kết mơ hồ.`));
  }
  return out;
};

export const invalidRole: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("[role]").forEach((el) => {
    if (el.closest("template") || elDisabled(el, r.id)) return;
    const raw = (el.getAttribute("role") ?? "").trim();
    const tokens = raw.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length || tokens.some(isValidRole)) return; // empty attr, or has a valid (fallback) token
    out.push(mk(ctx, r, elementLine(ctx, el),
      `role="${raw}" is not a valid ARIA role — it exposes no role to assistive tech (a typo silently does nothing).`,
      `role="${raw}" không phải role ARIA hợp lệ — không phơi role nào cho công nghệ trợ giúp (gõ sai âm thầm vô hiệu).`));
  });
  return out;
};

export const nestedInteractive: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("a, area, button, input, select, textarea, [role]").forEach((el) => {
    if (!isInteractiveEl(el) || el.closest("template") || elDisabled(el, r.id)) return;
    for (let p = el.parentNode as HTMLElement | null; p && p.nodeType === 1; p = p.parentNode as HTMLElement | null) {
      if (isInteractiveEl(p)) {
        out.push(mk(ctx, r, elementLine(ctx, el),
          `<${el.rawTagName}> is nested inside an interactive <${p.rawTagName}> — nested controls break keyboard focus and screen-reader semantics (4.1.2).`,
          `<${el.rawTagName}> lồng trong <${p.rawTagName}> tương tác — điều khiển lồng phá focus bàn phím và ngữ nghĩa trình đọc màn hình (4.1.2).`));
        break;
      }
    }
  });
  return out;
};

export const listStructure: Check = (ctx, rules) => {
  if (!ctx.dom) return [];
  const r = rules[0];
  const out: Finding[] = [];
  ctx.dom.querySelectorAll("ul, ol").forEach((el) => {
    if (el.closest("template") || el.hasAttribute("role") || elDisabled(el, r.id)) return; // a role override re-purposes the list
    const bad = el.childNodes.find((c) => c.nodeType === 1 && !["li", "script", "template"].includes(((c as HTMLElement).rawTagName ?? "").toLowerCase()));
    if (bad) out.push(mk(ctx, r, elementLine(ctx, el),
      `<${el.rawTagName}> has a non-<li> child <${(bad as HTMLElement).rawTagName}> — only <li> (plus <script>/<template>) may be a direct child, or the list semantics break.`,
      `<${el.rawTagName}> có con không phải <li> là <${(bad as HTMLElement).rawTagName}> — chỉ <li> (cùng <script>/<template>) được làm con trực tiếp, nếu không ngữ nghĩa danh sách hỏng.`));
  });
  return out;
};
