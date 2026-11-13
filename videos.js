window.youtubeVideoId = function (value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    let id;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(shorts|embed|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : null;
    }
    return /^[\w-]{11}$/.test(id || '') ? id : null;
  } catch { return null; }
};

window.renderFeaturedVideos = function (doc, videos) {
  const grid = doc.querySelector('[data-featured-videos]');
  if (!grid) return;
  grid.replaceChildren();
  for (const video of videos) {
    const id = window.youtubeVideoId(video.url);
    if (!id) continue;
    const card = doc.createElement('article');
    card.className = 'video-item';
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'video-poster';
    const title = video.title.trim() || 'おすすめ動画';
    button.setAttribute('aria-label', title + 'を再生');
    const image = doc.createElement('img');
    image.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    image.alt = '';
    image.loading = 'lazy';
    const play = doc.createElement('span');
    play.className = 'video-play';
    play.textContent = '▶';
    play.setAttribute('aria-hidden', 'true');
    button.append(image, play);
    button.addEventListener('click', () => {
      grid.querySelectorAll('iframe').forEach(frame => frame.replaceWith(frame._poster));
      const frame = doc.createElement('iframe');
      frame.className = 'video-player';
      frame.title = title;
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame._poster = button;
      button.replaceWith(frame);
    });
    const heading = doc.createElement('h3');
    heading.textContent = title;
    const external = doc.createElement('a');
    external.href = 'https://www.youtube.com/watch?v=' + id;
    external.textContent = 'YouTubeで見る ↗';
    external.target = '_blank';
    external.rel = 'noopener noreferrer';
    card.append(button, heading, external);
    grid.append(card);
  }
  grid.closest('.featured-videos').hidden = !grid.children.length;
};

