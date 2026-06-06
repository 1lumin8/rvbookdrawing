const PAGE_COUNT = 105;
const FIRST_PAGE = 2;
const PAGE_PATH = "assets/pages/page-";
const NOTES_PAGE_COUNT = 53;
const NOTES_PAGE_PATH = "assets/notes-pages/note-";
const DETAILS = [
  {
    label: "Physical Fulfillment Figures",
    page: 2,
    src: notesPageFile(2),
    kind: "detail",
  },
  { label: "Timeline 1", page: 51, src: notesPageFile(51), kind: "notes" },
  { label: "Timeline 2", page: 52, src: notesPageFile(52), kind: "notes" },
];
const grid = document.querySelector("#pageGrid");
const chapterNav = document.querySelector("#chapterNav");
const pageSize = document.querySelector("#pageSize");
const searchInput = document.querySelector("#searchInput");
const searchStatus = document.querySelector("#searchStatus");
const searchResults = document.querySelector("#searchResults");
const scrollTop = document.querySelector("#scrollTop");
const overlay = document.querySelector("#zoomOverlay");
const pane = document.querySelector("#zoomPane");
const zoomImage = document.querySelector("#zoomImage");
const zoomLabel = document.querySelector("#zoomLabel");
const closeZoom = document.querySelector("#closeZoom");
const zoomIn = document.querySelector("#zoomIn");
const zoomOut = document.querySelector("#zoomOut");
const fitPage = document.querySelector("#fitPage");

let activePage = null;
let clickFocus = { x: 0.5, y: 0.5 };
let zoom = 1;
let fitWidth = 900;
let dragging = false;
let movedDuringDrag = false;
let dragStart = { x: 0, y: 0, left: 0, top: 0 };
let searchableCards = [];
let chapterGroups = [];
let searchTimer = null;

const CHAPTERS = [
  { label: "Rev 1", page: 2, notesPage: 3 },
  { label: "Rev 2", page: 5, notesPage: 7 },
  { label: "Rev 3", page: 10, notesPage: 11 },
  { label: "Rev 4", page: 14, notesPage: 15 },
  { label: "Rev 5", page: 17, notesPage: 16 },
  { label: "Rev 6", page: 21, notesPage: 17 },
  { label: "Rev 7", page: 25, notesPage: 19 },
  { label: "Rev 8", page: 28, notesPage: 21 },
  { label: "Rev 9", page: 32, notesPage: 23 },
  { label: "Rev 10", page: 36, notesPage: 25 },
  { label: "Rev 11", page: 39, notesPage: 27 },
  { label: "Rev 12", page: 44, notesPage: 29 },
  { label: "Rev 13", page: 50, notesPage: 31 },
  { label: "Rev 14", page: 56, notesPage: 33 },
  { label: "Rev 15", page: 61, notesPage: 35 },
  { label: "Rev 16", page: 64, notesPage: 37 },
  { label: "Rev 17", page: 70, notesPage: 39 },
  { label: "Rev 18", page: 77, notesPage: 41 },
  { label: "Rev 19", page: 84, notesPage: 43 },
  { label: "Rev 20", page: 91, notesPage: 45 },
  { label: "Rev 21", page: 95, notesPage: 47 },
  { label: "Rev 22", page: 101, notesPage: 49, notesEndPage: 50 },
];

function pageFile(pageNumber) {
  return `${PAGE_PATH}${String(pageNumber).padStart(3, "0")}.jpg`;
}

function notesPageFile(pageNumber) {
  return `${NOTES_PAGE_PATH}${String(pageNumber).padStart(2, "0")}.jpg`;
}

function getChapterEndPage(chapterIndex) {
  const nextChapter = CHAPTERS[chapterIndex + 1];
  return nextChapter ? nextChapter.page - 1 : PAGE_COUNT;
}

function getNotesEndPage(chapterIndex) {
  if (CHAPTERS[chapterIndex].notesEndPage) {
    return CHAPTERS[chapterIndex].notesEndPage;
  }
  const nextChapter = CHAPTERS[chapterIndex + 1];
  return nextChapter ? nextChapter.notesPage - 1 : NOTES_PAGE_COUNT;
}

