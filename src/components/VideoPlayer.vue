<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useRoomStore } from "../stores/roomStore";
import { storeToRefs } from "pinia";
import { deserializeVideo, getEmbedUrl } from "../utils/videoParser";
import FloatingReactions from "./FloatingReactions.vue";

const roomStore = useRoomStore();
const { currentUser, isPlaying, currentTime, videoId } = storeToRefs(roomStore);
const { setPlayerState } = roomStore;

const playerRef = ref(null);
const player = ref(null);
const rutubeIframeRef = ref(null);
const vkIframeRef = ref(null);
const vkPlayer = ref(null);
const lastRutubeSeekTime = ref(null);
const lastVkSeekTime = ref(null);
let rutubePauseCheckTimer = null;
let lastVkTimeupdateSent = 0;
let syncInterval = null;
let messageHandler = null;

const DEBUG_VK = true; // Включить для отладки VK sync — смотреть в консоль (F12)

const canControl = computed(
  () =>
    currentUser.value?.role === "host" ||
    currentUser.value?.role === "controller",
);

const videoInfo = computed(() => deserializeVideo(videoId.value));
const isYouTube = computed(() => videoInfo.value?.platform === "youtube");
const isRutube = computed(() => videoInfo.value?.platform === "rutube");
const isVk = computed(() => videoInfo.value?.platform === "vk");
const embedUrl = computed(() => {
  const info = videoInfo.value;
  if (!info) return null;
  return getEmbedUrl(info.platform, info.id);
});

const getPostMessageIframe = () => rutubeIframeRef.value || vkIframeRef.value;

// Rutube: send command via postMessage
const rutubeSend = (type, data = {}) => {
  const iframe = rutubeIframeRef.value;
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(JSON.stringify({ type, data }), "*");
};

// VK: postMessage — VK.VideoPlayer отправляет объекты напрямую, не JSON-строку
const vkPostMessage = (cmd) => {
  const iframe = vkIframeRef.value;
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(typeof cmd === "string" ? cmd : cmd, "*");
};

// Load YouTube IFrame API
const loadYouTubeAPI = () => {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve();
    };
    if (window.YT?.Player) resolve();
  });
};

// Create YouTube player
const initYouTubePlayer = () => {
  const info = videoInfo.value;
  if (!info || info.platform !== "youtube") return;

  const container = playerRef.value;
  if (!container) return;

  if (player.value?.destroy) {
    player.value.destroy();
    player.value = null;
  }

  loadYouTubeAPI().then(() => {
    const YT = window.YT;
    if (!YT) return;

    player.value = new YT.Player(container.id ? container.id : container, {
      videoId: info.id,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 0,
        controls: 1,
        enablejsapi: 1,
        fs: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (e) => {
          e.target.seekTo(currentTime.value || 0, true);
          if (isPlaying.value) e.target.playVideo();
          if (canControl.value) {
            if (syncInterval) clearInterval(syncInterval);
            syncInterval = setInterval(() => {
              if (!player.value?.getCurrentTime) return;
              const t = player.value.getCurrentTime();
              const state = player.value.getPlayerState();
              if (YT && state === YT.PlayerState.PLAYING) {
                setPlayerState("play", t, videoId.value);
              } else if (YT && state === YT.PlayerState.PAUSED) {
                setPlayerState("pause", t, videoId.value);
              }
            }, 2000);
          }
        },
        onStateChange: (e) => {
          if (!canControl.value) return;
          const YT = window.YT;
          if (!YT) return;
          const t = e.target.getCurrentTime();
          if (e.data === YT.PlayerState.PLAYING) {
            setPlayerState("play", t, videoId.value);
          } else if (e.data === YT.PlayerState.PAUSED) {
            setPlayerState("pause", t, videoId.value);
          } else if (e.data === YT.PlayerState.CUED) {
            setPlayerState("seek", t, videoId.value);
          }
        },
      },
    });
  });
};

