/**
 * Scale utility to achieve auto scaling of canvas to improve performance.
 * @static
 * @constructor
 */
let Scale = {};

/**
 * Holds the scale of original size.
 * @type {number}
 * @default 1.0
 * @static
 */
Scale.scale = 1.0;

/**
 * Adjusts the scale of original size.
 * @param {number} width Original canvas's width.
 * @param {number} height Original canvas's height.
 * @static
 */
Scale.adjustScale = function (width, height) {
  const PIXEL_THRESHOLD = 50000;
  // this.scale =
  //   this.normalizeScale(1.0 / (Math.sqrt(width * height / PIXEL_THRESHOLD)));
  // console.warn('scale computed', this.scale);
  let ratio = 1 / (Math.sqrt(width * height / PIXEL_THRESHOLD));
  ratio = ratio > 1 ? 1 : ratio;
  this.scale = Math.round(ratio * 10) / 10;
  console.warn('scale computed', this.scale);
};

/**
 * Normalizes the raw scale to avoid rounding issues.
 * Note: take from http://jsfiddle.net/gamealchemist/r6aVp.
 * @param {number} s Raw scale.
 * @returns {number} Normalized scale.
 * @static
 */
Scale.normalizeScale = function (s) {
  if (s > 1) {
    throw('s must be <1');
  }
  s = 0 | (1 / s);
  let l = this.log2(s);
  let mask = 1 << l;
  let accuracy = 4;
  while (accuracy && l) {
    l--;
    mask |= 1 << l;
    accuracy--;
  }

  return 1 / ( s & mask );
};

/**
 * Finds the log base 2 of an N-bit integer.
 * Note: taken from http://graphics.stanford.edu/~seander/bithacks.html.
 * @param v N-bit number.
 * @returns {number} Log base 2 of the number.
 * @static
 */
Scale.log2 = function (v) {
  const b = [0x2, 0xC, 0xF0, 0xFF00, 0xFFFF0000];
  const S = [1, 2, 4, 8, 16];
  let i = 0, r = 0;

  for (i = 4; i >= 0; i--) {
    if (v & b[i]) {
      v >>= S[i];
      r |= S[i];
    }
  }
  return r;
};

module.exports = Scale;
