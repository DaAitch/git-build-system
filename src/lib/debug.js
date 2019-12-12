const debug = require('debug');
const path = require('path');

const rootPathAbs = path.normalize(`${__dirname}/..`);

module.exports = function createDebug(filename) {
  const rel = path.relative(rootPathAbs, filename);
  return debug(`git-build-system:${rel}`);
};