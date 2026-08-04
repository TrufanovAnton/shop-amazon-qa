# Repro Guide — как повторить находки руками

Рабочая шпаргалка. Держите открытой рядом с браузером. Всё воспроизводилось 2026-08-04 в Chrome на macOS, залогиненная сессия, delivery location = Israel.

**Общая предпосылка ко всем трём:** локация доставки аккаунта — **не США**. Это ключевой триггер для BUG-002 и BUG-003. Если смените её на US ZIP — BUG-002 и BUG-003, скорее всего, пропадут. BUG-001 от локации не зависит.

---

## BUG-001 · Корзина: вечный спиннер при сбое сети

**Ожидаемое время: 3 мин. Воспроизводимость: 1/1.**

### Подготовка

1. Залогиньтесь, положите в корзину любой товар.
2. Откройте `https://www.amazon.com/gp/cart/view.html`.
3. Откройте DevTools (⌥⌘I) → вкладка **Console**.
4. Запомните текущее состояние: количество, Subtotal, бейдж корзины в шапке.

### Шаги

**Шаг 1.** Сначала убедитесь, что при живой сети всё работает. Нажмите «+» на степпере. Должно: количество +1, Subtotal пересчитался, бейдж обновился. У меня было корректно: 1 → 2, `$9.99` → `$19.98`, бейдж `2`, лейбл «Subtotal (2 items)».

**Шаг 2.** Роняем сеть. Два варианта — любой:

*Вариант A (как в задании, через DevTools):* Network → троттлинг-дропдаун → **Offline**.

*Вариант B (быстрее и точнее, я использовал его):* в Console вставьте

```js
window.__origFetch = window.fetch;
window.__blocked = 0;
window.fetch = () => { window.__blocked++; return Promise.reject(new TypeError('Failed to fetch')); };
'blocked';
```

**Шаг 3.** Нажмите «+» ещё раз.

**Шаг 4.** Ждите 30+ секунд и смотрите на строку товара. Проверочный снимок состояния — вставьте в Console:

```js
JSON.stringify({
  blockedRequests: window.__blocked,
  spinnerStillPresent: !!document.querySelector('.sc-list-item .a-spinner'),
  errorTextPresent: /(try again|couldn.t|unable|error|problem)/i.test(document.body.innerText.slice(0,5000)),
  retryControl: /retry/i.test(document.body.innerText.slice(0,5000)),
  subtotal: document.querySelector('#sc-subtotal-amount-activecart')?.innerText?.trim(),
  badge: document.querySelector('#nav-cart-count')?.innerText?.trim(),
  proceedToCheckoutEnabled: !document.querySelector('#sc-buy-box-ptc-button input')?.disabled
}, null, 1)
```

**Что вы должны увидеть (мой результат):**

```
blockedRequests: 1
spinnerStillPresent: true      ← спустя 35+ секунд
errorTextPresent: false        ← НИ ОДНОГО сообщения об ошибке
retryControl: false            ← нечего нажать
subtotal: "$19.98"             ← устаревший
badge: "2"                     ← устаревший
proceedToCheckoutEnabled: true ← ГЛАВНОЕ: чекаут активен
```

Визуально: строка серая, степпер заменён спиннером, ещё один крупный спиннер в середине строки, Delete / Save for later / Compare тоже недоступны.

**Шаг 5.** Верните сеть, **не перезагружая страницу**:

```js
window.fetch = window.__origFetch; 'restored';
```

Строка сама не оживает. Восстанавливает только перезагрузка.

**Шаг 6.** Перезагрузите и проверьте: количество должно быть 2, Subtotal `$19.98` — то есть неудачный инкремент **не сохранился**. Это важно записать: серверные данные целы, поэтому severity = High, а не Critical.

### На что снять видео

Задание прямо просит screen recording для interaction-багов. Пишите с шага 3 по шаг 5 включительно — видно клик, спиннер, отсутствие ошибки и активную кнопку чекаута.

