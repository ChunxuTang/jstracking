const TrackingMath = require('../math').TrackingMath;
const DisjointSet = require('../utils').DisjointSet;
const Image = require('../utils').Image;
const Scale = require('../utils').Scale;
const { eye, face, mouth } = require('./haar');

/**
 * ViolaJones utility.
 * @static
 * @constructor
 */
let ViolaJones = {};

/**
 * Holds the minimum area of intersection that defines when a rectangle is
 * from the same group. Often when a face is matched multiple rectangles are
 * classified as possible rectangles to represent the face, when they
 * intersects they are grouped as one face.
 * @type {number}
 * @default 0.5
 * @static
 */
ViolaJones.REGIONS_OVERLAP = 0.5;

/**
 * Holds the HAAR cascade classifiers converted from OpenCV training.
 * @type {array}
 * @static
 */
ViolaJones.classifiers = {
  eye,
  face,
  mouth
};

/**
 * Detects through the HAAR cascade data rectangles matches.
 * @param {Array} pixels The pixels in a linear [r,g,b,a,...] array.
 * @param {number} width The image width.
 * @param {number} height The image height.
 * @param {number} initialScale The initial scale to start the block
 *     scaling.
 * @param {number} scaleFactor The scale factor to scale the feature block.
 * @param {number} stepSize The block step size.
 * @param {number} edgesDensity Percentage density edges inside the
 *     classifier block. Value from [0.0, 1.0], defaults to 0.2. If specified
 *     edge detection will be applied to the image to prune dead areas of the
 *     image, this can improve significantly performance.
 * @param {number} data The HAAR cascade data.
 * @return {array} Found rectangles.
 * @static
 */
ViolaJones.detect = function (pixels, width, height, initialScale, scaleFactor, stepSize, edgesDensity, data) {
  let total = 0;
  let rects = [];
  let integralImage = new Int32Array(width * height);
  let integralImageSquare = new Int32Array(width * height);
  let tiltedIntegralImage = new Int32Array(width * height);

  let integralImageSobel;
  if (edgesDensity > 0) {
    integralImageSobel = new Int32Array(width * height);
  }

  Image.computeIntegralImage(pixels, width, height, integralImage,
    integralImageSquare, tiltedIntegralImage, integralImageSobel);

  let minWidth = data[0];
  let minHeight = data[1];
  let scale = initialScale * scaleFactor;
  let blockWidth = (scale * minWidth) | 0;
  let blockHeight = (scale * minHeight) | 0;

  while (blockWidth < width && blockHeight < height) {
    let step = (scale * stepSize + 0.5) | 0;
    for (let i = 0; i < (height - blockHeight); i += step) {
      for (let j = 0; j < (width - blockWidth); j += step) {
        if (edgesDensity > 0) {
          if (this.isTriviallyExcluded(edgesDensity, integralImageSobel, i, j, width, blockWidth, blockHeight)) {
            continue;
          }
        }

        if (this.evalStages_(data, integralImage, integralImageSquare, tiltedIntegralImage,
            i, j, width, blockWidth, blockHeight, scale)) {
          rects[total++] = {
            width: blockWidth,
            height: blockHeight,
            x: j,
            y: i
          };
        }
      }
    }

    scale *= scaleFactor;
    blockWidth = (scale * minWidth) | 0;
    blockHeight = (scale * minHeight) | 0;
  }

  return this.mergeRectangles_(rects);
};

/**
 * Fast check to test whether the edges density inside the block is greater
 * than a threshold, if true it tests the stages. This can improve
 * significantly performance.
 * @param {number} edgesDensity Percentage density edges inside the
 *     classifier block.
 * @param {array} integralImageSobel The integral image of a sobel image.
 * @param {number} i Vertical position of the pixel to be evaluated.
 * @param {number} j Horizontal position of the pixel to be evaluated.
 * @param {number} width The image width.
 * @return {boolean} True whether the block at position i,j can be skipped,
 *     false otherwise.
 * @static
 * @protected
 */
ViolaJones.isTriviallyExcluded = function (edgesDensity, integralImageSobel, i, j, width, blockWidth, blockHeight) {
  let wbA = i * width + j;
  let wbB = wbA + blockWidth;
  let wbD = wbA + blockHeight * width;
  let wbC = wbD + blockWidth;
  let blockEdgesDensity = (integralImageSobel[wbA] - integralImageSobel[wbB] -
    integralImageSobel[wbD] + integralImageSobel[wbC]) / (blockWidth * blockHeight * 255);

  return blockEdgesDensity < edgesDensity;
};

/**
 * Evaluates if the block size on i,j position is a valid HAAR cascade
 * stage.
 * @param {number} data The HAAR cascade data.
 * @param {number} i Vertical position of the pixel to be evaluated.
 * @param {number} j Horizontal position of the pixel to be evaluated.
 * @param {number} width The image width.
 * @param {number} blockSize The block size.
 * @param {number} scale The scale factor of the block size and its original
 *     size.
 * @param {number} inverseArea The inverse area of the block size.
 * @return {boolean} Whether the region passes all the stage tests.
 * @private
 * @static
 */
