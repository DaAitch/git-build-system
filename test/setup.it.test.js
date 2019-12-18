const fs = require('fs');
const it = require('./it');
const ava = require('ava');
const test = ava.default;

it.setup(test);

test('should create git directory', async t => {
  
  const git = it.get(t).git('test.git');
  await git.init(true);

  t.true(fs.existsSync(`${__dirname}/test-repos/should-create-git-directory/test.git`));
});