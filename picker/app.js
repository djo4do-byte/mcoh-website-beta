/* McAvoy O'Hara service picker — beta app
   Prices from General Price List v4 (Nov 2026 working copy). Offline; sessionStorage persistence. */

/* —— i18n: page language comes from <html lang>; English strings are the keys. ——
   Prices/numbers are never translated. Dictionaries: picker-i18n.js (window.MCOH_PICKER_I18N). */
const LANG = (document.documentElement.getAttribute("lang") || "en").slice(0, 2);
function T(s) {
  const d = (window.MCOH_PICKER_I18N || {})[LANG];
  return (d && d[s]) || s;
}

const STORAGE_KEY = "mcoh-picker-beta-v1";

const PRICES = {
  "gather-quiet": null,
  "gather-memorial": null,
  "gather-funeral": null,
  "pkg-memorial": 3020,
  "memorial-chapel-ala": 1150,
  "pkg-funeral-evergreen": 4520,
  "pkg-funeral-church": 4280,
  "pkg-funeral-chapel-church": 4680,
  "pkg-graveside": 3580,
  "chapel-first-hour": 380, /* GPL v4: “Quiet Hour” — Drawing Room */
  "chapel-add-hour": 250,
  "chapel-add-hour-late": 350,
  "chapel-up-to-2hrs": 1160,
  "style-mass": null,
  "style-funeral-svc": null,
  "style-memorial-svc": null,
  "style-procession": null,
  "style-simple": null,
  "procession-hearse": null,
  "procession-band": null,
  "motorcycle-escorts": null,
  "funeral-visiting": 1160,
  "prep-viewing": 690,
  "committal-addon": 625,
  "private-id": null, /* was 490 + first-hour 500; first-hour rate not on GPL v4 */
  "direct-cremation": 1820,
  "cremation-visitation": null,
  "cremation-funeral": null,
  "cremation-memorial": null,
  "witness-cremation": 3580,
  "memorial-later": 1150,
  "memorial-after-pkg": 3020,
  "urn-selection": null,
  "care-here": 2000,
  "shipping": 2980,
  "ship-cremains": 250,
  "distant-memorial": 1150,
  "programs": 66, /* GPL v4 combined register book / cards line */
  "ack-cards": null,
  "flower-car": 285,
  "reception": 1160,
  "incense": 200,
  "food-cleanup": 125,
  "livestream": null,
  "obituary": null,
  "crem-vis-prep": 690,
  "crem-vis-hours": 1160,
  "crem-vis-direct": 1820
};

const PRICE_LABELS = {
  "gather-quiet": T("From $380"),
  "private-id": T("Ask director"),
  "gather-memorial": T("From $1,150"),
  "gather-funeral": T("From $4,280"),
  "cremation-visitation": T("From $3,670"),
  "cremation-funeral": T("From $4,280"),
  "urn-selection": T("Ask director"),
  "livestream": T("Ask director"),
  "obituary": T("As billed"),
  "motorcycle-escorts": T("As billed"),
  "procession-band": T("Family-arranged"),
  "procession-hearse": T("As arranged"),
  "style-mass": T("Helps shape the arrangement"),
  "style-funeral-svc": T("Helps shape the arrangement"),
  "style-memorial-svc": T("Helps shape the arrangement"),
  "style-procession": T("Helps shape the arrangement"),
  "style-simple": T("Helps shape the arrangement")
};

const EXCLUSIVE_GROUPS = {
  "gather-main": true,
  "quiet-duration": true,
  "memorial-where": true,
  "funeral-style": true,
  "funeral-where": true,
  "transfer-direction": true,
  "cremation-main": true,
  "crem-memorial-where": true,
  "crem-funeral-where": true,
  "crem-funeral-style": true
};

const GATHER_PARENTS = new Set([
  "gather-quiet", "gather-memorial", "gather-funeral",
  "cremation-visitation", "cremation-funeral", "cremation-memorial"
]);

const NEST_BY_TYPE = {
  quiet: ["chapel-up-to-2hrs", "chapel-first-hour", "chapel-add-hour"],
  memorial: ["pkg-memorial", "memorial-chapel-ala"],
  funeral: [
    "style-mass", "style-funeral-svc", "style-memorial-svc", "style-procession", "style-simple",
    "pkg-funeral-evergreen", "pkg-funeral-church", "pkg-funeral-chapel-church",
    "procession-hearse", "procession-band", "motorcycle-escorts", "flower-car",
    "funeral-visiting", "prep-viewing", "committal-addon"
  ],
  graveside: [],
  "crem-visitation": ["crem-vis-prep", "crem-vis-hours", "crem-vis-direct", "chapel-first-hour", "chapel-add-hour"],
  "crem-funeral": [
    "style-mass", "style-funeral-svc", "style-memorial-svc", "style-procession", "style-simple",
    "pkg-funeral-evergreen", "pkg-funeral-church", "pkg-funeral-chapel-church",
    "procession-hearse", "procession-band", "motorcycle-escorts", "flower-car",
    "funeral-visiting", "prep-viewing"
  ],
  "crem-memorial": ["memorial-after-pkg", "memorial-later"]
};

