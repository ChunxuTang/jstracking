// export { default as Canvas } from './Canvas';
// export { default as DisjointSet } from './DisjointSet';
// export { default as EventEmitter } from './EventEmitter';
// export { default as Image } from './Image';

const Canvas = require('./Canvas');
const DisjointSet = require('./DisjointSet');
const EventEmitter = require('./EventEmitter');
const Image = require('./Image');

const utils = {
  Canvas,
  DisjointSet,
  EventEmitter,
  Image
};

module.exports = utils;
