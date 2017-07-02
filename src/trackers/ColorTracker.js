// import Tracker from './Tracker';
// import { TrackingMath } from '../math';
const Tracker = require('./Tracker');
const TrackingMath = require('../math').TrackingMath;

/**
 * ColorTracker utility to track colored blobs in a frame using color
 * difference evaluation.
 * @constructor
 * @param {string|Array.<string>} opt_colors Optional colors to track.
 * @extends {Tracker}
 */
class ColorTracker extends Tracker {
  constructor(opt_colors) {
    super(opt_colors);

    if (typeof opt_colors === 'string') {
      opt_colors = [opt_colors];
    }

    if (opt_colors) {
      opt_colors.forEach(function(color) {
        if (!ColorTracker.getColor(color)) {
          throw new Error('Color not valid, try `new tracking.ColorTracker("magenta")`.');
        }
      });
      this.setColors(opt_colors);
    }
  }
}

/**
 * Holds the known colors.
 * @type {Object.<string, function>}
 * @private
 * @static
 */
ColorTracker.knownColors_ = {};

/**
 * Caches coordinates values of the neighbours surrounding a pixel.
 * @type {Object.<number, Int32Array>}
 * @private
 * @static
 */
ColorTracker.neighbours_ = {};

/**
 * Registers a color as known color.
 * @param {string} name The color name.
 * @param {function} fn The color function to test if the passed (r,g,b) is
 *     the desired color.
 * @static
 */
ColorTracker.registerColor = function(name, fn) {
  ColorTracker.knownColors_[name] = fn;
};

/**
 * Gets the known color function that is able to test whether an (r,g,b) is
 * the desired color.
 * @param {string} name The color name.
 * @return {function} The known color test function.
 * @static
 */
ColorTracker.getColor = function(name) {
  return ColorTracker.knownColors_[name];
};

/**
 * Holds the colors to be tracked by the `ColorTracker` instance.
 * @default ['magenta']
 * @type {Array.<string>}
 */
ColorTracker.prototype.colors = ['magenta'];

/**
 * Holds the minimum dimension to classify a rectangle.
 * @default 20
 * @type {number}
 */
ColorTracker.prototype.minDimension = 20;

/**
 * Holds the maximum dimension to classify a rectangle.
 * @default Infinity
 * @type {number}
 */
ColorTracker.prototype.maxDimension = Infinity;


/**
 * Holds the minimum group size to be classified as a rectangle.
 * @default 30
 * @type {number}
 */
ColorTracker.prototype.minGroupSize = 30;

/**
 * Calculates the central coordinate from the cloud points. The cloud points
 * are all points that matches the desired color.
 * @param {Array.<number>} cloud Major row order array containing all the
 *     points from the desired color, e.g. [x1, y1, c2, y2, ...].
 * @param {number} total Total numbers of pixels of the desired color.
 * @return {object} Object containing the x, y and estimated z coordinate of
 *     the blog extracted from the cloud points.
 * @private
 */
ColorTracker.prototype.calculateDimensions_ = function(cloud, total) {
  let maxx = -1;
  let maxy = -1;
  let minx = Infinity;
  let miny = Infinity;

  for (let c = 0; c < total; c += 2) {
    let x = cloud[c];
    let y = cloud[c + 1];

    if (x < minx) {
      minx = x;
    }
    if (x > maxx) {
      maxx = x;
    }
    if (y < miny) {
      miny = y;
    }
    if (y > maxy) {
      maxy = y;
    }
  }

  return {
    width: maxx - minx,
    height: maxy - miny,
    x: minx,
    y: miny
  };
};

/**
 * Gets the colors being tracked by the `ColorTracker` instance.
 * @return {Array.<string>}
 */
ColorTracker.prototype.getColors = function() {
  return this.colors;
};

/**
 * Gets the minimum dimension to classify a rectangle.
 * @return {number}
 */
ColorTracker.prototype.getMinDimension = function() {
  return this.minDimension;
};

