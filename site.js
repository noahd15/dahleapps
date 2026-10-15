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
      <a class="brand" href="#top">Dahle Apps</a>
      <nav>
        ${APPS.map((a) => html`<a key=${a.id} href=${"#" + a.id}
          class=${active === a.id ? "on" : ""} style=${{ "--accent": a.accent }}>${a.name}</a>`)}
      </nav>
      <${ThemeButton} />
    </div>
  </div>`;
}

function Hero() {
  return html`<header class="wrap hero" id="top">
    <div class="icons">
      ${APPS.map((a, i) => html`<a key=${a.id} href=${"#" + a.id} style=${{ "--i": i }}>
        <img src=${"img/" + a.id + "-icon.png"} alt=${a.name} width="64" height="64" />
      </a>`)}
    </div>
    <h1>Dahle Apps</h1>
    <p class="lede">Puzzle games for iPhone and iPad, made by Noah Dahle.
      <strong> Each one has real mathematics underneath it</strong>, but you can play them all without knowing any.</p>
  </header>`;
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
      <p>${app.blurb}</p>
      <ul>${app.points.map((p) => html`<li key=${p}>${p}</li>`)}</ul>
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
  return html`<${React.Fragment}>
    <${TopBar} />
    <${Hero} />
    <main class="wrap">
      ${APPS.map((a, k) => html`<${AppCard} key=${a.id} app=${a} flip=${k % 2 === 1} />`)}
    </main>
    <footer class="wrap">
      <div class="row">
        <span>No ads and no subscriptions.</span>
        <a href=${"mailto:" + MAIL}>${MAIL}</a>
      </div>
    </footer>
  </${React.Fragment}>`;
}

ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} />`);
