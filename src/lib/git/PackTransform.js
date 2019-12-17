const stream = require('stream');
const debug = require('../debug')(__filename);

const MODE_READSIZE = 1;
const MODE_READLINE = 2;
const MODE_READPACK = 3;
const MODE_END = 4;

const VALID_SIZE = /^[0-9a-f]{4}$/i;

module.exports = class PackTransform extends stream.Transform {

  /**
   * @param {{logDirection: string}} param0 
   */
  constructor({logDirection = 'unknown'} = {}) {
    super({readableObjectMode: true, writableObjectMode: false});

    this._logDirection = logDirection;
    this._data = Buffer.alloc(0);
    this._mode = MODE_READSIZE;
  }

  _debug(msg, ...args) {
    debug(`%s: ${msg}`, this._logDirection, ...args);
  }

  _transform(chunk, encoding, callback) {
    this._data = Buffer.concat([this._data, chunk]);

    if (this._mode === MODE_READSIZE) {
      this._readSize(callback);
    } else if (this._mode === MODE_READLINE) {
      this._readLine(callback);
    } else if (this._mode === MODE_READPACK) {
      this._readPack(callback);
    }
  }

  _readSize(callback) {
    if (this._data.length < 4) {
      callback();
      return;
    }

    const stringSize = this._data.toString('ascii', 0, 4);
    this._data = this._data.slice(4);

    if (stringSize === '0000') {
      this._mode = MODE_READPACK;
      this._debug('%s: pushing pack', this._logDirection);
      this._readPack(callback);
    } else {
      this._mode = MODE_READLINE;
      if (!VALID_SIZE.test(stringSize)) {
        return callback(new TypeError(`unexpected size format: "${stringSize}".`));
      }

      this._bytesToRead = Number.parseInt(stringSize, 16) - 4;
      this._debug('%s: pushing line', this._logDirection);
      this._readLine(callback);
    }
  }

  _readLine(callback) {

    if (this._data.length < this._bytesToRead) {
      return callback();
    }

    const lineData = this._data.slice(0, this._bytesToRead);
    const lineString = lineData.toString();
    const value = lineString.trim();

    this.push({type: 'line', value});
    this._data = this._data.slice(this._bytesToRead);
    this._bytesToRead = null;
    this._mode = MODE_READSIZE;
    return this._readSize(callback);
  }

  _readPack(callback) {
    if (this._data.length === 0) {
      return callback();
    }

    this.push({type: 'pack', value: this._data});
    this._data = Buffer.alloc(0);
    return callback();
  }

  _flush(callback) {
    this._debug('flush');

    this._mode = MODE_END;
    return callback();
  }
}
