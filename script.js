
"use strict";

/* HATENACAT — Personal Website */

const CONFIG = {
  youtubeHandle: "hatenacat",
  youtubeApiKey: "AIzaSyB6IiGXtBSEZp1TJIc4jgsswCtHjmRvk1E",
  youtubeMaxCandidates: 30,
  youtubeDisplayCount: 3,
  robloxThumbnailSize: "420x420",
  requestTimeout: 15000
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

function setText(element, text) {
  if (element) element.textContent = text;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;

  return element;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    CONFIG.requestTimeout
  );

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/* 年号 */
function initCurrentYear() {
  setText($("#current-year"), String(new Date().getFullYear()));
}

/* ナビゲーション */
function initNavigation() {
  const toggle = $("#menu-toggle");
  const menu = $("#site-nav");

  if (!toggle || !menu) return;

  const closeMenu = () => {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "メニューを開く");
    document.body.classList.remove("menu-open");
  };

  const openMenu = () => {
    menu.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "メニューを閉じる");
    document.body.classList.add("menu-open");
  };

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.contains("is-open");

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  $$(".nav-link", menu).forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click", event => {
    if (
      menu.classList.contains("is-open") &&
      !menu.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 620) closeMenu();
  });
}

/* 現在見ているセクションをメニューに反映 */
function initActiveNavigation() {
  const links = $$(".nav-link[href^='#']");
  const sections = links
    .map(link => $(link.getAttribute("href")))
    .filter(Boolean);

  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;

    links.forEach(link => {
      const active = link.getAttribute("href") === `#${visible.target.id}`;

      link.classList.toggle("active", active);

      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }, {
    rootMargin: "-20% 0px -60% 0px",
    threshold: [0, 0.15, 0.35, 0.6]
  });

  sections.forEach(section => observer.observe(section));
}

/* スクロール時のフェード */
function initScrollReveal() {
  const elements = $$(".reveal");

  if (!("IntersectionObserver" in window)) {
    elements.forEach(element => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.08,
    rootMargin: "0px 0px -25px 0px"
  });

  elements.forEach(element => observer.observe(element));
}

/* アクセスごとにカードの順序・幅を変更 */
function shuffleArray(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function initRandomLayout() {
  const grid = $("#content-grid");

  if (!grid) return;

  const cards = $$("[data-card]", grid);

  if (cards.length < 2) return;

  const order = shuffleArray(cards);

  // DOMの順番を入れ替える。各カードのIDは変えない。
  order.forEach(card => grid.appendChild(card));

  // 幅も訪問ごとに変化させる。
  // モバイル時の幅はCSSで上書きして読みやすさを維持する。
  order.forEach(card => {
    const type = card.dataset.card;

    if (type === "youtube") {
      card.style.gridColumn = Math.random() < 0.72
        ? "span 12"
        : "span 8";
      return;
    }

    if (type === "games") {
      const spans = [5, 7, 12];
      const weights = [0.25, 0.35, 0.40];
      card.style.gridColumn = `span ${weightedChoice(spans, weights)}`;
      return;
    }

    const spans = [4, 5, 6, 7, 8];
    const weights = [0.10, 0.25, 0.30, 0.25, 0.10];

    card.style.gridColumn = `span ${weightedChoice(spans, weights)}`;
  });

  // 並べ替えたカードは新しい順序で自然に表示する。
  cards.forEach((card, index) => {
    card.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
  });
}

function weightedChoice(values, weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * total;

  for (let i = 0; i < values.length; i++) {
    random -= weights[i];

    if (random <= 0) return values[i];
  }

  return values[values.length - 1];
}

/* ページ上部へ戻る */
function initBackToTop() {
  const button = $("#back-to-top");

  if (!button) return;

  const update = () => {
    button.classList.toggle("is-visible", window.scrollY > 500);
  };

  window.addEventListener("scroll", update, { passive: true });
  update();
}

/* コピー */
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.select();

  const success = document.execCommand("copy");
  textarea.remove();

  if (!success) throw new Error("Copy failed");
}

function initCopyButtons() {
  $$("[data-copy]").forEach(button => {
    button.addEventListener("click", async () => {
      const original = button.textContent;

      try {
        await copyText(button.dataset.copy || "");
        setText(button, "COPIED!");
        button.setAttribute("aria-label", "コピーしました");
      } catch (error) {
        console.error("Copy failed:", error);
        setText(button, "FAILED");
      }

      setTimeout(() => {
        setText(button, original || "COPY");
        button.setAttribute(
          "aria-label",
          `${button.dataset.copy || ""}をコピー`
        );
      }, 1400);
    });
  });
}

