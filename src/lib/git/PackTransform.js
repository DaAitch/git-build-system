const stream = require('stream');
const debug = require('../debug')(__filename);

module.exports = class PackTransform extends stream.Transform {

  /**
   * @param {{logDirection: string}} param0 
   */
  constructor({logDirection = 'unknown'} = {}) {
    super({readableObjectMode: true, writableObjectMode: false});

    this._logDirection = logDirection;
    this._data = Buffer.from('');
    this._readSize = undefined;

    this._emptyStream = true;
  }

  _debug(msg, ...args) {
    debug(`%s: ${msg}`, this._logDirection, ...args);
  }

  _pushLine(line) {
    this._debug('%s: pushing line: %s', this._logDirection, line);
    this.push({type: 'line', value: line});
  }

  _pushPackChunk(packChunk) {
    this._debug('%s: pushing pack: %s', this._logDirection, packChunk);
    this.push({type: 'pack', value: packChunk});
  }

  _tick() {
    while (1) {
      if (this._readSize === undefined) {
        if (this._data.length >= 4) {
          const n = this._data.toString('ascii', 0, 4);
          this._readSize = Number.parseInt(n, 16);

          if (this._readSize === 0) {
            // git packs ended, remove 0000
            this._data = this._data.slice(4);
            
            // everything after 0000 pushed
            if (this._data.length > 0) {
              this._pushPackChunk(this._data);
              this._data = Buffer.from('');
            }

            return;

          } else if (this._readSize <= 4) {
            return new Error(`read size ${this._readSize} is lower than or equal 4 not allowed`);
          }

        } else {
          // data too small
          return;
        }
      }

      if (this._data.length < this._readSize) {
        return;
      }

      const string = this._data.toString('utf8', 4, this._readSize);
      this._pushLine(string.trim()); // trimmed
      this._data = this._data.slice(this._readSize);
      this._readSize = undefined;
    }
  }

  _transform(chunk, encoding, callback) {
    this._emptyStream = false;
    
    // reading pack chunks
    if (this._readSize !== 0) {
      this._data = Buffer.concat([this._data, chunk]);
      const err = this._tick();
      callback(err);
      return;
    }

    // reading pack payload
    this._pushPackChunk(chunk);
  }

  _flush(callback) {

    if (!this._emptyStream && this._readSize !== 0) {
      callback(new Error(`didn't read 0000`));
      return;
    }

    if (this._data.length > 0) {
      callback(new Error(`data not empty: missing ${this._data.length} symbols '${this._data}'`));
      return;
    }

    callback();
  }
}
