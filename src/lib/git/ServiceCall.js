const events = require('events');
const http = require('http');
const exec = require('./exec');
const pack = require('./pack');
const debug = require('../debug')(__filename);
const PackTransform = require('./PackTransform');
const UploadPackEmitter = require('./UploadPackEmitter');
const ReceivePackEmitter = require('./ReceivePackEmitter');

const SERVICES = {
  'git-receive-pack': {
    EmitterClass: ReceivePackEmitter
  }, 
  'git-upload-pack': {
    EmitterClass: UploadPackEmitter
  }
};

const ZERO_COMMIT = '0000000000000000000000000000000000000000';

const VALID_SERVICES = Object.keys(SERVICES);

module.exports = class ServiceCall extends events.EventEmitter {
  /**
   * 
   * @param {{repoPath: string, req: http.IncomingMessage, res: http.OutgoingMessage}} param0 
   */
  constructor({repoPath, req, res}) {
    super();

    this._repoPath = repoPath;
    this._req = req;
    this._res = res;

    this.on('ref-info', event => {
      if (event.commit === ZERO_COMMIT) {
        debug('new branch: %o', event);
        this.emit('new-branch', {ref: event.ref, name: event.name, attr: event.attr});
        return;
      }

      debug('branch commit: %o', event);
      this.emit('branch-commit', event);
    });
  }

  async advertise(service) {
    return await this._call(service, true);
  }

  async uploadPack() {
    return await this._call('git-upload-pack', false);
  }

  async receivePack() {
    return await this._call('git-receive-pack', false);
  }

  async _call(service, advertisement) {
    debug('calling service %s, with advertisement: %b', service, advertisement);

    if (!ServiceCall.isServiceValid(service)) {
      throw new TypeError(`invalid service ${service}, allowed is ${VALID_SERVICES.join(', ')}`);
    }
    
    this._res.setHeader('cache-control', 'no-cache');
    this._res.setHeader('content-type', `application/x-${service}-${advertisement ? 'advertisement' : 'result'}`);

    if (advertisement) {
      this._res.write(pack(`# service=${service}\n`));
      this._res.write('0000');
    }

    const args = ['--stateless-rpc'];

    if (advertisement) {
      args.push('--advertise-refs')
    }

    args.push(this._repoPath);

    const proc = exec(service, args);

    // passthrough git <-> service
    this._req.pipe(proc.stdin);
    proc.stdout.pipe(this._res);

    // IN: git -> app
    const inPack = new PackTransform({logDirection: 'IN'});
    const inEmitter = this._createEmitter(service, 'IN');

    this._req
      .pipe(inPack)
      .pipe(inEmitter)
    ;

    // OUT: app -> git
    const outPack = new PackTransform({logDirection: 'OUT'});
    const outEmitter = this._createEmitter(service, 'OUT');
    
    proc.stdout
      .pipe(outPack)
      .pipe(outEmitter)
    ;

    return await new Promise((resolve, reject) => {
      proc.once('close', (code, signal) => {
        if (code !== 0) {
          reject(new Error(`service call unexpected exit code: ${code}, signal: ${signal}`));
          return;
        }

        resolve();
      });
      proc.once('error', err => {
        reject(err);
      });
    });
  }

  _createEmitter(service, logDirection) {
    switch (service) {
      case 'git-receive-pack': {
        return new ReceivePackEmitter(this, {logDirection});
      }

      case 'git-upload-pack': {
        return new UploadPackEmitter(this, {logDirection});
      }
    }
  }

  static isServiceValid(service) {
    return VALID_SERVICES.includes(service);
  }
}