// Rutube & VK: handle postMessage from iframe
const setupPostMessageListener = () => {
  messageHandler = (event) => {
    if (
      DEBUG_VK &&
      (event.origin?.includes("vk") || event.origin?.includes("vkvideo"))
    ) {
      console.log(
        "[VK Raw]",
        event.origin,
        typeof event.data === "string"
          ? event.data
          : JSON.stringify(event.data),
      );
    }
    try {
      const msg =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      const hasRutubeType =
        msg && typeof msg.type === "string" && msg.type.startsWith("player:");
      const hasVkEvent = msg && typeof msg.event === "string";
      if (!msg || (!hasRutubeType && !hasVkEvent)) return;

      const isRutubeMsg = isRutube.value && hasRutubeType;
      const rutubeOrigin =
        event.origin?.includes("rutube") ||
        event.origin?.includes("promomedias");
      const isFromRutube =
        rutubeIframeRef.value &&
        (isRutubeMsg ||
          event.source === rutubeIframeRef.value.contentWindow ||
          (rutubeOrigin && isRutube.value));
      const vkOrigin =
        event.origin?.includes("vk.com") ||
        event.origin?.includes("vkvideo.ru");
      const isFromVk =
        vkIframeRef.value &&
        (hasVkEvent ||
          event.source === vkIframeRef.value.contentWindow ||
          (vkOrigin && isVk.value));
      if (!isFromRutube && !isFromVk) return;

      if (isFromRutube) {
        if (msg.type === "player:ready") {
          rutubeSend("player:setCurrentTime", { time: currentTime.value || 0 });
          if (isPlaying.value) rutubeSend("player:play");
        }
        if (msg.type === "player:changeState" && canControl.value) {
          const state = (msg.data?.state || msg.state || "").toLowerCase();
          if (state === "playing") {
            if (rutubePauseCheckTimer) clearTimeout(rutubePauseCheckTimer);
            setPlayerState("play", currentTime.value || 0, videoId.value);
          }
          if (state === "paused" || state === "stopped") {
            if (rutubePauseCheckTimer) clearTimeout(rutubePauseCheckTimer);
            setPlayerState("pause", currentTime.value || 0, videoId.value);
          }
        }
        if (msg.type === "player:currentTime" && canControl.value) {
          const t = msg.data?.time;
          if (typeof t === "number") {
            setPlayerState("seek", t, videoId.value);
            if (rutubePauseCheckTimer) clearTimeout(rutubePauseCheckTimer);
            rutubePauseCheckTimer = setTimeout(() => {
              if (isPlaying.value) setPlayerState("pause", t, videoId.value);
            }, 1000);
          }
        }
      }

      if (isFromVk && canControl.value) {
        if (DEBUG_VK)
          console.log("[VK Host] Получено:", msg?.event || event.data, msg);
        if (msg?.event === "started")
          setPlayerState("play", msg.time ?? 0, videoId.value);
        if (msg?.event === "paused")
          setPlayerState("pause", msg.time ?? 0, videoId.value);
        if (msg?.event === "timeupdate" || msg?.event === "playing") {
          const t = msg.time ?? 0;
          const now = Date.now();
          if (msg.state === "playing") {
            if (now - lastVkTimeupdateSent > 1000) {
              lastVkTimeupdateSent = now;
              setPlayerState("play", t, videoId.value);
            }
          }
          if (msg.state === "paused") setPlayerState("pause", t, videoId.value);
        }
        if (event.data === "embed-play")
          setPlayerState("play", currentTime.value || 0, videoId.value);
        if (event.data === "embed-pause")
          setPlayerState("pause", currentTime.value || 0, videoId.value);
      }
    } catch {
      if (
        (event.data === "embed-play" || event.data === "embed-pause") &&
        canControl.value &&
        (event.origin?.includes("vk") || event.origin?.includes("rutube")) &&
        (isVk.value || isRutube.value)
      ) {
        if (DEBUG_VK && isVk.value)
          console.log("[VK Host] Получено (catch):", event.data);
        if (event.data === "embed-play")
          setPlayerState("play", currentTime.value || 0, videoId.value);
        if (event.data === "embed-pause")
          setPlayerState("pause", currentTime.value || 0, videoId.value);
      }
    }
  };
  window.addEventListener("message", messageHandler);
};

