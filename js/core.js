/* White Wolf menu: shared helpers for the customer menu and the admin page */
const WW = (function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ico = (n, cls = '') => `<span class="ico ${cls}" style="--i:var(--i-${n})" aria-hidden="true"></span>`;
  const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) { } }, del(k) { try { localStorage.removeItem(k) } catch (e) { } } };
  const TYPE = { indica: 'אינדיקה', sativa: 'סאטיבה', hybrid: 'היבריד' };
  const CAT = { flower: 'תפרחת', oil: 'שמן', preroll: 'גליליות' };
  const TAGS = ['יום', 'ערב', 'אנרגטי', 'מרגיע', 'פוקוס', 'חברתי', 'יצירתי'];
  const DAY = 864e5, FRESH_DAYS = 14;
  const nis = n => n == null || n === '' ? '' : '₪' + Number(n).toLocaleString('he-IL');
  const prof = p => p.thc == null ? '' : `T${p.thc}/C${p.cbd}`;
  const profSort = (a, b) => { const pa = a.match(/\d+/g).map(Number), pb = b.match(/\d+/g).map(Number); return pb[0] - pa[0] || pa[1] - pb[1] };
  function pot(p) { if (p.thc == null) return ''; if (p.cbd > p.thc) return 'עשיר ב-CBD'; if (p.thc >= 10 && p.cbd >= 10) return 'מאוזן THC/CBD'; if (p.thc >= 20) return 'THC גבוה'; if (p.thc >= 15) return 'THC בינוני-גבוה'; return 'THC בינוני' }
  const today = () => new Date().toISOString().slice(0, 10);
  const recent = d => d && (Date.now() - Date.parse(d)) < FRESH_DAYS * DAY;
  const isNew = p => recent(p.firstSeen) && !p.initial;
  const isBack = p => recent(p.backAt);
  const imgSrc = p => p.img ? 'data:image/jpeg;base64,' + p.img : '';
  const norm = s => String(s || '').replace(/[‎‏"״׳']/g, '').replace(/\s+/g, ' ').trim();
  const keyOf = p => [norm(p.name), norm(p.strain), norm(p.marketer), p.type || '', p.cat || '', p.thc ?? '', p.cbd ?? ''].join('|');

  /* review text in the WhatsApp format -> fields */
  const EMO = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}]/gu;
  const clean = s => s.replace(EMO, '').replace(/[ \t]+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s*\|\s*/g, ' | ').trim();
  function parseReview(raw) {
    const r = { title: '', strain: '', typeLine: '', brand: '', grower: '', author: '', method: '', facts: [], tags: [], nose: '', smoke: '', effect: '', bottom: '', score: null, verdict: '', type: null };
    const lines = String(raw || '').replace(/\r/g, '').split('\n'); let sec = 'intro'; const buf = { nose: [], smoke: [], effect: [], bottom: [] };
    const H = [[/קצת בקטנה/, 'facts'], [/מבחן ה.?["״”]?אף/, 'nose'], [/מבחן ה.?["״”]?עישון/, 'smoke'], [/^השפעה/, 'effect'], [/שורה תחתונה/, 'bottom']];
    for (const L of lines) {
      const c = clean(L); if (!c) continue;
      const sm = c.match(/(\d+(?:[.,]\d)?)\s*מתוך\s*10/);
      if (sm && /מדד|ציון|מתוך/.test(c)) { r.score = parseFloat(sm[1].replace(',', '.')); r.verdict = clean(c.slice(c.indexOf(sm[0]) + sm[0].length)).replace(/^[\s:–-]+/, ''); sec = 'done'; continue }
      let hit = null; for (const [re, k] of H) { if (re.test(c)) { hit = k; break } }
      if (hit) { sec = hit; const rest = c.replace(/^[^:]*:/, '').trim(); if (rest && rest !== c && buf[hit]) buf[hit].push(rest); continue }
      if (sec === 'intro') {
        if (/סקירת זן/.test(c)) { r.title = c.replace(/^.*סקירת זן\s*:?\s*/, '').trim(); continue }
        if (/^מאת\s/.test(c)) { r.author = c.replace(/^מאת\s*/, ''); continue }
        if (/^מבית\s/.test(c)) { r.grower = c.replace(/^מבית\s*/, ''); continue }
        if (/(סאטיבה|אינדיקה|היבריד)/.test(c) && !r.typeLine) { r.typeLine = c; const m = c.match(/המותג\s+(.+)$/); if (m) r.brand = m[1]; r.type = /סאטיבה/.test(c) ? 'sativa' : /אינדיקה/.test(c) ? 'indica' : 'hybrid'; continue }
        r.method = (r.method ? r.method + ' ' : '') + c; continue
      }
      if (sec === 'facts') {
        const m = c.match(/^([^:]{1,24}):\s*(.+)$/);
        if (m) { r.facts.push([m[1].trim(), m[2].trim()]); if (/מותג/.test(m[1])) r.brand = m[2].trim(); if (/מגדל/.test(m[1])) r.grower = m[2].trim(); if (/גנטיקה/.test(m[1])) r.strain = m[2].trim() }
        else r.tags.push(...c.split('|').map(s => s.trim()).filter(Boolean)); continue
      }
      if (buf[sec]) buf[sec].push(c);
    }
    for (const k in buf) r[k] = buf[k].join(' ');
    return r;
  }
  function suggestTags(r) {
    const t = [r.effect, r.bottom, r.verdict].join(' '); const o = new Set();
    if (/אנרגי|ממריץ|מרומם|מרימ/.test(t)) o.add('אנרגטי'); if (/פוקוס|מחדד|ריכוז/.test(t)) o.add('פוקוס'); if (/חברתי|חברותי/.test(t)) o.add('חברתי'); if (/יצירתי/.test(t)) o.add('יצירתי');
    if (/שעות היום|בוקר|צהריים|ליום|במהלך היום/.test(t)) o.add('יום'); if (/ערב|לילה|לפני השינה/.test(t)) o.add('ערב');
    if (/מרגיע|רגיעה|הרפיה|נינוח/.test(t) || (/מדביק/.test(t) && !/לא מדביק/.test(t))) o.add('מרגיע');
    return TAGS.filter(x => o.has(x));
  }
  function reviewHTML(rv, date) {
    const r = rv;
    const sec = (i, h, t) => t ? `<div class="rsec"><span class="bub">${ico(i)}</span><div><h4>${h}</h4><p>${esc(t)}</p></div></div>` : '';
    const sc = Math.round(r.score || 0);
    return `<div class="rvw">
      <div class="rvh"><div><h3>סקירת זן: ${esc(r.title)}</h3><div class="by">${ico('crown')}${r.author ? 'מאת ' + esc(r.author) + ' · ' : ''}${esc(date || '')}</div></div>
        ${r.score != null ? `<div class="meter" aria-label="מדד החוויה האישית ${r.score} מתוך 10"><b class="num">${r.score}</b><div><div class="bars">${Array.from({ length: 10 }, (_, i) => `<i class="${i < sc ? 'on' : ''}"></i>`).join('')}</div><small>מדד החוויה האישית</small></div></div>` : ''}</div>
      ${r.method ? `<div class="cmp">${esc(r.method)}</div>` : ''}
      ${r.facts.length ? `<dl class="facts">${r.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${r.tags.length ? `<div class="ptags">${r.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      ${sec('nose', 'מבחן האף', r.nose)}${sec('smoke', 'מבחן העישון', r.smoke)}${sec('effect', 'השפעה', r.effect)}
      ${r.bottom ? `<div class="bottom"><h4>שורה תחתונה</h4><p>${esc(r.bottom)}</p>${r.verdict ? `<p class="vd">${esc(r.verdict)}</p>` : ''}</div>` : ''}
    </div>`;
  }
  /* what a bulk deal works out to per unit, from the prices of the products in it */
  function dealNote(d, l) {
    const ps = (l || []).map(p => p.sale ?? p.price).filter(Boolean); if (!ps.length) return '';
    const lo = Math.min(...ps), hi = Math.max(...ps), rng = lo === hi ? nis(lo) : `${nis(lo)}–${nis(hi)}`;
    let m = d.match(/^(\d+|זוג)\s*ב-?\s*₪?\s*([\d,]+)/);
    if (m) { const n = m[1] === 'זוג' ? 2 : +m[1], tot = +m[2].replace(/,/g, ''), u = Math.round(tot / n); if (!n || !tot) return ''; return hi > u ? `${nis(u)} ליחידה במקום ${rng}${lo === hi ? ` · חיסכון ${nis(lo * n - tot)}` : ''}` : `${nis(u)} ליחידה` }
    m = d.match(/^(\d+)\s*\+\s*(\d+)/);
    if (m) { const pay = +m[1], get = pay + +m[2]; return `${get} במחיר ${pay} · יוצא ${lo === hi ? nis(Math.round(lo * pay / get)) + ' ליחידה' : `${Math.round((1 - pay / get) * 100)}% הנחה`}` }
    m = d.match(/קנה\s*(\d+).*?(\d+)/);
    if (m) { const pay = +m[1], get = +m[2]; if (get > pay) return `${get} במחיר ${pay} · כ-${Math.round((1 - pay / get) * 100)}% הנחה, הזול במתנה` }
    m = d.match(/עד\s*₪?\s*(\d+)/); if (m) return `מחירים ${rng}`;
    return '';
  }
  let tt; function toast(m) { let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t) } t.textContent = m; clearTimeout(tt); tt = setTimeout(() => t.remove(), 3600) }
  return { esc, ico, store, TYPE, CAT, TAGS, DAY, nis, prof, profSort, pot, today, isNew, isBack, imgSrc, norm, keyOf, parseReview, suggestTags, reviewHTML, dealNote, toast };
})();
