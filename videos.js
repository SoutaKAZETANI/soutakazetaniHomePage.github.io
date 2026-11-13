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

window.renderWorks = function (doc, categories) {
  const root = doc.querySelector('[data-work-categories]');
  if (!root) return;
  const current = root.querySelector('[aria-selected="true"]')?.dataset.workTab || '0';
  root.replaceChildren();
  const tabs = doc.createElement('div');
  tabs.className = 'works-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', '活動カテゴリ');
  root.append(tabs);
  categories.forEach((category, index) => {
    const tab = doc.createElement('button');
    tab.type = 'button';
    tab.id = 'work-tab-' + index;
    tab.dataset.workTab = String(index);
    tab.textContent = category.label;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'work-panel-' + index);
    tab.setAttribute('aria-selected', String(index === 0));
    tab.tabIndex = index === 0 ? 0 : -1;
    tabs.append(tab);
    const panel = doc.createElement('div');
    panel.id = 'work-panel-' + index;
    panel.className = 'work-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    panel.hidden = index !== 0;
    const heading = doc.createElement('h3');
    heading.className = 'works-heading';
    heading.textContent = category.label;
    panel.append(heading);
    let playlist;
    try { const url = new URL(category.playlist); if (['www.youtube.com', 'youtube.com'].includes(url.hostname)) playlist = url.searchParams.get('list'); } catch {}
    if (playlist && /^[\w-]+$/.test(playlist)) {
      const container = doc.createElement('div');
      container.className = 'work-playlist';
      container.dataset.playlist = playlist;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'video-poster';
      button.setAttribute('aria-label', category.label + 'の再生リストを再生');
      const image = doc.createElement('img');
      const id = category.items.map(item => window.youtubeVideoId(item.url)).find(Boolean);
      image.src = id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : 'assets/header.png';
      image.alt = '';
      image.loading = 'lazy';
      const play = doc.createElement('span');
      play.className = 'video-play';
      play.textContent = '▶';
      const label = doc.createElement('span');
      label.className = 'playlist-label';
      label.textContent = category.label + ' / PLAYLIST';
      button.append(image, play, label);
      container.append(button);
      panel.append(container);
      const link = doc.createElement('a');
      link.href = category.playlist;
      link.textContent = 'YouTubeで再生リストを見る ↗';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      panel.append(link);
    }
    const grid = doc.createElement('div');
    grid.className = 'works-video-grid';
    grid.style.marginTop = '24px';
    category.items.forEach(item => {
      let url;
      try { url = new URL(item.url); } catch { return; }
      if (!['https:', 'http:'].includes(url.protocol)) return;
      const a = doc.createElement('a');
      a.href = url.href;
      a.className = 'work-video';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      const id = window.youtubeVideoId(item.url);
      if (id) {
        const image = doc.createElement('img');
        image.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
        image.alt = '';
        image.loading = 'lazy';
        a.append(image);
      } else { a.classList.add('work-entry'); }
      const title = doc.createElement('h4');
      title.textContent = item.title || '記事を見る ↗';
      a.append(title);
      grid.append(a);
    });
    panel.append(grid);
    root.append(panel);
  });
  window.setupWorksTabs(doc);
  root.querySelector('[data-work-tab="' + current + '"]')?.click();
};

window.setupWorksTabs = function (doc) {
  const tabs = [...doc.querySelectorAll('[data-work-tab]')];
  function activate(tab) {
    doc.querySelectorAll('.work-playlist iframe').forEach(frame => frame.replaceWith(frame._poster));
    tabs.forEach(button => {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      doc.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    });
  }
  doc.querySelectorAll('[data-playlist]').forEach(container => {
    const button = container.querySelector('button');
    button.addEventListener('click', () => {
      const frame = doc.createElement('iframe');
      frame.className = 'video-player';
      frame.title = '化学の動画 再生リスト';
      frame.src = 'https://www.youtube-nocookie.com/embed/videoseries?list=' + encodeURIComponent(container.dataset.playlist) + '&autoplay=1';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame._poster = button;
      button.replaceWith(frame);
    });
  });
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (next === null) return;
      event.preventDefault();
      activate(tabs[next]);
      tabs[next].focus();
    });
  });
};