function buildChapterNav() {
  const fragment = document.createDocumentFragment();
  const detailsLink = document.createElement("a");

  detailsLink.href = "#details";
  detailsLink.textContent = "Details";
  fragment.append(detailsLink);

  CHAPTERS.forEach((chapter) => {
    const link = document.createElement("a");
    link.href = `#chapter-${chapter.page}`;
    link.textContent = chapter.label;
    fragment.append(link);
  });

  chapterNav.append(fragment);
}

function createChapterDivider(chapter, index) {
  const divider = document.createElement("div");
  const title = document.createElement("h2");
  const range = document.createElement("span");
  const endPage = getChapterEndPage(index);
  const notesEndPage = getNotesEndPage(index);

  divider.className = "chapter-divider";
  divider.id = `chapter-${chapter.page}`;
  title.textContent = `Revelation ${chapter.label.replace("Rev ", "")}`;
  range.textContent = `Drawings ${chapter.page}-${endPage} · Notes ${chapter.notesPage}-${notesEndPage}`;

  divider.append(title, range);
  return divider;
}

function createDetailsDivider() {
  const divider = document.createElement("div");
  const title = document.createElement("h2");
  const range = document.createElement("span");

  divider.className = "chapter-divider";
  divider.id = "details";
  title.textContent = "Details";
  range.textContent = "Figures · Timelines";

  divider.append(title, range);
  return divider;
}

function createSectionLabel(text, groupId) {
  const label = document.createElement("div");
  label.className = "section-label";
  label.dataset.groupId = groupId;
  label.textContent = text;
  return label;
}

