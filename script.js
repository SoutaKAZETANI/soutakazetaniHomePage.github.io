const canvas = document.querySelector("#molecule-canvas");
const context = canvas?.getContext("2d");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let width = 0;
let height = 0;
let points = [];
const pointer = { active: false, x: 0, y: 0 };
const validViews = new Set(["home", "profile", "gamer", "works", "logs", "links"]);
const originalTitle = document.title;
let activeView = "home";
let routeLock = false;
let initialLoadFinished = false;
const INITIAL_LOAD_MIN_MS = 1000;
const ROUTE_LOAD_BEFORE_SWAP_MS = 650;
const ROUTE_LOAD_AFTER_SWAP_MS = 350;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function preloadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      if (image.decode) {
        image.decode().then(resolve).catch(resolve);
      } else {
        resolve();
      }
    };
    image.onerror = resolve;
    image.src = src;

    if (image.complete && image.naturalWidth > 0) {
      resolve();
    }
  });
}

const logoReady = preloadImage("assets/logo.png");
const criticalImagesReady = Promise.allSettled([
  logoReady,
  preloadImage("assets/header.png"),
  preloadImage("assets/icon.png"),
]);

function setupManagedLinks() {
  const grid = document.querySelector("[data-managed-links]");
  const links = Array.isArray(window.SOUTA_LINKS) ? window.SOUTA_LINKS : [];
  if (!grid || links.length === 0) return;

  const fragment = document.createDocumentFragment();

  links.forEach((link) => {
    if (!link || !link.url || !link.title) return;

    const anchor = document.createElement("a");
    anchor.className = "reveal";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";

    const media = document.createElement("div");
    media.className = "link-media";
    media.setAttribute("aria-hidden", "true");

    if (link.image) {
      const image = document.createElement("img");
      image.src = link.image;
      image.alt = "";
      image.loading = "lazy";
      media.append(image);
    }

    const copy = document.createElement("div");
    copy.className = "link-copy";

    const label = document.createElement("span");
    label.textContent = link.label || "Link";

    const title = document.createElement("strong");
    title.textContent = link.title;

    copy.append(label, title);
    anchor.append(media, copy);
    fragment.append(anchor);
  });

  grid.replaceChildren(fragment);
}

function resizeCanvas() {
  if (!canvas || !context) return;

  const ratio = window.devicePixelRatio || 1;
  width = canvas.offsetWidth;
  height = canvas.offsetHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  createPoints();
}

function createPoints() {
  const count = Math.max(42, Math.floor((width * height) / 18000));
  points = Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: index % 6 === 0 ? 3.5 : 2.1,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    phase: Math.random() * Math.PI * 2,
  }));
}

function drawPoint(point, time) {
  const pulse = prefersReducedMotion ? 0 : Math.sin(time * 0.0014 + point.phase) * 0.6;
  context.beginPath();
  context.arc(point.x, point.y, point.radius + pulse, 0, Math.PI * 2);
  context.fillStyle = point.radius > 3 ? "rgba(53, 166, 255, 0.95)" : "rgba(158, 227, 255, 0.82)";
  context.fill();
}

function drawConnections() {
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const maxDistance = width < 680 ? 110 : 148;

      if (distance < maxDistance) {
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.strokeStyle = `rgba(255, 255, 255, ${0.17 * (1 - distance / maxDistance)})`;
        context.lineWidth = 1;
        context.stroke();
      }
    }

    if (pointer.active) {
      const point = points[i];
      const distance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
      if (distance < 170) {
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(pointer.x, pointer.y);
        context.strokeStyle = `rgba(53, 166, 255, ${0.2 * (1 - distance / 170)})`;
        context.stroke();
      }
    }
  }
}

function movePoint(point) {
  point.x += point.vx;
  point.y += point.vy;

  if (pointer.active) {
    const dx = point.x - pointer.x;
    const dy = point.y - pointer.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 0 && distance < 82) {
      const push = (82 - distance) / 82;
      point.x += (dx / distance) * push * 0.7;
      point.y += (dy / distance) * push * 0.7;
    }
  }

  if (point.x < -20) point.x = width + 20;
  if (point.x > width + 20) point.x = -20;
  if (point.y < -20) point.y = height + 20;
  if (point.y > height + 20) point.y = -20;
}

function render(time = 0) {
  if (!canvas || !context) return;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(6, 24, 44, 0.1)";
  context.fillRect(0, 0, width, height);
  drawConnections();

  points.forEach((point) => {
    if (!prefersReducedMotion) {
      movePoint(point);
    }
    drawPoint(point, time);
  });

  if (!prefersReducedMotion) {
    window.requestAnimationFrame(render);
  }
}

function updateProgress() {
  const progress = document.querySelector(".scroll-progress");
  if (!progress) return;

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
  progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
}

