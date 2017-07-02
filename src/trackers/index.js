// export { default as ColorTracker } from './ColorTracker';
// export { default as ObjectTracker } from './ObjectTracker';
// export { default as Tracker } from './Tracker';
// export { default as TrackerTask } from './TrackerTask';

const ColorTracker = require('./ColorTracker');
const ObjectTracker = require('./ObjectTracker');
const Tracker = require('./Tracker');
const TrackerTask = require('./TrackerTask');

const trackers = {
  ColorTracker,
  ObjectTracker,
  Tracker,
  TrackerTask
};

module.exports = trackers;

