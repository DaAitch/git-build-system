const stream = require('stream');
const events = require('events');
const parser = require('./parser');
const debug = require('../debug')(__filename);

module.exports = class ReceivePackEmitter extends stream.Writable {
  /**
   * 
   * @param {events.EventEmitter} ee 
   * @param {{logDirection: string}} param1 
   */
  constructor(ee, {logDirection}) {
    super({objectMode: true});

    this._ee = ee;
    this._logDirection = logDirection;
  }

  _debug(msg, ...args) {
    debug(`%s: ${msg}`, this._logDirection, ...args);
  }

  _write(object, encoding, callback) {
    switch (object.type) {
      case 'line': {
        let result;
        if (result = parser.readRefInfo(object.value)) {
          this._debug('ref-info: %o', result);
          this._ee.emit('ref-info', result);
          return;
        }

        if (result = parser.readUnknown(object.value)) {
          this._debug('unknown: %o', result);
          this._ee.emit('ref-info', result);
          return;
        }

        if (result = parser.readStream(object.value)) {
          this._debug('stream: %o', result);
          this._ee.emit('stream', result);
          return;
        }

        this._debug('could not understand line: %o', object);
        break;
      }

      case 'pack': {
        // https://git-scm.com/docs/pack-format
        this._debug('pack: %o', object);
        this._ee.emit('pack', object.value);
        break;
      }
      
      default: {
        this._debug('could not understand: %o', object);
      }
    }

    callback();
  }
}