const http = require('http');
const express = require('express');
const serviceCall = require('./express/serviceCall');

const debug = require('./debug')(__filename);

module.exports = class Server {
  constructor({gitReposPath}) {
    this._app = express();
    this._gitReposPath = gitReposPath;

    this._configureRoutes();
  }

  _configureRoutes() {

    const serviceCallMiddleware = serviceCall.middleware({gitReposPath: this._gitReposPath});

    this._app

      .get('/:repo/info/refs', serviceCallMiddleware, async (req, res) => {

        const {service} = req.query;
        if (!serviceCall.isServiceValid(service)) {
          res.writeHead(400);
          res.end();
          return;
        }
        
        const call = serviceCall.get(req);
        await call.advertise(service);
      })

      .post('/:repo/git-upload-pack', serviceCallMiddleware, async (req, res) => {
        const call = serviceCall.get(req);
        await call.uploadPack();
      })

      .post('/:repo/git-receive-pack', serviceCallMiddleware, async (req, res) => {
        const call = serviceCall.get(req);
        await call.receivePack();
      })
    ;
  }

  async start(port) {
    this._server = new http.Server(this._app);
    this._server.listen(port, '0.0.0.0', () => {
      const address = this._server.address();
      debug(`listen on %s:%s`, address.address, address.port);
    });
  }

  async stop() {
    return new Promise((resolve, reject) => {
      this._server.close(err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }
};