function normalizeRoute(hash = window.location.hash) {
  const route = hash.replace(/^#\/?/, "") || "home";
  const aliases = {
    top: "home",
    profile: "profile",
    about: "profile",
    activities: "works",
    works: "works",
    articles: "logs",
    logs: "logs",
    links: "links",
  };

  return validViews.has(aliases[route] || route) ? aliases[route] || route : "home";
}

function setActiveNav(view) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.route === view);
  });
}

function revealView(view) {
  const activeViews = document.querySelectorAll(`[data-view="${view}"]`);
  const revealItems = Array.from(activeViews).flatMap((container) =>
    Array.from(container.querySelectorAll(".reveal"))
  );

  revealItems.forEach((item) => item.classList.remove("is-visible"));
  revealItems.forEach((item, index) => {
    window.setTimeout(() => item.classList.add("is-visible"), prefersReducedMotion ? 0 : 80 + index * 45);
  });
}

function applyView(view) {
  document.body.classList.toggle('gamer-mode', view === 'gamer');
  document.title = view === 'gamer' ? 'ゲーマーの風谷 | 風谷創太' : originalTitle;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', view === 'gamer' ? '#19090e' : '#06182c');
  document.querySelector('[data-work-categories]')?._stop?.();
  document.querySelectorAll('.video-player').forEach(frame => { if (frame._poster) frame.replaceWith(frame._poster); });
  document.querySelectorAll("[data-view]").forEach((viewElement) => {
    viewElement.classList.toggle("is-active", viewElement.dataset.view === view);
  });

  activeView = view;
  setActiveNav(view);
  updateProgress();
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  window.setTimeout(() => revealView(view), 30);
}

function showTransition(visible) {
  const transition = document.querySelector(".page-transition");
  document.body.classList.toggle("is-transitioning", visible);
  if (!transition) return;

  if (visible) {
    transition.classList.remove("is-visible");
    void transition.offsetWidth;
    transition.classList.add("is-visible");
  } else {
    transition.classList.remove("is-visible");
  }
}

async function switchView(view, { animate = true, updateUrl = true, force = false } = {}) {
  const nextView = validViews.has(view) ? view : "home";
  if (routeLock || (!force && nextView === activeView)) {
    setActiveNav(nextView);
    return;
  }

  routeLock = true;

  if (updateUrl && window.location.hash !== `#/${nextView}`) {
    window.history.pushState({}, "", `#/${nextView}`);
  }

  if (!animate) {
    applyView(nextView);
    routeLock = false;
    return;
  }

  showTransition(true);

  try {
    await Promise.allSettled([logoReady, wait(ROUTE_LOAD_BEFORE_SWAP_MS)]);
    applyView(nextView);
    await wait(ROUTE_LOAD_AFTER_SWAP_MS);
  } finally {
    showTransition(false);
    routeLock = false;
  }
}

function setupRouter() {
  const rawRoute = window.location.hash.replace(/^#\/?/, "") || "home";
  activeView = normalizeRoute();

  if (rawRoute === "data") {
    window.history.replaceState({}, "", `#/${activeView}`);
  }

  applyView(activeView);

  document.querySelectorAll('a[href^="#/"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const view = normalizeRoute(link.getAttribute("href"));
      switchView(view, { force: true });
    });
  });

  window.addEventListener("popstate", () => {
    switchView(normalizeRoute(), { animate: true, updateUrl: false });
  });

  window.addEventListener("hashchange", () => {
    const rawRoute = window.location.hash.replace(/^#\/?/, "") || "home";
    const nextRoute = normalizeRoute();

    if (rawRoute === "data") {
      window.history.replaceState({}, "", `#/${nextRoute}`);
    }

    if (!routeLock) {
      switchView(nextRoute, { animate: true, updateUrl: false });
    }
  });
}

function setupCopyButtons() {
  const toast = document.querySelector(".toast");

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const text = button.getAttribute("data-copy");
      if (!text) return;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.append(textarea);
          textarea.select();
          document.execCommand("copy");
          textarea.remove();
        }

        if (toast) {
          toast.classList.add("is-visible");
          window.setTimeout(() => toast.classList.remove("is-visible"), 1600);
        }
      } catch {
        button.textContent = text;
      }
    });
  });
}

function setupPointer() {
  const hero = document.querySelector(".hero");
  if (!hero || !canvas) return;

  hero.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.active = true;
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
  });

  hero.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
}

async function finishInitialLoad() {
  if (initialLoadFinished) return;
  initialLoadFinished = true;

  const minimumDuration = INITIAL_LOAD_MIN_MS;
  await Promise.allSettled([criticalImagesReady, wait(minimumDuration)]);
  document.body.classList.remove("is-loading");
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("load", finishInitialLoad, { once: true });

resizeCanvas();
render();
setupManagedLinks();
window.renderFeaturedVideos(document, window.SOUTA_VIDEOS || []);
window.renderWorks(document, window.SOUTA_WORKS || []);
updateProgress();
setupRouter();
setupCopyButtons();
setupPointer();

if (document.readyState === "complete") {
  finishInitialLoad();
}
