// import { EventEmitter } from '../utils';
const EventEmitter = require('../utils').EventEmitter;

class Tracker extends EventEmitter {
  track() {}
}

// export default Tracker;
module.exports = Tracker;
