// export { default as ViolaJones } from './ViolaJones';

const ViolaJones = require('./ViolaJones');
const haar = require('./haar');

const training = {
  haar,
  ViolaJones
};

module.exports = training;