const INCLUDED_VISITING_WITH = new Set(["pkg-funeral-evergreen", "pkg-funeral-chapel-church"]);

const PATH_LABELS = {
  gather: T("Funeral, memorial, or visitation"),
  cremation: T("Cremation"),
  faraway: T("Receiving or forwarding remains")
};

const MODE_LABELS = {
  "at-need": T("At-need"),
  preneed: T("Preneed contract")
};

const BASE_SCREENS = ["home", "path", "options", "addons", "review"];
const PRENEED_SCREENS = ["home", "preneed-intro", "path", "options", "addons", "review"];

function getScreens() {
  return state.mode === "preneed" ? PRENEED_SCREENS : BASE_SCREENS;
}

const state = {
  screen: "home",
  mode: null,
  path: null,
  selected: new Set(),
  gatherType: null,
  cremationType: null
};

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

function formatPrice(val, id) {
  if (typeof val === "number") return "$" + val.toLocaleString("en-US");
  if (id && PRICE_LABELS[id]) return PRICE_LABELS[id];
  if (val === null || val === undefined || val === "—") return T("Ask director");
  return String(val);
}

function isIncludedVisiting() {
  for (const id of INCLUDED_VISITING_WITH) {
    if (state.selected.has(id)) return true;
  }
  return false;
}

function effectivePrice(id) {
  if (id === "funeral-visiting" && isIncludedVisiting()) return "included";
  if (GATHER_PARENTS.has(id)) return null;
  return PRICES[id];
}

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      screen: state.screen,
      mode: state.mode,
      path: state.path,
      selected: Array.from(state.selected),
      gatherType: state.gatherType,
      cremationType: state.cremationType
    }));
  } catch (_) { /* private mode */ }
}

function restore() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const allowed = ["home", "preneed-intro", "path", "options", "addons", "review"];
    if (!data || !allowed.includes(data.screen)) return false;
    state.screen = data.screen;
    state.mode = data.mode || null;
    state.path = data.path || null;
    state.selected = new Set(data.selected || []);
    state.gatherType = data.gatherType || null;
    state.cremationType = data.cremationType || null;
    return true;
  } catch (_) {
    return false;
  }
}

function syncDomSelection(id) {
  const on = state.selected.has(id);
  $all('[data-id="' + id + '"]').forEach(el => el.classList.toggle("selected", on));
}

function clearIds(ids) {
  ids.forEach(id => {
    if (state.selected.has(id)) {
      state.selected.delete(id);
      syncDomSelection(id);
    }
  });
}

function updateFuneralVisitingUI() {
  $all("#nest-funeral-visiting, #nest-crem-funeral-visiting").forEach(el => {
    const meta = el.querySelector(".nest-meta");
    if (!meta) return;
    const included = isIncludedVisiting();
    el.classList.toggle("included", included);
    if (included) {
      meta.textContent = T("Included");
      meta.classList.add("included-tag");
      if (!state.selected.has("funeral-visiting")) {
        state.selected.add("funeral-visiting");
        syncDomSelection("funeral-visiting");
      }
    } else {
      meta.textContent = "$1,160";
      meta.classList.remove("included-tag");
    }
  });
}

function updateParentPriceHints() {
  const q = $("#price-gather-quiet");
  if (q) {
    if (state.selected.has("chapel-up-to-2hrs")) q.textContent = "$1,160";
    else if (state.selected.has("chapel-first-hour")) {
      let t = 380;
      if (state.selected.has("chapel-add-hour")) t += 250;
      q.textContent = "$" + t.toLocaleString("en-US");
    } else q.textContent = T("From $380");
  }
  const m = $("#price-gather-memorial");
  if (m) {
    if (state.selected.has("pkg-memorial")) m.textContent = "$3,020";
    else if (state.selected.has("memorial-chapel-ala")) m.textContent = "$1,150";
    else m.textContent = T("From $1,150");
  }
  const f = $("#price-gather-funeral");
  if (f) {
    if (state.selected.has("pkg-funeral-evergreen")) f.textContent = "$4,520";
    else if (state.selected.has("pkg-funeral-church")) f.textContent = "$4,280";
    else if (state.selected.has("pkg-funeral-chapel-church")) f.textContent = "$4,680";
    else f.textContent = T("From $4,280");
  }
  const cv = $("#price-cremation-visitation");
  if (cv) {
    let sum = 0; let any = false;
    ["crem-vis-prep", "crem-vis-hours", "crem-vis-direct", "chapel-up-to-2hrs", "chapel-first-hour", "chapel-add-hour"].forEach(id => {
      if (state.selected.has(id) && typeof PRICES[id] === "number") { sum += PRICES[id]; any = true; }
    });
    // Prefer composed defaults when parent selected
    if (state.selected.has("cremation-visitation")) {
      const parts = [];
      if (state.selected.has("crem-vis-prep") || state.selected.has("prep-viewing")) parts.push(690);
      if (state.selected.has("crem-vis-hours") || state.selected.has("chapel-up-to-2hrs")) parts.push(1160);
      else if (state.selected.has("chapel-first-hour")) {
        parts.push(380);
        if (state.selected.has("chapel-add-hour")) parts.push(250);
      }
      if (state.selected.has("crem-vis-direct") || state.selected.has("direct-cremation")) parts.push(1820);
      if (parts.length) {
        cv.textContent = "$" + parts.reduce((a, b) => a + b, 0).toLocaleString("en-US");
      } else cv.textContent = T("From $3,670");
    } else if (any) cv.textContent = "$" + sum.toLocaleString("en-US");
    else cv.textContent = T("From $3,670");
  }
  const cf = $("#price-cremation-funeral");
  if (cf) {
    if (state.selected.has("pkg-funeral-evergreen")) cf.textContent = "$4,520";
    else if (state.selected.has("pkg-funeral-church")) cf.textContent = "$4,280";
    else if (state.selected.has("pkg-funeral-chapel-church")) cf.textContent = "$4,680";
    else cf.textContent = T("From $4,280");
  }
}