function getSearchText({ page, kind, label, chapterLabel = "", section = "" }) {
  const parts = [label, kind, chapterLabel, section];
  if (kind === "drawing") {
    parts.push(`drawing page ${page}`, `picture page ${page}`);
  }
  if (kind === "notes" || kind === "detail") {
    const indexItem = (window.SEARCH_INDEX || []).find((item) => item.kind === "notes" && String(item.page) === String(page));
    if (indexItem) parts.push(indexItem.title, indexItem.text);
  }
  return parts.join(" ").toLowerCase();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function getSearchScore(text, query, terms) {
  const lower = text.toLowerCase();
  let score = 0;

  if (lower.includes(query)) score += 1000;
  terms.forEach((term) => {
    const matches = lower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
    score += matches ? matches.length : 0;
  });

  return score;
}

function getSnippet(text, query, terms) {
  if (!text) return "";
  const lower = text.toLowerCase();
  const phraseIndex = lower.indexOf(query);
  const firstTermIndex = terms.reduce((best, term) => {
    const index = lower.indexOf(term);
    if (index < 0) return best;
    return best < 0 ? index : Math.min(best, index);
  }, -1);
  const firstIndex = phraseIndex >= 0 ? phraseIndex : firstTermIndex;
  const start = Math.max(0, firstIndex - 80);
  const end = Math.min(text.length, (firstIndex < 0 ? 0 : firstIndex) + 170);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = `...${snippet}`;
  if (end < text.length) snippet = `${snippet}...`;

  if (query.includes(" ")) {
    const escapedPhrase = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    snippet = snippet.replace(new RegExp(`(${escapedPhrase})`, "ig"), "<<<mark>>>$1<<<endmark>>>");
  }

  terms.forEach((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    snippet = snippet.replace(new RegExp(`(?![^<]*<<<endmark>>>)(\\b${escaped}\\b)`, "ig"), "<<<mark>>>$1<<<endmark>>>");
  });

  return escapeHtml(snippet)
    .replaceAll("&lt;&lt;&lt;mark&gt;&gt;&gt;", "<mark>")
    .replaceAll("&lt;&lt;&lt;endmark&gt;&gt;&gt;", "</mark>");
}

function getCardSnippet(card, query, terms) {
  const page = card.querySelector(".page-button")?.dataset.page;
  const kind = card.querySelector(".page-button")?.dataset.kind;
  if (kind !== "notes" && kind !== "detail") return "";
  const indexItem = (window.SEARCH_INDEX || []).find((item) => String(item.page) === String(page));
  return indexItem ? getSnippet(indexItem.text, query, terms) : "";
}

function createPageCard({ page, src, kind, chapterLabel = "", groupId = "", section = "" }) {
  const figure = document.createElement("figure");
  const button = document.createElement("button");
  const image = document.createElement("img");
  const caption = document.createElement("figcaption");
  const label = kind === "notes" ? `Notes page ${page}` : kind === "detail" ? page : `Page ${page}`;

  figure.className = "page-card";
  figure.dataset.groupId = groupId;
  figure.dataset.section = section;
  figure.dataset.searchText = getSearchText({ page, kind, label, chapterLabel, section });
  button.className = "page-button";
  button.type = "button";
  button.dataset.page = page;
  button.dataset.src = src;
  button.dataset.label = label;
  button.dataset.kind = kind;
  button.setAttribute("aria-label", `Open ${label}`);

  image.src = src;
  image.alt = label;
  image.loading = page <= 8 ? "eager" : "lazy";
  image.decoding = "async";

  caption.className = "caption";
  caption.textContent = label;

  button.append(image);
  figure.append(button, caption);
  return figure;
}

function buildGrid() {
  const fragment = document.createDocumentFragment();
  const detailsGroup = {
    id: "details",
    divider: createDetailsDivider(),
    labels: [],
    cards: [],
    searchText: "details reference physical fulfillment figures timelines notes page 2 notes page 51 notes page 52",
  };

  fragment.append(detailsGroup.divider);
  const detailsLabel = createSectionLabel("Reference details", detailsGroup.id);
  detailsGroup.labels.push(detailsLabel);
  fragment.append(detailsLabel);
  DETAILS.forEach((detail) => {
    const card = createPageCard({ ...detail, groupId: detailsGroup.id, chapterLabel: "Details", section: "Reference details" });
    detailsGroup.cards.push(card);
    fragment.append(card);
  });
  chapterGroups.push(detailsGroup);

  CHAPTERS.forEach((chapter, chapterIndex) => {
    const drawingEnd = getChapterEndPage(chapterIndex);
    const notesEnd = getNotesEndPage(chapterIndex);
    const group = {
      id: `chapter-${chapter.page}`,
      divider: createChapterDivider(chapter, chapterIndex),
      labels: [],
      cards: [],
      searchText: `${chapter.label} revelation ${chapter.label.replace("Rev ", "")} drawings ${chapter.page}-${drawingEnd} notes ${chapter.notesPage}-${notesEnd}`.toLowerCase(),
    };

    fragment.append(group.divider);
    const drawingLabel = createSectionLabel("Drawings", group.id);
    group.labels.push(drawingLabel);
    fragment.append(drawingLabel);

    for (let page = chapter.page; page <= drawingEnd; page += 1) {
      if (page >= FIRST_PAGE) {
        const card = createPageCard({ page, src: pageFile(page), kind: "drawing", chapterLabel: chapter.label, groupId: group.id, section: "Drawings" });
        group.cards.push(card);
        fragment.append(card);
      }
    }

    const notesLabel = createSectionLabel("Explanation notes", group.id);
    group.labels.push(notesLabel);
    fragment.append(notesLabel);

    for (let page = chapter.notesPage; page <= notesEnd; page += 1) {
      const card = createPageCard({ page, src: notesPageFile(page), kind: "notes", chapterLabel: chapter.label, groupId: group.id, section: "Explanation notes" });
      group.cards.push(card);
      fragment.append(card);
    }

    chapterGroups.push(group);
  });

  grid.append(fragment);
  searchableCards = Array.from(grid.querySelectorAll(".page-card"));
}

function syncPageSize() {
  document.documentElement.style.setProperty("--page-width", `${pageSize.value}px`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateZoomLabel() {
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
}

function getFitWidth() {
  const widthFit = pane.clientWidth - 48;
  const heightFit = (pane.clientHeight - 64) * 8.5 / 11;
  return Math.max(260, Math.min(widthFit, heightFit, 1000));
}

function getZoomAnchor(event) {
  if (!event) {
    return {
      x: pane.scrollLeft + pane.clientWidth / 2 - zoomImage.offsetLeft,
      y: pane.scrollTop + pane.clientHeight / 2 - zoomImage.offsetTop,
    };
  }

  const paneRect = pane.getBoundingClientRect();
  return {
    x: pane.scrollLeft + event.clientX - paneRect.left - zoomImage.offsetLeft,
    y: pane.scrollTop + event.clientY - paneRect.top - zoomImage.offsetTop,
  };
}

function setZoom(nextZoom, keepCenter = true, anchorEvent = null) {
  const oldWidth = zoomImage.getBoundingClientRect().width || fitWidth;
  const oldHeight = zoomImage.getBoundingClientRect().height || oldWidth * 11 / 8.5;
  const anchor = getZoomAnchor(anchorEvent);
  const ratioX = clamp(anchor.x / oldWidth, 0, 1);
  const ratioY = clamp(anchor.y / oldHeight, 0, 1);
  const targetClientX = anchorEvent ? anchorEvent.clientX - pane.getBoundingClientRect().left : pane.clientWidth / 2;
  const targetClientY = anchorEvent ? anchorEvent.clientY - pane.getBoundingClientRect().top : pane.clientHeight / 2;

  zoom = clamp(nextZoom, 0.55, 4);
  zoomImage.style.width = `${Math.round(fitWidth * zoom)}px`;
  updateZoomLabel();

  if (keepCenter) {
    requestAnimationFrame(() => {
      const newWidth = zoomImage.getBoundingClientRect().width;
      const newHeight = zoomImage.getBoundingClientRect().height;
      pane.scrollLeft = zoomImage.offsetLeft + ratioX * newWidth - targetClientX;
      pane.scrollTop = zoomImage.offsetTop + ratioY * newHeight - targetClientY;
    });
  }
}

function centerOnFocus() {
  requestAnimationFrame(() => {
    const rect = zoomImage.getBoundingClientRect();
    pane.scrollLeft = zoomImage.offsetLeft + clickFocus.x * rect.width - pane.clientWidth / 2;
    pane.scrollTop = zoomImage.offsetTop + clickFocus.y * rect.height - pane.clientHeight / 2;
  });
}

function openZoom(button, event) {
  const page = button.dataset.page;
  const source = button.querySelector("img");
  const rect = source.getBoundingClientRect();
  const src = button.dataset.src;
  const label = source.alt || button.dataset.label || `Page ${page}`;

  clickFocus = {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
  };
  activePage = page;
  zoomImage.src = src;
  zoomImage.alt = label;

  document.body.classList.add("zooming");
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");

  fitWidth = getFitWidth();
  zoom = 1;
  zoomImage.style.width = `${Math.round(fitWidth * zoom)}px`;
  updateZoomLabel();

  if (zoomImage.complete) {
    centerOnFocus();
  } else {
    zoomImage.addEventListener("load", centerOnFocus, { once: true });
  }
}

function closeOverlay() {
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("zooming");
  activePage = null;
}

grid.addEventListener("click", (event) => {
  const button = event.target.closest(".page-button");
  if (!button) return;
  openZoom(button, event);
});

pageSize.addEventListener("input", syncPageSize);

closeZoom.addEventListener("click", closeOverlay);
fitPage.addEventListener("click", () => {
  zoom = 1;
  fitWidth = getFitWidth();
  zoomImage.style.width = `${Math.round(fitWidth)}px`;
  updateZoomLabel();
  centerOnFocus();
});
zoomIn.addEventListener("click", () => setZoom(zoom + 0.25));
zoomOut.addEventListener("click", () => setZoom(zoom - 0.25));

overlay.addEventListener("click", (event) => {
  if (event.target === overlay) closeOverlay();
});

pane.addEventListener("pointerdown", (event) => {
  if (!activePage || event.button !== 0) return;
  dragging = true;
  movedDuringDrag = false;
  pane.classList.add("is-dragging");
  pane.setPointerCapture(event.pointerId);
  dragStart = {
    x: event.clientX,
    y: event.clientY,
    left: pane.scrollLeft,
    top: pane.scrollTop,
  };
});

pane.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  movedDuringDrag = movedDuringDrag || Math.abs(event.clientX - dragStart.x) > 4 || Math.abs(event.clientY - dragStart.y) > 4;
  pane.scrollLeft = dragStart.left - (event.clientX - dragStart.x);
  pane.scrollTop = dragStart.top - (event.clientY - dragStart.y);
});

pane.addEventListener("pointerup", (event) => {
  const shouldClose = event.target === pane && !movedDuringDrag;
  dragging = false;
  pane.classList.remove("is-dragging");
  pane.releasePointerCapture(event.pointerId);
  if (shouldClose) closeOverlay();
});

pane.addEventListener("wheel", (event) => {
  if (!event.metaKey && !event.ctrlKey) return;
  event.preventDefault();
  setZoom(zoom + (event.deltaY > 0 ? -0.15 : 0.15), true, event);
}, { passive: false });

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activePage) closeOverlay();
  if ((event.key === "+" || event.key === "=") && activePage) setZoom(zoom + 0.25);
  if (event.key === "-" && activePage) setZoom(zoom - 0.25);
});

