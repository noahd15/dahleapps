const { useState, useEffect, useRef } = React;
const html = htm.bind(React.createElement);
const APPS = window.APPS;
const MAIL = "dahle.apps@gmail.com";

function save(key, value) {
  try { value ? localStorage.setItem(key, value) : localStorage.removeItem(key); } catch (e) {}
}

// System, light, dark: the button cycles through them.
function ThemeButton() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || "");
  const next = { "": "light", light: "dark", dark: "" };
  const label = { "": "Auto", light: "Light", dark: "Dark" };
  function cycle() {
    const t = next[theme];
    if (t) document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    save("theme", t);
    setTheme(t);
  }
  return html`<button class="theme" onClick=${cycle} aria-label=${"Theme: " + label[theme]}>
    <span class=${"dot " + (theme || "auto")}></span><span class="label">${label[theme]}</span>
  </button>`;
}

// Which app section is on screen, for the top bar.
function useActive(ids) {
  const [active, setActive] = useState("");
  useEffect(() => {
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.intersectionRatio));
      let best = "", ratio = 0.15;
      seen.forEach((r, id) => { if (r > ratio) { best = id; ratio = r; } });
      setActive(best);
    }, { threshold: [0, 0.15, 0.3, 0.5, 0.7, 1] });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return active;
}

function TopBar() {
  const active = useActive(APPS.map((a) => a.id));
  return html`<div class="bar">
    <div class="wrap bar-in">
      <a class="brand" href="#top"><img src="img/logo.svg" alt="" width="28" height="28" />Dahle Apps</a>
      <nav>
        ${APPS.map((a) => html`<a key=${a.id} href=${"#" + a.id}
          class=${active === a.id ? "on" : ""} style=${{ "--accent": a.accent }}>${a.name}</a>`)}
      </nav>
      <${ThemeButton} />
    </div>
  </div>`;
}