function setGatherOpen(type) {
  $all("#opts-gather .option-block").forEach(block => {
    const t = block.dataset.gatherType;
    block.classList.toggle("open", t === type && type !== "graveside");
  });
}

function setCremationOpen(type) {
  $all("#opts-cremation .option-block").forEach(block => {
    const t = block.dataset.cremationType;
    const openTypes = ["visitation", "funeral", "memorial"];
    block.classList.toggle("open", t === type && openTypes.includes(type));
  });
}

function toggleGatherType(el) {
  const id = el.dataset.id;
  const block = el.closest(".option-block");
  const type = block ? block.dataset.gatherType : null;

  if (state.selected.has(id)) {
    state.selected.delete(id);
    el.classList.remove("selected");
    if (type && NEST_BY_TYPE[type]) clearIds(NEST_BY_TYPE[type]);
    state.gatherType = null;
    setGatherOpen(null);
  } else {
    $all('#opts-gather .option-item[data-group="gather-main"]').forEach(other => {
      if (other !== el && state.selected.has(other.dataset.id)) {
        const oid = other.dataset.id;
        state.selected.delete(oid);
        other.classList.remove("selected");
        const ob = other.closest(".option-block");
        const ot = ob && ob.dataset.gatherType;
        if (ot && NEST_BY_TYPE[ot]) clearIds(NEST_BY_TYPE[ot]);
      }
    });
    state.selected.add(id);
    el.classList.add("selected");
    state.gatherType = type;
    setGatherOpen(type);
    if (type === "quiet" && !state.selected.has("chapel-up-to-2hrs") && !state.selected.has("chapel-first-hour")) {
      const def = $('.nest-option[data-id="chapel-up-to-2hrs"]');
      if (def) { state.selected.add("chapel-up-to-2hrs"); syncDomSelection("chapel-up-to-2hrs"); }
    }
  }
  afterSelectionChange();
}

function toggleCremationType(el) {
  const id = el.dataset.id;
  const block = el.closest(".option-block");
  const type = block ? block.dataset.cremationType : null;

  if (state.selected.has(id)) {
    state.selected.delete(id);
    el.classList.remove("selected");
    const nestKey = type === "visitation" ? "crem-visitation"
      : type === "funeral" ? "crem-funeral"
      : type === "memorial" ? "crem-memorial" : null;
    if (nestKey && NEST_BY_TYPE[nestKey]) clearIds(NEST_BY_TYPE[nestKey]);
    // Direct / witness / ship are leaf ids — also clear companion pieces
    if (id === "direct-cremation") { /* leaf */ }
    if (id === "witness-cremation") { /* leaf uses pkg-graveside price */ }
    state.cremationType = null;
    setCremationOpen(null);
  } else {
    $all('#opts-cremation .option-item[data-group="cremation-main"]').forEach(other => {
      if (other !== el && state.selected.has(other.dataset.id)) {
        const oid = other.dataset.id;
        state.selected.delete(oid);
        other.classList.remove("selected");
        const ob = other.closest(".option-block");
        const ot = ob && ob.dataset.cremationType;
        const nk = ot === "visitation" ? "crem-visitation"
          : ot === "funeral" ? "crem-funeral"
          : ot === "memorial" ? "crem-memorial" : null;
        if (nk && NEST_BY_TYPE[nk]) clearIds(NEST_BY_TYPE[nk]);
      }
    });
    state.selected.add(id);
    el.classList.add("selected");
    state.cremationType = type;
    setCremationOpen(type);

    // Defaults for composed cremation + visitation
    if (type === "visitation") {
      ["crem-vis-prep", "crem-vis-hours", "crem-vis-direct"].forEach(nid => {
        if (!state.selected.has(nid)) {
          state.selected.add(nid);
          syncDomSelection(nid);
        }
      });
    }
    if (type === "memorial" && !state.selected.has("memorial-later") && !state.selected.has("memorial-after-pkg")) {
      state.selected.add("memorial-later");
      syncDomSelection("memorial-later");
    }
  }
  afterSelectionChange();
}

