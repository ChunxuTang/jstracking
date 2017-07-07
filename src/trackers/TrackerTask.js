const EventEmitter = require('../utils').EventEmitter;

class TrackerTask extends EventEmitter {
  constructor(tracker) {
    super(tracker);

    if (!tracker) {
      throw new Error('Tracker instance not specified.');
    }

    this.setTracker(tracker);
  }
}

/**
 * Holds the tracker instance managed by this task.
 * @type {tracking.Tracker}
 * @private
 */
TrackerTask.prototype.tracker_ = null;

/**
 * Holds if the tracker task is in running.
 * @type {boolean}
 * @private
 */
TrackerTask.prototype.running_ = false;

/**
 * Gets the tracker instance managed by this task.
 * @return {tracking.Tracker}
 */
TrackerTask.prototype.getTracker = function() {
  return this.tracker_;
};

/**
 * Returns true if the tracker task is in running, false otherwise.
 * @return {boolean}
 * @private
 */
TrackerTask.prototype.inRunning = function() {
  return this.running_;
};

/**
 * Sets if the tracker task is in running.
 * @param {boolean} running
 * @private
 */
TrackerTask.prototype.setRunning = function(running) {
  this.running_ = running;
};

/**
 * Sets the tracker instance managed by this task.
 * @return {tracking.Tracker}
 */
TrackerTask.prototype.setTracker = function(tracker) {
  this.tracker_ = tracker;
};

/**
 * Emits a `run` event on the tracker task for the implementers to run any
 * child action, e.g. `requestAnimationFrame`.
 * @return {object} Returns itself, so calls can be chained.
 */
TrackerTask.prototype.run = function() {
  if (this.inRunning()) {
    return;
  }

  this.setRunning(true);
  this.reemitTrackEvent_ = (event) => {
    this.emit('track', event);
  };
  this.tracker_.on('track', this.reemitTrackEvent_);
  this.emit('run');
  return this;
};

/**
 * Emits a `stop` event on the tracker task for the implementers to stop any
 * child action being done, e.g. `requestAnimationFrame`.
 * @return {object} Returns itself, so calls can be chained.
 */
TrackerTask.prototype.stop = function() {
  if (!this.inRunning()) {
    return;
  }

  this.setRunning(false);
  this.emit('stop');
  this.tracker_.removeListener('track', this.reemitTrackEvent_);
  return this;
};

module.exports = TrackerTask;
