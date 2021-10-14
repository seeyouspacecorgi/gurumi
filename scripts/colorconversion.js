export const hsv2hsl = (
  { h, s, v },
  _s = s / 100,
  _v = v / 100,
  l = _v - (_v * _s) / 2,
  m = Math.min(l, 1 - l)
) => ({
  h: h,
  s: m ? Math.round(((_v - l) / m) * 100) : 0,
  l: Math.round(l * 100)
});

export const hsl2hsv = (
  { h, s, l },
  _s = s / 100,
  _l = l / 100,
  v = _s * Math.min(_l, 1 - _l) + _l
) => ({
  h: h,
  s: v ? Math.round((2 - (2 * _l) / v) * 100) : 0,
  v: Math.round(v * 100)
});

export const hsv2rgb = (
  { h, s, v },
  _s = s / 100,
  _v = v / 100,
  f = (n, k = (n + h / 60) % 6) =>
    Math.round((_v - _v * _s * Math.max(Math.min(k, 4 - k, 1), 0)) * 255)
) => ({
  r: f(5),
  g: f(3),
  b: f(1)
});

export const rgb2hsv = (
  { r, g, b },
  _r = r / 255,
  _g = g / 255,
  _b = b / 255
) => {
  let v = Math.max(_r, _g, _b);
  let c = v - Math.min(_r, _g, _b);
  let h =
    c &&
    (v === _r
      ? (_g - _b) / c
      : v === _g
      ? 2 + (_b - _r) / c
      : 4 + (_r - _g) / c);
  return {
    h: Math.round(60 * (h < 0 ? h + 6 : h)),
    s: Math.round((v && c / v) * 100),
    v: Math.round(v * 100)
  };
};

const rgb2hex = (
  { r, g, b },
  f = (x, s = x.toString(16)) => (s.length === 1 ? "0" + s : s)
) => `#${f(r)}${f(g)}${f(b)}`;

const hex2rgb = (hex, i = parseInt(hex.toString().replace('#',''), 16)) => ({
  r: (i >> 16) & 255,
  g: (i >> 8) & 255,
  b: i & 255
});

export const hsv2hex = (hsv) => rgb2hex(hsv2rgb(hsv));
export const hex2hsv = (hex) => rgb2hsv(hex2rgb(hex));