function toggleNestOption(el, evt) {
  if (evt) { evt.stopPropagation(); evt.preventDefault(); }
  const id = el.dataset.id;
  const group = el.dataset.group;

  if (id === "funeral-visiting" && isIncludedVisiting()) {
    updateFuneralVisitingUI();
    return;
  }

  if (state.selected.has(id)) {
    state.selected.delete(id);
    syncDomSelection(id);
  } else {
    if (group && EXCLUSIVE_GROUPS[group]) {
      $all('[data-group="' + group + '"]').forEach(other => {
        if (other !== el && state.selected.has(other.dataset.id)) {
          state.selected.delete(other.dataset.id);
          syncDomSelection(other.dataset.id);
        }
      });
    }
    if (id === "chapel-up-to-2hrs" || id === "crem-vis-hours") {
      clearIds(["chapel-first-hour", "chapel-add-hour"]);
    } else if (id === "chapel-first-hour") {
      clearIds(["chapel-up-to-2hrs", "crem-vis-hours"]);
    } else if (id === "chapel-add-hour") {
      clearIds(["chapel-up-to-2hrs", "crem-vis-hours"]);
      if (!state.selected.has("chapel-first-hour")) {
        state.selected.add("chapel-first-hour");
        syncDomSelection("chapel-first-hour");
      }
    }
    state.selected.add(id);
    syncDomSelection(id);
  }
  afterSelectionChange();
}

function toggleOption(el) {
  const id = el.dataset.id;
  const group = el.dataset.group;
  if (GATHER_PARENTS.has(id) || id === "pkg-graveside") {
    if (el.closest("#opts-cremation")) { toggleCremationType(el); return; }
    toggleGatherType(el);
    return;
  }
  if (el.closest("#opts-cremation") && el.dataset.group === "cremation-main") {
    toggleCremationType(el);
    return;
  }
  if (state.selected.has(id)) {
    state.selected.delete(id);
    syncDomSelection(id);
  } else {
    if (group && EXCLUSIVE_GROUPS[group]) {
      $all('[data-group="' + group + '"]').forEach(other => {
        if (other !== el && state.selected.has(other.dataset.id)) {
          state.selected.delete(other.dataset.id);
          syncDomSelection(other.dataset.id);
        }
      });
    }
    state.selected.add(id);
    syncDomSelection(id);
  }
  afterSelectionChange();
}

function selectMode(mode, advance) {
  state.mode = mode;
  $all(".mode-card").forEach(c => c.classList.toggle("selected", c.dataset.mode === mode));
  updateModeChrome();
  afterSelectionChange();
  if (advance) {
    goTo(mode === "preneed" ? "preneed-intro" : "path");
  }
}

function continueFromPreneedIntro() {
  goTo("path");
}

function selectPath(path) {
  // Clear path-specific selections when switching paths
  if (state.path && state.path !== path) {
    const keepAddons = new Set([
      "programs", "ack-cards", "flower-car", "reception", "incense",
      "food-cleanup", "livestream", "obituary"
    ]);
    Array.from(state.selected).forEach(id => {
      if (!keepAddons.has(id)) {
        state.selected.delete(id);
        syncDomSelection(id);
      }
    });
    state.gatherType = null;
    state.cremationType = null;
    setGatherOpen(null);
    setCremationOpen(null);
  }
  state.path = path;
  $all(".path-card").forEach(c => c.classList.toggle("selected", c.dataset.path === path));
  showPathPanel(path);
  afterSelectionChange();
}

function showPathPanel(path) {
  $all(".path-panel").forEach(p => p.classList.toggle("visible", p.dataset.pathPanel === path));
  const title = $("#options-title");
  const sub = $("#options-subtitle");
  if (!title) return;
  if (path === "gather") {
    title.textContent = T("Funeral, memorial, or visitation");
    sub.textContent = T("Choose a service type. More details open under your choice.");
  } else if (path === "cremation") {
    title.textContent = T("Cremation options");
    sub.textContent = T("Choose how cremation fits your plans.");
  } else if (path === "faraway") {
    title.textContent = T("Receiving or forwarding remains");
    sub.textContent = T("A memorial service may follow.");
  }
}

function nameOf(id) {
  const el = $('[data-id="' + id + '"]');
  return el ? (el.dataset.name || id) : id;
}

function computeTotal() {
  let sum = 0;
  let hasNumeric = false;
  const counted = new Set();
  state.selected.forEach(id => {
    if (GATHER_PARENTS.has(id)) return;
    if (id === "funeral-visiting" && isIncludedVisiting()) return;
    // Avoid double-counting aliases
    if (id === "crem-vis-direct" && state.selected.has("direct-cremation") && counted.has("direct-cremation")) return;
    const p = PRICES[id];
    if (typeof p === "number" && !counted.has(id)) {
      sum += p;
      hasNumeric = true;
      counted.add(id);
    }
  });
  return { sum, hasNumeric };
}