// Sync: apply store state to Rutube/VK iframes
const SEEK_THRESHOLD = 4; // Rutube: seek только если разница > 4 сек (иначе лаги)
const applySyncToIframe = (playing, time) => {
  if (isRutube.value && rutubeIframeRef.value) {
    const shouldSeek =
      typeof time === "number" &&
      time >= 0 &&
      (lastRutubeSeekTime.value == null ||
        Math.abs(time - lastRutubeSeekTime.value) > SEEK_THRESHOLD);
    if (shouldSeek) {
      rutubeSend("player:setCurrentTime", { time });
      lastRutubeSeekTime.value = time;
    }
    if (playing) rutubeSend("player:play");
    else rutubeSend("player:pause");
  }
  if (isVk.value) {
    const shouldSeek =
      typeof time === "number" &&
      time >= 0 &&
      (lastVkSeekTime.value == null ||
        Math.abs(time - lastVkSeekTime.value) > SEEK_THRESHOLD);
    const sendVkPlayPause = (play) => {
      if (DEBUG_VK)
        console.log(
          "[VK Viewer] Отправка:",
          play ? "play" : "pause",
          "vkPlayer:",
          !!vkPlayer.value,
        );
      if (vkPlayer.value) {
        try {
          if (play) vkPlayer.value.play();
          else vkPlayer.value.pause();
        } catch (e) {
          if (DEBUG_VK) console.log("[VK Viewer] vkPlayer ошибка:", e);
          vkPostMessage(play ? "embed-play" : "embed-pause");
        }
      } else {
        vkPostMessage(play ? "embed-play" : "embed-pause");
      }
    };
    if (playing) {
      if (shouldSeek) {
        lastVkSeekTime.value = time;
        if (vkPlayer.value?.seek) {
          try {
            vkPlayer.value.seek(time);
          } catch {
            vkPostMessage({ method: "seek", time });
          }
        } else {
          vkPostMessage({ method: "seek", time });
        }
      }
      sendVkPlayPause(true);
      setTimeout(() => sendVkPlayPause(true), 300);
      setTimeout(() => sendVkPlayPause(true), 800);
    } else {
      if (shouldSeek) {
        lastVkSeekTime.value = time;
        if (vkPlayer.value?.seek) {
          try {
            vkPlayer.value.seek(time);
          } catch {
            vkPostMessage({ method: "seek", time });
          }
        } else {
          vkPostMessage({ method: "seek", time });
        }
      }
      sendVkPlayPause(false);
      setTimeout(() => sendVkPlayPause(false), 150);
      setTimeout(() => sendVkPlayPause(false), 400);
      setTimeout(() => sendVkPlayPause(false), 700);
    }
  }
};

// Rutube: при загрузке применяем синхронизацию
const onRutubeLoad = () => {
  lastRutubeSeekTime.value = null;
  nextTick(() => applySyncToIframe(isPlaying.value, currentTime.value));
};

// VK: инициализация VK.VideoPlayer при загрузке iframe (скрипт может загрузиться позже)
const onVkLoad = () => {
  vkPlayer.value = null;
  const tryInit = (attempt = 0) => {
    const iframe = vkIframeRef.value;
    if (!iframe) return;
    if (window.VK?.VideoPlayer) {
      try {
        vkPlayer.value = new window.VK.VideoPlayer(iframe);
        const apply = () =>
          applySyncToIframe(isPlaying.value, currentTime.value);
        nextTick(apply);
        setTimeout(apply, 500);
        setTimeout(apply, 1500);
      } catch {
        // Стрим или неверный embed — VK.VideoPlayer только для обычных видео
        nextTick(() => applySyncToIframe(isPlaying.value, currentTime.value));
        setTimeout(
          () => applySyncToIframe(isPlaying.value, currentTime.value),
          500,
        );
      }
      return;
    }
    if (attempt < 20) setTimeout(() => tryInit(attempt + 1), 250);
  };
  nextTick(() => tryInit());
};

// Rutube/VK: periodic sync when playing (player:currentTime / VK events may not fire often)
const startIframeSyncInterval = () => {
  if (!canControl.value || (!isRutube.value && !isVk.value)) return;
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    if (!isPlaying.value) return;
    if (isVk.value && vkPlayer.value?.getCurrentTime) {
      try {
        const t = vkPlayer.value.getCurrentTime();
        if (typeof t === "number") setPlayerState("play", t, videoId.value);
        else setPlayerState("play", currentTime.value || 0, videoId.value);
      } catch {
        setPlayerState("play", currentTime.value || 0, videoId.value);
      }
    } else {
      setPlayerState("play", currentTime.value || 0, videoId.value);
    }
  }, 2000);
};

