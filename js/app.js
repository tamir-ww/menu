/* White Wolf customer menu: view only */
(function () {
  const { esc, ico, store, TYPE, CAT, TAGS, nis, prof, profSort, pot, isNew, isBack, imgSrc, parseReview, reviewHTML, dealNote, toast } = WW;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LOW = 2, PREVIEW = /[?&]preview=1/.test(location.search), EMBED = /[?&]embed=1/.test(location.search);
  document.documentElement.setAttribute('dir', 'rtl'); document.documentElement.setAttribute('lang', 'he');
  const DEF = { phone: '054-3003138', hours: [['א׳–ה׳', '10:00–21:00'], ['ו׳', '09:00–15:00'], ['מוצ״ש', '20:00–22:30']], ann: '' };
  const S = { menu: null, products: [], reviews: [], deals: [], settings: DEF, revOn: true,
    f: { q: '', cat: 'all', types: [], mk: [], prof: [], tags: [], min: '', max: '', sale: false, review: false, mini: false, deal: false, fresh: false },
    rx: store.get('ww-rx') || '', sort: store.get('ww-sort') || 'pa', group: store.get('ww-group') || 'deals',
    view: store.get('ww-view') || (matchMedia('(max-width: 700px)').matches ? 'list' : 'cards'), col: new Set() };
  const hash = s => { let h = 5381; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h.toString(36) };
  const byId = id => S.products.find(p => p.id === id);
  const revOf = p => p && S.reviews.find(r => r.key === p.key);
  const visible = () => S.products.filter(p => !p.off && !p.hidden && p.stock !== 0);
  const companies = () => { const m = new Map(); visible().forEach(p => m.set(p.marketer, (m.get(p.marketer) || 0) + 1)); return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'he')) };

  /* transliteration so "pink" finds "פינק" */
  const TR = { 'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'o', 'ז': 'z', 'ח': 'h', 'ט': 't', 'י': 'i', 'כ': 'k', 'ל': 'l', 'מ': 'm', 'נ': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p', 'צ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't', 'ך': 'k', 'ם': 'm', 'ן': 'n', 'ף': 'f', 'ץ': 'tz' };
  const tl = s => s.replace(/ג'/g, 'j').replace(/צ'/g, 'ch').replace(/ז'/g, 'j').toLowerCase().split('').map(c => TR[c] ?? c).join('');
  const sk = s => s.toLowerCase().replace(/ph/g, 'f').replace(/c/g, 'k').replace(/[wv]/g, 'o').replace(/q/g, 'k').replace(/x/g, 'ks').replace(/[aeiouy\W\d_]/g, '');

  function apply(list, skip) {
    const f = S.f, q = f.q.trim().toLowerCase(), latin = /[a-z]/.test(q), qs = latin ? sk(q) : '';
    return list.filter(p => {
      if (S.rx && prof(p) !== S.rx) return false;
      if (skip !== 'cat' && f.cat !== 'all' && p.cat !== f.cat) return false;
      if (skip !== 'types' && f.types.length && !f.types.includes(p.type)) return false;
      if (skip !== 'mk' && f.mk.length && !f.mk.includes(p.marketer)) return false;
      if (skip !== 'prof' && f.prof.length && !f.prof.includes(prof(p))) return false;
      if (skip !== 'tags' && f.tags.length && !f.tags.some(t => (p.tags || []).includes(t))) return false;
      const pr = p.sale ?? p.price;
      if (f.min !== '' && pr < +f.min) return false; if (f.max !== '' && pr > +f.max) return false;
      if (f.sale && !(p.sale && p.sale < p.price)) return false;
      if (f.review && !revOf(p)) return false;
      if (f.mini && !p.mini) return false;
      if (f.deal && !p.deals.some(d => d !== 'מוזלים עד ₪150')) return false;
      if (f.fresh && !(isNew(p) || isBack(p))) return false;
      if (q) {
        const h = (p.name + ' ' + p.strain + ' ' + (p.en || '') + ' ' + p.marketer + ' ' + TYPE[p.type] + ' ' + CAT[p.cat] + ' ' + prof(p) + ' ' + p.deals.join(' ') + ' ' + (p.tags || []).join(' ')).toLowerCase();
        if (!q.split(/\s+/).every(w => h.includes(w))) { if (!latin || qs.length < 2) return false; if (!sk(tl(p.name + ' ' + p.strain)).includes(qs)) return false }
      }
      return true;
    });
  }
  const disc = p => p.sale && p.price ? (p.price - p.sale) / p.price : 0;
  const SORTS = { pa: ['מחיר: מהזול ליקר', (a, b) => (a.sale ?? a.price) - (b.sale ?? b.price)], pd: ['מחיר: מהיקר לזול', (a, b) => (b.sale ?? b.price) - (a.sale ?? a.price)],
    disc: ['ההנחה הגדולה ביותר', (a, b) => disc(b) - disc(a)], thc: ['THC: מהגבוה לנמוך', (a, b) => (b.thc ?? 0) - (a.thc ?? 0) || (a.sale ?? a.price) - (b.sale ?? b.price)], cbd: ['CBD: מהגבוה לנמוך', (a, b) => (b.cbd ?? 0) - (a.cbd ?? 0)],
    rev: ['ציון ביקורת', (a, b) => ((revOf(b)?.p.score) ?? -1) - ((revOf(a)?.p.score) ?? -1)], az: ['שם: א׳ עד ת׳', (a, b) => a.name.localeCompare(b.name, 'he')] };
  const GROUPS = { deals: ['לפי מבצעים', 'gift'], company: ['לפי חברה', 'shield'], type: ['לפי סוג', 'flower'], none: ['רשימה אחת', 'grid'] };
  const activeCount = () => { const f = S.f; return (f.cat !== 'all') + f.types.length + f.mk.length + f.prof.length + f.tags.length + (f.min !== '' || f.max !== '') + f.sale + f.review + f.mini + f.deal + f.fresh };

  function card(p) {
    const rv = revOf(p), onSale = p.sale && p.sale < p.price, src = imgSrc(p);
    const deals = p.deals.filter(d => d !== 'מוזלים עד ₪150');
    return `<a class="card" href="#${p.id}" aria-label="${esc(p.name)}, ${nis(p.sale ?? p.price)}">
      <span class="im" style="${src ? `background-image:url(${src})` : ''}">${rv ? `<span class="pl">${ico('play')}</span>` : ''}</span>
      <span style="min-width:0">
        <span class="nm">${esc(p.name)}</span>${p.strain || p.en ? `<span class="st"> · <span ${p.strain ? '' : 'dir="ltr"'}>${esc(p.strain || p.en)}</span></span>` : ''}
        <span class="meta"><span class="tp tp-${p.type}">${TYPE[p.type] || ''}</span><span class="thc num" dir="ltr">${prof(p)}</span><span>${CAT[p.cat]}</span><span>· <b style="color:var(--ink)">${esc(p.marketer)}</b></span></span>
        <span class="meta">${onSale ? '<span class="tag tag-sale">מבצע</span>' : ''}${deals.map(d => `<span class="tag tag-deal">${ico('gift')}${esc(d)}</span>`).join('')}${isNew(p) ? '<span class="tag tag-new">חדש</span>' : ''}${isBack(p) ? '<span class="tag tag-new">חזר למלאי</span>' : ''}${p.low || (p.stock != null && p.stock <= LOW) ? '<span class="tag tag-low">אחרונים במלאי</span>' : ''}</span>
        ${(p.tags || []).length ? `<span class="meta lvl">${p.tags.map(esc).join(' · ')}</span>` : ''}
        ${rv ? `<span class="rv" data-play="1">${ico('play')}ביקורת וידאו${rv.p.score != null ? ` · <b class="num">${rv.p.score}/10</b>` : ''}</span>` : ''}
      </span>
      <span class="pr"><span class="now num ${onSale ? 's' : ''}">${nis(p.sale ?? p.price)}</span>${onSale ? `<del class="num">${nis(p.price)}</del>` : ''}</span>
    </a>`;
  }

  /* compact row: about three times more products per screen than the cards */
  function row(p, sec) {
    const rv = revOf(p), onSale = p.sale && p.sale < p.price, src = imgSrc(p);
    const deals = p.deals.filter(d => d !== 'מוזלים עד ₪150' && d !== sec), low = p.low || (p.stock != null && p.stock <= LOW);
    return `<a class="row" href="#${p.id}" aria-label="${esc(p.name)}, ${TYPE[p.type] || ''}, ${prof(p)}, ${nis(p.sale ?? p.price)}">
      <span class="ri" style="${src ? `background-image:url(${src})` : ''}"><span class="dot dot-${p.type}"></span></span>
      <span class="rn"><b>${esc(p.name)}</b>${p.strain || p.en ? ` <small ${p.strain ? '' : 'dir="ltr"'}>${esc(p.strain || p.en)}</small>` : ''}</span>
      <span class="rm"><span class="thc num" dir="ltr">${prof(p)}</span><span class="rty">${TYPE[p.type] || ''}</span><span class="rco">${esc(p.marketer)}</span>${rv ? `<span class="rvp" data-play="1" title="ביקורת וידאו">${ico('play')}${rv.p.score != null ? `<b class="num">${rv.p.score}</b>` : ''}</span>` : ''}${deals.length ? `<span class="tag tag-deal" title="${esc(deals.join(', '))}">${ico('gift')}${esc(deals[0])}${deals.length > 1 ? ' +' + (deals.length - 1) : ''}</span>` : ''}${isNew(p) ? '<span class="tag tag-new">חדש</span>' : isBack(p) ? '<span class="tag tag-new">חזר</span>' : ''}${low ? '<span class="tag tag-low">אחרונים</span>' : ''}</span>
      <span class="rp"><b class="num ${onSale ? 's' : ''}">${nis(p.sale ?? p.price)}</b>${onSale ? `<del class="num">${nis(p.price)}</del>` : ''}</span>
    </a>`;
  }
  const items = (l, sec) => S.view === 'list' ? `<div class="rows">${l.map(p => row(p, sec)).join('')}</div>` : `<div class="grid">${l.map(card).join('')}</div>`;

  function filtersHTML() {
    const base = visible(), f = S.f;
    const cnt = (skip, fn) => { const l = apply(base, skip); return k => l.filter(p => fn(p) === k).length };
    const tc = cnt('types', p => p.type), pc = cnt('prof', prof);
    const tl0 = apply(base, 'tags'), tgc = t => tl0.filter(p => (p.tags || []).includes(t)).length, anyTag = base.some(p => (p.tags || []).length);
    const profs = [...new Set(base.map(prof))].filter(Boolean).sort(profSort);
    return `
    <div class="fgroup"><h3>סוג</h3><div class="chips">${['indica', 'sativa', 'hybrid'].map(t => `<button class="chip" type="button" data-f="types" data-v="${t}" aria-pressed="${f.types.includes(t)}"><span class="dot dot-${t}"></span>${TYPE[t]} <span class="c num">${tc(t)}</span></button>`).join('')}</div></div>
    ${anyTag ? `<div class="fgroup"><h3>חוויה ושימוש</h3><div class="chips">${TAGS.filter(t => tgc(t) || f.tags.includes(t)).map(t => `<button class="chip" type="button" data-f="tags" data-v="${t}" aria-pressed="${f.tags.includes(t)}">${t} <span class="c num">${tgc(t)}</span></button>`).join('')}</div><p class="lvl" style="margin:6px 0 0">לפי חוויות שדווחו ${S.revOn ? 'בביקורות ועל ידי הרוקחים' : 'על ידי הרוקחים'}. לא המלצה רפואית.</p></div>` : ''}
    ${S.rx ? '' : `<div class="fgroup"><h3>יחס THC / CBD</h3><div class="chips">${profs.filter(v => pc(v) || f.prof.includes(v)).map(v => `<button class="chip num" type="button" data-f="prof" data-v="${v}" aria-pressed="${f.prof.includes(v)}" dir="ltr">${v} <span class="c">${pc(v)}</span></button>`).join('')}</div></div>`}
    <div class="fgroup"><h3>מחיר (₪)</h3><div class="range"><input id="fmin" inputmode="numeric" placeholder="מ-" value="${esc(f.min)}" aria-label="מחיר מינימלי"><span>–</span><input id="fmax" inputmode="numeric" placeholder="עד" value="${esc(f.max)}" aria-label="מחיר מקסימלי"></div>
      <div class="chips" style="margin-top:8px">${[['', '150', 'עד 150'], ['150', '250', '150–250'], ['250', '350', '250–350'], ['350', '', '350+']].map(([a, b, l]) => `<button class="chip num" type="button" data-pr="${a}|${b}" aria-pressed="${f.min === a && f.max === b}">${l}</button>`).join('')}</div></div>
    <div class="fgroup">
      <label class="toggle">רק מוצרים במבצע<input type="checkbox" id="t-sale" data-t="sale" ${f.sale ? 'checked' : ''}></label>
      <label class="toggle">מבצעי כמות (2+1, 3 ב-...)<input type="checkbox" id="t-deal" data-t="deal" ${f.deal ? 'checked' : ''}></label>
      ${S.revOn ? `<label class="toggle">יש ביקורת וידאו<input type="checkbox" id="t-review" data-t="review" ${f.review ? 'checked' : ''}></label>` : ''}
      <label class="toggle">חדשים וחזרו למלאי<input type="checkbox" id="t-fresh" data-t="fresh" ${f.fresh ? 'checked' : ''}></label>
      <label class="toggle">מיני / סמול בלבד<input type="checkbox" id="t-mini" data-t="mini" ${f.mini ? 'checked' : ''}></label>
    </div>
    ${activeCount() ? '<button class="linkbtn" type="button" data-clear>ניקוי כל הסינונים</button>' : ''}`;
  }
  const range = l => { const ps = l.map(p => p.sale ?? p.price); const a = Math.min(...ps), b = Math.max(...ps); return a === b ? nis(a) : `${nis(a)}–${nis(b)}` };
  let secs = [];
  const section = (icon, title, sub, l, kind, note) => { const i = secs.length, c = S.col.has(title); secs.push([title, l.length, kind]);
    return `<div class="sec sk-${kind}${c ? ' closed' : ''}" id="sec${i}"><div class="sech" data-sec="${esc(title)}">${ico(icon)}<h2>${esc(title)}</h2><span class="num">${sub}</span>${note ? `<span class="dn num">${esc(note)}</span>` : ''}<button class="chev" type="button" aria-expanded="${!c}" aria-label="${c ? 'פתיחת' : 'כיווץ'} הקבוצה ${esc(title)}"></button></div>${c ? '' : items(l, title)}</div>` };
  const JL = { deals: ['gift', 'קפיצה למבצע'], company: ['shield', 'קפיצה לחברה'], type: ['flower', 'קפיצה לסוג'] };
  const jumpBar = () => secs.length < 3 ? '' : `<nav class="jump j-${S.group}" aria-label="קפיצה לקבוצה"><b class="ll">${ico(JL[S.group][0])}<span>${JL[S.group][1]}</span></b><div class="scroll">${secs.map(([t, n, k], i) => `<button class="chip jk-${k}" type="button" data-jump="${i}">${TYPE[k] ? `<i class="dot dot-${k}"></i>` : ''}${esc(t.replace('ללא מבצע כמות · ', ''))} <span class="c num">${n}</span></button>`).join('')}</div><button class="linkbtn" type="button" data-colall>${S.col.size ? 'פתיחת הכל' : 'כיווץ הכל'}</button></nav>`;
  function grouped(list) {
    const srt = l => [...l].sort(SORTS[S.sort][1]);
    secs = [];
    if (S.group === 'none') return items(srt(list));
    let out = '';
    if (S.group === 'company') {
      const m = new Map(); list.forEach(p => { if (!m.has(p.marketer)) m.set(p.marketer, []); m.get(p.marketer).push(p) });
      [...m].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'he')).forEach(([k, l]) => out += section('shield', k, `${l.length} מוצרים · ${range(l)}`, srt(l), 'co')); return out;
    }
    const seen = new Set();
    if (S.group === 'deals') {
      const ds = [...new Set(list.flatMap(p => p.deals))].sort((a, b) => { const ia = S.deals.indexOf(a), ib = S.deals.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) });
      for (const d of ds) {
        const l = list.filter(p => p.deals.includes(d) && !seen.has(p.id)); if (!l.length) continue; l.forEach(p => seen.add(p.id));
        out += section('gift', d, `${l.length} מוצרים${/^\d|זוג|קנה/.test(d) ? ' · אפשר לשלב בין המוצרים בקבוצה' : ''}`, srt(l), 'deal', dealNote(d, l));
      }
    }
    for (const c of ['flower', 'oil', 'preroll']) for (const t of ['indica', 'sativa', 'hybrid']) {
      const l = list.filter(p => !seen.has(p.id) && p.cat === c && p.type === t); if (!l.length) continue;
      out += section(c, (S.group === 'deals' && seen.size ? 'ללא מבצע כמות · ' : '') + `${CAT[c]} · ${TYPE[t]}`, `${l.length} מוצרים · ${range(l)}`, srt(l), t);
    }
    return out;
  }
  /* quick filters next to the categories: one tap instead of opening the filter panel */
  const QUICK = [['fresh', 'חדשים וחזרו', 'star'], ['review', 'עם ביקורת וידאו', 'play'], ['deal', 'מבצעי כמות', 'gift']];
  function quick(base) {
    const n = k => { const o = S.f[k]; S.f[k] = true; const c = apply(base).length; S.f[k] = o; return c };
    const h = QUICK.filter(([k]) => S.revOn || k !== 'review').map(([k, l, i]) => [k, l, i, n(k)]).filter(x => x[3] || S.f[x[0]]);
    return h.length ? `${h.map(([k, l, i, c]) => `<button class="chip qf" type="button" data-qf="${k}" aria-pressed="${!!S.f[k]}">${ico(i)}${l} <span class="c num">${c}</span></button>`).join('')}` : '';
  }
  /* new and back-in-stock products as a row of small cards above the menu */
  function freshStrip(list) {
    if (S.f.fresh) return '';
    const d = p => Math.max(isNew(p) ? Date.parse(p.firstSeen) : 0, isBack(p) ? Date.parse(p.backAt) : 0);
    const L = list.filter(p => isNew(p) || isBack(p)).sort((a, b) => d(b) - d(a)).slice(0, 14); if (!L.length) return '';
    return `<section class="fresh" aria-label="חדש וחזר למלאי"><div class="fh"><h2>${ico('star')}חדש וחזר למלאי</h2><button class="linkbtn" type="button" data-qf="fresh">לכל ${list.filter(p => isNew(p) || isBack(p)).length} המוצרים</button></div>
      <div class="fs">${L.map(p => { const on = p.sale && p.sale < p.price, src = imgSrc(p); return `<a class="fcard" href="#${p.id}"><span class="im" style="${src ? `background-image:url(${src})` : ''}"><span class="ft ${isNew(p) ? 'n' : 'b'}">${isNew(p) ? 'חדש' : 'חזר למלאי'}</span></span><b>${esc(p.name)}</b><small><i class="dot dot-${p.type}"></i>${TYPE[p.type] || ''} · <span dir="ltr">${prof(p)}</span></small><small>${esc(p.marketer)}</small><span class="fp num ${on ? 's' : ''}">${nis(p.sale ?? p.price)}${on ? ` <del>${nis(p.price)}</del>` : ''}</span></a>` }).join('')}</div></section>`;
  }
  function renderMenu() {
    const base = visible(), list = apply(base), f = S.f;
    const cc = apply(base, 'cat'); const cN = k => k === 'all' ? cc.length : cc.filter(p => p.cat === k).length;
    const mkl = apply(base, 'mk'); const mN = m => mkl.filter(p => p.marketer === m).length;
    const rv = S.reviews.find(r => S.products.some(p => p.key === r.key && !p.hidden && !p.off)), rp = rv && S.products.find(p => p.key === rv.key);
    const chips = [];
    if (f.cat !== 'all') chips.push(['cat', f.cat, CAT[f.cat]]);
    f.mk.forEach(v => chips.push(['mk', v, v])); f.types.forEach(v => chips.push(['types', v, TYPE[v]])); f.prof.forEach(v => chips.push(['prof', v, v])); f.tags.forEach(v => chips.push(['tags', v, v]));
    if (f.min !== '' || f.max !== '') chips.push(['price', '', `₪${f.min || 0}–${f.max || '∞'}`]);
    ['sale', 'deal', 'review', 'mini', 'fresh'].forEach(k => f[k] && chips.push(['t', k, { sale: 'במבצע', deal: 'מבצעי כמות', review: 'עם ביקורת', mini: 'מיני', fresh: 'חדשים וחזרו למלאי' }[k]]));
    const rxN = S.rx ? base.filter(p => prof(p) === S.rx).length : 0;
    $('#main').innerHTML = `
    <div class="wrap">
      <div class="phead"><h1>תפריט קנאביס רפואי</h1><p class="num">${base.length} מוצרים זמינים מ-${companies().length} חברות · ${base.filter(p => p.sale && p.sale < p.price).length} במבצע</p></div>
      ${rv && rp ? `<a class="spot" href="#${rp.id}" data-play="1">
        <span class="thumb" style="${rv.poster ? `background-image:url(${esc(rv.poster)})` : ''}">${ico('play')}</span>
        <span style="min-width:0"><span class="eb">ביקורת וידאו${rv.p.author ? ' · ' + esc(rv.p.author) : ''}</span><h2>${esc(rv.p.title)}</h2><p>${esc(rv.p.bottom)}</p></span>
        <span class="score"><b class="num">${rv.p.score ?? '–'}</b><span>מתוך 10</span></span></a>` : ''}
      ${freshStrip(list)}
      <div class="layout">
        <aside class="filters" aria-label="סינון">${filtersHTML()}</aside>
        <section style="min-width:0">
          ${S.rx ? `<div class="rx">${ico('shield')}<span>מוצגים רק מוצרים בקטגוריה <b class="num" dir="ltr">${S.rx}</b> שבמרשם שלך (<span class="num">${rxN}</span>)</span><button class="linkbtn" type="button" data-rx="change">שינוי</button><button class="linkbtn" type="button" data-rx="clear">הצגת כל המוצרים</button></div>` : ''}
          <div class="fpanel">
          <div class="lane lane-cat"><b class="ll">${ico('grid')}<span>קטגוריה</span></b><div class="scroll" role="group" aria-label="קטגוריה">${['all', 'flower', 'oil', 'preroll'].filter(k => k === 'all' || cN(k)).map(k => `<button class="chip" type="button" data-cat="${k}" aria-pressed="${f.cat === k}">${k === 'all' ? 'הכל' : CAT[k]} <span class="c num">${cN(k)}</span></button>`).join('')}</div></div>
          ${(qh => qh ? `<div class="lane lane-q"><b class="ll">${ico('star')}<span>סינון מהיר</span></b><div class="scroll" role="group" aria-label="סינון מהיר">${qh}</div></div>` : '')(quick(base))}
          <div class="lane lane-co"><b class="ll">${ico('shield')}<span>חברה</span></b><div class="scroll" role="group" aria-label="חברה">
            <button class="chip" type="button" data-mkall aria-pressed="${!f.mk.length}">כל החברות</button>
            ${companies().map(([m]) => `<button class="chip" type="button" data-f="mk" data-v="${esc(m)}" aria-pressed="${f.mk.includes(m)}">${esc(m)} <span class="c num">${mN(m)}</span></button>`).join('')}</div></div>
          <div class="tools">
            <label class="search">${ico('search')}<span class="sr">חיפוש</span><input id="q" type="search" placeholder="חיפוש בעברית או באנגלית: שם, זן, חברה..." value="${esc(f.q)}" autocomplete="off"></label>
            <button class="fbtn" type="button" id="openF">${ico('filter')}סינון${activeCount() ? `<span class="n num">${activeCount()}</span>` : ''}</button>
            <select class="sel" id="sort" aria-label="מיון">${Object.entries(SORTS).filter(([k]) => S.revOn || k !== 'rev').map(([k, [l]]) => `<option value="${k}" ${S.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
            <span class="seg vw" role="group" aria-label="תצוגה"><button type="button" data-view="cards" aria-pressed="${S.view === 'cards'}" title="כרטיסים">${ico('grid')}<span class="vl">כרטיסים</span></button><button type="button" data-view="list" aria-pressed="${S.view === 'list'}" title="רשימה צפופה">${ico('rows')}<span class="vl">רשימה</span></button></span>
            <span class="seg" role="group" aria-label="קיבוץ">${Object.entries(GROUPS).map(([k, [l, i]]) => `<button type="button" data-group="${k}" aria-pressed="${S.group === k}">${ico(i)}${l}</button>`).join('')}</span>
          </div>
          </div>
          ${chips.length || f.q ? `<div class="active">${chips.map(([k, v, l]) => `<button class="chip ac-${k}" type="button" data-rm="${k}" data-v="${esc(v)}">${esc(l)} ${ico('close')}</button>`).join('')}${chips.length + !!f.q > 1 || (f.q && !chips.length) ? `<button class="clearall" type="button" data-clear>${ico('close')}ניקוי הכל</button>` : ''}</div>` : ''}
          <div class="count" aria-live="polite"><b class="num">${list.length}</b> מוצרים · <span class="sorthint">${GROUPS[S.group][0]}, ובכל קבוצה ${SORTS[S.sort][0].replace(':', '')}</span><span class="legend" aria-hidden="true">${['indica', 'sativa', 'hybrid'].map(t => `<i class="dot dot-${t}"></i>${TYPE[t]}`).join('')}</span></div>
          ${list.length ? (h => jumpBar() + h)(grouped(list)) : `<div class="empty"><b>לא נמצאו מוצרים</b>נסו להסיר חלק מהסינונים או לחפש מילה אחרת.<br><br><button class="btn btn-sm btn-2" type="button" data-clear>ניקוי הסינונים</button></div>`}
        </section>
      </div>
    </div>`;
    mbar();
    $$('.lane .scroll').forEach(sc => { const on = sc.querySelector('[aria-pressed="true"]'); if (!on || on === sc.firstElementChild) return; const r = on.getBoundingClientRect(), R = sc.getBoundingClientRect(); if (r.left < R.left || r.right > R.right) sc.scrollLeft += (r.left + r.width / 2) - (R.left + R.width / 2) });
  }

  /* phone bottom bar: filters, jump to a group, search, without scrolling back up */
  function mbar() {
    let m = $('#mbar'); if (!m) { m = document.createElement('nav'); m.id = 'mbar'; m.className = 'mbar'; m.setAttribute('aria-label', 'קיצורים'); document.body.appendChild(m) }
    const n = activeCount();
    m.innerHTML = `<button type="button" id="openF2">${ico('filter')}<span>סינון</span>${n ? `<b class="n num">${n}</b>` : ''}</button>${secs.length > 1 ? `<button type="button" id="openJ">${ico(S.group === 'company' ? 'shield' : 'gift')}<span>${S.group === 'company' ? 'חברות' : S.group === 'deals' ? 'מבצעים' : 'קבוצות'}</span></button>` : ''}<button type="button" id="goQ">${ico('search')}<span>חיפוש</span></button>`;
    mshow();
  }
  function mshow() { const m = $('#mbar'), fp = $('.fpanel'); if (!m) return; const on = !!fp && fp.getBoundingClientRect().bottom < 0 && /^#?(menu)?$/.test(location.hash.replace(/^#$/, '')) && !$('#layer').innerHTML; m.classList.toggle('on', on) }
  addEventListener('scroll', () => requestAnimationFrame(mshow), { passive: true });
  function jumpSheet() {
    sheet(`<div style="padding:20px 20px 24px"><h2 style="margin:0 0 12px;font-size:18px">קפיצה ל${S.group === 'company' ? 'חברה' : S.group === 'deals' ? 'מבצע' : 'קבוצה'}</h2><div class="jlist">${secs.map(([t, n, k], i) => `<button type="button" class="chip jk-${k}" data-jump="${i}">${TYPE[k] ? `<i class="dot dot-${k}"></i>` : ''}${esc(t.replace('ללא מבצע כמות · ', ''))} <span class="c num">${n}</span></button>`).join('')}</div></div>`, 'קפיצה לקבוצה');
    $('#layer .dlg').classList.add('dlg-sm');
  }
  function sheet(inner, label) {
    $('#layer').innerHTML = `<div class="ov" data-close><div class="dlg" role="dialog" aria-modal="true" aria-label="${esc(label)}"><button class="x" type="button" data-close aria-label="סגירה">${ico('close')}</button>${inner}</div></div>`;
    document.body.style.overflow = 'hidden'; const x = $('#layer .x'); x && x.focus(); const mb = $('#mbar'); mb && mb.classList.remove('on');
  }
  function closeSheet() { const v = $('#layer video'); v && v.pause(); $('#layer').innerHTML = ''; document.body.style.overflow = ''; if (/^#(p|r-)/.test(location.hash)) history.replaceState(null, '', S.last || '#menu'); mshow() }
  function videoBlock(rv) { return rv.video ? `<div class="vid"><video id="vid" src="${esc(rv.video)}" ${rv.poster ? `poster="${esc(rv.poster)}"` : ''} controls playsinline preload="metadata"></video></div>` : '' }
  function openProduct(id, play) {
    const p = byId(id); if (!p) return;
    const rv = revOf(p), onSale = p.sale && p.sale < p.price, src = imgSrc(p);
    const st = p.low || (p.stock != null && p.stock <= LOW) ? 'אחרונים במלאי' : 'זמין';
    const same = visible().filter(x => x.id !== p.id && x.marketer === p.marketer).length;
    sheet(`<div class="pd ${rv ? 'has-r' : ''}">${rv ? videoBlock(rv) : ''}
      <div class="pbody">
        <div class="phero"><span class="im" style="${src ? `background-image:url(${src})` : ''}"></span><div style="min-width:0"><h2>${esc(p.name)}</h2><div class="st">${p.en ? `<span dir="ltr">${esc(p.en)}</span> · ` : ''}${p.strain ? 'גנטיקה: ' + esc(p.strain) + ' · ' : ''}${esc(p.marketer)}</div>
          <div class="meta"><span class="tp tp-${p.type}">${TYPE[p.type] || ''}</span><span class="thc num" dir="ltr">${prof(p)}</span><span class="lvl">${pot(p)}</span>${isNew(p) ? '<span class="tag tag-new">חדש</span>' : ''}${isBack(p) ? '<span class="tag tag-new">חזר למלאי</span>' : ''}</div>
          ${(p.tags || []).length ? `<div class="ptags" style="margin-top:8px">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div></div>
        <div class="pricebox"><span class="now num ${onSale ? 's' : ''}">${nis(p.sale ?? p.price)}</span>${onSale ? `<del class="num">${nis(p.price)}</del><span class="tag tag-sale">חיסכון ${nis(p.price - p.sale)}</span>` : ''}${p.deals.map(d => `<span class="tag tag-deal">${ico('gift')}${esc(d)}</span>`).join('')}</div>
        ${rv ? reviewHTML(rv.p, rv.date) + partners() : ''}
        <dl class="specs"><div><dt>סוג</dt><dd>${TYPE[p.type] || '–'}</dd></div><div><dt>קטגוריה</dt><dd>${CAT[p.cat]}</dd></div><div><dt>THC</dt><dd class="num">${p.thc ?? '–'}%</dd></div><div><dt>CBD</dt><dd class="num">${p.cbd ?? '–'}%</dd></div><div><dt>חברה</dt><dd>${esc(p.marketer || '–')}</dd></div><div><dt>זמינות</dt><dd>${st}</dd></div></dl>
        ${same ? `<button class="linkbtn" type="button" data-samemk="${esc(p.marketer)}">עוד ${same} מוצרים של ${esc(p.marketer)}</button>` : ''}
        <p class="legal">המידע אינו מהווה המלצה רפואית. יש להתייעץ עם רוקח לפני הרכישה. מבצעים עד גמר המלאי. להזמנות: <span class="num" dir="ltr">${esc(S.settings.phone)}</span></p>
      </div></div>`, p.name);
    if (play && rv) { const v = $('#vid'); v && v.play().catch(() => { }) }
  }
  function openReview(id) {
    const rv = S.reviews.find(r => r.id === id); if (!rv) return;
    const p = S.products.find(x => x.key === rv.key && !x.hidden && !x.off);
    if (p) return openProduct(p.id, true);
    sheet(`<div class="pd has-r">${videoBlock(rv)}<div class="pbody">${reviewHTML(rv.p, rv.date)}${partners()}<div class="note" style="margin:0">המוצר הזה לא נמצא כרגע בתפריט. אפשר לשאול עליו בבית המרקחת: <span class="num" dir="ltr">${esc(S.settings.phone)}</span></div></div></div>`, rv.p.title);
    const v = $('#vid'); v && v.play().catch(() => { });
  }

  const partners = () => `<div class="partners"><img src="media/forum-central.jpg" alt="פורום המטופלים המרכזי"><img src="media/forum-neon.jpg" alt="מטופלים למען מטופלים"><span>ביקורות הקהילה בשיתוף <b>פורום המטופלים המרכזי</b> ו<b>מטופלים למען מטופלים</b></span></div>`;
  function renderReviews() {
    $('#main').innerHTML = `<section class="rhero"><div class="wrap"><div><div class="eb">ביקורות White Wolf</div><h1>ביקורות וידאו על הזנים</h1><p>חוות דעת אישיות: ריח, טעם, השפעה וציון. ביקורת של מוצר שנמצא בתפריט מקושרת למחיר העדכני.</p>
      <div class="hpart"><img src="media/forum-central.jpg" alt="פורום המטופלים המרכזי"><img src="media/forum-neon.jpg" alt="מטופלים למען מטופלים"><span>בשיתוף פורום המטופלים המרכזי ו"מטופלים למען מטופלים"</span></div></div><img src="media/mascot.jpg" alt=""></div></section>
    <div class="wrap"><div class="rgrid">
      ${S.reviews.map(rv => { const p = S.products.find(x => x.key === rv.key && !x.hidden && !x.off); return `<a class="rcard" href="#r-${esc(rv.id)}">
        <span class="po" style="${rv.poster ? `background-image:url(${esc(rv.poster)})` : ''}">${rv.p.score != null ? `<span class="sc num">${rv.p.score}/10</span>` : ''}<span class="pb">${ico('play')}</span></span>
        <span class="bd"><span class="meta" style="margin:0">${p ? `<span class="tp tp-${p.type}">${TYPE[p.type]}</span><span>${esc(p.marketer)}</span><span class="num">${nis(p.sale ?? p.price)}</span>` : '<span class="tag tag-low">כרגע לא במלאי</span>'}</span>
        <h3>${esc(rv.p.title)}</h3><p>${esc(rv.p.bottom)}</p><span class="meta" style="margin:0">${ico('crown')}${rv.p.author ? 'מאת ' + esc(rv.p.author) + ' · ' : ''}${esc(rv.date)}</span></span></a>` }).join('')}
      ${S.reviews.length < 3 ? '<div class="rcard ph"><div><b style="display:block;color:var(--ink);margin-bottom:4px">ביקורות נוספות בדרך</b>ביקורות חדשות יופיעו כאן ובתפריט, ליד המוצר שלהן.</div></div>' : ''}
    </div></div>`;
  }

  function openFilters() { sheet(`<div style="padding:20px 20px 24px;display:flex;flex-direction:column;gap:22px" id="fsheet">${filtersHTML()}<button class="btn" type="button" data-close>הצגת ${apply(visible()).length} מוצרים</button></div>`, 'סינון'); $('#layer .dlg').classList.add('dlg-sm') }
  function rxDlg() {
    const profs = [...new Set(visible().map(prof))].filter(Boolean).sort(profSort);
    sheet(`<div class="login"><h2>הקטגוריה שבמרשם שלך</h2><p>נציג רק מוצרים בקטגוריית THC/CBD שמופיעה במרשם.</p><div class="chips">${profs.map(v => `<button class="chip num" type="button" data-setrx="${v}" aria-pressed="${S.rx === v}" dir="ltr">${v} <span class="c">${visible().filter(p => prof(p) === v).length}</span></button>`).join('')}</div><button class="linkbtn" type="button" data-setrx="">הצגת כל המוצרים</button></div>`, 'קטגוריית מרשם');
    $('#layer .dlg').classList.add('dlg-sm');
  }
  const setRx = v => { S.rx = v; store.set('ww-rx', v); S.f.prof = [] };
  function rerender(keepSheet) {
    const y = scrollY, a = document.activeElement && document.activeElement.id; route(true);
    if (keepSheet && $('#fsheet')) $('#fsheet').innerHTML = filtersHTML() + `<button class="btn" type="button" data-close>הצגת ${apply(visible()).length} מוצרים</button>`;
    scrollTo(0, y); if (a && $('#' + a)) { const e = $('#' + a); e.focus(); try { if (e.value) e.setSelectionRange(e.value.length, e.value.length) } catch (_) { } }
  }
  function route(soft) {
    if (!S.menu) return;
    const h = location.hash.replace('#', '') || 'menu';
    if (/^p[0-9a-z]+$/.test(h) && byId(h)) { if (!$('#main').innerHTML.trim()) renderMenu(); openProduct(h, S.wantPlay); S.wantPlay = false; return }
    if (/^r-/.test(h) && S.revOn) { if (!$('#main').innerHTML.trim()) renderReviews(); openReview(h.slice(2)); return }
    const r = h === 'reviews' && S.revOn ? 'reviews' : 'menu'; S.last = '#' + r;
    $$('.nav a').forEach(a => a.dataset.r === r ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    (r === 'menu' ? renderMenu : renderReviews)();
    if (!soft) scrollTo(0, 0);
  }

  document.addEventListener('click', e => {
    const t = e.target, c = t.closest('[data-close]');
    if (c && (c === t || c.tagName === 'BUTTON')) { closeSheet(); return }
    const pl = t.closest('[data-play]'); if (pl) S.wantPlay = true;
    const sm = t.closest('[data-samemk]'); if (sm) { closeSheet(); S.f.mk = [sm.dataset.samemk]; location.hash = '#menu'; rerender(); return }
    const ff = t.closest('[data-f]'); if (ff) { const a = S.f[ff.dataset.f], v = ff.dataset.v, i = a.indexOf(v); i < 0 ? a.push(v) : a.splice(i, 1); rerender(true); return }
    if (t.closest('[data-mkall]')) { S.f.mk = []; rerender(); return }
    const pr = t.closest('[data-pr]'); if (pr) { const [a, b] = pr.dataset.pr.split('|'); if (S.f.min === a && S.f.max === b) { S.f.min = ''; S.f.max = '' } else { S.f.min = a; S.f.max = b } rerender(true); return }
    const qf = t.closest('[data-qf]'); if (qf) { S.f[qf.dataset.qf] = !S.f[qf.dataset.qf]; rerender(); return }
    const ct = t.closest('[data-cat]'); if (ct) { S.f.cat = ct.dataset.cat; rerender(); return }
    const gr = t.closest('[data-group]'); if (gr) { S.group = gr.dataset.group; S.col.clear(); store.set('ww-group', S.group); rerender(); return }
    const vw = t.closest('[data-view]'); if (vw) { S.view = vw.dataset.view; store.set('ww-view', S.view); rerender(); return }
    const sc = t.closest('[data-sec]'); if (sc) { const k = sc.dataset.sec; S.col.has(k) ? S.col.delete(k) : S.col.add(k); rerender(); return }
    const jp = t.closest('[data-jump]'); if (jp) { if (jp.closest('#layer')) closeSheet(); const k = secs[+jp.dataset.jump]; if (k && S.col.has(k[0])) { S.col.delete(k[0]); rerender() } const el = $('#sec' + jp.dataset.jump); if (el) { const y = el.getBoundingClientRect().top + scrollY - (($('.top') || {}).offsetHeight || 64) - (($('.jump') || {}).offsetHeight || 0) - 8; scrollTo({ top: y, behavior: 'smooth' }) } return }
    if (t.closest('[data-colall]')) { if (S.col.size) S.col.clear(); else secs.forEach(([k]) => S.col.add(k)); rerender(); return }
    const rm = t.closest('[data-rm]'); if (rm) { const k = rm.dataset.rm, v = rm.dataset.v; if (k === 'cat') S.f.cat = 'all'; else if (k === 'price') { S.f.min = ''; S.f.max = '' } else if (k === 't') S.f[v] = false; else S.f[k] = S.f[k].filter(x => x !== v); rerender(); return }
    if (t.closest('[data-clear]')) { S.f = { q: '', cat: 'all', types: [], mk: [], prof: [], tags: [], min: '', max: '', sale: false, review: false, mini: false, deal: false, fresh: false }; rerender(true); return }
    const rx = t.closest('[data-rx]'); if (rx) { if (rx.dataset.rx === 'clear') { setRx(''); rerender() } else rxDlg(); return }
    const srx = t.closest('[data-setrx]'); if (srx) { setRx(srx.dataset.setrx); closeSheet(); rerender(); return }
    if (t.closest('#openF') || t.closest('#openF2')) { openFilters(); return }
    if (t.closest('#openJ')) { jumpSheet(); return }
    if (t.closest('#goQ')) { scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => { const q = $('#q'); q && q.focus() }, 350); return }
    const cp = t.closest('[data-copy]'); if (cp) { const v = S.settings.phone; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast('המספר הועתק')).catch(() => toast(v)); return }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#layer').innerHTML) closeSheet() });
  let qt; document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'q') { clearTimeout(qt); qt = setTimeout(() => { S.f.q = t.value; rerender() }, 160) }
    if (t.id === 'fmin' || t.id === 'fmax') { clearTimeout(qt); qt = setTimeout(() => { S.f[t.id === 'fmin' ? 'min' : 'max'] = t.value.replace(/\D/g, ''); rerender(true) }, 400) }
  });
  document.addEventListener('change', e => { const t = e.target; if (t.dataset.t) { S.f[t.dataset.t] = t.checked; rerender(true) } if (t.id === 'sort') { S.sort = t.value; store.set('ww-sort', S.sort); rerender() } });
  window.addEventListener('hashchange', () => { if (!/^#(p|r-)/.test(location.hash)) { $('#layer').innerHTML = ''; document.body.style.overflow = '' } route() });

  function chrome() {
    const s = S.settings;
    $$('[data-phone]').forEach(e => e.textContent = s.phone);
    $('#sHours').textContent = s.hours.map(h => h.join(' ')).join(' · ');
    $('#fHours').innerHTML = s.hours.map(h => `<p>${esc(h[0])} <span class="num">${esc(h[1])}</span></p>`).join('');
    $('#updated').innerHTML = S.menu.updated ? `עדכון אחרון: <b class="num">${esc(S.menu.updated)}</b>` : '';
    $('#ann').innerHTML = (PREVIEW ? `<div class="ann ann-pv"><div class="wrap">${ico('shield')}<span>תצוגה מקדימה למנהלים. זה עוד לא פורסם ללקוחות.</span></div></div>` : '') + (s.ann ? `<div class="ann"><div class="wrap">${ico('gift')}<span>${esc(s.ann)}</span></div></div>` : '');
  }
  function gate() {
    const gp = [...new Set(visible().map(prof))].filter(Boolean).sort(profSort);
    $('#gRx').innerHTML = '<option value="">הצגת כל המוצרים</option>' + gp.map(v => { const n = v.match(/\d+/g); return `<option value="${v}" ${S.rx === v ? 'selected' : ''}>${v} · ${pot({ thc: +n[0], cbd: +n[1] })}</option>` }).join('');
    if (store.get('ww-licensed') !== '1' && !PREVIEW) { $('#gate').hidden = false; $('#gateOk').focus() }
    $('#gateOk').onclick = () => { store.set('ww-licensed', '1'); setRx($('#gRx').value); $('#gate').hidden = true; route(true) };
    $('#gateNo').onclick = () => { $('#gate .t').innerHTML = '<img class="w" src="media/wordmark-reverse.png" alt="White Wolf AI Pharmacy"><h1>הגישה לתפריט מוגבלת</h1><p>התפריט זמין רק לבעלי רישיון לקנאביס רפואי. לשאלות על תהליך קבלת רישיון אפשר לפנות לרופא המטפל.</p>' };
  }
  function start(menu, reviews) {
      S.menu = menu; S.deals = menu.deals || []; S.settings = { ...DEF, ...(menu.settings || {}) };
      S.products = menu.products.map(p => ({ ...p, id: 'p' + hash(p.key), tags: p.tags || [], deals: p.deals || [] }));
      /* video reviews can be switched off in the admin page (settings.reviews === false): then nothing about them is shown */
      S.revOn = (menu.settings || {}).reviews !== false;
      S.reviews = S.revOn ? ((reviews && reviews.reviews) || []).map(r => ({ ...r, p: parseReview(r.raw) })) : [];
      /* the experience tags come from the reviews, so they go with them */
      if (!S.revOn) { S.f.review = false; S.f.tags = []; if (S.sort === 'rev') S.sort = 'pa'; S.products.forEach(p => p.tags = []) }
      $$('[data-rev]').forEach(e => e.hidden = !S.revOn);
      const gt = $('#gateTxt'); if (gt) gt.textContent = `כדי לצפות במחירים${S.revOn ? ', במבצעים ובביקורות' : ' ובמבצעים'} יש לאשר שיש לך רישיון בתוקף ממשרד הבריאות ומרשם פעיל.`;
      if (!SORTS[S.sort]) S.sort = 'pa'; if (!GROUPS[S.group]) S.group = 'deals';
      chrome(); if (!EMBED) gate(); route();
  }
  async function load() {
    if (EMBED) {
      window.addEventListener('message', e => { const d = e.data; if (d && d.type === 'ww-preview') { const keep = location.hash; start(d.menu, d.reviews); if (keep) route(true) } });
      parent.postMessage({ type: 'ww-ready' }, '*'); return;
    }
    try {
      let menu, reviews;
      if (PREVIEW) { const d = JSON.parse(store.get('ww-preview') || 'null'); if (d) { menu = d.menu; reviews = d.reviews } }
      if (!menu) {
        const r = await fetch('data.json?v=' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw new Error(r.status);
        const d = await r.json(); menu = d.menu; reviews = d.reviews;
      }
      start(menu, reviews);
    } catch (err) {
      $('#main').innerHTML = `<div class="wrap" style="padding-block:48px"><div class="empty"><b>לא הצלחנו לטעון את התפריט</b>בדקו את החיבור לאינטרנט ונסו לרענן את הדף. אפשר גם להתקשר: <span class="num" dir="ltr">054-3003138</span></div></div>`;
    }
  }
  load();
})();