ViolaJones.evalStages_ = function (data, integralImage, integralImageSquare, tiltedIntegralImage,
                                   i, j, width, blockWidth, blockHeight, scale) {
  let inverseArea = 1.0 / (blockWidth * blockHeight);
  let wbA = i * width + j;
  let wbB = wbA + blockWidth;
  let wbD = wbA + blockHeight * width;
  let wbC = wbD + blockWidth;
  let mean = (integralImage[wbA] - integralImage[wbB] - integralImage[wbD] + integralImage[wbC]) * inverseArea;
  let variance = (integralImageSquare[wbA] - integralImageSquare[wbB] - integralImageSquare[wbD] +
    integralImageSquare[wbC]) * inverseArea - mean * mean;

  let standardDeviation = 1;
  if (variance > 0) {
    standardDeviation = Math.sqrt(variance);
  }

  let length = data.length;

  for (let w = 2; w < length;) {
    let stageSum = 0;
    let stageThreshold = data[w++];
    let nodeLength = data[w++];

    while (nodeLength--) {
      let rectsSum = 0;
      let tilted = data[w++];
      let rectsLength = data[w++];

      for (let r = 0; r < rectsLength; r++) {
        let rectLeft = (j + data[w++] * scale + 0.5) | 0;
        let rectTop = (i + data[w++] * scale + 0.5) | 0;
        let rectWidth = (data[w++] * scale + 0.5) | 0;
        let rectHeight = (data[w++] * scale + 0.5) | 0;
        let rectWeight = data[w++];

        let w1;
        let w2;
        let w3;
        let w4;
        if (tilted) {
          // RectSum(r) = RSAT(x-h+w, y+w+h-1) + RSAT(x, y-1) - RSAT(x-h, y+h-1) - RSAT(x+w, y+w-1)
          w1 = (rectLeft - rectHeight + rectWidth) + (rectTop + rectWidth + rectHeight - 1) * width;
          w2 = rectLeft + (rectTop - 1) * width;
          w3 = (rectLeft - rectHeight) + (rectTop + rectHeight - 1) * width;
          w4 = (rectLeft + rectWidth) + (rectTop + rectWidth - 1) * width;
          rectsSum += (tiltedIntegralImage[w1] + tiltedIntegralImage[w2] - tiltedIntegralImage[w3] -
            tiltedIntegralImage[w4]) * rectWeight;
        } else {
          // RectSum(r) = SAT(x-1, y-1) + SAT(x+w-1, y+h-1) - SAT(x-1, y+h-1) - SAT(x+w-1, y-1)
          w1 = rectTop * width + rectLeft;
          w2 = w1 + rectWidth;
          w3 = w1 + rectHeight * width;
          w4 = w3 + rectWidth;
          rectsSum += (integralImage[w1] - integralImage[w2] - integralImage[w3] + integralImage[w4]) * rectWeight;
          // TODO: Review the code below to analyze performance when using it instead.
          // w1 = (rectLeft - 1) + (rectTop - 1) * width;
          // w2 = (rectLeft + rectWidth - 1) + (rectTop + rectHeight - 1) * width;
          // w3 = (rectLeft - 1) + (rectTop + rectHeight - 1) * width;
          // w4 = (rectLeft + rectWidth - 1) + (rectTop - 1) * width;
          // rectsSum += (integralImage[w1] + integralImage[w2] - integralImage[w3] - integralImage[w4]) * rectWeight;
        }
      }

      let nodeThreshold = data[w++];
      let nodeLeft = data[w++];
      let nodeRight = data[w++];

      if (rectsSum * inverseArea < nodeThreshold * standardDeviation) {
        stageSum += nodeLeft;
      } else {
        stageSum += nodeRight;
      }
    }

    if (stageSum < stageThreshold) {
      return false;
    }
  }
  return true;
};

/**
 * Postprocess the detected sub-windows in order to combine overlapping
 * detections into a single detection.
 * @param {array} rects
 * @return {array}
 * @private
 * @static
 */
ViolaJones.mergeRectangles_ = function (rects) {
  let disjointSet = new DisjointSet(rects.length);

  for (let i = 0; i < rects.length; i++) {
    let r1 = rects[i];
    for (let j = 0; j < rects.length; j++) {
      let r2 = rects[j];
      if (TrackingMath.intersectRect(r1.x, r1.y, r1.x + r1.width, r1.y + r1.height,
          r2.x, r2.y, r2.x + r2.width, r2.y + r2.height)) {
        let x1 = Math.max(r1.x, r2.x);
        let y1 = Math.max(r1.y, r2.y);
        let x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
        let y2 = Math.min(r1.y + r1.height, r2.y + r2.height);
        let overlap = (x1 - x2) * (y1 - y2);
        let area1 = (r1.width * r1.height);
        let area2 = (r2.width * r2.height);

        if ((overlap / (area1 * (area1 / area2)) >= this.REGIONS_OVERLAP) &&
          (overlap / (area2 * (area1 / area2)) >= this.REGIONS_OVERLAP)) {
          disjointSet.union(i, j);
        }
      }
    }
  }

  let map = {};
  for (let k = 0; k < disjointSet.length; k++) {
    let rep = disjointSet.find(k);
    if (!map[rep]) {
      map[rep] = {
        total: 1,
        width: rects[k].width,
        height: rects[k].height,
        x: rects[k].x,
        y: rects[k].y
      };
      continue;
    }
    map[rep].total++;
    map[rep].width += rects[k].width;
    map[rep].height += rects[k].height;
    map[rep].x += rects[k].x;
    map[rep].y += rects[k].y;
  }

  let result = [];
  const scale = Scale.scale;
  Object.keys(map).forEach(function (key) {
    let rect = map[key];
    result.push({
      total: rect.total,
      width: ((rect.width / rect.total + 0.5) / scale) | 0,
      height: ((rect.height / rect.total + 0.5) / scale) | 0,
      x: ((rect.x / rect.total + 0.5) / scale) | 0,
      y: ((rect.y / rect.total + 0.5) / scale) | 0
    });
  });

  return result;
};

module.exports = ViolaJones;
