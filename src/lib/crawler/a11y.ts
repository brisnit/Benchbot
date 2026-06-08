import type { A11yReport } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Self-contained accessibility evaluator run INSIDE the page via
// page.evaluate(). It must not reference any module-scope variables (Playwright
// serialises the function), so everything it needs is defined within. Covers
// the DOM-observable WCAG signals: language, title, alt text, form labels,
// accessible names, headings, landmarks, skip links, zoom, tabindex, link text,
// iframe titles, ARIA usage and a sampled colour-contrast check.
// ─────────────────────────────────────────────────────────────

export function evaluateA11y(): A11yReport {
  type Check = A11yReport["checks"][number];
  const checks: Check[] = [];
  const doc = document;

  const langAttr = doc.documentElement.getAttribute("lang");
  const hasLang = !!langAttr;
  checks.push({
    id: "lang",
    label: "Page language declared",
    status: hasLang ? "pass" : "fail",
    detail: hasLang ? `lang="${langAttr}"` : "No lang attribute on <html> — assistive tech can't pick the correct voice.",
  });

  const hasTitle = !!doc.title && doc.title.trim().length > 0;
  checks.push({
    id: "title",
    label: "Document title",
    status: hasTitle ? "pass" : "fail",
    detail: hasTitle ? doc.title : "Page has no <title>.",
  });

  // Images & alt text (null alt = missing; empty alt = decorative, acceptable)
  const imgs = Array.from(doc.querySelectorAll("img"));
  const totalImages = imgs.length;
  const missingAlt = imgs.filter((i) => !i.hasAttribute("alt")).length;
  const altCoverage = totalImages ? Math.round(((totalImages - missingAlt) / totalImages) * 100) : 100;
  checks.push({
    id: "alt",
    label: "Image alt text",
    status: missingAlt === 0 ? "pass" : missingAlt <= 2 ? "warn" : "fail",
    detail: `${missingAlt} of ${totalImages} images missing an alt attribute.`,
    count: missingAlt,
  });

  // Form controls & accessible names
  const controls = Array.from(doc.querySelectorAll("input, select, textarea")).filter((el) => {
    const t = (el as HTMLInputElement).type;
    return t !== "hidden" && t !== "submit" && t !== "button" && t !== "reset";
  });
  const totalInputs = controls.length;
  const labelled = (el: Element): boolean => {
    if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title")) return true;
    const id = el.getAttribute("id");
    try {
      if (id && doc.querySelector(`label[for="${CSS.escape(id)}"]`)) return true;
    } catch {
      /* invalid id */
    }
    if (el.closest("label")) return true;
    return false;
  };
  const unlabeled = controls.filter((c) => !labelled(c)).length;
  const labelCoverage = totalInputs ? Math.round(((totalInputs - unlabeled) / totalInputs) * 100) : 100;
  checks.push({
    id: "labels",
    label: "Form field labels",
    status: totalInputs === 0 ? "info" : unlabeled === 0 ? "pass" : unlabeled <= 2 ? "warn" : "fail",
    detail: totalInputs === 0 ? "No form controls on this page." : `${unlabeled} of ${totalInputs} controls lack an accessible label.`,
    count: unlabeled,
  });

  // Accessible names on links/buttons
  const interactives = Array.from(doc.querySelectorAll("a[href], button, [role=button]"));
  const noName = interactives.filter((el) => {
    if ((el.textContent || "").trim()) return false;
    if (el.getAttribute("aria-label") || el.getAttribute("title")) return false;
    if (el.querySelector("img[alt]:not([alt=''])")) return false;
    return true;
  }).length;
  checks.push({
    id: "names",
    label: "Links & buttons named",
    status: noName === 0 ? "pass" : noName <= 2 ? "warn" : "fail",
    detail: `${noName} links/buttons have no accessible name (e.g. icon-only without aria-label).`,
    count: noName,
  });

  // Headings
  const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"));
  const h1Count = doc.querySelectorAll("h1").length;
  let skips = 0;
  let prev = 0;
  for (const h of headings) {
    const lvl = parseInt(h.tagName[1], 10);
    if (prev && lvl > prev + 1) skips++;
    prev = lvl;
  }
  checks.push({
    id: "h1",
    label: "Single top-level heading",
    status: h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warn",
    detail: h1Count === 1 ? "Exactly one <h1>." : h1Count === 0 ? "No <h1> found." : `${h1Count} <h1> elements (should be one).`,
    count: h1Count,
  });
  checks.push({
    id: "headingorder",
    label: "Logical heading order",
    status: skips === 0 ? "pass" : "warn",
    detail: skips === 0 ? "No skipped heading levels." : `${skips} skipped heading level(s).`,
    count: skips,
  });

  // Landmarks
  const landmarkDefs: [string, string][] = [
    ["main", "main, [role=main]"],
    ["nav", "nav, [role=navigation]"],
    ["header", "header, [role=banner]"],
    ["footer", "footer, [role=contentinfo]"],
  ];
  const present = landmarkDefs.filter(([, sel]) => doc.querySelector(sel)).map(([name]) => name);
  const landmarksPresent = present.length;
  const hasMain = present.includes("main");
  checks.push({
    id: "landmarks",
    label: "Landmark regions",
    status: landmarksPresent >= 3 ? "pass" : landmarksPresent >= 1 ? "warn" : "fail",
    detail: `${present.join(", ") || "none"} present.`,
    count: landmarksPresent,
  });
  checks.push({
    id: "main",
    label: "Main content landmark",
    status: hasMain ? "pass" : "fail",
    detail: hasMain ? "Has a <main> region." : "No <main> landmark for screen-reader navigation.",
  });

  // Skip link
  const skipLink = Array.from(doc.querySelectorAll("a[href^='#']"))
    .slice(0, 6)
    .some((a) => /skip|main|content/i.test(a.textContent || ""));
  checks.push({
    id: "skiplink",
    label: "Skip-to-content link",
    status: skipLink ? "pass" : "warn",
    detail: skipLink ? "Skip link detected." : "No skip-to-content link found.",
  });

  // Viewport zoom
  const vp = doc.querySelector("meta[name=viewport]")?.getAttribute("content") || "";
  const zoomDisabled = /user-scalable\s*=\s*no/i.test(vp) || /maximum-scale\s*=\s*1(\.0)?\b/i.test(vp);
  checks.push({
    id: "zoom",
    label: "Pinch-zoom allowed",
    status: zoomDisabled ? "fail" : "pass",
    detail: zoomDisabled ? "Zoom disabled in viewport meta — fails WCAG 1.4.4." : "Users can zoom the page.",
  });

  // Positive tabindex
  const posTab = Array.from(doc.querySelectorAll("[tabindex]")).filter(
    (el) => parseInt(el.getAttribute("tabindex") || "0", 10) > 0,
  ).length;
  checks.push({
    id: "tabindex",
    label: "No positive tabindex",
    status: posTab === 0 ? "pass" : "warn",
    detail: posTab === 0 ? "No positive tabindex values." : `${posTab} element(s) use positive tabindex (disrupts focus order).`,
    count: posTab,
  });

  // Ambiguous link text
  const ambiguous = Array.from(doc.querySelectorAll("a[href]")).filter((a) =>
    /^(click here|read more|learn more|here|more|details)$/i.test((a.textContent || "").trim()),
  ).length;
  checks.push({
    id: "linktext",
    label: "Descriptive link text",
    status: ambiguous === 0 ? "pass" : "warn",
    detail: ambiguous === 0 ? "No vague link text." : `${ambiguous} vague links ("click here" / "read more").`,
    count: ambiguous,
  });

  // Iframe titles
  const iframes = Array.from(doc.querySelectorAll("iframe"));
  if (iframes.length) {
    const iframesNoTitle = iframes.filter((f) => !f.getAttribute("title")).length;
    checks.push({
      id: "iframetitle",
      label: "Iframe titles",
      status: iframesNoTitle === 0 ? "pass" : "warn",
      detail: `${iframesNoTitle} of ${iframes.length} iframes missing a title.`,
      count: iframesNoTitle,
    });
  }

  // ARIA usage
  let ariaCount = 0;
  doc.querySelectorAll("*").forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      if (a.name === "role" || a.name.startsWith("aria-")) ariaCount++;
    }
  });
  checks.push({
    id: "aria",
    label: "ARIA roles / attributes",
    status: "info",
    detail: `${ariaCount} ARIA role/attribute usages found.`,
    count: ariaCount,
  });

  // Sampled colour contrast (WCAG AA)
  const parseRGB = (s: string) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] };
  };
  const lum = (c: { r: number; g: number; b: number }) => {
    const f = (v: number) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
    const L1 = lum(a);
    const L2 = lum(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  };
  const effBg = (el: Element) => {
    let e: Element | null = el;
    while (e) {
      const c = parseRGB(getComputedStyle(e).backgroundColor);
      if (c && c.a !== 0) return c;
      e = e.parentElement;
    }
    return { r: 255, g: 255, b: 255 };
  };
  const textEls = Array.from(
    doc.querySelectorAll("p,span,a,li,h1,h2,h3,h4,h5,h6,button,label,td,th,strong,em"),
  )
    .filter((el) => {
      const hasText = Array.from(el.childNodes).some(
        (n) => n.nodeType === 3 && (n.textContent || "").trim().length > 1,
      );
      if (!hasText) return false;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none" || parseFloat(st.opacity) === 0) return false;
      const rect = (el as HTMLElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .slice(0, 120);
  let contrastIssues = 0;
  let contrastSampled = 0;
  for (const el of textEls) {
    const st = getComputedStyle(el);
    const fg = parseRGB(st.color);
    if (!fg) continue;
    const bg = effBg(el);
    const size = parseFloat(st.fontSize);
    const bold = st.fontWeight === "bold" || parseInt(st.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const min = large ? 3 : 4.5;
    contrastSampled++;
    if (ratio(fg, bg) < min) contrastIssues++;
  }
  checks.push({
    id: "contrast",
    label: "Text contrast (sampled)",
    status: contrastIssues === 0 ? "pass" : contrastIssues <= 3 ? "warn" : "fail",
    detail: `${contrastIssues} of ${contrastSampled} sampled text elements fall below WCAG AA contrast.`,
    count: contrastIssues,
  });

  // Composite score
  let score = 100;
  if (!hasLang) score -= 8;
  if (!hasTitle) score -= 6;
  score -= Math.round((1 - altCoverage / 100) * 15);
  score -= Math.round((1 - labelCoverage / 100) * 15);
  score -= Math.min(20, contrastIssues * 2);
  if (h1Count !== 1) score -= 5;
  if (!hasMain) score -= 6;
  if (!skipLink) score -= 3;
  if (zoomDisabled) score -= 6;
  score -= Math.min(10, noName);
  if (posTab > 0) score -= 3;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    altCoverage,
    totalImages,
    labelCoverage,
    totalInputs,
    contrastSampled,
    contrastIssues,
    landmarksPresent,
    h1Count,
    hasLang,
    ariaCount,
    checks,
  };
}
