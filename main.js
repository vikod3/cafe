const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const defs = document.getElementById('liquid-defs');
const mapCache = {};
let uid = 0;

function smoothstep(a, b, t) {
  t = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function sdRoundedRect(px, py, hw, hh, r) {
  const qx = Math.abs(px) - hw + r;
  const qy = Math.abs(py) - hh + r;
  return Math.min(Math.max(qx, qy), 0) +
         Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

function buildMap(w, h, radius) {
  const key = w + 'x' + h + 'r' + radius;
  if (mapCache[key]) return mapCache[key];

  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(canvas.width, canvas.height);
  const data = img.data;

  const hw = canvas.width / 2, hh = canvas.height / 2, r = radius * scale;
  const edgeBand = Math.min(16, Math.min(w, h) * 0.32) * scale;

  let i = 0;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const px = x - hw, py = y - hh;
      const d = sdRoundedRect(px, py, hw, hh, r);
      const t = smoothstep(-edgeBand, 0, d);
      const strength = t * t;
      const len = Math.hypot(px, py) || 1;
      data[i++] = 128 + (px / len) * strength * 127;
      data[i++] = 128 + (py / len) * strength * 127;
      data[i++] = 128;
      data[i++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  mapCache[key] = canvas.toDataURL();
  return mapCache[key];
}

function attachGlass(el) {
  const rect = el.getBoundingClientRect();
  const w = Math.round(rect.width), h = Math.round(rect.height);
  if (!w || !h) return;
  const cs = getComputedStyle(el);
  let radius = parseFloat(cs.borderTopLeftRadius) || 0;
  radius = Math.min(radius, Math.min(w, h) / 2);

  const id = 'lg-' + (uid++);
  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.setAttribute('id', id);
  filter.setAttribute('x', '-20%');
  filter.setAttribute('y', '-20%');
  filter.setAttribute('width', '140%');
  filter.setAttribute('height', '140%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  const feImage = document.createElementNS(SVG_NS, 'feImage');
  const url = buildMap(w, h, radius);
  feImage.setAttribute('href', url);
  feImage.setAttributeNS(XLINK_NS, 'href', url);
  feImage.setAttribute('x', '0');
  feImage.setAttribute('y', '0');
  feImage.setAttribute('width', w);
  feImage.setAttribute('height', h);
  feImage.setAttribute('preserveAspectRatio', 'none');
  feImage.setAttribute('result', 'map');

  const feDisp = document.createElementNS(SVG_NS, 'feDisplacementMap');
  feDisp.setAttribute('in', 'SourceGraphic');
  feDisp.setAttribute('in2', 'map');
  feDisp.setAttribute('scale', '26');
  feDisp.setAttribute('xChannelSelector', 'R');
  feDisp.setAttribute('yChannelSelector', 'G');

  filter.appendChild(feImage);
  filter.appendChild(feDisp);
  defs.appendChild(filter);

  const value = `url(#${id}) blur(0.3px) saturate(1.3)`;
  el.style.backdropFilter = value;
  el.style.webkitBackdropFilter = value;

  const applied = getComputedStyle(el).backdropFilter ||
                  getComputedStyle(el).webkitBackdropFilter || '';
  if (!applied.includes('url')) {
    el.style.backdropFilter = 'blur(6px) saturate(1.4) brightness(1.08)';
    el.style.webkitBackdropFilter = 'blur(6px) saturate(1.4) brightness(1.08)';
    el.style.background = 'rgba(255,255,255,0.10)';
  }
}

requestAnimationFrame(() => {
  document.querySelectorAll('[data-liquid]').forEach(attachGlass);
});
