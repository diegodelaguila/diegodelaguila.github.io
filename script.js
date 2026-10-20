document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

// Tabs: show one section at a time, driven by the URL hash so each tab
// can be linked to directly and the back button works
const panels = [...document.querySelectorAll('[data-panel]')];
const tabs = [...document.querySelectorAll('.nav-links a')];

function route() {
  // The hash can name a tab (#design) or something inside one
  // (#library-drawers): show the tab that contains it
  // Projects use data-project rather than id, so the browser has no element
  // to jump to and the page always opens at the top
  const hash = decodeURIComponent(location.hash.slice(1));
  const target = hash && (document.querySelector(`[data-panel="${CSS.escape(hash)}"], [data-project="${CSS.escape(hash)}"]`) || document.getElementById(hash));
  const active = (target && panels.find(p => p.contains(target))) || panels[0];
  stopVideos();   // any navigation stops a playing video
  document.body.dataset.view = active.dataset.panel;
  panels.forEach(p => { p.hidden = p !== active; });
  tabs.forEach(t => {
    if (t.hash === '#' + active.dataset.panel) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  // Pages with projects (Video, Design) open on a menu; a project's own hash
  // shows just that project
  const project = target && target.closest('.project');
  active.classList.toggle('show-project', !!project);
  active.querySelectorAll('.project').forEach(p => { p.hidden = !!project && p !== project; });
  window.scrollTo(0, 0);
}

// Every project gets a link back to its page's menu
document.querySelectorAll('.project').forEach(p => {
  const back = document.createElement('a');
  back.className = 'back';
  back.href = '#' + p.closest('[data-panel]').dataset.panel;
  back.textContent = '← All ' + (p.closest('[data-panel="video"]') ? 'videos' : 'projects');
  p.prepend(back);
});

// Project menus: the hovered row becomes a window onto an image from that
// project (data-win). In menus marked .pi-bw the image arrives in pure black
// and white and resolves into colour.
// The year sits right after the title (before the publication details),
// rather than floating at the far right of the row
document.querySelectorAll('.project-index a').forEach(link => {
  const year = link.querySelector(':scope > .pi-year');
  const title = link.querySelector(':scope > span');
  if (!year || !title || !year.textContent.trim()) return year?.remove();
  title.insertBefore(year, title.querySelector('.pi-meta'));
});

document.querySelectorAll('.project-index a[data-win]').forEach(link => {
  const img = document.createElement('img');
  img.className = 'pi-win';
  img.alt = '';
  img.src = link.dataset.win;
  img.style.objectPosition = link.dataset.pos || 'center';
  if (link.dataset.shade) link.style.setProperty('--shade', link.dataset.shade);
  link.prepend(img);
  if (!link.closest('.pi-bw')) return;
  let timer;
  const arrive = () => {
    clearTimeout(timer);
    img.classList.add('raw');
    // .pi-stay menus keep the image in black and white
    if (!link.closest('.pi-stay')) timer = setTimeout(() => img.classList.remove('raw'), 500);
  };
  link.addEventListener('mouseenter', arrive);
  link.addEventListener('focus', arrive);
});

// Video: clicking a still swaps it for the Vimeo, YouTube or Instagram
// player; leaving the tab puts the still back so nothing keeps playing out of sight
const stills = [...document.querySelectorAll('button.v-frame')];
const players = new Map();

stills.forEach(still => still.addEventListener('click', () => {
  const player = document.createElement('div');
  const title = still.getAttribute('aria-label').replace('Play ', '');
  if (still.dataset.instagram) {
    // Instagram's player has its own header and sizing, so it gets a plain
    // wrapper rather than the fixed-ratio frame
    const url = `https://www.instagram.com/p/${still.dataset.instagram}/`;
    player.className = 'v-ig';
    player.innerHTML = `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14">
      <a href="${url}" target="_blank" rel="noopener">Watch ${title} on Instagram</a></blockquote>`;
  } else {
    const src = still.dataset.youtube
      ? `https://www.youtube-nocookie.com/embed/${still.dataset.youtube}?autoplay=1&rel=0&playsinline=1`
      : `https://player.vimeo.com/video/${still.dataset.vimeo}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`;
    player.className = 'v-frame';
    player.innerHTML = `<iframe src="${src}" referrerpolicy="strict-origin-when-cross-origin"
      allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${title}"></iframe>`;
  }
  still.replaceWith(player);
  players.set(still, player);
  if (still.dataset.instagram) loadInstagram();
}));

// Instagram's embed script tracks visitors, so it only loads the first time
// someone plays the Instagram video; after that it just renders new embeds
let instagramLoaded = false;
function loadInstagram() {
  if (instagramLoaded) return window.instgrm?.Embeds.process();
  instagramLoaded = true;
  const s = document.createElement('script');
  s.src = 'https://www.instagram.com/embed.js';
  s.async = true;
  document.body.append(s);
}

function stopVideos() {
  players.forEach((player, still) => player.replaceWith(still));
  players.clear();
}

// Home: the cover drawing shows by default; hovering a section crossfades
// it into an image from that section (sections without one keep the drawing)
const home = document.querySelector('.home');
const preview = document.querySelector('.home-preview');
document.querySelectorAll('.home-index a').forEach(link => {
  if (link.dataset.preview) new Image().src = link.dataset.preview; // preload so the first hover is instant
  const show = () => {
    if (link.dataset.preview) preview.src = link.dataset.preview;
    preview.classList.toggle('is-visible', !!link.dataset.preview);
    home.classList.toggle('is-previewing', !!link.dataset.preview);
  };
  const hide = () => {
    preview.classList.remove('is-visible');
    home.classList.remove('is-previewing');
  };
  link.addEventListener('mouseenter', show);
  link.addEventListener('focus', show);
  link.addEventListener('mouseleave', hide);
  link.addEventListener('blur', hide);
});

document.documentElement.classList.add('tabs-ready');
window.addEventListener('hashchange', route);
route();

// Lightbox: arrows step through the images of the group (.lb-group) the
// clicked image belongs to, so photos and drawings stay separate
const lb = document.getElementById('lightbox');
const lbImg = document.getElementById('lb-img');
const lbCap = document.getElementById('lb-cap');
let set = [];
let current = 0;

function show(i) {
  current = (i + set.length) % set.length;
  const img = set[current].querySelector('img');
  lbImg.src = img.src;
  lbImg.alt = img.alt;
  const cap = set[current].querySelector('figcaption');
  const n = cap?.querySelector('.n')?.textContent;
  lbCap.textContent = cap ? (n ? `${n} — ${cap.textContent.replace(n, '').trim()}` : cap.textContent.trim()) : '';
}
function open(item) {
  set = [...item.closest('.lb-group').querySelectorAll('.g-item')];
  show(set.indexOf(item));
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  lb.querySelector('.lb-close').focus();
}
function close() {
  lb.hidden = true;
  document.body.style.overflow = '';
  set[current].focus();
}

document.querySelectorAll('.lb-group .g-item').forEach(item => {
  item.tabIndex = 0;
  item.addEventListener('click', () => open(item));
  item.addEventListener('keydown', e => { if (e.key === 'Enter') open(item); });
});
lb.querySelector('.lb-close').addEventListener('click', close);
lb.querySelector('.lb-prev').addEventListener('click', () => show(current - 1));
lb.querySelector('.lb-next').addEventListener('click', () => show(current + 1));
lb.addEventListener('click', e => { if (e.target === lb) close(); });
document.addEventListener('keydown', e => {
  if (lb.hidden) return;
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowLeft') show(current - 1);
  if (e.key === 'ArrowRight') show(current + 1);
});

// Booklet flipbook: `turned` counts the leaves turned over (0 = closed on the
// front cover, leaves.length = closed on the back cover). Turned leaves stack
// on the left with the most recent on top; unturned ones stack on the right
// with the next one on top.
document.querySelectorAll('.flipbook').forEach(book => {
  const leaves = [...book.querySelectorAll('.fb-leaf')];
  const controls = book.parentElement.querySelector('.fb-controls');
  const prevBtn = controls.querySelector('.fb-prev');
  const nextBtn = controls.querySelector('.fb-next');
  const status = controls.querySelector('.fb-status');
  const n = leaves.length;
  let turned = 0;

  function render() {
    leaves.forEach((leaf, i) => {
      const isTurned = i < turned;
      leaf.classList.toggle('is-flipped', isTurned);
      leaf.style.zIndex = isTurned ? i + 1 : n - i;
    });
    book.classList.toggle('at-front', turned === 0);
    book.classList.toggle('at-back', turned === n);
    book.closest('.bk-top')?.classList.toggle('is-open', turned > 0);
    moveText(turned > 0);
    showText(false);
    status.textContent = turned === 0 ? 'Click to open'
      : turned === n ? 'Back cover'
      : `Pages ${2 * turned}–${2 * turned + 1}`;
    prevBtn.disabled = turned === 0;
    nextBtn.disabled = turned === n;
  }
  // The leaf in motion rides above both stacks until it lands
  function turn(to) {
    if (to < 0 || to > n || to === turned) return;
    const leaf = leaves[Math.min(turned, to)];
    leaf.classList.add('is-turning');
    setTimeout(() => leaf.classList.remove('is-turning'), 900);
    turned = to;
    render();
  }

  // While open, the text can be called back over the left page, and the
  // book can be closed back to its cover (where the text always shows)
  const top = book.closest('.bk-top');
  let textTimer;
  function moveText(below) {
    if (!top || top.classList.contains('text-below') === below) return;
    clearTimeout(textTimer);
    top.classList.add('text-fading');
    textTimer = setTimeout(() => {
      top.classList.toggle('text-below', below);
      setTimeout(() => top.classList.remove('text-fading'), 30);
    }, below ? 450 : 700);   // wait for the fade (and, when closing, for the book to settle)
  }
  const aboutBtn = controls.querySelector('.fb-about');
  const closeBtn = controls.querySelector('.fb-close');
  function showText(on) {
    top?.classList.toggle('show-text', on);
    aboutBtn?.setAttribute('aria-pressed', on);
  }
  aboutBtn?.addEventListener('click', () => showText(!top.classList.contains('show-text')));
  closeBtn?.addEventListener('click', () => turn(0));
  prevBtn.addEventListener('click', () => turn(turned - 1));
  nextBtn.addEventListener('click', () => turn(turned + 1));
  // Click the right-hand side to go forward, the left-hand side to go back
  book.addEventListener('click', e => {
    if (turned === 0) return turn(1);
    if (turned === n) return turn(n - 1);
    const r = book.getBoundingClientRect();
    turn(e.clientX > r.left + r.width / 2 ? turned + 1 : turned - 1);
  });
  book.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); turn(turned + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); turn(turned - 1); }
  });
  render();
});