---

## BUG-002 · Сортировка по цене с карточками без цены

**Ожидаемое время: 2 мин. Воспроизводимость: 2/2.**

### Шаги

1. Откройте `https://www.amazon.com/s?k=wireless+mouse&s=price-asc-rank`
2. В левой колонке в блоке **Brands** отметьте **Logitech**.
3. Дождитесь перерисовки списка (~2 с).
4. Пролистайте карточки сверху вниз глазами: у верхних цены нет вообще.

### Замер в Console

```js
const cards = [...document.querySelectorAll('[data-component-type="s-search-result"]')];
JSON.stringify({
  total: cards.length,
  withPrice: cards.filter(c => c.querySelector('.a-price .a-offscreen')).length,
  top6: cards.slice(0,6).map(c => ({
    asin: c.getAttribute('data-asin'),
    price: c.querySelector('.a-price .a-offscreen')?.textContent ?? null,
    hasSeeOptions: /see options/i.test(c.innerText),
    title: c.querySelector('h2')?.textContent?.trim().slice(0,40)
  }))
}, null, 1)
```

**Мой результат:** `total: 17`, `withPrice: 4`. Первые две карточки (`B0FGQT847L`, `B08C9JPV59`) — ни цены, ни `See options`, ни `No featured offers`. Только заголовок и рейтинг. Действовать с ними нельзя никак.

### Контрольные замеры (докажут, что это не общий сбой)

Прогоните в Console на любой странице amazon.com:

```js
async function probe(url){
  const html = await (await fetch(url)).text();
  const d = new DOMParser().parseFromString(html, 'text/html');
  const cards = [...d.querySelectorAll('[data-component-type="s-search-result"]')];
  return cards.filter(c => c.querySelector('.a-price .a-offscreen')).length + ' / ' + cards.length;
}
JSON.stringify({
  featured:        await probe('/s?k=wireless+mouse'),
  priceAsc:        await probe('/s?k=wireless+mouse&s=price-asc-rank'),
  priceAscBrand:   await probe('/s?k=wireless+mouse&rh=p_123%3A213704&s=price-asc-rank'),
  keyboardControl: await probe('/s?k=mechanical+keyboard&s=price-asc-rank')
}, null, 1)
```

**Мои цифры:** `17/24`, `15/18`, **`4/17`**, `17/18`. Видно, что проблему разгоняет именно связка сортировка + бренд-фильтр + ограничивающая локация.

### Заодно зафиксируйте

В выдаче по «wireless mouse» с фильтром Logitech присутствует *Logitech **Wired** Mouse M90*. Это дефект релевантности — упомяните как наблюдение, но не как отдельный баг: ranking quality вынесен в out of scope.

---

## BUG-003 · Два разных адреса доставки на одной странице

**Ожидаемое время: 5–15 мин. Воспроизводимость: 1/3 — самый капризный.**

### Что нужно поймать

В одном кадре одновременно:

- шапка (`#glow-ingress-block`): **«Delivering to Nashville 37217»**
- баннер под шапкой: **«We're showing you items that ship to Israel…»**

### Условия, при которых у меня это выпало

Это был **самый первый** переход на SERP в свежей сессии. При последующих навигациях шапка везде показывала «Deliver to Israel», и противоречие исчезло.

### Как пробовать

1. Полностью очистите cookies для amazon.com (DevTools → Application → Storage → Clear site data).
2. Залогиньтесь заново.
3. **Сразу**, не заходя на главную и никуда больше, откройте `https://www.amazon.com/s?k=wireless+mouse&s=price-asc-rank`.
4. В первые же секунды сравните шапку и баннер:

```js
JSON.stringify({
  glowHeader: document.querySelector('#glow-ingress-block')?.innerText?.replace(/\s+/g,' ').trim(),
  banner: [...document.querySelectorAll('div,span')]
    .map(e => e.innerText)
    .find(t => t && /ship to/i.test(t) && t.length < 250)?.replace(/\s+/g,' ').trim()
}, null, 1)
```

