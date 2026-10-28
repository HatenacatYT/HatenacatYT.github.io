"use strict";

/* HATENA. Personal Website */

const CONFIG = {
  youtubeHandle: "hatenacat",
  youtubeApiKey: "AIzaSyB6IiGXtBSEZp1TJIc4jgsswCtHjmRvk1E",
  youtubeMaxCandidates: 30,
  youtubeDisplayCount: 3,
  robloxThumbnailSize: "420x420",
  requestTimeout: 12000
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
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function initCurrentYear() {
  const year = $("#current-year");
  if (year) setText(year, String(new Date().getFullYear()));
}

function initNavigation() {
  const toggle = $("#menu-toggle");
  const menu = $("#site-nav");

  if (!toggle || !menu) return;

  function closeMenu() {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  $$("a", menu).forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click", event => {
    if (!menu.contains(event.target) && !toggle.contains(event.target)) {
      closeMenu();
    }
  });
}

function initScrollReveal() {
  const elements = $$(
    ".reveal, .reveal-up, .reveal-left, .reveal-right"
  );

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
    threshold: 0.12,
    rootMargin: "0px 0px -35px 0px"
  });

  elements.forEach(element => observer.observe(element));
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
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
      const value = button.dataset.copy;
      if (!value) return;

      const originalText = button.textContent;

      try {
        await copyText(value);
        setText(button, "COPIED!");
      } catch (error) {
        console.error("Copy failed:", error);
        setText(button, "FAILED");
      }

      setTimeout(() => {
        setText(button, originalText || "COPY");
      }, 1400);
    });
  });
}

async function getRobloxUser(username) {
  const data = await fetchJson(
    "https://users.roblox.com/v1/usernames/users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false
      })
    }
  );

  return data.data?.[0] || null;
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

  return data.data?.[0]?.imageUrl || null;
}

function makeAvatarFallback(username) {
  const initials = username
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase() || "R";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="420">
      <rect width="420" height="420" rx="48" fill="#071116"/>
      <rect x="8" y="8" width="404" height="404" rx="40"
        fill="none" stroke="#00eaff" stroke-width="4"/>
      <text x="210" y="245" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="132"
        font-weight="700" fill="#00eaff">${initials}</text>
    </svg>
  `;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

async function loadRobloxAvatar(image) {
  const username = image.dataset.robloxUsername;
  if (!username) return;

  try {
    const user = await getRobloxUser(username);
    if (!user?.id) throw new Error(`Roblox user not found: ${username}`);

    const avatarUrl = await getRobloxAvatar(user.id);
    image.src = avatarUrl || makeAvatarFallback(username);
    image.alt = `${user.name} Roblox avatar`;

    const profileLink = image.closest("[data-roblox-profile]");
    if (profileLink) {
      profileLink.href = `https://www.roblox.com/users/${user.id}/profile`;
      profileLink.target = "_blank";
      profileLink.rel = "noopener noreferrer";
    }
  } catch (error) {
    console.warn(`Could not load Roblox avatar for ${username}:`, error);
    image.src = makeAvatarFallback(username);
    image.alt = `${username} avatar placeholder`;
  }
}

