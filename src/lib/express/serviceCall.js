const fs = require('fs');
const express = require('express');
const ServiceCall = require('../git/ServiceCall');

const REQ_SERVICECALL = Symbol();
const VALID_REPO = /[a-z0-9\-]+/i;

module.exports = {
  get,
  middleware,
  isServiceValid: ServiceCall.isServiceValid
};

/**
 * @param {express.Request} req 
 * @return {ServiceCall}
 */
function get(req) {
  return req[REQ_SERVICECALL];
}

/**
 * @param {{gitReposPath: string}} param0 
 */
function middleware({gitReposPath}) {

  if (!fs.existsSync(gitReposPath)) {
    throw new Error(`invalid directory: ${gitReposPath}`);
  }

  /**
   * @param {express.Request} req 
   * @param {express.Response} res 
   * @param {() => void} next 
   */
  function mw(req, res, next) {
    const {repo} = req.params;

    if (!VALID_REPO.test(repo)) {
      res.writeHead(400);
      res.end();
      return;
    }

    const repoPath = `${gitReposPath}/${repo}`;

    req[REQ_SERVICECALL] = new ServiceCall({repoPath, req, res});
    next();
  }

  return mw;
}
