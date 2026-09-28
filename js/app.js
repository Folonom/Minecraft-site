/* CraftStore — поведение магазина. Каталог и тексты лежат в js/data.js */
(function () {
  'use strict';

  const STORE = window.STORE;
  const PRODUCTS = STORE.products;
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CART_KEY = 'craftstore.cart.v1';
  const MAX_QTY = 99;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Вспомогательные ---------- */

  // Небольшой конструктор DOM: весь динамический текст идёт через textContent
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return el;
  }

  function svgUse(id, cls) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    if (cls) svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + id);
    svg.append(use);
    return svg;
  }

  const money = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';

  function iconSrc([type, name]) {
    return type === 'block' ? `assets/img/blocks/${name}.png` : `assets/textures/item/${name}.png`;
  }
  function iconImg([type, name], cls) {
    return h('img', { class: (type === 'item' ? 'px ' : '') + (cls || ''), src: iconSrc([type, name]), alt: '', width: type === 'item' ? 16 : 166, height: type === 'item' ? 16 : 192 });
  }

  /* ---------- Состояние корзины ---------- */

  function loadCart() {
    const empty = { items: {}, promo: null };
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return empty;
      const items = {};
      for (const [id, qty] of Object.entries(raw.items || {})) {
        const n = Number(qty);
        if (byId[id] && Number.isInteger(n) && n > 0) items[id] = Math.min(n, MAX_QTY);
      }
      const promo = STORE.promos[raw.promo] ? raw.promo : null;
      return { items, promo };
    } catch (e) {
      return empty;
    }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* хранилище недоступно */ }
  }

  let cart = loadCart();

  function totals() {
    let sub = 0;
    let count = 0;
    for (const [id, qty] of Object.entries(cart.items)) {
      sub += byId[id].price * qty;
      count += qty;
    }
    const promo = cart.promo ? STORE.promos[cart.promo] : null;
    const discount = promo ? Math.round((sub * promo.percent) / 100) : 0;
    return { sub, count, discount, total: sub - discount };
  }

  /* ---------- Уведомления ---------- */

  function toast(title, text, icon) {
    const box = $('#toasts');
    const key = title + '|' + text;
    $$('.toast', box).forEach((t) => { if (t.dataset.key === key) t.remove(); });
    while (box.children.length >= 3) box.firstChild.remove();
    const el = h('div', { class: 'toast', 'data-key': key },
      h('div', { class: 'toast-icon' }, iconImg(icon)),
      h('div', {}, h('p', { class: 'toast-title', text: title }), h('p', { class: 'toast-text', text: text })));
    box.append(el);
    const kill = () => el.remove();
    el.addEventListener('animationend', (e) => { if (e.animationName === 'toast-out') kill(); });
    setTimeout(kill, 4200); // на случай отключённых анимаций
  }

  /* ---------- Каталог ---------- */

  let activeCat = 'all';

  function renderTabs() {
    const box = $('#tabs');
    box.replaceChildren(...STORE.categories.map((c) =>
      h('button', {
        type: 'button', class: 'btn btn--sm' + (c.id === activeCat ? ' is-active' : ''),
        'aria-pressed': String(c.id === activeCat),
        onclick: () => { activeCat = c.id; renderTabs(); renderGrid(); }
      }, iconImg(c.icon), c.label)));
  }

  function productCard(p, i) {
    const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const art = h('div', { class: 'card-art', style: `--tone:${p.tone}` },
      p.badge && h('span', { class: 'badge', text: p.badge }),
      disc > 0 && h('span', { class: 'badge badge--sale', text: `−${disc}%` }),
      iconImg(p.art, 'art-img' + (p.art[0] === 'item' ? ' art-item' : '')));

    return h('article', { class: 'card panel', style: `--i:${i}` },
      art,
      h('div', { class: 'card-body' },
        h('h3', { text: p.name }),
        h('p', { class: 'sub', text: p.sub }),
        h('ul', { class: 'feat', role: 'list' }, p.features.map((f) => h('li', {}, svgUse('i-check'), h('span', { text: f })))),
        h('div', { class: 'buy' },
          h('div', { class: 'price' },
            p.oldPrice && h('s', { text: money(p.oldPrice) }),
            h('b', { text: money(p.price) })),
          h('button', { type: 'button', class: 'btn btn--green btn--sm', 'aria-label': `Добавить в инвентарь: ${p.name}`, onclick: () => addToCart(p.id) }, 'В инвентарь'))));
  }

  function renderGrid() {
    const list = PRODUCTS.filter((p) => activeCat === 'all' || p.cat === activeCat);
    $('#product-grid').replaceChildren(...list.map(productCard));
  }

  /* ---------- Корзина ---------- */

  function addToCart(id, qty = 1) {
    cart.items[id] = Math.min(MAX_QTY, (cart.items[id] || 0) + qty);
    saveCart();
    renderCart();
    const badge = $('#cart-count');
    badge.classList.remove('bump');
    void badge.offsetWidth;
    badge.classList.add('bump');
    toast('Добавлено в инвентарь', byId[id].name, byId[id].art);
  }

  function setQty(id, qty) {
    if (qty <= 0) delete cart.items[id];
    else cart.items[id] = Math.min(MAX_QTY, qty);
    saveCart();
    renderCart();
  }

  function cartLine(id) {
    const p = byId[id];
    const qty = cart.items[id];
    return h('div', { class: 'line' },
      h('span', { class: 'slot' }, iconImg(p.art), qty > 1 && h('span', { class: 'qty', text: String(qty) })),
      h('div', {},
        h('p', { class: 'line-name', text: p.name }),
        h('p', { class: 'line-price', text: money(p.price * qty) }),
        h('div', { class: 'stepper', role: 'group', 'aria-label': `Количество: ${p.name}` },
          h('button', { type: 'button', class: 'btn', 'aria-label': 'Меньше', onclick: () => setQty(id, qty - 1) }, '−'),
          h('output', { text: String(qty), 'aria-live': 'polite' }),
          h('button', { type: 'button', class: 'btn', 'aria-label': 'Больше', onclick: () => setQty(id, qty + 1), disabled: qty >= MAX_QTY }, '+'))),
      h('button', { type: 'button', class: 'btn btn--red', 'aria-label': `Убрать: ${p.name}`, onclick: () => setQty(id, 0) }, svgUse('i-cross', 'ico')));
  }

  function renderCart() {
    const t = totals();
    const ids = Object.keys(cart.items);

    const badge = $('#cart-count');
    badge.textContent = String(t.count);
    badge.classList.toggle('is-empty', t.count === 0);
    badge.setAttribute('aria-label', `Товаров в корзине: ${t.count}`);

    const list = $('#cart-list');
    if (ids.length === 0) {
      list.replaceChildren(h('div', { class: 'empty' },
        h('span', { class: 'slot' }, h('img', { class: 'px', src: 'assets/textures/item/bucket.png', alt: '', width: 16, height: 16 })),
        h('h3', { text: 'Инвентарь пуст' }),
        h('p', { text: 'Добавь игру или подписку — они появятся здесь.' }),
        h('button', { type: 'button', class: 'btn btn--green', onclick: () => { closeDrawer(); location.hash = '#shop'; } }, 'К товарам')));
    } else {
      list.replaceChildren(...ids.map(cartLine));
    }

    $('#cart-foot').hidden = ids.length === 0;
    $('#sum-sub').textContent = money(t.sub);
    $('#sum-discount-row').hidden = t.discount === 0;
    $('#sum-discount').textContent = '−' + money(t.discount);
    $('#sum-total').textContent = money(t.total);
    $('#modal-total').textContent = money(t.total);

    const promoInput = $('#promo-input');
    const promoMsg = $('#promo-msg');
    if (cart.promo) {
      promoInput.value = cart.promo;
      promoMsg.className = 'promo-msg ok';
      promoMsg.textContent = 'Применён промокод: ' + STORE.promos[cart.promo].label;
    } else if (promoMsg.classList.contains('ok')) {
      promoMsg.className = 'promo-msg';
      promoMsg.textContent = '';
    }

    $('#order-mini').replaceChildren(...ids.map((id) =>
      h('div', {}, h('span', { text: `${byId[id].name} × ${cart.items[id]}` }), h('span', { text: money(byId[id].price * cart.items[id]) }))));
  }

  /* ---------- Слои: корзина и оформление ---------- */

  const page = $('#page');
  const overlay = $('#overlay');
  const drawer = $('#drawer');
  const modal = $('#modal');
  let returnFocus = null;

  function lockPage(on) {
    page.inert = on;
    document.body.classList.toggle('lock', on);
    overlay.hidden = !on;
  }

  function openDrawer() {
    returnFocus = document.activeElement;
    renderCart();
    lockPage(true);
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    $('#cart-close').focus();
  }
  function closeDrawer() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    if (modal.hidden) {
      lockPage(false);
      if (returnFocus && returnFocus.focus) returnFocus.focus();
    }
  }

  function openModal() {
    if (Object.keys(cart.items).length === 0) return;
    clearErrors();
    $('#checkout-form').hidden = false;
    $('#success').hidden = true;
    modal.hidden = false;
    closeDrawerKeepLock();
    $('#f-email').focus();
  }
  function closeDrawerKeepLock() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    lockPage(false);
    if (returnFocus && returnFocus.focus) returnFocus.focus();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeModal();
    else closeDrawer();
  });
  overlay.addEventListener('click', () => { if (modal.hidden) closeDrawer(); });
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  $('#cart-open').addEventListener('click', openDrawer);
  $('#cart-close').addEventListener('click', closeDrawer);
  $('#modal-close').addEventListener('click', closeModal);
  $('#checkout-open').addEventListener('click', openModal);
  $('#success-close').addEventListener('click', closeModal);
  $('#cart-clear').addEventListener('click', () => {
    cart = { items: {}, promo: null };
    $('#promo-input').value = '';
    saveCart();
    renderCart();
  });

  /* ---------- Промокод ---------- */

  $('#promo-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('#promo-input').value.trim().toUpperCase();
    const msg = $('#promo-msg');
    if (!code) {
      cart.promo = null;
      msg.className = 'promo-msg';
      msg.textContent = '';
    } else if (STORE.promos[code]) {
      cart.promo = code;
    } else {
      msg.className = 'promo-msg bad';
      msg.textContent = 'Такого промокода нет. Попробуй ещё раз.';
      return;
    }
    saveCart();
    renderCart();
  });

  /* ---------- Оформление заказа ---------- */

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const NICK_RE = /^[A-Za-z0-9_]{3,16}$/;

  function setError(inputId, errId, text) {
    const input = $('#' + inputId);
    $('#' + errId).textContent = text;
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
    return !text;
  }
  function clearErrors() {
    setError('f-email', 'err-email', '');
    setError('f-nick', 'err-nick', '');
    setError('f-agree', 'err-agree', '');
  }

  $('#checkout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#f-email').value.trim();
    const nick = $('#f-nick').value.trim();
    const okEmail = setError('f-email', 'err-email', EMAIL_RE.test(email) ? '' : 'Введи корректный e-mail — на него придёт ключ.');
    const okNick = setError('f-nick', 'err-nick', !nick || NICK_RE.test(nick) ? '' : 'Ник: 3–16 символов, латиница, цифры и «_».');
    const okAgree = setError('f-agree', 'err-agree', $('#f-agree').checked ? '' : 'Нужно согласиться с условиями покупки.');
    if (!(okEmail && okNick && okAgree)) {
      const firstBad = $('[aria-invalid="true"]', $('#checkout-form'));
      if (firstBad) firstBad.focus();
      return;
    }

    // Здесь должен быть запрос к вашему серверу / платёжной системе.
    const orderId = 'CS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    $('#order-id').textContent = orderId;
    $('#order-text').textContent = `Адрес получателя: ${email}. В рабочем магазине ключ приходит на него сразу после оплаты.`;
    $('#checkout-form').hidden = true;
    $('#success').hidden = false;
    $('#modal-title').textContent = 'Готово!';
    cart = { items: {}, promo: null };
    saveCart();
    renderCart();
    $('#success-close').focus();
    toast('Достижение получено!', 'Первый заказ оформлен', ['item', 'nether_star']);
  });
  const modalTitle = $('#modal-title');
  new MutationObserver(() => { if (modal.hidden) modalTitle.textContent = 'Оформление заказа'; })
    .observe(modal, { attributes: true, attributeFilter: ['hidden'] });

  /* ---------- Шапка ---------- */

  const burger = $('#burger');
  const nav = $('#nav');
  function setNav(open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  burger.addEventListener('click', () => setNav(!nav.classList.contains('open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.site-header')) setNav(false); });

  // Подсветка текущего раздела в меню
  const navLinks = $$('.nav a');
  const sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      navLinks.forEach((a) => {
        if (a.getAttribute('href') === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['shop', 'modes', 'compare', 'how', 'faq'].forEach((id) => { const el = document.getElementById(id); if (el) sectionObserver.observe(el); });

  /* ---------- Полоска опыта ---------- */

  const xpFill = $('#xp-fill');
  const xpLevel = $('#xp-level');
  let xpQueued = false;
  function updateXp() {
    xpQueued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    xpFill.style.setProperty('--p', (p * 100).toFixed(1) + '%');
    xpLevel.textContent = String(Math.round(p * 30));
  }
  const xpBox = $('.xp');
  let xpTimer = 0;
  window.addEventListener('scroll', () => {
    if (!xpQueued) { xpQueued = true; requestAnimationFrame(updateXp); }
    xpBox.classList.add('on');
    clearTimeout(xpTimer);
    xpTimer = setTimeout(() => xpBox.classList.remove('on'), 1600);
  }, { passive: true });
  window.addEventListener('resize', updateXp);

  /* ---------- Появление блоков ---------- */

  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el, i) => { el.style.transitionDelay = (i % 4) * 60 + 'ms'; io.observe(el); });
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Надпись-«splash» ---------- */

  const splash = $('#splash');
  function rollSplash() {
    const list = STORE.splashes;
    let next;
    do { next = list[Math.floor(Math.random() * list.length)]; } while (next === splash.textContent && list.length > 1);
    splash.textContent = next;
  }
  splash.addEventListener('click', rollSplash);
  rollSplash();

  /* ---------- Старт ---------- */

  $('#year').textContent = String(new Date().getFullYear());
  renderTabs();
  renderGrid();
  renderCart();
  updateXp();
})();