// Drifting nodes; nearby ones are joined by edges, and the pointer joins in.
function Network() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas.getContext("2d");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const accents = APPS.map((a) => a.accent);
    let w = 0, h = 0, nodes = [], frame = 0, pointer = null;
    const reach = 150;
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(110, Math.max(28, (w * h) / 15000)));
      nodes = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
        r: 1.6 + Math.random() * 1.8,
        c: i % 7 === 0 ? accents[(i / 7) % accents.length | 0] : null,
      }));
    }
    function draw() {
      const css = getComputedStyle(document.documentElement);
      const ink = css.getPropertyValue("--net").trim(), alpha = parseFloat(css.getPropertyValue("--net-a"));
      ctx.clearRect(0, 0, w, h);
      for (const p of nodes) {
        if (!still) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20; if (p.y > h + 20) p.y = -20;
        }
      }
      const all = pointer ? nodes.concat([{ x: pointer.x, y: pointer.y, r: 0 }]) : nodes;
      ctx.lineWidth = 1;
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i], b = all[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < reach) {
            ctx.strokeStyle = `rgba(${ink}, ${alpha * (1 - d / reach)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of nodes) {
        ctx.fillStyle = p.c || `rgba(${ink}, ${alpha * 2.2})`;
        ctx.globalAlpha = p.c ? .7 : 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.c ? p.r + 1.2 : p.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (!still && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function restart() { cancelAnimationFrame(frame); draw(); }
    const move = (e) => { pointer = { x: e.clientX, y: e.clientY }; if (still) draw(); };
    const leave = () => { pointer = null; };
    size(); draw();
    window.addEventListener("resize", () => { size(); restart(); });
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", restart);
    const mo = new MutationObserver(restart);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { cancelAnimationFrame(frame); mo.disconnect(); };
  }, []);
  return html`<canvas class="net" ref=${ref} aria-hidden="true"></canvas>`;
}

function Hero() {
  return html`<header class="wrap hero" id="top">
    <div class="icons">
      ${APPS.map((a, i) => html`<a key=${a.id} href=${"#" + a.id} style=${{ "--i": i }}>
        <img src=${"img/" + a.id + "-icon.png"} alt=${a.name} width="64" height="64" />
      </a>`)}
    </div>
    <h1>Dahle Apps</h1>
    <p class="lede">Puzzle apps, courses and a study tool for iPhone and iPad, made by Noah Dahle.
      <strong> The games are built on real math problems</strong>, but you don't need to know any math to play them.</p>
  </header>`;
}

function Intro() {
  return html`<section class="wrap intro" aria-label="About these games">
    <div>
      <h3>About these apps</h3>
      <p class="pull">Small apps for iPhone and iPad: a few puzzle games, a course, and a study tool.</p>
      <p>Bay 4 and Sulks are puzzle games. Each one is built on a real math problem, but you don't need to know any math to play. If you get curious, the game explains what's going on. Find a Set! puts the card game SET on your phone.</p>
      <p>Tape is a course in the theory of computation. Instead of textbook exercises, every lesson has puzzles.</p>
      <p>Dialed In is for studying. One AI turns your notes into flashcards, a second AI checks them, and it schedules your reviews so you're ready on exam day.</p>
      <p>No ads, no subscriptions and nothing to sign up for. iPhone and iPad only for now.</p>
    </div>
    <ul class="problems">
      ${APPS.map((a) => html`<li key=${a.id}><a href=${"#" + a.id} style=${{ "--accent": a.accent }}>
        <img src=${"img/" + a.id + "-icon.png"} alt="" />
        <div><b>${a.name}</b><span class="u">${a.under}</span><span>${a.question}</span></div>
      </a></li>`)}
    </ul>
  </section>`;
}

// When each app is planned to reach the App Store, in order.
function Schedule() {
  const planned = APPS.filter((a) => a.release).sort((a, b) => a.releaseOrder - b.releaseOrder);
  if (!planned.length) return null;
  return html`<section class="wrap schedule" id="schedule" aria-label="Release schedule">
    <h3>Release schedule</h3>
    <p class="note">Planned App Store dates. Until then, every app is open to try on TestFlight.</p>
    <ol>
      ${planned.map((a) => html`<li key=${a.id} style=${{ "--accent": a.accent }}>
        <a href=${"#" + a.id}>
          <img src=${"img/" + a.id + "-icon.png"} alt="" width="44" height="44" />
          <div><b>${a.name}</b><span>${a.release}</span></div>
        </a>
      </li>`)}
    </ol>
  </section>`;
}

function Gallery({ app }) {
  const [i, setI] = useState(0);
  const touch = useRef(null);
  const n = app.shots.length;
  // Fetch the rest once the first is showing, so flipping is instant.
  useEffect(() => { app.shots.slice(1).forEach(([src]) => { new Image().src = "img/" + src; }); }, []);
  const go = (d) => setI((k) => (k + d + n) % n);
  function onKey(e) {
    if (e.key === "ArrowRight") { go(1); e.preventDefault(); }
    if (e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
  }
  function onTouchEnd(e) {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touch.current = null;
  }
  return html`<figure class="gallery" tabIndex="0" onKeyDown=${onKey}
      aria-label=${app.name + " screenshots"}>
    <div class="phone"
        onTouchStart=${(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd=${onTouchEnd}>
      <img key=${app.shots[i][0]} src=${"img/" + app.shots[i][0]} alt=${app.shots[i][1]} />
      <button class="nav prev" onClick=${() => go(-1)} aria-label="Previous screenshot">‹</button>
      <button class="nav next" onClick=${() => go(1)} aria-label="Next screenshot">›</button>
    </div>
    <figcaption>
      <span>${app.shots[i][1]}</span>
      <span class="dots">
        ${app.shots.map((s, k) => html`<button key=${k} class=${k === i ? "on" : ""}
          onClick=${() => setI(k)} aria-label=${"Screenshot " + (k + 1)}></button>`)}
      </span>
    </figcaption>
  </figure>`;
}

function AppCard({ app, flip }) {
  return html`<section class=${"app" + (flip ? " flip" : "")} id=${app.id} style=${{ "--accent": app.accent }}>
    <div class="text">
      <div class="top">
        <img src=${"img/" + app.id + "-icon.png"} alt="" width="72" height="72" />
        <div><h2>${app.name}</h2><p class="tag">${app.tag}</p></div>
      </div>
      <span class="under">${app.tool ? app.under : (app.course ? "Covers" : "Underneath") + ": " + app.under}</span>
      ${app.release && html`<span class="when">On the App Store: ${app.release.replace(/ 20\d\d$/, "")}</span>`}
      <p>${app.blurb}</p>
      <ul>${app.points.map((p) => html`<li key=${p}>${p}</li>`)}</ul>
      ${app.credit && html`<p class="credit">${app.credit}</p>`}
      <div class="meta">
        ${app.testflight && html`<a class="btn" href=${app.testflight} target="_blank" rel="noopener">Join the TestFlight beta</a>`}
        ${app.support && html`<a class="note" href=${app.support} target="_blank" rel="noopener">Support and privacy</a>`}
        ${app.invite && html`<span class="note">In TestFlight, invite only for now.
          <a href=${"mailto:" + MAIL + "?subject=" + encodeURIComponent(app.invite + " beta")}> Ask to join</a></span>`}
      </div>
    </div>
    <${Gallery} app=${app} />
  </section>`;
}

function App() {
  // The page is drawn after load, so the browser can't find #bay4 and friends itself.
  useEffect(() => {
    const el = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) el.scrollIntoView();
  }, []);
  return html`<${React.Fragment}>
    <${Network} />
    <${TopBar} />
    <${Hero} />
    <${Intro} />
    <${Schedule} />
    <main class="wrap">
      ${APPS.map((a, k) => html`<${AppCard} key=${a.id} app=${a} flip=${k % 2 === 1} />`)}
    </main>
    <footer class="wrap">
      <div class="row">
        <span>iPhone and iPad only for now. No ads and no subscriptions.</span>
        <a href=${"mailto:" + MAIL}>${MAIL}</a>
      </div>
    </footer>
  </${React.Fragment}>`;
}

ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} />`);