function initRobloxAvatars() {
  $$("img[data-roblox-username]").forEach(image => {
    image.addEventListener("error", () => {
      if (image.dataset.fallbackApplied === "true") return;
      image.dataset.fallbackApplied = "true";
      image.src = makeAvatarFallback(
        image.dataset.robloxUsername || "R"
      );
    });

    loadRobloxAvatar(image);
  });
}

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
  const status = $("#shorts-status");
  const list = $("#shorts-list");
  const placeholder = $("#shorts-placeholder");

  if (status) setText(status, message);
  if (placeholder) placeholder.hidden = false;

  if (list && !$("#shorts-fallback-link", list)) {
    const link = makeElement(
      "a",
      "shorts-fallback-link",
      "YouTubeでShortsを見る ↗"
    );

    link.id = "shorts-fallback-link";
    link.href = `https://www.youtube.com/@${CONFIG.youtubeHandle}/shorts`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    list.appendChild(link);
  }
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

    showYouTubeFallback("表示できる動画が見つかりませんでした。");
    return;
  }

  const firstVideo = videos[0];
  const firstVideoId = firstVideo.id;
  const firstTitle = firstVideo.snippet?.title || "Latest YouTube Video";

  if (player && firstVideoId) {
    player.src =
      `https://www.youtube-nocookie.com/embed/${encodeURIComponent(firstVideoId)}?rel=0`;
    player.title = firstTitle;
    player.hidden = false;
  }

  if (placeholder) placeholder.hidden = true;
  if (status) setText(status, "最新の動画を読み込みました。");
  if (title) setText(title, firstTitle);

  videos.forEach((video, index) => {
    const videoId = video.id;
    const videoTitle = video.snippet?.title || "YouTube Video";
    const thumbnail = getThumbnail(video);

    const item = makeElement("button", "shorts-item");
    item.type = "button";
    item.setAttribute("aria-label", `${videoTitle}を再生`);

    if (thumbnail) {
      const image = makeElement("img", "shorts-thumbnail");
      image.src = thumbnail;
      image.alt = "";
      image.loading = "lazy";
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
      if (player) {
        player.src =
          `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`;
        player.title = videoTitle;
        player.hidden = false;
      }

      if (placeholder) placeholder.hidden = true;
      if (title) setText(title, videoTitle);

      $$(".shorts-item", list).forEach(button => {
        button.classList.remove("is-active");
      });

      item.classList.add("is-active");
    });

    list.appendChild(item);
  });
}

async function loadYouTubeVideos() {
  const status = $("#shorts-status");

  try {
    if (status) setText(status, "YouTube動画を読み込み中...");

    const key = encodeURIComponent(CONFIG.youtubeApiKey);
    const handle = encodeURIComponent(`@${CONFIG.youtubeHandle}`);

    const channelUrl =
      "https://www.googleapis.com/youtube/v3/channels" +
      `?part=contentDetails,snippet&forHandle=${handle}&key=${key}`;

    const channelData = await fetchJson(channelUrl);
    const channel = channelData.items?.[0];

    if (!channel) {
      throw new Error("YouTubeチャンネルが見つかりませんでした。");
    }

    const uploadsPlaylist =
      channel.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylist) {
      throw new Error("アップロード一覧を取得できませんでした。");
    }

    const playlistUrl =
      "https://www.googleapis.com/youtube/v3/playlistItems" +
      `?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploadsPlaylist)}` +
      `&maxResults=${CONFIG.youtubeMaxCandidates}&key=${key}`;

    const playlistData = await fetchJson(playlistUrl);
    const videoIds = (playlistData.items || [])
      .map(item => item.contentDetails?.videoId)
      .filter(Boolean);

    if (!videoIds.length) {
      throw new Error("動画が見つかりませんでした。");
    }

    const videosUrl =
      "https://www.googleapis.com/youtube/v3/videos" +
      `?part=snippet,contentDetails&id=${videoIds.join(",")}&key=${key}`;

    const videosData = await fetchJson(videosUrl);

    const videos = (videosData.items || [])
      .filter(video => {
        const duration = video.contentDetails?.duration || "";
        const match = duration.match(
          /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
        );

        if (!match) return false;

        const seconds =
          Number(match[1] || 0) * 3600
          + Number(match[2] || 0) * 60
          + Number(match[3] || 0);

        return seconds > 0 && seconds <= 180;
      })
      .sort((a, b) =>
        new Date(b.snippet?.publishedAt || 0)
        - new Date(a.snippet?.publishedAt || 0)
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
  const shortsLink = $("#shorts-channel-link");

  if (shortsLink) {
    shortsLink.href =
      `https://www.youtube.com/@${CONFIG.youtubeHandle}/shorts`;
    shortsLink.target = "_blank";
    shortsLink.rel = "noopener noreferrer";
  }

  loadYouTubeVideos();
}

function initExternalLinks() {
  $$('a[target="_blank"]').forEach(link => {
    link.rel = "noopener noreferrer";
  });
}

function init() {
  initCurrentYear();
  initNavigation();
  initScrollReveal();
  initCopyButtons();
  initRobloxAvatars();
  initYouTube();
  initExternalLinks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