5. Если строки называют **разные** места назначения — немедленно скриншот всего окна.
6. Повторите цикл 3–5 раз. Если поймаете 2 раза из 5 — поднимайте severity до **High** и правьте раздел «Reproduction rate» в репорте.

### Проверка серверного состояния (для technical notes)

```js
async function glowOf(url){
  const html = await (await fetch(url)).text();
  return new DOMParser().parseFromString(html,'text/html')
    .querySelector('#glow-ingress-block')?.textContent?.replace(/\s+/g,' ').trim();
}
JSON.stringify({
  home: await glowOf('/'),
  serp: await glowOf('/s?k=wireless+mouse'),
  pdp:  await glowOf('/dp/B005EJH6Z4'),
  cart: await glowOf('/gp/cart/view.html')
}, null, 1)
```

У меня все четыре вернули `Deliver to Israel` — то есть на сервере состояние консистентно. Отсюда гипотеза про кэшированный фрагмент шапки, а не про испорченное состояние сессии.

### Сопутствующее, легко воспроизводится

Откройте `https://www.amazon.com/dp/B005EJH6Z4` при не-US локации. Кнопки Add to Cart **нет вообще**:

```js
JSON.stringify({
  addToCartExists: !!document.querySelector('#add-to-cart-button'),
  message: document.querySelector('#outOfStock, #availability')?.innerText?.replace(/\s+/g,' ').slice(0,140)
}, null, 1)
```

Ожидается `addToCartExists: false` и текст «This item cannot be shipped to your selected delivery location». Само по себе это корректное поведение — важно оно тем, что объясняет BUG-002.

---

## BUG-004 · Фильтр цены $20–$84 показывает товары от $8.69

**Ожидаемое время: 2 мин. Воспроизводимость: 1/1. Нашли вы — подтверждено.**

### Критично: фильтр надо применять кликом, а не руками в URL

Самодельный `rh=p_36%3A5000-` Amazon **молча игнорирует** — возвращает весь набор («over 10 000 results»), и вы получите ложную находку. Я на это наступил. Всегда проверяйте, что фильтр реально применён.

### Шаги

1. `https://www.amazon.com/s?k=wireless+mouse`
2. Brands → **Logitech**
3. Price → слайдер на **$20 – $84**
4. **Проверка, что фильтр жив:** в сайдбаре видно `$20 – $84` и ссылку **Reset price range**, счётчик стал `1-16 of 155 results` (а не «over 10 000»)
5. Смотрите на строку цены каждой карточки

### Замер

```js
const MIN=20, MAX=84;
const cards=[...document.querySelectorAll('[data-component-type="s-search-result"]')];
const rows=cards.map((c,i)=>{
  const t=c.innerText;
  const feat=c.querySelector('.a-price .a-offscreen')?.textContent??null;
  const un=t.match(/\$([\d,]+\.\d{2})\s*\((\d+)\s*used\s*&\s*new/i);
  const v=feat?Number(feat.replace(/[^\d.]/g,'')):(un?Number(un[1]):null);
  return {pos:i+1, asin:c.getAttribute('data-asin'),
          displayed: feat??(un?'$'+un[1]:null),
          offers: un?Number(un[2]):null,
          noFeaturedOffers:/no featured offers available/i.test(t),
          sponsored:/^\s*sponsored/i.test(t),
          out: v!==null && (v<MIN||v>MAX)};
});
const bad = rows.filter(r=>r.out);
console.table(bad);
console.log(JSON.stringify({
  filterApplied: /reset price range/i.test(document.body.innerText),
  total: rows.length,
  violations: bad.length,
  organicViolations: bad.filter(r=>!r.sponsored).length,
  everyOffenderHasNoFeaturedOffer: bad.every(r=>r.noFeaturedOffers),
  featuredPriceViolations: rows.filter(r=>r.out && !r.noFeaturedOffers).length
}, null, 1));
```