function updateSummary() {
  const pathEl = $("#summary-path");
  const modeBit = state.mode ? MODE_LABELS[state.mode] + " · " : "";
  pathEl.textContent = state.path
    ? modeBit + T("Path: ") + PATH_LABELS[state.path]
    : (state.mode ? MODE_LABELS[state.mode] + " · " + T("Path: Not yet chosen") : T("Path: Not yet chosen"));

  const container = $("#summary-items");
  const packageItems = [];
  const detailItems = [];
  const addonItems = [];

  const PACKAGE_IDS = new Set([
    "pkg-memorial", "pkg-funeral-evergreen", "pkg-funeral-church",
    "pkg-funeral-chapel-church", "pkg-graveside", "direct-cremation",
    "witness-cremation", "care-here", "shipping", "memorial-after-pkg"
  ]);
  const ADDON_IDS = new Set([
    "programs", "ack-cards", "flower-car", "reception", "incense",
    "food-cleanup", "livestream", "obituary"
  ]);

  function pushPkg(label, amt) {
    packageItems.push(
      '<div class="summary-item"><span class="label">' + label +
      '<span class="pkg-sub">' + T("Total package price") + '</span></span><span class="amt">' +
      amt + "</span></div>"
    );
  }
  function pushDetail(label, amt) {
    detailItems.push(
      '<div class="summary-item detail"><span class="label">' + label +
      '</span><span class="amt">' + amt + "</span></div>"
    );
  }

  // Gather
  const gatherOrder = ["gather-quiet", "gather-memorial", "gather-funeral", "pkg-graveside"];
  gatherOrder.forEach(pid => {
    if (!state.selected.has(pid)) return;
    if (pid === "gather-funeral") {
      let pkgId = null;
      if (state.selected.has("pkg-funeral-evergreen")) pkgId = "pkg-funeral-evergreen";
      else if (state.selected.has("pkg-funeral-church")) pkgId = "pkg-funeral-church";
      else if (state.selected.has("pkg-funeral-chapel-church")) pkgId = "pkg-funeral-chapel-church";
      if (pkgId) pushPkg(nameOf(pkgId), formatPrice(PRICES[pkgId]));
      else packageItems.push('<div class="summary-item"><span class="label">' + T("Funeral service") + '<span class="pkg-sub">' + T("Choose a package") + '</span></span><span class="amt">' + T("From $4,280") + '</span></div>');
    } else if (pid === "gather-memorial") {
      if (state.selected.has("pkg-memorial")) pushPkg(nameOf("pkg-memorial"), formatPrice(3020));
      else if (state.selected.has("memorial-chapel-ala")) {
        packageItems.push('<div class="summary-item"><span class="label">' + nameOf("memorial-chapel-ala") +
          '<span class="pkg-sub">' + T("This charge") + '</span></span><span class="amt">' + formatPrice(1150) + "</span></div>");
      } else packageItems.push('<div class="summary-item"><span class="label">' + T("Memorial service") + '<span class="pkg-sub">' + T("Choose an option") + '</span></span><span class="amt">' + T("From $1,150") + '</span></div>');
    } else if (pid === "gather-quiet") {
      let sum = 0; let any = false;
      ["chapel-up-to-2hrs", "chapel-first-hour", "chapel-add-hour"].forEach(nid => {
        if (state.selected.has(nid) && typeof PRICES[nid] === "number") { sum += PRICES[nid]; any = true; }
      });
      packageItems.push('<div class="summary-item"><span class="label">' + T("Visitation") + '<span class="pkg-sub">' + T("This charge") + '</span></span><span class="amt">' +
        (any ? formatPrice(sum) : T("From $380")) + "</span></div>");
    } else if (pid === "pkg-graveside") {
      pushPkg(nameOf("pkg-graveside"), formatPrice(3580));
    }
    const nestIds = NEST_BY_TYPE[{
      "gather-quiet": "quiet",
      "gather-memorial": "memorial",
      "gather-funeral": "funeral",
      "pkg-graveside": "graveside"
    }[pid]] || [];
    nestIds.forEach(nid => {
      if (!state.selected.has(nid)) return;
      if (["pkg-funeral-evergreen", "pkg-funeral-church", "pkg-funeral-chapel-church",
           "pkg-memorial", "memorial-chapel-ala",
           "chapel-up-to-2hrs", "chapel-first-hour", "chapel-add-hour"].includes(nid)) return;
      const ep = effectivePrice(nid);
      pushDetail(nameOf(nid), ep === "included" ? T("Included") : formatPrice(ep, nid));
    });
  });

  // Cremation path selections
  if (state.selected.has("direct-cremation") && state.path === "cremation" && state.cremationType === "direct") {
    pushPkg(T("Simple / direct cremation"), formatPrice(1820));
  }
  if (state.selected.has("cremation-visitation")) {
    let sum = 0;
    ["crem-vis-prep", "crem-vis-hours", "crem-vis-direct"].forEach(nid => {
      if (state.selected.has(nid) && typeof PRICES[nid] === "number") sum += PRICES[nid];
    });
    packageItems.push('<div class="summary-item"><span class="label">' + T("Cremation with visitation") +
      '<span class="pkg-sub">' + T("Combined charges") + '</span></span><span class="amt">' +
      (sum ? formatPrice(sum) : T("From $3,670")) + "</span></div>");
    ["crem-vis-prep", "crem-vis-hours", "crem-vis-direct"].forEach(nid => {
      if (state.selected.has(nid)) pushDetail(nameOf(nid), formatPrice(PRICES[nid], nid));
    });
  }
  if (state.selected.has("cremation-funeral")) {
    let pkgId = null;
    if (state.selected.has("pkg-funeral-evergreen")) pkgId = "pkg-funeral-evergreen";
    else if (state.selected.has("pkg-funeral-church")) pkgId = "pkg-funeral-church";
    else if (state.selected.has("pkg-funeral-chapel-church")) pkgId = "pkg-funeral-chapel-church";
    if (pkgId) pushPkg(T("Cremation with funeral service") + " — " + nameOf(pkgId), formatPrice(PRICES[pkgId]));
    else packageItems.push('<div class="summary-item"><span class="label">' + T("Cremation with funeral service") + '<span class="pkg-sub">' + T("Choose a package") + '</span></span><span class="amt">' + T("From $4,280") + '</span></div>');
    NEST_BY_TYPE["crem-funeral"].forEach(nid => {
      if (!state.selected.has(nid)) return;
      if (["pkg-funeral-evergreen", "pkg-funeral-church", "pkg-funeral-chapel-church"].includes(nid)) return;
      const ep = effectivePrice(nid);
      pushDetail(nameOf(nid), ep === "included" ? T("Included") : formatPrice(ep, nid));
    });
  }
  if (state.selected.has("witness-cremation")) {
    pushPkg(T("Witnessed cremation / graveside"), formatPrice(3580));
  }
  if (state.selected.has("cremation-memorial") || state.selected.has("memorial-after-pkg") || (state.selected.has("memorial-later") && state.cremationType === "memorial")) {
    if (state.selected.has("memorial-after-pkg")) pushPkg(T("Memorial service package (after cremation)"), formatPrice(3020));
    else if (state.selected.has("memorial-later")) {
      packageItems.push('<div class="summary-item"><span class="label">' + T("Memorial service at a later date") +
        '<span class="pkg-sub">' + T("This charge") + '</span></span><span class="amt">' + formatPrice(1150) + "</span></div>");
    }
  } else if (state.selected.has("memorial-later") && state.path === "cremation") {
    packageItems.push('<div class="summary-item"><span class="label">' + T("Memorial service at a later date") +
      '<span class="pkg-sub">' + T("This charge") + '</span></span><span class="amt">' + formatPrice(1150) + "</span></div>");
  }

  // Other option-items (faraway, addons, private-id, ship, urn)
  $all(".option-item").forEach(el => {
    const id = el.dataset.id;
    if (!state.selected.has(id)) return;
    if (gatherOrder.includes(id) || GATHER_PARENTS.has(id)) return;
    if (["direct-cremation", "cremation-visitation", "cremation-funeral", "witness-cremation",
         "cremation-memorial", "memorial-later", "memorial-after-pkg"].includes(id) && state.path === "cremation") return;
    const allNest = [].concat(
      NEST_BY_TYPE.quiet, NEST_BY_TYPE.memorial, NEST_BY_TYPE.funeral,
      NEST_BY_TYPE["crem-visitation"], NEST_BY_TYPE["crem-funeral"], NEST_BY_TYPE["crem-memorial"]
    );
    if (allNest.includes(id)) return;
    const price = effectivePrice(id);
    const row =
      '<div class="summary-item"><span class="label">' + el.dataset.name +
      (PACKAGE_IDS.has(id) ? '<span class="pkg-sub">' + T("Total package price") + '</span>' : "") +
      '</span><span class="amt">' + formatPrice(price, id) + "</span></div>";
    if (ADDON_IDS.has(id)) addonItems.push(row);
    else if (PACKAGE_IDS.has(id)) packageItems.push(row);
    else detailItems.push(row);
  });

  // ship-cremains on cremation path
  if (state.selected.has("ship-cremains") && state.path === "cremation") {
    // may already be covered by option-item loop if in faraway panel only — ensure
    const already = detailItems.concat(packageItems, addonItems).some(h => h.includes(T("Shipping cremated remains (US)")));
    if (!already) {
      detailItems.push('<div class="summary-item"><span class="label">' + T("Shipping cremated remains (US)") + '</span><span class="amt">$250</span></div>');
    }
  }

  const parts = [];
  if (packageItems.length) {
    parts.push('<div class="summary-section-label">' + T("Selected package") + '</div>');
    parts.push(...packageItems);
  }
  if (detailItems.length) {
    parts.push('<div class="summary-section-label">' + T("Included details &amp; options") + '</div>');
    parts.push(...detailItems);
  }
  if (addonItems.length) {
    parts.push('<div class="summary-section-label">' + T("Additional products &amp; services") + '</div>');
    parts.push(...addonItems);
  }

  if (parts.length === 0) {
    container.innerHTML = '<div class="summary-empty">' + T("Select options on earlier screens — they'll appear here.") + '</div>';
  } else {
    container.innerHTML = parts.join("");
  }

  const { sum, hasNumeric } = computeTotal();
  let totalText = "—";
  if (state.selected.size > 0) {
    totalText = hasNumeric ? "$" + sum.toLocaleString("en-US") : T("Ask director");
  }
  $("#summary-total-amt").textContent = totalText;
  $("#running-total").textContent = totalText;

  const modeNote = $("#preneed-review-note");
  if (modeNote) {
    modeNote.hidden = state.mode !== "preneed";
  }
  if (state.screen === "review") updateReviewChrome();
}

