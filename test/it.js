require('dotenv').config(`${__dirname}/test.env`);

const util = require('util');
const fs = require('fs');
const ava = require('ava');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const Server = require('../src/lib/Server');
const GitClient = require('../src/lib/git/GitClient');

module.exports = {setup, get};

/**
 * @param {ava.TestInterface} test
 */
function setup(test) {
  test.beforeEach(beforeEach);
  test.afterEach(afterEach);
}

/**
 * @param {ava.ExecutionContext} t 
 */
async function beforeEach(t) {
  const gitReposPath = await recreateGitReposDir(t.title);

  const server = new Server({gitReposPath});
  await server.start();

  Object.assign(t.context, {
    gitReposPath,
    server,
    git(repo) {
      return new GitClient({cwd: `${gitReposPath}/${repo}`});
    }
  });
}

/**
 * @param {ava.ExecutionContext} t 
 */
async function afterEach(t) {
  const {gitReposPath, server} = get(t);
  await server.stop();

  await deleteGitReposDir(gitReposPath);
}

/**
 * 
 * @param {ava.ExecutionContext} t 
 * @return {{gitReposPath: string, server: Server, git: (repo: string) => GitClient}}
 */
function get(t) {
  return t.context;
}

/**
 * @param {string} title 
 */
async function recreateGitReposDir(title) {
  if (/(should\s.+)$/.test(title)) {
    title = RegExp.$1;
  }

  const dirName = title.replace(/[^0-9a-z]+/gi, '-');
  const gitReposPath = `${__dirname}/test-repos/${dirName}`;

  await deleteGitReposDir(gitReposPath);
  await util.promisify(mkdirp)(gitReposPath);

  return gitReposPath;
}

/**
 * @param {string} gitReposPath
 * @return {boolean}
 */
async function deleteGitReposDir(gitReposPath) {
  try {
    await util.promisify(fs.access)(gitReposPath, fs.constants.W_OK);
  } catch (e) {
    return false;
  }

  await util.promisify(rimraf)(gitReposPath);
  return true;
}