/**
 * Gets the maximum dimension to classify a rectangle.
 * @return {number}
 */
ColorTracker.prototype.getMaxDimension = function() {
  return this.maxDimension;
};

/**
 * Gets the minimum group size to be classified as a rectangle.
 * @return {number}
 */
ColorTracker.prototype.getMinGroupSize = function() {
  return this.minGroupSize;
};

/**
 * Gets the eight offset values of the neighbours surrounding a pixel.
 * @param {number} width The image width.
 * @return {array} Array with the eight offset values of the neighbours
 *     surrounding a pixel.
 * @private
 */
ColorTracker.prototype.getNeighboursForWidth_ = function(width) {
  if (ColorTracker.neighbours_[width]) {
    return ColorTracker.neighbours_[width];
  }

  let neighbours = new Int32Array(8);

  neighbours[0] = -width * 4;
  neighbours[1] = -width * 4 + 4;
  neighbours[2] = 4;
  neighbours[3] = width * 4 + 4;
  neighbours[4] = width * 4;
  neighbours[5] = width * 4 - 4;
  neighbours[6] = -4;
  neighbours[7] = -width * 4 - 4;

  ColorTracker.neighbours_[width] = neighbours;

  return neighbours;
};

/**
 * Unites groups whose bounding box intersect with each other.
 * @param {Array.<Object>} rects
 * @private
 */
ColorTracker.prototype.mergeRectangles_ = function(rects) {
  let intersects;
  let results = [];
  let minDimension = this.getMinDimension();
  let maxDimension = this.getMaxDimension();

  for (let r = 0; r < rects.length; r++) {
    let r1 = rects[r];
    intersects = true;
    for (let s = r + 1; s < rects.length; s++) {
      let r2 = rects[s];
      if (TrackingMath.intersectRect(r1.x, r1.y, r1.x + r1.width, r1.y + r1.height,
          r2.x, r2.y, r2.x + r2.width, r2.y + r2.height)) {
        intersects = false;
        let x1 = Math.min(r1.x, r2.x);
        let y1 = Math.min(r1.y, r2.y);
        let x2 = Math.max(r1.x + r1.width, r2.x + r2.width);
        let y2 = Math.max(r1.y + r1.height, r2.y + r2.height);
        r2.height = y2 - y1;
        r2.width = x2 - x1;
        r2.x = x1;
        r2.y = y1;
        break;
      }
    }

    if (intersects) {
      if (r1.width >= minDimension && r1.height >= minDimension) {
        if (r1.width <= maxDimension && r1.height <= maxDimension) {
          results.push(r1);
        }
      }
    }
  }

  return results;
};

/**
 * Sets the colors to be tracked by the `ColorTracker` instance.
 * @param {Array.<string>} colors
 */
ColorTracker.prototype.setColors = function(colors) {
  this.colors = colors;
};

/**
 * Sets the minimum dimension to classify a rectangle.
 * @param {number} minDimension
 */
ColorTracker.prototype.setMinDimension = function(minDimension) {
  this.minDimension = minDimension;
};

/**
 * Sets the maximum dimension to classify a rectangle.
 * @param {number} maxDimension
 */
ColorTracker.prototype.setMaxDimension = function(maxDimension) {
  this.maxDimension = maxDimension;
};

/**
 * Sets the minimum group size to be classified as a rectangle.
 * @param {number} minGroupSize
 */
ColorTracker.prototype.setMinGroupSize = function(minGroupSize) {
  this.minGroupSize = minGroupSize;
};

/**
 * Tracks the `Video` frames. This method is called for each video frame in
 * order to emit `track` event.
 * @param {Uint8ClampedArray} pixels The pixels data to track.
 * @param {number} width The pixels canvas width.
 * @param {number} height The pixels canvas height.
 */
ColorTracker.prototype.track = function (pixels, width, height) {
  const colors = this.getColors();

  if (!colors) {
    throw new Error('Colors not specified, try `new tracking.ColorTracker("magenta")`.');
  }

  let results = [];

  for (const color of colors) {
    results = results.concat(this.trackColor_(pixels, width, height, color));
  }

  this.emit('track', {
    data: results
  });
};

