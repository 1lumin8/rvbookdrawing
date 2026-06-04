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

function createSectionLabel(text) {
  const label = document.createElement("div");
  label.className = "section-label";
  label.textContent = text;
  return label;
}

function createPageCard({ page, src, kind }) {
  const figure = document.createElement("figure");
  const button = document.createElement("button");
  const image = document.createElement("img");
  const caption = document.createElement("figcaption");
  const label = kind === "notes" ? `Notes page ${page}` : kind === "detail" ? page : `Page ${page}`;

  figure.className = "page-card";
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

  fragment.append(createDetailsDivider());
  fragment.append(createSectionLabel("Reference details"));
  DETAILS.forEach((detail) => {
    fragment.append(createPageCard(detail));
  });

  CHAPTERS.forEach((chapter, chapterIndex) => {
    const drawingEnd = getChapterEndPage(chapterIndex);
    const notesEnd = getNotesEndPage(chapterIndex);

    fragment.append(createChapterDivider(chapter, chapterIndex));
    fragment.append(createSectionLabel("Drawings"));

    for (let page = chapter.page; page <= drawingEnd; page += 1) {
      if (page >= FIRST_PAGE) {
        fragment.append(createPageCard({ page, src: pageFile(page), kind: "drawing" }));
      }
    }

    fragment.append(createSectionLabel("Explanation notes"));

    for (let page = chapter.notesPage; page <= notesEnd; page += 1) {
      fragment.append(createPageCard({ page, src: notesPageFile(page), kind: "notes" }));
    }
  });

  grid.append(fragment);
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

function setZoom(nextZoom, keepCenter = true) {
  const oldWidth = zoomImage.getBoundingClientRect().width || fitWidth;
  const centerX = pane.scrollLeft + pane.clientWidth / 2;
  const centerY = pane.scrollTop + pane.clientHeight / 2;
  const ratioX = centerX / oldWidth;
  const ratioY = centerY / (oldWidth * 11 / 8.5);

  zoom = clamp(nextZoom, 0.55, 4);
  zoomImage.style.width = `${Math.round(fitWidth * zoom)}px`;
  updateZoomLabel();

  if (keepCenter) {
    requestAnimationFrame(() => {
      const newWidth = zoomImage.getBoundingClientRect().width;
      pane.scrollLeft = ratioX * newWidth - pane.clientWidth / 2;
      pane.scrollTop = ratioY * (newWidth * 11 / 8.5) - pane.clientHeight / 2;
    });
  }
}

function centerOnFocus() {
  requestAnimationFrame(() => {
    const rect = zoomImage.getBoundingClientRect();
    pane.scrollLeft = clickFocus.x * rect.width - pane.clientWidth / 2;
    pane.scrollTop = clickFocus.y * rect.height - pane.clientHeight / 2;
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
  setZoom(zoom + (event.deltaY > 0 ? -0.15 : 0.15));
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

buildChapterNav();
buildGrid();
syncPageSize();
