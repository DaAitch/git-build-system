const {spawn} = require('child_process');
const through = require('through');
const util = require('./util');
const parser = require('./parser');
const stream = require('stream');
const events = require('events');

const debug = require('debug')('buse-git');

const zeroCommit = '0000000000000000000000000000000000000000';

const getEmitter = service => {
  switch (service) {
    case 'git-upload-pack': {
      return new exports.GitUploadPackEventEmitter();
    }
    case 'git-receive-pack': {
      return new exports.GitReceivePackEventEmitter();
    }
    default: {
      throw new Error(`unknown service ${service}`);
    }
  }
};

exports.serviceCall = ({req, res, repoPath, service, advertisement}) => {
  const args = ['--stateless-rpc'];

  if (advertisement) {
    args.push('--advertise-refs')
  }

  args.push(repoPath);

  debug('$ %s %s', service, args.join(' '));
  const proc = spawn(service, args);

  const contentType = advertisement
    ? `application/x-${service}-advertisement`
    : `application/x-${service}-result`
  
  res.setHeader('content-type', contentType);
  res.setHeader('cache-control', 'no-cache');

  if (advertisement) {
    res.write(util.pack(`# service=${service}\n`));
    res.write('0000');
  }
    
  const emitter = {
    in: getEmitter(service),
    out: getEmitter(service)
  };
  
  req.pipe(new exports.PackStream()).pipe(emitter.in);
  req.pipe(proc.stdin);

  proc.stdout.pipe(new exports.PackStream()).pipe(emitter.out);
  proc.stdout.pipe(res);

  const promise = new Promise((resolve, reject) => {
    proc.on('error', (code, signal) => {
      debug('error %s: code %d, signal %d', service, code, signal);
      reject(new Error(`code: ${code}, signal: ${signal}`));
    });

    proc.on('exit', () => {
      resolve();
    });
  });

  return {
    emitter,
    promise
  };
};

exports.PackStream = class PackStream extends stream.Transform {
  constructor() {
    super({
      readableObjectMode: true,
      writableObjectMode: false
    });

    this._data = Buffer.from('');
    this._readSize = undefined;

    this._emptyStream = true;
  }

  _pushLine(line) {
    this.push({type: 'line', value: line});
  }

  _pushPackChunk(packChunk) {
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

exports.GitUploadPackEventEmitter = class GitUploadPackEventEmitter extends stream.Writable {

  constructor() {
    super({objectMode: true});

    this.git = new events.EventEmitter();
  }

  _write(object, encoding, callback) {
    switch (object.type) {
      case 'line': {
        let result;
        if (result = parser.readRefInfo(object.value)) {
          this.git.emit('ref-info', result);
          console.log(result);
          return;
        }

        console.log('could not understand line: ' + JSON.stringify(object.value));
        break;
      }
      case 'pack': {
        this.git.emit('pack', object.value);
        break;
      }
      default: {
        console.log('could not understand any: ' + JSON.stringify(object.value.toString()));
      }
    }

    callback();
  }
}

exports.GitReceivePackEventEmitter = class GitReceivePackEventEmitter extends stream.Writable {
  constructor() {
    super({
      objectMode: true
    });

    this.git = new events.EventEmitter();
  }

  _write(object, encoding, callback) {
    switch (object.type) {
      case 'line': {

        let result;
        if (result = parser.readRefInfo(object.value)) {
          this.git.emit('ref-info', result);
          console.log(result);
          return;
        }

        if (result = parser.readUnknown(object.value)) { // TODOOOOOOOOOOOO
          this.git.emit('unknown', result);
          console.log(result);
          return;
        }

        if (result = parser.readStream(object.value)) {
          this.git.emit('stream', result);
          console.log({result});
          return;
        }

        console.log('could not understand line: ' + JSON.stringify(object.value));
        break;
      }
      case 'pack': {
        this.git.emit('pack', object.value);
        break;
      }
      default: {
        console.log('could not understand any: ' + JSON.stringify(object.value.toString()));
      }
    }

    callback();
  }
}