// Sync with store (remote updates) - YouTube
watch(
  [isPlaying, currentTime, videoId],
  ([playing, time, vidId]) => {
    if (isYouTube.value && player.value?.getPlayerState) {
      const YT = window.YT;
      if (!YT) return;
      try {
        const state = player.value.getPlayerState();
        if (state === -1) return;
      } catch {
        return;
      }
      const info = deserializeVideo(vidId);
      if (
        info?.platform === "youtube" &&
        player.value.getVideoData?.().video_id !== info.id
      ) {
        player.value.loadVideoById(info.id, time ?? 0, true);
      }
      if (typeof time === "number" && time >= 0)
        player.value.seekTo(time, true);
      const state = player.value.getPlayerState();
      if (playing && state !== YT.PlayerState.PLAYING) player.value.playVideo();
      else if (!playing && state === YT.PlayerState.PLAYING)
        player.value.pauseVideo();
      return;
    }

    if ((isRutube.value || isVk.value) && !canControl.value) {
      if (DEBUG_VK && isVk.value)
        console.log("[VK Viewer] syncPlayer → applySync", { playing, time });
      nextTick(() => applySyncToIframe(playing, time));
    }
  },
  { deep: true },
);

watch(videoId, async (newVal) => {
  if (!newVal) return;
  if (rutubePauseCheckTimer) clearTimeout(rutubePauseCheckTimer);
  lastRutubeSeekTime.value = null;
  lastVkSeekTime.value = null;
  vkPlayer.value = null;
  await nextTick();
  if (!playerRef.value && !getPostMessageIframe()) return;

  const info = deserializeVideo(newVal);
  if (!info) return;

  if (info.platform === "youtube") {
    if (player.value?.loadVideoById) {
      player.value.loadVideoById(info.id, currentTime.value || 0, true);
    } else {
      initYouTubePlayer();
    }
  }
});

watch([isRutube, isVk], ([r, v]) => {
  if ((r || v) && canControl.value) startIframeSyncInterval();
});

onMounted(async () => {
  setupPostMessageListener();
  if (videoId.value) {
    await nextTick();
    if (isYouTube.value) initYouTubePlayer();
    if ((isRutube.value || isVk.value) && canControl.value)
      startIframeSyncInterval();
  }
});

onUnmounted(() => {
  if (syncInterval) clearInterval(syncInterval);
  if (rutubePauseCheckTimer) clearTimeout(rutubePauseCheckTimer);
  if (messageHandler) window.removeEventListener("message", messageHandler);
  if (player.value?.destroy) player.value.destroy();
});
</script>

<template>
  <div
    class="relative bg-black rounded-lg overflow-hidden"
    style="aspect-ratio: 16/9"
  >
    <!-- YouTube -->
    <div
      v-if="videoId && isYouTube"
      id="yt-player"
      ref="playerRef"
      class="absolute inset-0 w-full h-full"
    />

    <!-- Rutube (with API) -->
    <iframe
      v-else-if="videoId && isRutube"
      ref="rutubeIframeRef"
      :src="embedUrl"
      class="absolute inset-0 w-full h-full"
      frameborder="0"
      allowfullscreen
      allow="
        accelerometer;
        autoplay;
        clipboard-write;
        encrypted-media;
        gyroscope;
        picture-in-picture;
      "
      @load="onRutubeLoad"
    />

    <!-- VK Video (with API) -->
    <iframe
      v-else-if="videoId && isVk"
      ref="vkIframeRef"
      :src="embedUrl"
      class="absolute inset-0 w-full h-full"
      frameborder="0"
      allowfullscreen
      allow="
        accelerometer;
        autoplay;
        clipboard-write;
        encrypted-media;
        gyroscope;
        picture-in-picture;
      "
      @load="onVkLoad"
    />

    <!-- Placeholder -->
    <div
      v-else
      class="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center"
    ></div>

    <!-- Floating Reactions Overlay -->
    <FloatingReactions />

    <!-- Блокировка для зрителей: оверлей поверх плеера (все платформы) -->
    <div
      v-if="!canControl && videoId && (isRutube || isVk)"
      class="absolute inset-0 z-10"
      style="pointer-events: auto; cursor: default"
      aria-hidden="true"
    />

    <!-- Read-only indicator -->
    <div
      v-if="!canControl"
      class="absolute bottom-4 left-4 z-20 bg-black/70 text-gray-300 px-3 py-1.5 rounded-lg text-sm pointer-events-none"
    >
      👁️ View-only mode
    </div>
  </div>
</template>
