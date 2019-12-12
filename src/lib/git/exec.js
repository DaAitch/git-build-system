const {spawn} = require('child_process');
const debug = require('../debug')(__filename);

module.exports = function exec(service, args) {

  if (debug.enabled) {
    debug('exec %s %s', service, args.map(x => `"${x}"`).join(' '));
  }

  const proc = spawn(service, args);

  if (debug.enabled) {
    proc.once('exit', (code, signal) => {
      if (code !== 0) {
        debug('exec exited with code: %d and signal: %s', code, signal);
      }
    });

    proc.once('error', err => {
      debug('exec error: %o', err);
    });
  }

  return proc;
};