const { Brief, Fast } = require('./features');
const { TrackingMath, Matrix } = require('./math');
const { ColorTracker, ObjectTracker, Tracker, TrackerTask } = require('./trackers');
const { haar, ViolaJones } = require('./training');
const { Canvas, DisjointSet, EventEmitter, Image, Scale } = require('./utils');

if (typeof window === 'undefined') { window = {}; }
if (typeof navigator === 'undefined') { navigator = {}; }

window.tracking = window.tracking || {};

let tracking = Object.assign(window.tracking, {
  Brief,
  Canvas,
  ColorTracker,
  DisjointSet,
  EventEmitter,
  Fast,
  haar,
  Image,
  Math: TrackingMath,
  Matrix,
  ObjectTracker,
  Scale,
  Tracker,
  TrackerTask,
  ViolaJones
});

/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * <pre>
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
   *   tracking.base(this, a, b);
   * }
 * tracking.inherits(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'c');
 * child.foo();
 * </pre>
 *
 * @param {Function} childCtor Child class.
 * @param {Function} parentCtor Parent class.
 */
tracking.inherits = function(childCtor, parentCtor) {
  function TempCtor() {
  }
  TempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new TempCtor();
  childCtor.prototype.constructor = childCtor;

  /**
   * Calls superclass constructor/method.
   *
   * This function is only available if you use tracking.inherits to express
   * inheritance relationships between classes.
   *
   * @param {!object} me Should always be "this".
   * @param {string} methodName The method name to call. Calling superclass
   *     constructor can be done with the special string 'constructor'.
   * @param {...*} var_args The arguments to pass to superclass
   *     method/constructor.
   * @return {*} The return value of the superclass method/constructor.
   */
  childCtor.base = function(me, methodName) {
    const args = Array.prototype.slice.call(arguments, 2);
    return parentCtor.prototype[methodName].apply(me, args);
  };
};

/**
 * Captures the user camera when tracking a video element and set its source
 * to the camera stream.
 * @param {HTMLVideoElement} element Canvas element to track.
 * @param {object} opt_options Optional configuration to the tracker.
 */
tracking.initUserMedia_ = function(element, opt_options) {
  window.navigator.getUserMedia({
      video: true,
      audio: !!(opt_options && opt_options.audio)
    }, function(stream) {
      try {
        element.src = window.URL.createObjectURL(stream);
      } catch (err) {
        element.src = stream;
      }
    }, function() {
      throw Error('Cannot capture user camera.');
    }
  );
};

/**
 * Tests whether the object is a dom node.
 * @param {object} o Object to be tested.
 * @return {boolean} True if the object is a dom node.
 */
tracking.isNode = function(o) {
  return o.nodeType || this.isWindow(o);
};

/**
 * Tests whether the object is the `window` object.
 * @param {object} o Object to be tested.
 * @return {boolean} True if the object is the `window` object.
 */
tracking.isWindow = function(o) {
  return !!(o && o.alert && o.document);
};

/**
 * Selects a dom node from a CSS3 selector using `document.querySelector`.
 * @param {string} selector
 * @param {object} opt_element The root element for the query. When not
 *     specified `document` is used as root element.
 * @return {HTMLElement} The first dom element that matches to the selector.
 *     If not found, returns `null`.
 */
tracking.one = function(selector, opt_element) {
  if (this.isNode(selector)) {
    return selector;
  }
  return (opt_element || document).querySelector(selector);
};

/**
 * Tracks a canvas, image or video element based on the specified `tracker`
 * instance. This method extract the pixel information of the input element
 * to pass to the `tracker` instance. When tracking a video, the
 * `tracker.track(pixels, width, height)` will be in a
 * `requestAnimationFrame` loop in order to track all video frames.
 *
 * Example:
 * var tracker = new tracking.ColorTracker();
 *
 * tracking.track('#video', tracker);
 * or
 * tracking.track('#video', tracker, { camera: true });
 *
 * tracker.on('track', function(event) {
   *   // console.log(event.data[0].x, event.data[0].y)
   * });
 *
 * @param {HTMLElement} element The element to track, canvas, image or
 *     video.
 * @param {tracking.Tracker} tracker The tracker instance used to track the
 *     element.
 * @param {object} opt_options Optional configuration to the tracker.
 */
tracking.track = function(element, tracker, opt_options) {
  element = tracking.one(element);
  if (!element) {
    throw new Error('Element not found, try a different element or selector.');
  }
  if (!tracker) {
    throw new Error('Tracker not specified, try `tracking.track(element, new tracking.FaceTracker())`.');
  }

  switch (element.nodeName.toLowerCase()) {
    case 'canvas':
      return this.trackCanvas_(element, tracker, opt_options);
    case 'img':
      return this.trackImg_(element, tracker, opt_options);
    case 'video':
      if (opt_options) {
        if (opt_options.camera) {
          this.initUserMedia_(element, opt_options);
        }
      }
      return this.trackVideo_(element, tracker, opt_options);
    default:
      throw new Error('Element not supported, try in a canvas, img, or video.');
  }
};

