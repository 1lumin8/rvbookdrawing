const PAGE_COUNT = 105;
const FIRST_PAGE = 2;
const PAGE_PATH = "assets/pages/page-";
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
  { label: "Rev 1", page: 2 },
  { label: "Rev 2", page: 5 },
  { label: "Rev 3", page: 10 },
  { label: "Rev 4", page: 14 },
  { label: "Rev 5", page: 17 },
  { label: "Rev 6", page: 21 },
  { label: "Rev 7", page: 25 },
  { label: "Rev 8", page: 28 },
  { label: "Rev 9", page: 32 },
  { label: "Rev 10", page: 36 },
  { label: "Rev 11", page: 39 },
  { label: "Rev 12", page: 44 },
  { label: "Rev 13", page: 50 },
  { label: "Rev 14", page: 56 },
  { label: "Rev 15", page: 61 },
  { label: "Rev 16", page: 64 },
  { label: "Rev 17", page: 70 },
  { label: "Rev 18", page: 77 },
  { label: "Rev 19", page: 84 },
  { label: "Rev 20", page: 91 },
  { label: "Rev 21", page: 95 },
  { label: "Rev 22", page: 101 },
];

function pageFile(pageNumber) {
  return `${PAGE_PATH}${String(pageNumber).padStart(3, "0")}.jpg`;
}

function getChapterForPage(page) {
  return CHAPTERS.find((chapter) => chapter.page === page);
}

function getChapterEndPage(chapterIndex) {
  const nextChapter = CHAPTERS[chapterIndex + 1];
  return nextChapter ? nextChapter.page - 1 : PAGE_COUNT;
}

function buildChapterNav() {
  const fragment = document.createDocumentFragment();

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

  divider.className = "chapter-divider";
  divider.id = `chapter-${chapter.page}`;
  title.textContent = `Revelation ${chapter.label.replace("Rev ", "")}`;
  range.textContent = chapter.page === endPage ? `Page ${chapter.page}` : `Pages ${chapter.page}-${endPage}`;

  divider.append(title, range);
  return divider;
}

function buildGrid() {
  const fragment = document.createDocumentFragment();

  for (let page = FIRST_PAGE; page <= PAGE_COUNT; page += 1) {
    const chapterIndex = CHAPTERS.findIndex((chapter) => chapter.page === page);
    if (chapterIndex >= 0) {
      fragment.append(createChapterDivider(CHAPTERS[chapterIndex], chapterIndex));
    }

    const figure = document.createElement("figure");
    const button = document.createElement("button");
    const image = document.createElement("img");
    const caption = document.createElement("figcaption");

    figure.className = "page-card";
    button.className = "page-button";
    button.type = "button";
    button.dataset.page = page;
    button.setAttribute("aria-label", `Open page ${page}`);

    image.src = pageFile(page);
    image.alt = `Page ${page}`;
    image.loading = page <= 8 ? "eager" : "lazy";
    image.decoding = "async";

    caption.className = "caption";
    caption.textContent = `Page ${page}`;

    button.append(image);
    figure.append(button, caption);
    fragment.append(figure);
  }

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

function openZoom(page, event) {
  const source = event.currentTarget.querySelector("img");
  const rect = source.getBoundingClientRect();

  clickFocus = {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
  };
  activePage = page;
  zoomImage.src = pageFile(page);
  zoomImage.alt = `Page ${page}`;

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
  openZoom(Number(button.dataset.page), event);
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
