const git = require('../git');
const {assert} = require('./assert');

const b = str => Buffer.from(str);

const assertLine = (object, str) => {
  assert(object.type, 'line');
  assert(object.value, str); // string
};
const assertPack = (object, str) => {
  assert(object.type, 'pack');
  assert(object.value.toString(), str); // buffer
};

const tests = {
  'read no line but pack': async (ps, arr) => {
    ps.write(b('0000'));
    ps.write(b('pack payload'));
    ps.end();
    assert(arr.length, 1);
    assertPack(arr[0], 'pack payload');
  },
  'read some lines splitted': async (ps, arr) => {
    ps.write(b('0012this is a line001fand this ')); // 18, 13
    assert(arr.length, 1);
    assertLine(arr[0], 'this is a line');

    ps.write(b('should be ')); // 10
    assert(arr.length, 1);

    ps.write(b('splitted')); // 8
    assert(arr.length, 2);
    assertLine(arr[1], 'and this should be splitted');

    ps.write(b('00')); // 2
    assert(arr.length, 2);

    ps.write(b('19th')); // 4
    assert(arr.length, 2);

    ps.write(b('at should also work')); // 19
    assert(arr.length, 3);
    assertLine(arr[2], 'that should also work');

    ps.write(b('0'));
    ps.write(b('00'));
    ps.write(b('0'));
    
    ps.end();
  },
  'trim newlines at the end': async (ps, arr) => {
    ps.write(b('001b\nthis is a message\nX\n\n\n0000'));
    ps.end();
    assert(arr.length, 1);
    assertLine(arr[0], 'this is a message\nX');
  },
};

(async () => {
  for (const testName in tests)  {
    const test = tests[testName];

    const ps = new git.PackStream();
    
    const arr = [];
    ps.on('data', data => arr.push(data));
    await test(ps, arr);
    console.info(`OK ${testName}`);
  }
})();