function updateCounts() {
  const n = state.selected.size;
  $("#sel-count").textContent =
    n === 0 ? T("0 items selected") : n === 1 ? T("1 item selected") : T("{n} items selected").replace("{n}", n);
}

function updateModeChrome() {
  const badge = $("#mode-badge");
  if (!badge) return;
  if (state.mode) {
    badge.hidden = false;
    badge.textContent = MODE_LABELS[state.mode];
  } else {
    badge.hidden = true;
  }
}

function afterSelectionChange() {
  updateFuneralVisitingUI();
  updateParentPriceHints();
  updateSummary();
  updateCounts();
  persist();
  updateNav();
}

function screenIndex() {
  return getScreens().indexOf(state.screen);
}

function syncStepPills() {
  const screens = getScreens();
  const idx = screenIndex();
  const pills = $all(".step-pill");
  pills.forEach((p, i) => {
    const used = i < screens.length;
    p.hidden = !used;
    p.classList.toggle("active", used && i === idx);
    p.classList.toggle("done", used && i < idx);
  });
}

function goTo(screen) {
  const screens = getScreens();
  if (!screens.includes(screen) && screen !== "home") {
    // Allow home always; if mode not set yet, only home
    if (screen !== "home") return;
  }
  if (screen !== "home" && !screens.includes(screen)) return;
  state.screen = screen;
  $all(".screen").forEach(s => s.classList.toggle("active", s.dataset.screen === screen));
  syncStepPills();
  const body = $(".app-body");
  if (body) body.scrollTop = 0;
  if (screen === "options") showPathPanel(state.path);
  if (screen === "review") updateReviewChrome();
  afterSelectionChange();
}