window.addEventListener("scroll", () => {
  scrollTop.classList.toggle("is-visible", window.scrollY > 700);
}, { passive: true });

scrollTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function clearSearch() {
  searchableCards.forEach((card) => {
    card.classList.remove("is-search-match", "is-search-hidden");
  });
  chapterGroups.forEach((group) => {
    group.divider.classList.remove("is-search-hidden");
    group.labels.forEach((label) => label.classList.remove("is-search-hidden"));
  });
  searchResults.classList.remove("is-visible");
  searchResults.innerHTML = "";
  searchStatus.textContent = "Search notes and page labels";
}

function renderSearchResults(matches, query, terms) {
  searchResults.innerHTML = "";

  matches.slice(0, 8).forEach((card) => {
    const button = card.querySelector(".page-button");
    const title = button.dataset.label;
    const section = card.dataset.section || button.dataset.kind;
    const result = document.createElement("button");
    const heading = document.createElement("strong");
    const snippet = document.createElement("span");

    result.type = "button";
    result.className = "result-card";
    heading.textContent = `${title} · ${section}`;
    snippet.innerHTML = getCardSnippet(card, query, terms) || getSnippet(card.dataset.searchText, query, terms);

    result.append(heading, snippet);
    result.addEventListener("click", () => {
      searchResults.classList.remove("is-visible");
      searchStatus.textContent = `Showing ${title}`;
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    searchResults.append(result);
  });

  searchResults.classList.toggle("is-visible", matches.length > 0);
}

function applySearch() {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    clearSearch();
    return;
  }

  const terms = query.split(/\s+/).filter(Boolean);
  let matchCount = 0;
  let firstMatch = null;
  const matches = [];

  chapterGroups.forEach((group) => {
    let groupHasMatch = terms.every((term) => group.searchText.includes(term));

    group.cards.forEach((card) => {
      const isMatch = terms.every((term) => card.dataset.searchText.includes(term));
      const score = isMatch ? getSearchScore(card.dataset.searchText, query, terms) : 0;
      card.classList.toggle("is-search-match", isMatch);
      card.classList.toggle("is-search-hidden", !isMatch && !groupHasMatch);

      if (isMatch) {
        matchCount += 1;
        matches.push({ card, score });
        groupHasMatch = true;
      }
    });

    group.divider.classList.toggle("is-search-hidden", !groupHasMatch);
    group.labels.forEach((label) => label.classList.toggle("is-search-hidden", !groupHasMatch));
  });

  if (matchCount === 0) {
    searchStatus.textContent = "No matches";
    searchResults.classList.remove("is-visible");
    searchResults.innerHTML = "";
    return;
  }

  searchStatus.textContent = `${matchCount} match${matchCount === 1 ? "" : "es"}`;
  matches.sort((a, b) => b.score - a.score);
  firstMatch = matches[0]?.card || null;
  renderSearchResults(matches.map((match) => match.card), query, terms);
  if (firstMatch) {
    firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

searchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(applySearch, 140);
});

buildChapterNav();
buildGrid();
syncPageSize();