**Мой результат:** `16` карточек, `7` нарушений, все `7` органические (не sponsored), цены `$15.85, $15.44, $10.78, $8.70, $12.31, $8.69, $14.26`. Минимум — на **57 % ниже** нижней границы фильтра.

**Ключевые два флага, которые доказывают причину:**

```
everyOffenderHasNoFeaturedOffer: true    ← все нарушители без featured offer
featuredPriceViolations: 0               ← ни одного нарушения там, где featured цена есть
```

То есть: фильтр сопоставляется с **featured/list** ценой, а карточка рисует **lowest used & new** цену. Две разные сущности, и пользователь фильтровал не по той, которую видит. Это формулировка «нашёл корень», а не «фильтр сломан» — на такое ревьюер реагирует совсем иначе.

### Контрольный замер (докажет границы дефекта)

Примените кликом `Up to $15` — у меня `0` нарушений. Значит дефект специфичен для диапазонов, чей нижний порог выше типичной used-offer цены.

---

## BUG-005 · «Compare with similar items» для мыши показывает спонжи для макияжа

**Ожидаемое время: 2 мин. У вас уже на скриншотах — осталось оформить.**

### Шаги

1. В мобильной эмуляции откройте `https://www.amazon.com/gp/aw/c?ref_=navm_hdr_cart`
2. На строке **TECKNET Wireless Mouse Rechargeable, 2.4G** нажмите **Compare with similar items**
3. Прочитайте, что предлагается к сравнению

### Замер

```js
JSON.stringify({
  cartItemTitle: document.querySelector('.sc-list-item h4, .sc-product-title')?.innerText?.slice(0,60),
  compareTitles: [...document.querySelectorAll('a')]
    .map(a => a.innerText.trim())
    .filter(t => t.length > 15 && t.length < 80).slice(0, 8)
}, null, 1)
```

**Ваш результат:** для беспроводной мыши предлагаются Amazon Basics Makeup Blender Sponges, Amazon Basics Cosmetic Rectangular Foam Wedges, e.l.f. Total Sponge Set, Beautyblender Original, Beautyblender Original Pink, M. Asam Magic Finish Sponge Trio. Ноль пересечения по категории, воспроизводится в обеих ориентациях.

### Как формулировать

Это **не** «плохая релевантность» — её мы вынесли в out of scope. Это **категориальный промах**: виджет резолвит не тот seed-ASIN либо падает на generic-набор рекомендаций. Разница принципиальная: первое — вопрос ранжирования, второе — дефект связывания данных. В репорте так и написано.

Снимите скриншот, где в одном кадре видно название товара в корзине и предлагаемые к сравнению спонжи.

---

## Опровергнутые гипотезы — перепроверьте, если хотите

Обе не подтвердились. Если у вас получится иначе — это ценнее, чем моё «не воспроизвелось».

**Сброс сортировки при применении фильтра.** После клика по бренду проверьте:

```js
JSON.stringify({
  dropdown: document.querySelector('#s-result-sort-select')?.value,
  urlHasSort: location.search.includes('s=price-asc-rank'),
  pricesAscending: (p => p.every((v,i) => i===0 || p[i-1] <= v))(
    [...document.querySelectorAll('[data-component-type="s-search-result"] .a-price .a-offscreen')]
      .map(e => Number(e.textContent.replace(/[^\d.]/g,'')))
  )
}, null, 1)
```

У меня: `price-asc-rank`, `true`, `true` — сортировка сохраняется корректно.

**Порча корзины на сервере при сбое сети.** Уже покрыто шагом 6 в BUG-001: после reload было ровно 2 / `$19.98`, дублей нет.

---

## Перед тем как прикладывать скриншоты

На моих кадрах видно «Hello, Anton», ZIP 37217 и содержимое корзины. Либо замажьте, либо переснимите в инкогнито. В отчёт для работодателя персональные данные тащить не стоит.
