// Activity cards and their detail dialogs share the editor's category data.
window.renderWorks = function (doc, categories) {
  const root = doc.querySelector('[data-work-categories]');
  if (!root) return;
  root._cleanup?.();
  root.replaceChildren();
  const win = doc.defaultView;
  const grid = doc.createElement('div');
  grid.className = 'activity-tiles';
  const dialog = doc.createElement('dialog');
  dialog.className = 'activity-dialog';
  dialog.setAttribute('aria-labelledby', 'activity-dialog-title');
  const header = doc.createElement('div');
  header.className = 'activity-dialog-header';
  const heading = doc.createElement('h3');
  heading.id = 'activity-dialog-title';
  const close = doc.createElement('button');
  close.type = 'button';
  close.className = 'activity-close';
  close.textContent = '×';
  close.setAttribute('aria-label', '閉じる');
  close.title = '閉じる';
  close.addEventListener('click', () => dialog.close());
  header.append(heading, close);
  const content = doc.createElement('div');
  content.className = 'activity-dialog-content';
  dialog.append(header, content);
  root.append(grid, dialog);
  const cleaners = [];
  const safeUrl = value => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
  };
  function embed(id, title, muted = false, playlist = false, autoplay = false) {
    const frame = doc.createElement('iframe');
    frame.title = title;
    frame.className = muted ? 'activity-hover-player' : 'video-player';
    frame.src = 'https://www.youtube-nocookie.com/embed/' + (playlist ? 'videoseries?list=' + encodeURIComponent(id) : id + '?rel=0') + (muted ? '&autoplay=1&mute=1&controls=0&playsinline=1&disablekb=1' : '&autoplay=' + (autoplay ? '1' : '0'));
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = !muted;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    if (muted) { frame.tabIndex = -1; frame.setAttribute('aria-hidden', 'true'); }
    return frame;
  }
  function external(url, text) {
    const a = doc.createElement('a');
    a.href = url;
    a.textContent = text;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }
  function stopAll() { cleaners.forEach(clean => clean()); }
  dialog.addEventListener('close', () => { content.replaceChildren(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  categories.forEach((category, index) => {
    const items = (category.items || []).filter(item => safeUrl(item.url));
    const pool = [...(category.previews || []), ...items].filter(item => safeUrl(item.url));
    const unique = [...new Map(pool.map(item => [item.url, item])).values()];
    const card = doc.createElement('button');
    card.type = 'button';
    card.className = 'activity-tile';
    card.setAttribute('aria-haspopup', 'dialog');
    const copy = doc.createElement('span');
    copy.className = 'activity-tile-copy';
    const number = doc.createElement('span');
    number.className = 'activity-tile-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const title = doc.createElement('span');
    title.className = 'activity-tile-title';
    title.textContent = category.label;
    const description = doc.createElement('span');
    description.className = 'activity-tile-description';
    description.textContent = category.description || '';
    const arrow = doc.createElement('span');
    arrow.className = 'activity-tile-arrow';
    arrow.textContent = '↗';
    arrow.setAttribute('aria-hidden', 'true');
    copy.append(number, title, description, arrow);
    const preview = doc.createElement('span');
    preview.className = 'activity-tile-preview';
    const media = doc.createElement('span');
    media.className = 'activity-tile-media';
    const caption = doc.createElement('span');
    caption.className = 'activity-tile-caption';
    preview.append(media, caption);
    card.append(copy, preview);
    let current = -1;
    let delay, timer;
    function showPreview(random = false, play = false) {
      if (!unique.length) { media.textContent = category.label; caption.textContent = ''; return; }
      let selected = random ? Math.floor(Math.random() * unique.length) : 0;
      if (random && unique.length > 1 && selected === current) selected = (selected + 1) % unique.length;
      current = selected;
      const item = unique[selected];
      const id = window.youtubeVideoId(item.url);
      media.replaceChildren();
      media.classList.toggle('is-article', !id);
      if (id) {
        const image = doc.createElement('img');
        image.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
        image.alt = '';
        image.loading = 'lazy';
        media.append(image);
        if (play && !win.matchMedia('(prefers-reduced-motion: reduce)').matches) media.append(embed(id, item.title, true));
      } else {
        const text = doc.createElement('span');
        text.textContent = item.title || category.label;
        media.append(text);
      }
      caption.textContent = item.title || '';
      card.dataset.previewUrl = item.url;
    }
    function stop() {
      win.clearTimeout(delay); win.clearInterval(timer);
      media.querySelectorAll('iframe').forEach(frame => frame.remove());
    }
    cleaners.push(stop);
    showPreview();
    card.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch' || dialog.open) return;
      stopAll();
      delay = win.setTimeout(() => { showPreview(true, true); timer = win.setInterval(() => showPreview(true, true), 9000); }, 450);
    });
    card.addEventListener('pointerleave', stop);
    card.addEventListener('focus', () => showPreview(true));
    card.addEventListener('blur', stop);
    card.addEventListener('click', () => {
      stopAll();
      heading.textContent = category.label;
      content.replaceChildren();
      const intro = doc.createElement('p'); intro.textContent = category.description || ''; content.append(intro);
      let playlist;
      try { const url = new URL(category.playlist); if (['youtube.com', 'www.youtube.com'].includes(url.hostname)) playlist = url.searchParams.get('list'); } catch {}
      if (playlist && /^[\w-]+$/.test(playlist)) {
        content.append(embed(playlist, category.label + ' 再生リスト', false, true), external(category.playlist, 'YouTubeで再生リストを見る ↗'));
      }
      const list = doc.createElement('div'); list.className = 'activity-dialog-list';
      const details = items.length ? items : unique;
      details.forEach(item => {
        const article = doc.createElement('article'); article.className = 'activity-dialog-item';
        const id = window.youtubeVideoId(item.url);
        if (id) {
          const button = doc.createElement('button'); button.type = 'button'; button.className = 'video-poster';
          button.setAttribute('aria-label', (item.title || '動画') + 'を再生');
          const image = doc.createElement('img'); image.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; image.alt = ''; image.loading = 'lazy';
          const play = doc.createElement('span'); play.className = 'video-play'; play.textContent = '▶'; play.setAttribute('aria-hidden', 'true');
          button.append(image, play);
          button.addEventListener('click', () => {
            content.querySelectorAll('[data-dialog-player]').forEach(frame => frame.replaceWith(frame._poster));
            const frame = embed(id, item.title || '動画', false, false, true); frame.dataset.dialogPlayer = ''; frame._poster = button; button.replaceWith(frame);
          });
          article.append(button);
        }
        const h4 = doc.createElement('h4'); h4.textContent = item.title; article.append(h4, external(item.url, id ? 'YouTubeで見る ↗' : '記事を読む ↗')); list.append(article);
      });
      content.append(list);
      dialog.showModal();
      close.focus();
    });
    grid.append(card);
  });
  const visibility = () => { if (doc.hidden) stopAll(); };
  doc.addEventListener('visibilitychange', visibility);
  root._stop = () => { stopAll(); if (dialog.open) dialog.close(); };
  root._cleanup = () => { root._stop(); doc.removeEventListener('visibilitychange', visibility); };
};
