/* SG Toy House mobile swipe navigation
   Page order: Home -> LEGO -> Pokemon -> One Piece -> Accessories */
(() => {
  "use strict";

  const pages = [
    { file: "index.html", label: "Home" },
    { file: "lego.html", label: "LEGO" },
    { file: "pokemon.html", label: "Pokémon TCG" },
    { file: "onepiece.html", label: "One Piece TCG" },
    { file: "accessories.html", label: "Accessories" }
  ];

  const MOBILE_MAX = 900;
  const MIN_DISTANCE = 70;
  const MAX_VERTICAL_DRIFT = 80;
  const MIN_HORIZONTAL_RATIO = 1.25;
  const ANIMATION_MS = 280;
  const interactiveSelector = [
    "a", "button", "input", "select", "textarea", "label", "video", "audio",
    "[contenteditable='true']", "[role='button']", "[role='dialog']",
    ".product-modal", ".product-photo-viewer", ".modal", ".lightbox"
  ].join(",");

  const normalizeFile = (path) => {
    const file = (path.split("/").pop() || "index.html").split("?")[0].split("#")[0];
    return file || "index.html";
  };

  const currentIndex = pages.findIndex((page) => page.file === normalizeFile(location.pathname));
  if (currentIndex < 0) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const mobileQuery = matchMedia(`(max-width: ${MOBILE_MAX}px)`);
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let tracking = false;
  let navigating = false;
  let sourceTarget = null;

  const style = document.createElement("style");
  style.textContent = `
    html.sgth-swipe-navigating,
    html.sgth-swipe-navigating body { overflow: hidden !important; }
    body.sgth-swipe-page {
      transition: transform ${ANIMATION_MS}ms cubic-bezier(.22,.61,.36,1), opacity ${ANIMATION_MS}ms ease;
      will-change: transform, opacity;
    }
    body.sgth-swipe-page.sgth-exit-left { transform: translate3d(-100vw,0,0); opacity: .35; }
    body.sgth-swipe-page.sgth-exit-right { transform: translate3d(100vw,0,0); opacity: .35; }
    .sgth-swipe-shade {
      position: fixed; inset: 0; z-index: 2147483645; pointer-events: none;
      background: rgba(0,0,0,0); transition: background ${ANIMATION_MS}ms ease;
    }
    .sgth-swipe-shade.is-active { background: rgba(0,0,0,.42); }
    .sgth-swipe-label {
      position: fixed; left: 50%; bottom: max(24px, env(safe-area-inset-bottom));
      z-index: 2147483646; max-width: calc(100vw - 40px); padding: 10px 16px;
      color: #070707; background: #f0d675; border: 1px solid #d4af37;
      border-radius: 999px; box-shadow: 0 10px 30px rgba(0,0,0,.45);
      font: 800 13px/1.2 Arial,Helvetica,sans-serif; text-align: center;
      opacity: 0; pointer-events: none; transform: translate(-50%,18px);
      transition: opacity 180ms ease, transform 180ms ease;
    }
    .sgth-swipe-label.is-active { opacity: 1; transform: translate(-50%,0); }

    .sgth-swipe-bar {
      display: none;
    }
    @media (max-width: 900px) {
      body.sgth-swipe-page { padding-bottom: calc(62px + env(safe-area-inset-bottom)); }
      .sgth-swipe-bar {
        min-height: 54px;
        padding: 6px max(10px, env(safe-area-inset-left)) calc(6px + env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-right));
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        position: fixed;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 2147483644;
        background: rgba(7,7,7,.94);
        border-top: 1px solid #3c321c;
        box-shadow: 0 -8px 26px rgba(0,0,0,.42);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        font-family: Arial,Helvetica,sans-serif;
      }
      .sgth-swipe-bar-button {
        min-width: 0;
        min-height: 40px;
        padding: 6px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f0d675;
        background: #171717;
        border: 1px solid #3c321c;
        border-radius: 999px;
        font: 800 11px/1.15 Arial,Helvetica,sans-serif;
        cursor: pointer;
      }
      .sgth-swipe-bar-button.next { justify-content: flex-end; text-align: right; }
      .sgth-swipe-bar-button.previous { justify-content: flex-start; text-align: left; }
      .sgth-swipe-bar-button:disabled { opacity: .3; cursor: default; }
      .sgth-swipe-bar-arrow { flex: 0 0 auto; color: #d4af37; font-size: 22px; line-height: 1; }
      .sgth-swipe-bar-copy { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sgth-swipe-bar-title { color: #b8ad91; font: 700 9px/1.1 Arial,Helvetica,sans-serif; letter-spacing: .6px; text-transform: uppercase; }
      .sgth-swipe-bar-current { color: #f8f4e8; font: 800 11px/1.2 Arial,Helvetica,sans-serif; text-align: center; white-space: nowrap; }
      body.product-modal-open .sgth-swipe-bar,
      body:has(.product-photo-viewer:not([hidden])) .sgth-swipe-bar { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      body.sgth-swipe-page, .sgth-swipe-shade, .sgth-swipe-label { transition: none !important; }
    }
  `;
  document.head.appendChild(style);
  document.body.classList.add("sgth-swipe-page");

  const shade = document.createElement("div");
  shade.className = "sgth-swipe-shade";
  shade.setAttribute("aria-hidden", "true");
  document.body.appendChild(shade);

  const label = document.createElement("div");
  label.className = "sgth-swipe-label";
  label.setAttribute("role", "status");
  label.setAttribute("aria-live", "polite");
  document.body.appendChild(label);



  const swipeBar = document.createElement("nav");
  swipeBar.className = "sgth-swipe-bar";
  swipeBar.setAttribute("aria-label", "Swipe category navigation");

  const previousPage = pages[currentIndex - 1] || null;
  const nextPage = pages[currentIndex + 1] || null;

  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.className = "sgth-swipe-bar-button previous";
  previousButton.disabled = !previousPage;
  previousButton.setAttribute("aria-label", previousPage ? `Previous category: ${previousPage.label}` : "No previous category");
  previousButton.innerHTML = `<span class="sgth-swipe-bar-arrow" aria-hidden="true">&#8592;</span><span class="sgth-swipe-bar-copy"><span class="sgth-swipe-bar-title">Previous</span><br>${previousPage ? previousPage.label : "Start"}</span>`;

  const currentLabel = document.createElement("span");
  currentLabel.className = "sgth-swipe-bar-current";
  currentLabel.textContent = "Swipe categories";

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "sgth-swipe-bar-button next";
  nextButton.disabled = !nextPage;
  nextButton.setAttribute("aria-label", nextPage ? `Next category: ${nextPage.label}` : "No next category");
  nextButton.innerHTML = `<span class="sgth-swipe-bar-copy"><span class="sgth-swipe-bar-title">Next</span><br>${nextPage ? nextPage.label : "End"}</span><span class="sgth-swipe-bar-arrow" aria-hidden="true">&#8594;</span>`;

  swipeBar.append(previousButton, currentLabel, nextButton);
  document.body.appendChild(swipeBar);

  const overlayIsOpen = () => {
    if (document.fullscreenElement) return true;
    return [...document.querySelectorAll("[role='dialog'], .product-modal, .product-photo-viewer, .modal, .lightbox")]
      .some((element) => !element.hidden && getComputedStyle(element).display !== "none" && element.getAttribute("aria-hidden") !== "true");
  };

  const reset = () => {
    tracking = false;
    sourceTarget = null;
    document.body.style.transform = "";
    document.body.style.opacity = "";
    shade.classList.remove("is-active");
    label.classList.remove("is-active");
  };

  const destinationFor = (deltaX) => {
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    return pages[nextIndex] || null;
  };

  const showPreview = (deltaX) => {
    const destination = destinationFor(deltaX);
    if (!destination) return;
    label.textContent = `${deltaX < 0 ? "Next" : "Previous"}: ${destination.label}`;
    label.classList.add("is-active");
    shade.classList.add("is-active");
  };

  const navigate = (deltaX) => {
    const destination = destinationFor(deltaX);
    if (!destination || navigating) {
      reset();
      return;
    }

    navigating = true;
    label.textContent = `Opening ${destination.label}`;
    label.classList.add("is-active");
    shade.classList.add("is-active");
    document.documentElement.classList.add("sgth-swipe-navigating");

    if (reducedMotion.matches) {
      location.assign(destination.file);
      return;
    }

    document.body.style.transform = "";
    document.body.style.opacity = "";
    document.body.classList.add(deltaX < 0 ? "sgth-exit-left" : "sgth-exit-right");
    window.setTimeout(() => location.assign(destination.file), ANIMATION_MS - 20);
  };



  previousButton.addEventListener("click", () => {
    if (previousPage && !overlayIsOpen()) navigate(1);
  });
  nextButton.addEventListener("click", () => {
    if (nextPage && !overlayIsOpen()) navigate(-1);
  });

  document.addEventListener("touchstart", (event) => {
    if (!mobileQuery.matches || navigating || event.touches.length !== 1 || overlayIsOpen()) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest(interactiveSelector)) return;
    const touch = event.touches[0];
    startX = currentX = touch.clientX;
    startY = touch.clientY;
    sourceTarget = target;
    tracking = true;
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (!tracking || event.touches.length !== 1) return;
    const touch = event.touches[0];
    currentX = touch.clientX;
    const deltaX = currentX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaY) > Math.abs(deltaX) || Math.abs(deltaY) > MAX_VERTICAL_DRIFT) {
      reset();
      return;
    }

    if (!destinationFor(deltaX)) return;
    showPreview(deltaX);
    const drag = Math.max(-110, Math.min(110, deltaX * 0.22));
    document.body.style.transform = `translate3d(${drag}px,0,0)`;
    document.body.style.opacity = String(Math.max(0.78, 1 - Math.abs(deltaX) / 900));
  }, { passive: true });

  document.addEventListener("touchend", (event) => {
    if (!tracking) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const horizontalEnough = Math.abs(deltaX) >= MIN_DISTANCE;
    const directionIsClear = Math.abs(deltaX) >= Math.abs(deltaY) * MIN_HORIZONTAL_RATIO;
    const stillEligible = sourceTarget && !overlayIsOpen();

    if (horizontalEnough && directionIsClear && stillEligible && destinationFor(deltaX)) {
      navigate(deltaX);
    } else {
      document.body.style.transition = `transform 180ms ease, opacity 180ms ease`;
      reset();
      window.setTimeout(() => { document.body.style.transition = ""; }, 190);
    }
  }, { passive: true });

  document.addEventListener("touchcancel", reset, { passive: true });
  window.addEventListener("pageshow", () => {
    navigating = false;
    document.documentElement.classList.remove("sgth-swipe-navigating");
    document.body.classList.remove("sgth-exit-left", "sgth-exit-right");
    reset();
  });
})();
