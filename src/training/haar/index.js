// export { default as eye } from './eye';
// export { default as face } from './face';
// export { default as mouth } from './mouth';

const eye = require('./eye');
const face = require('./face');
const mouth = require('./mouth');

const haar = {
  eye,
  face,
  mouth
};

module.exports = haar;
