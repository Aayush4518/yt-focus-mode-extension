console.log("[Content] YouTube Focus Mode content script loaded");

const ALLOWED_PATHS = ["/results", "/watch", "/shorts"];
const VIDEO_PATH = "/watch";

function isAllowedPage() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  
  if (path === "/results") return true;
  if (path === VIDEO_PATH && params.has("v")) return true;
  
  return false;
}

function hideElements() {
  if (isAllowedPage()) {
    console.log("[Content] Allowed page, skipping hide");
    return;
  }
  
  console.log("[Content] Hiding distracting elements");

  document.querySelectorAll("ytd-rich-grid-renderer, ytd-rich-section-renderer").forEach(el => {
    el.style.display = "none";
  });

  document.querySelectorAll("ytd-reel-shelf-renderer").forEach(el => {
    el.style.display = "none";
  });

  document.querySelectorAll("ytd-rich-shelf-renderer").forEach(el => {
    const title = el.querySelector("yt-formatted-string")?.textContent?.toLowerCase() || "";
    const hasReels = el.querySelector("ytd-reel-video-renderer, ytd-grid-video-renderer");
    if (title.includes("shorts") || hasReels) {
      el.style.display = "none";
    }
  });

  document.querySelectorAll("ytd-watch-next-secondary-results-renderer").forEach(el => {
    el.style.display = "none";
  });

  document.querySelectorAll("ytd-compact-video-renderer, ytd-compact-autoplay-renderer").forEach(el => {
    el.style.display = "none";
  });

  document.querySelectorAll("ytd-endscreen-content-renderer").forEach(el => {
    el.style.display = "none";
  });

  document.querySelectorAll("ytd-feed-nudge-renderer, ytd-rich-item-renderer").forEach(el => {
    const title = el.querySelector("yt-formatted-string")?.textContent?.toLowerCase() || "";
    if (title.includes("trending") || title.includes("explore")) {
      el.style.display = "none";
    }
  });
}

let observer = null;
let currentFocusState = false;

function startObserver() {
  if (observer) {
    observer.disconnect();
  }

  console.log("[Content] Starting MutationObserver");
  
  observer = new MutationObserver((mutations) => {
    if (currentFocusState) {
      const significantMutation = mutations.some(m => 
        m.addedNodes.length > 0 || m.type === "childList"
      );
      if (significantMutation) {
        hideElements();
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function handleFocusState(focusActive) {
  console.log("[Content] Focus state changed:", focusActive);
  currentFocusState = focusActive;
  
  if (focusActive) {
    hideElements();
  }
}

chrome.storage.local.get("focusActive", (result) => {
  console.log("[Content] Initial focusActive:", result.focusActive);
  handleFocusState(result.focusActive || false);
  startObserver();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.focusActive) {
    handleFocusState(changes.focusActive.newValue);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Content] Message received:", message);
  if (message.focusActive !== undefined) {
    handleFocusState(message.focusActive);
    sendResponse({ success: true });
  }
});