/**
 * Tracks a canvas element based on the specified `tracker` instance and
 * returns a `TrackerTask` for this track.
 * @param {HTMLCanvasElement} element Canvas element to track.
 * @param {tracking.Tracker} tracker The tracker instance used to track the
 *     element.
 * @param {object} opt_options Optional configuration to the tracker.
 * @return {tracking.TrackerTask}
 * @private
 */
tracking.trackCanvas_ = function(element, tracker) {
  const task = new tracking.TrackerTask(tracker);
  task.on('run', () => {
    this.trackCanvasInternal_(element, tracker);
  });
  return task.run();
};

/**
 * Tracks a canvas element based on the specified `tracker` instance. This
 * method extract the pixel information of the input element to pass to the
 * `tracker` instance.
 * @param {HTMLCanvasElement} element Canvas element to track.
 * @param {tracking.Tracker} tracker The tracker instance used to track the
 *     element.
 * @param {object} opt_options Optional configuration to the tracker.
 * @private
 */
tracking.trackCanvasInternal_ = function(element, tracker) {
  const width = element.width;
  const height = element.height;
  const context = element.getContext('2d');
  const imageData = context.getImageData(0, 0, width, height);
  tracker.track(imageData.data, width, height);
};

/**
 * Tracks a image element based on the specified `tracker` instance. This
 * method extract the pixel information of the input element to pass to the
 * `tracker` instance.
 * @param {HTMLImageElement} element Canvas element to track.
 * @param {tracking.Tracker} tracker The tracker instance used to track the
 *     element.
 * @param {object} opt_options Optional configuration to the tracker.
 * @private
 */
tracking.trackImg_ = function(element, tracker) {
  const width = element.width;
  const height = element.height;
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const task = new tracking.TrackerTask(tracker);
  task.on('run', function() {
    Canvas.loadImage(canvas, element.src, 0, 0, width, height, function() {
      tracking.trackCanvasInternal_(canvas, tracker);
    });
  });
  return task.run();
};

/**
 * Tracks a video element based on the specified `tracker` instance. This
 * method extract the pixel information of the input element to pass to the
 * `tracker` instance. The `tracker.track(pixels, width, height)` will be in
 * a `requestAnimationFrame` loop in order to track all video frames.
 * @param {HTMLVideoElement} element Canvas element to track.
 * @param {tracking.Tracker} tracker The tracker instance used to track the
 *     element.
 * @param {object} opt_options Optional configuration to the tracker.
 * @private
 */
tracking.trackVideo_ = function(element, tracker, opt_options) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let width;
  let height;
  const fps = opt_options.fps || 60;
  const interval = 1000 / fps;

  const resizeCanvas_ = function() {
    console.warn('resizeCanvas_');
    if (opt_options.scaled) {
      tracking.Scale.adjustScale(element.offsetWidth, element.offsetHeight);
    }
    canvas.width = width = element.offsetWidth;
    canvas.height = height = element.offsetHeight;
    // canvas.width = width;
    // canvas.height = height;
  };
  resizeCanvas_();
  element.addEventListener('resize', resizeCanvas_);

  let requestId;
  let now, then;
  const trackAnimationFrame_ = function() {
    if (element.readyState === element.HAVE_ENOUGH_DATA) {
      try {
        // Firefox v~30.0 gets confused with the video readyState firing an
        // erroneous HAVE_ENOUGH_DATA just before HAVE_CURRENT_DATA state,
        // hence keep trying to read it until resolved.
        context.drawImage(element, 0, 0, width, height);
      } catch (err) {}
      tracking.trackCanvasInternal_(canvas, tracker);
    }
  };
  const requestAnimationFrame_ = function() {
    requestId = window.requestAnimationFrame(function() {
      now = Date.now();
      const elapsed = now - then;
      if (elapsed > interval) {
        then = now - (elapsed % interval);
        trackAnimationFrame_();
      }
      requestAnimationFrame_();
    });
  };

  const task = new tracking.TrackerTask(tracker);
  task.on('stop', function() {
    window.cancelAnimationFrame(requestId);
  });
  task.on('run', function() {
    then = Date.now();
    requestAnimationFrame_();
  });
  return task.run();
};

// Browser polyfills
//===================

if (!window.URL) {
  window.URL = window.URL || window.webkitURL || window.msURL || window.oURL;
}

if (!navigator.getUserMedia) {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia;
}

//export default window.tracking;
module.exports = window.tracking;