/**
 * Find the given color in the given matrix of pixels using Flood fill
 * algorithm to determines the area connected to a given node in a
 * multi-dimensional array.
 * @param {Uint8ClampedArray} pixels The pixels data to track.
 * @param {number} width The pixels canvas width.
 * @param {number} height The pixels canvas height.
 * @param {string} color The color to be found
 * @private
 */
ColorTracker.prototype.trackColor_ = function(pixels, width, height, color) {
  let colorFn = ColorTracker.knownColors_[color];
  let currGroup = new Int32Array(pixels.length >> 2);
  let currGroupSize;
  let currI;
  let currJ;
  let currW;
  let marked = new Int8Array(pixels.length);
  let minGroupSize = this.getMinGroupSize();
  let neighboursW = this.getNeighboursForWidth_(width);
  let queue = new Int32Array(pixels.length);
  let queuePosition;
  let results = [];
  let w = -4;

  if (!colorFn) {
    return results;
  }

  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      w += 4;

      if (marked[w]) {
        continue;
      }

      currGroupSize = 0;

      queuePosition = -1;
      queue[++queuePosition] = w;
      queue[++queuePosition] = i;
      queue[++queuePosition] = j;

      marked[w] = 1;

      while (queuePosition >= 0) {
        currJ = queue[queuePosition--];
        currI = queue[queuePosition--];
        currW = queue[queuePosition--];

        if (colorFn(pixels[currW], pixels[currW + 1], pixels[currW + 2], pixels[currW + 3], currW, currI, currJ)) {
          currGroup[currGroupSize++] = currJ;
          currGroup[currGroupSize++] = currI;

          for (let k = 0; k < neighboursW.length; k++) {
            let otherW = currW + neighboursW[k];
            let otherI = currI + neighboursI[k];
            let otherJ = currJ + neighboursJ[k];
            if (!marked[otherW] && otherI >= 0 && otherI < height && otherJ >= 0 && otherJ < width) {
              queue[++queuePosition] = otherW;
              queue[++queuePosition] = otherI;
              queue[++queuePosition] = otherJ;

              marked[otherW] = 1;
            }
          }
        }
      }

      if (currGroupSize >= minGroupSize) {
        let data = this.calculateDimensions_(currGroup, currGroupSize);
        if (data) {
          data.color = color;
          results.push(data);
        }
      }
    }
  }

  return this.mergeRectangles_(results);
};

// Default colors
//===================

ColorTracker.registerColor('cyan', function(r, g, b) {
  let thresholdGreen = 50,
    thresholdBlue = 70,
    dx = r - 0,
    dy = g - 255,
    dz = b - 255;

  if ((g - r) >= thresholdGreen && (b - r) >= thresholdBlue) {
    return true;
  }
  return dx * dx + dy * dy + dz * dz < 6400;
});

ColorTracker.registerColor('magenta', function(r, g, b) {
  let threshold = 50,
    dx = r - 255,
    dy = g - 0,
    dz = b - 255;

  if ((r - g) >= threshold && (b - g) >= threshold) {
    return true;
  }
  return dx * dx + dy * dy + dz * dz < 19600;
});

ColorTracker.registerColor('yellow', function(r, g, b) {
  let threshold = 50,
    dx = r - 255,
    dy = g - 255,
    dz = b - 0;

  if ((r - b) >= threshold && (g - b) >= threshold) {
    return true;
  }
  return dx * dx + dy * dy + dz * dz < 10000;
});

// Caching neighbour i/j offset values.
//=====================================
let neighboursI = new Int32Array([-1, -1, 0, 1, 1, 1, 0, -1]);
let neighboursJ = new Int32Array([0, 1, 1, 1, 0, -1, -1, -1]);

// export default ColorTracker;
module.exports = ColorTracker;