function canAdvance() {
  const s = state.screen;
  if (s === "home") return !!state.mode;
  if (s === "preneed-intro") return true;
  if (s === "path") return !!state.path;
  if (s === "options") return true;
  if (s === "addons") return true;
  if (s === "review") return false;
  return false;
}

function updateNav() {
  const idx = screenIndex();
  const back = $("#btn-back");
  const next = $("#btn-next");
  const footer = $(".app-footer");
  if (footer) footer.hidden = state.screen === "home";
  const pills = $(".step-pills");
  if (pills) pills.style.visibility = state.screen === "home" ? "hidden" : "visible";
  syncStepPills();
  back.disabled = idx <= 0;
  if (state.screen === "review" || state.screen === "home") {
    next.hidden = true;
  } else if (state.screen === "preneed-intro") {
    // Primary continue is on the intro body; keep footer next as secondary
    next.hidden = false;
    next.disabled = false;
    next.textContent = T("Continue →").replace(/\s*→\s*$/, "");
  } else {
    next.hidden = false;
    next.disabled = !canAdvance();
    if (state.screen === "addons") next.textContent = T("Review →").replace(/\s*→\s*$/, "");
    else next.textContent = T("Continue →").replace(/\s*→\s*$/, "");
  }
}

function nextScreen() {
  if (!canAdvance()) return;
  const screens = getScreens();
  const idx = screenIndex();
  if (idx < screens.length - 1) goTo(screens[idx + 1]);
}

function prevScreen() {
  const screens = getScreens();
  const idx = screenIndex();
  if (idx > 0) goTo(screens[idx - 1]);
}

function updateReviewChrome() {
  const isPreneed = state.mode === "preneed";
  const title = $("#review-title");
  const sub = $("#review-subtitle");
  const ctaTitle = $("#review-cta-title");
  const ctaBody = $("#review-cta-body");
  const ctaList = $("#review-cta-list");
  if (title) {
    title.textContent = isPreneed
      ? T("Selections for your preneed contract")
      : T("Your choices");
  }
  if (sub) {
    sub.textContent = T("Here's what you've selected so far.");
  }
  if (ctaTitle) {
    ctaTitle.textContent = T("Talk with your director");
  }
  if (ctaBody) {
    ctaBody.textContent = isPreneed
      ? T("Your selections are a starting point. Your director will complete the contract with you, including funding details.")
      : T("Your selections are a starting point — nothing is final until you review them together.");
  }
  if (ctaList) {
    if (isPreneed) {
      ctaList.innerHTML = [
        "<li>" + T("Ask any questions you still have") + "</li>",
        "<li>" + T("Confirm options, timing, and contract terms") + "</li>",
        "<li>" + T("When the need arises, one call sets your wishes in motion") + "</li>"
      ].join("");
    } else {
      ctaList.innerHTML = [
        "<li>" + T("Ask any questions you still have") + "</li>",
        "<li>" + T("Confirm timing, location, and details") + "</li>",
        "<li>" + T("We'll prepare everything with care") + "</li>"
      ].join("");
    }
  }
}