/* Roblox */
async function getRobloxUser(username) {
  const data = await fetchJson(
    "https://users.roblox.com/v1/usernames/users",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false
      })
    }
  );

  const user = data.data?.find(
    item => item.name?.toLowerCase() === username.toLowerCase()
  );

  if (!user?.id) {
    throw new Error(`Roblox username not found: ${username}`);
  }

  return user;
}

async function getRobloxAvatar(userId) {
  const params = new URLSearchParams({
    userIds: String(userId),
    size: CONFIG.robloxThumbnailSize,
    format: "Png",
    isCircular: "false"
  });

  const data = await fetchJson(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?${params}`
  );

  const result = data.data?.find(
    item => String(item.targetId) === String(userId)
  );

  if (result?.state !== "Completed" || !result.imageUrl) {
    throw new Error(`Roblox thumbnail unavailable: ${userId}`);
  }

  return result.imageUrl;
}

function makeAvatarFallback(username) {
  const initials = username
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase() || "R";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="420">
      <rect width="420" height="420" rx="48" fill="#edf5ff"/>
      <rect x="8" y="8" width="404" height="404" rx="40"
        fill="none" stroke="#77aaff" stroke-width="4"/>
      <text x="210" y="245" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="132"
        font-weight="700" fill="#4389f5">${initials}</text>
    </svg>
  `;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function setAvatarFallback(image, username) {
  image.dataset.avatarState = "error";
  image.onerror = null;
  image.src = makeAvatarFallback(username);
  image.alt = `${username} avatar placeholder`;
}

async function loadRobloxAvatar(image) {
  const username = image.dataset.robloxUsername;

  if (!username) return;

  image.dataset.avatarState = "loading";

  try {
    const user = await getRobloxUser(username);
    const avatarUrl = await getRobloxAvatar(user.id);

    const profileLink = image.closest("[data-roblox-profile]");

    if (profileLink) {
      profileLink.href = `https://www.roblox.com/users/${user.id}/profile`;
      profileLink.target = "_blank";
      profileLink.rel = "noopener noreferrer";
    }

    image.alt = `${user.displayName || user.name} Roblox avatar`;

    image.onload = () => {
      image.dataset.avatarState = "loaded";
    };

    image.onerror = () => {
      console.error(`Roblox image URL failed: ${username}`, avatarUrl);
      setAvatarFallback(image, username);
    };

    image.src = avatarUrl;

    console.info(`Roblox avatar requested: ${username}`, user.id);
  } catch (error) {
    console.error(`Roblox avatar failed: ${username}`, error);
    setAvatarFallback(image, username);
  }
}

function initRobloxAvatars() {
  const images = $$("img[data-roblox-username]");

  console.info(`Roblox avatar images found: ${images.length}`);

  images.forEach(image => {
    loadRobloxAvatar(image);
  });
}

/* YouTube */
function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function getThumbnail(video) {
  const thumbnails = video.snippet?.thumbnails || {};

  return thumbnails.maxres?.url
    || thumbnails.high?.url
    || thumbnails.medium?.url
    || thumbnails.default?.url
    || "";
}

function showYouTubeFallback(message) {
  setText($("#shorts-status"), message);

  const list = $("#shorts-list");
  if (!list) return;

  list.replaceChildren();

  const link = makeElement(
    "a",
    "shorts-fallback-link",
    "YouTubeでShortsを見る ↗"
  );

  link.href = `https://www.youtube.com/@${CONFIG.youtubeHandle}/shorts`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  list.appendChild(link);
}

function renderYouTubeVideos(videos) {
  const list = $("#shorts-list");
  const player = $("#shorts-player");
  const placeholder = $("#shorts-placeholder");
  const status = $("#shorts-status");
  const title = $("#shorts-title");

  if (!list) return;

  list.replaceChildren();

  if (!videos || videos.length === 0) {
    if (player) {
      player.hidden = true;
      player.src = "about:blank";
    }

    if (placeholder) placeholder.hidden = false;

    showYouTubeFallback("表示できる動画が見つかりませんでした。");
    return;
  }

  const setPlayer = video => {
    if (!player) return;

    const videoId = video.id;
    const videoTitle = video.snippet?.title || "YouTube Video";

    player.src =
      `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`;

    player.title = videoTitle;
    player.hidden = false;

    if (placeholder) placeholder.hidden = true;
    if (title) setText(title, videoTitle);
  };

  setPlayer(videos[0]);

  if (status) {
    setText(status, "最新の動画を読み込みました。");
  }

  videos.forEach((video, index) => {
    const item = makeElement("button", "shorts-item");
    const videoTitle = video.snippet?.title || "YouTube Video";
    const thumbnail = getThumbnail(video);

    item.type = "button";
    item.setAttribute("aria-pressed", String(index === 0));
    item.setAttribute("aria-label", `${videoTitle}を再生`);

    if (thumbnail) {
      const image = makeElement("img", "shorts-thumbnail");
      image.src = thumbnail;
      image.alt = "";
      image.loading = "lazy";
      image.onerror = () => {
        image.hidden = true;
      };

      item.appendChild(image);
    }

    const content = makeElement("span", "shorts-item-content");

    content.appendChild(
      makeElement("span", "shorts-item-title", videoTitle)
    );

    content.appendChild(
      makeElement(
        "span",
        "shorts-item-date",
        formatDate(video.snippet?.publishedAt)
      )
    );

    item.appendChild(content);
    item.appendChild(makeElement("span", "shorts-play-icon", "▶"));

    if (index === 0) item.classList.add("is-active");

    item.addEventListener("click", () => {
      setPlayer(video);

      $$(".shorts-item", list).forEach(button => {
        button.classList.remove("is-active");
        button.setAttribute("aria-pressed", "false");
      });

      item.classList.add("is-active");
      item.setAttribute("aria-pressed", "true");
    });

    list.appendChild(item);
  });
}

async function loadYouTubeVideos() {
  const status = $("#shorts-status");

  try {
    setText(status, "YouTube動画を読み込み中...");

    const key = encodeURIComponent(CONFIG.youtubeApiKey);
    const handle = encodeURIComponent(`@${CONFIG.youtubeHandle}`);

    const channelData = await fetchJson(
      "https://www.googleapis.com/youtube/v3/channels" +
      `?part=contentDetails,snippet&forHandle=${handle}&key=${key}`
    );

    const channel = channelData.items?.[0];

    if (!channel) {
      throw new Error("YouTubeチャンネルが見つかりませんでした。");
    }

    const playlistId = channel.contentDetails?.relatedPlaylists?.uploads;

    if (!playlistId) {
      throw new Error("アップロード一覧を取得できませんでした。");
    }

    const playlistData = await fetchJson(
      "https://www.googleapis.com/youtube/v3/playlistItems" +
      `?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}` +
      `&maxResults=${CONFIG.youtubeMaxCandidates}&key=${key}`
    );

    const ids = (playlistData.items || [])
      .map(item => item.contentDetails?.videoId)
      .filter(Boolean);

    if (!ids.length) {
      throw new Error("動画が見つかりませんでした。");
    }

    const videoData = await fetchJson(
      "https://www.googleapis.com/youtube/v3/videos" +
      `?part=snippet,contentDetails&id=${ids.join(",")}&key=${key}`
    );

    const videos = (videoData.items || [])
      .filter(video => {
        const duration = video.contentDetails?.duration || "";
        const match = duration.match(
          /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
        );

        if (!match) return false;

        const seconds =
          Number(match[1] || 0) * 3600 +
          Number(match[2] || 0) * 60 +
          Number(match[3] || 0);

        return seconds > 0 && seconds <= 180;
      })
      .sort((a, b) =>
        new Date(b.snippet?.publishedAt || 0) -
        new Date(a.snippet?.publishedAt || 0)
      )
      .slice(0, CONFIG.youtubeDisplayCount);

    renderYouTubeVideos(videos);
  } catch (error) {
    console.error("YouTube API error:", error);

    showYouTubeFallback(
      "動画を読み込めませんでした。APIキー・API制限・割り当てを確認してください。"
    );
  }
}

function initYouTube() {
  const link = $("#shorts-channel-link");

  if (link) {
    link.href = `https://www.youtube.com/@${CONFIG.youtubeHandle}/shorts`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  loadYouTubeVideos();
}

/* 外部リンクの安全設定 */
function initExternalLinks() {
  $$('a[target="_blank"]').forEach(link => {
    link.rel = "noopener noreferrer";
  });
}

/* 初期化 */
function init() {
  initCurrentYear();
  initRandomLayout();
  initNavigation();
  initActiveNavigation();
  initScrollReveal();
  initBackToTop();
  initCopyButtons();
  initRobloxAvatars();
  initYouTube();
  initExternalLinks();

  console.info("Hatenacat website initialized.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
