const {spawn} = require('child_process');
const path = require('path');

const debug = require('../debug')(__filename);

module.exports = class GitClient {
  constructor({cwd}) {
    this._cwd = cwd;
  }

  async init(bare = false) {
    const repo = path.basename(this._cwd);
    const dir = path.dirname(this._cwd);
    const args = ['init', repo];
    if (bare) {
      args.push('--bare');
    }

    return await this._exec(dir, ...args);
  }

  async exec(...args) {
    return await this._exec(this._cwd, ...args);
  }

  async _exec(repoPath, ...args) {
    return new Promise((resolve, reject) => {
      debug('$ git %o', args);
      const proc = spawn('git', args, {cwd: repoPath});

      proc.stdout.on('data', onStdout);
      proc.stderr.on('data', onStderr);

      proc
        .once('close', onClose)
        .once('error', onError);

      function onClose(code, signal) {
        dereg();
        if (code === 0) {
          return resolve();
        }

        reject(new Error(`exited git with code: ${code}, signal: ${signal}.`));
      }

      function onError(err) {
        dereg();
        reject(err);
      }

      function onStdout(data) {
        debug('OUT: %s', data.toString());
      }

      function onStderr(data) {
        debug('ERR: %s', data.toString());
      }

      function dereg() {
        proc
          .off('close', onClose)
          .off('error', onError);

        proc.stdout.off('data', onStdout);
        proc.stderr.off('data', onStderr);
      }
    });
  }
};