function applyRestoredDom() {
  if (state.mode) {
    $all(".mode-card").forEach(c => c.classList.toggle("selected", c.dataset.mode === state.mode));
  }
  if (state.path) {
    $all(".path-card").forEach(c => c.classList.toggle("selected", c.dataset.path === state.path));
    showPathPanel(state.path);
  }
  state.selected.forEach(id => syncDomSelection(id));
  if (state.gatherType) setGatherOpen(state.gatherType);
  if (state.cremationType) setCremationOpen(state.cremationType);
  updateModeChrome();
}

function initPrices() {
  $all(".option-item").forEach(el => {
    const id = el.dataset.id;
    if (GATHER_PARENTS.has(id)) return;
    const p = PRICES[id];
    const span = el.querySelector(".price:not(.parent-price-hint)");
    if (span && p !== undefined && !span.id) {
      span.textContent = formatPrice(p, id);
      span.classList.toggle("tbd", typeof p !== "number");
    }
  });
  $all(".nest-option").forEach(el => {
    const id = el.dataset.id;
    const meta = el.querySelector(".nest-meta");
    if (!meta || meta.id === "meta-funeral-visiting" || meta.classList.contains("dynamic")) return;
    const p = PRICES[id];
    if (typeof p === "number") {
      meta.textContent = formatPrice(p, id);
      meta.classList.remove("tbd");
    } else if (PRICE_LABELS[id]) {
      meta.textContent = PRICE_LABELS[id];
      meta.classList.add("tbd");
    }
  });
}

function clearSession() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
  state.screen = "home";
  state.mode = null;
  state.path = null;
  state.selected = new Set();
  state.gatherType = null;
  state.cremationType = null;
  $all(".selected").forEach(el => el.classList.remove("selected"));
  $all(".option-block.open").forEach(el => el.classList.remove("open"));
  $all(".mode-card, .path-card").forEach(el => el.classList.remove("selected"));
  updateModeChrome();
  goTo("home");
}

function startCremation() {
  if (!state.mode) {
    state.mode = "at-need";
    document.querySelectorAll(".mode-card").forEach(c => {
      c.classList.toggle("selected", c.dataset.mode === "at-need");
    });
    updateModeChrome();
  }
  selectPath("cremation");
  goTo("options");
}

function resumeSession() {
  if (state.mode && state.path) goTo(state.screen === "home" ? "path" : state.screen);
  else if (state.mode) goTo("path");
}

window.__mcohBeta = {
  resumeSession,
  startCremation,
  continueFromPreneedIntro,
  goTo,
  selectMode,
  selectPath,
  clearSession,
  getState: () => ({
    screen: state.screen,
    mode: state.mode,
    path: state.path,
    selected: Array.from(state.selected)
  }),
  primeCremationFuneral() {
    selectMode("at-need");
    selectPath("cremation");
    const el = $('[data-id="cremation-funeral"]');
    if (el && !state.selected.has("cremation-funeral")) toggleCremationType(el);
    ["style-mass", "pkg-funeral-evergreen"].forEach(id => {
      if (state.selected.has(id)) return;
      const n = $('.nest-option[data-id="' + id + '"]');
      if (n) toggleNestOption(n);
    });
    goTo("options");
  },
  primeGatherFuneral() {
    selectMode("at-need");
    selectPath("gather");
    const el = $('[data-id="gather-funeral"]');
    if (el && !state.selected.has("gather-funeral")) toggleGatherType(el);
    ["style-mass", "pkg-funeral-evergreen", "procession-hearse", "motorcycle-escorts", "prep-viewing"].forEach(id => {
      if (state.selected.has(id)) return;
      const n = $('.nest-option[data-id="' + id + '"]');
      if (n) toggleNestOption(n);
    });
    goTo("options");
  },
  primePreneedIntro() {
    clearSession();
    selectMode("preneed", true);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  initPrices();
  const restored = restore();
  if (restored) {
    applyRestoredDom();
    goTo(state.screen);
  } else {
    goTo("home");
  }
  $("#btn-back").addEventListener("click", prevScreen);
  $("#btn-next").addEventListener("click", nextScreen);
  const reset = $("#btn-reset");
  if (reset) reset.addEventListener("click", () => {
    if (confirm(T("Clear all selections and start over?"))) clearSession();
  });
});
