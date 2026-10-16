// Decodes a Dialed In set link (https://dahleapps.com/s/#1.<payload>) entirely in the browser:
// version prefix, base64url, raw DEFLATE, JSON. Nothing is sent anywhere. Also runs under Node
// for tests (it needs a global DecompressionStream, which Node 18+ has).
const MAX_PAYLOAD = 60000;        // characters of base64url
const MAX_INFLATED = 4000000;     // bytes of JSON
const KINDS = ["multipleChoice", "shortAnswer", "cloze", "numeric", "trueFalse", "flashcard", "term"];

function fromBase64url(s) {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error("corrupt");
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_INFLATED) { reader.cancel(); throw new Error("too large"); }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  return new TextDecoder().decode(all);
}

export async function decodeSet(linkOrFragment) {
  let s = String(linkOrFragment || "").trim();
  const hash = s.indexOf("#");
  if (hash >= 0) s = s.slice(hash + 1);
  const dot = s.indexOf(".");
  if (dot < 0) throw new Error("not a link");
  const version = s.slice(0, dot), body = s.slice(dot + 1);
  if (version !== "1") throw new Error("newer version");
  if (body.length > MAX_PAYLOAD) throw new Error("too large");
  const json = JSON.parse(await inflateRaw(fromBase64url(body)));
  if (typeof json.t !== "string" || !json.t.trim() || !Array.isArray(json.c) || json.c.length === 0 || json.c.length > 5000) {
    throw new Error("invalid");
  }
  return json;
}

/// The front and back a person sees, per card type.
export function sides(c) {
  if (!KINDS.includes(c.k)) return null;
  const ch = Array.isArray(c.ch) ? c.ch : [];
  switch (c.k) {
    case "multipleChoice":
      return { front: c.p, options: ch, back: (c.co || []).map(i => ch[i]).filter(Boolean).join("; ") };
    case "trueFalse":
      return { front: "True or false: " + c.p, back: c.tr === false ? "False" : "True" };
    case "cloze":
      return { front: c.p.replace(/____/g, "_____"), back: c.a || "" };
    default:
      return { front: c.p, back: c.a || "" };
  }
}
