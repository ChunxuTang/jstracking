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
  let ratio = 1 / (Math.sqrt(width * height / PIXEL_THRESHOLD));
  this.scale = this.normalizeScale(ratio);
};

/**
 * Normalizes the raw scale to avoid rounding issues.
 * @param {number} s Raw scale.
 * @returns {number} Normalized scale.
 * @static
 */
Scale.normalizeScale = function (s) {
  if (s >= 1) {
    return 1;
  }

  return Math.round(s * 10) / 10;
};

module.exports = Scale;
