const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');
const express = require('express');
const git = require('./git');
const build = require('./build');

const debug = require('debug')('buse');

const gitReposPath = `${__dirname}/../git-repos`;

const app = express();

// /**
//  * 
//  * @param {Express.Request} req 
//  * @param {Express.Response} res 
//  * @param {Function} next 
//  */
// const redlock = async (req, res, next) => {

//   const lock = await acquireLock();
//   res.on('finish', () => lock.release());
  
//   next();
// };

const gitInterceptor = async (req, res, next) => {
  next();
};

// express app

app

  .get('/:repo/info/refs', gitInterceptor, (req, res) => {
    const {service} = req.query;
    git.serviceCall({req, res, repoPath: `${gitReposPath}/${req.params.repo}`, advertisement: true, service});
  })

  .post('/:repo/git-upload-pack', gitInterceptor, (req, res) => {
    // req.params.repo
    const {emitter} = git.serviceCall({req, res, repoPath: `${gitReposPath}/${req.params.repo}`, service: 'git-upload-pack'});
    for (const e of [emitter.in, emitter.out]) {
      e.on('ref-info', x => {debug('%o', x);});
      e.on('pack', x => {debug('%o', x);});
      e.on('error', x => {debug('ERR %o', x);});
    }
  })

  .post('/:repo/git-receive-pack', gitInterceptor, (req, res) => {
    const {emitter} = git.serviceCall({req, res, repoPath: `${gitReposPath}/${req.params.repo}`, service: 'git-receive-pack'});
    for (const e of [emitter.in, emitter.out]) {
      e.on('ref-info', x => {debug('%o', x);});
      e.on('stream', x => {debug('%o', x);});
      e.on('pack', x => {debug('%o', x);});
      e.on('error', x => {debug('ERR %o', x);});
    }
  })

;

const server = http.createServer(app);
server.listen(60000, '0.0.0.0', () => {
  debug('listen on 60000');
});
