// import Tracker from './Tracker';
// import { ViolaJones } from '../training';
const Tracker = require('./Tracker');
const ViolaJones = require('../training').ViolaJones;

/**
 * ObjectTracker utility.
 * @constructor
 * @param {string|Array.<string|Array.<number>>} opt_classifiers Optional
 *     object classifiers to track.
 * @extends {Tracker}
 */
class ObjectTracker extends Tracker {
  constructor(opt_classifiers) {
    super(opt_classifiers);

    if (opt_classifiers) {
      if (!Array.isArray(opt_classifiers)) {
        opt_classifiers = [opt_classifiers];
      }

      if (Array.isArray(opt_classifiers)) {
        opt_classifiers.forEach(function(classifier, i) {
          if (typeof classifier === 'string') {
            opt_classifiers[i] = ViolaJones.classifiers[classifier];
          }
          if (!opt_classifiers[i]) {
            throw new Error('Object classifier not valid, try `new tracking.ObjectTracker("face")`.');
          }
        });
      }
    }

    this.setClassifiers(opt_classifiers);
  }
}

/**
 * Specifies the edges density of a block in order to decide whether to skip
 * it or not.
 * @default 0.2
 * @type {number}
 */
ObjectTracker.prototype.edgesDensity = 0.2;

/**
 * Specifies the initial scale to start the feature block scaling.
 * @default 1.0
 * @type {number}
 */
ObjectTracker.prototype.initialScale = 1.0;

/**
 * Specifies the scale factor to scale the feature block.
 * @default 1.25
 * @type {number}
 */
ObjectTracker.prototype.scaleFactor = 1.25;

/**
 * Specifies the block step size.
 * @default 1.5
 * @type {number}
 */
ObjectTracker.prototype.stepSize = 1.5;

/**
 * Gets the tracker HAAR classifiers.
 * @return {TypedArray.<number>}
 */
ObjectTracker.prototype.getClassifiers = function() {
  return this.classifiers;
};

/**
 * Gets the edges density value.
 * @return {number}
 */
ObjectTracker.prototype.getEdgesDensity = function() {
  return this.edgesDensity;
};

/**
 * Gets the initial scale to start the feature block scaling.
 * @return {number}
 */
ObjectTracker.prototype.getInitialScale = function() {
  return this.initialScale;
};

/**
 * Gets the scale factor to scale the feature block.
 * @return {number}
 */
ObjectTracker.prototype.getScaleFactor = function() {
  return this.scaleFactor;
};

/**
 * Gets the block step size.
 * @return {number}
 */
ObjectTracker.prototype.getStepSize = function() {
  return this.stepSize;
};

/**
 * Tracks the `Video` frames. This method is called for each video frame in
 * order to emit `track` event.
 * @param {Uint8ClampedArray} pixels The pixels data to track.
 * @param {number} width The pixels canvas width.
 * @param {number} height The pixels canvas height.
 */
ObjectTracker.prototype.track = function(pixels, width, height) {
  const classifiers = this.getClassifiers();

  if (!classifiers) {
    throw new Error('Object classifier not specified, try `new tracking.ObjectTracker("face")`.');
  }

  let results = [];

  for (const classifier of classifiers) {
    results = results.concat(
      ViolaJones.detect(
        pixels, width, height, this.getInitialScale(), this.getScaleFactor(),
        this.getStepSize(), this.getEdgesDensity(), classifier));
  }

  this.emit('track', {
    data: results
  });
};

/**
 * Sets the tracker HAAR classifiers.
 * @param {TypedArray.<number>} classifiers
 */
ObjectTracker.prototype.setClassifiers = function(classifiers) {
  this.classifiers = classifiers;
};

/**
 * Sets the edges density.
 * @param {number} edgesDensity
 */
ObjectTracker.prototype.setEdgesDensity = function(edgesDensity) {
  this.edgesDensity = edgesDensity;
};

/**
 * Sets the initial scale to start the block scaling.
 * @param {number} initialScale
 */
ObjectTracker.prototype.setInitialScale = function(initialScale) {
  this.initialScale = initialScale;
};

/**
 * Sets the scale factor to scale the feature block.
 * @param {number} scaleFactor
 */
ObjectTracker.prototype.setScaleFactor = function(scaleFactor) {
  this.scaleFactor = scaleFactor;
};

/**
 * Sets the block step size.
 * @param {number} stepSize
 */
ObjectTracker.prototype.setStepSize = function(stepSize) {
  this.stepSize = stepSize;
};

// export default ObjectTracker;
module.exports = ObjectTracker;
