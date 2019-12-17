require('dotenv').config();

const Server = require('./lib/Server');

const server = new Server({gitReposPath: process.env.GIT_REPOS_PATH});
server.start(+process.env.PORT || 60000);
