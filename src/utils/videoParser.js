/**
 * Parse video URLs from YouTube, Rutube, VK Video
 * Returns { platform, id } or null
 */

const PLATFORMS = {
  youtube: {
    patterns: [
      /(?:youtube\.com|m\.youtube\.com)\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com|m\.youtube\.com)\/embed\/([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com|m\.youtube\.com)\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // Just the ID
    ],
  },
  rutube: {
    patterns: [
      /rutube\.ru\/video\/([a-zA-Z0-9]+)/,
      /rutube\.ru\/play\/embed\/([a-zA-Z0-9]+)/,
    ],
  },
  vk: {
    patterns: [
      /vk\.com\/video(-?\d+)_(\d+)/, // oid_videoId
      /vkvideo\.ru\/video(-?\d+)_(\d+)/, // vkvideo.ru
      /vk\.com\/video_ext\.php\?.*oid=(-?\d+).*id=(\d+)/,
      /vk\.com\/video_ext\.php\?.*id=(\d+).*oid=(-?\d+)/,
    ],
    extractId: (match, patternIndex) => {
      if (match[1] && match[2]) {
        if (patternIndex === 3) return `${match[2]}_${match[1]}` // id, oid -> oid_videoId
        return `${match[1]}_${match[2]}`
      }
      return null
    },
  },
}

export function parseVideoUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()

  for (const [platform, config] of Object.entries(PLATFORMS)) {
    for (let i = 0; i < config.patterns.length; i++) {
      const match = trimmed.match(config.patterns[i])
      if (match) {
        const id = config.extractId ? config.extractId(match, i) : match[1]
        if (id) return { platform, id }
      }
    }
  }
  return null
}

export function getEmbedUrl(platform, id, options = {}) {
  switch (platform) {
    case 'youtube':
      return `https://www.youtube.com/embed/${id}?enablejsapi=1`
    case 'rutube':
      return `https://rutube.ru/play/embed/${id}?api=1`
    case 'vk': {
      const [oid, vidId] = id.includes('_') ? id.split('_') : [id, id]
      return `https://vk.com/video_ext.php?oid=${oid}&id=${vidId}&api=1&js_api=1`
    }
    default:
      return null
  }
}

export function serializeVideo(platform, id, options = {}) {
  return `${platform}:${id}`
}

export function deserializeVideo(value) {
  if (!value || typeof value !== 'string') return null
  const parts = value.split(':')
  if (parts.length === 1) {
    return { platform: 'youtube', id: parts[0] }
  }
  if (parts.length === 2) {
    return { platform: parts[0], id: parts[1] }
  }
  return null
}

export const SUPPORTED_PLATFORMS = [
  { id: 'youtube', name: 'YouTube', sync: true },
  { id: 'rutube', name: 'Rutube', sync: true },
  { id: 'vk', name: 'VK Video', sync: true },
]
