const parser = require('../parser');
const {assert} = require('./assert');


const tests = {
  'read ref info': () => {
    const result = parser.readRefInfo('3026f71b700866a330f19d42a22da913c6cb7022 d40fa1063b522d2d38c87db6d6a6e9b83298772c ' +
      'refs/heads/master\u0000 report-status side-band-64k agent=git/2.7.4');

    assert(result.commit, '3026f71b700866a330f19d42a22da913c6cb7022');
    assert(result.ref, 'd40fa1063b522d2d38c87db6d6a6e9b83298772c');
    assert(result.name, 'refs/heads/master');
    assert(result.attr, 'report-status side-band-64k agent=git/2.7.4');
  },
  'data stream': () => {
    const result = parser.readStream('\u0001Data stream');
    assert(result.type, 'data');
    assert(result.data, 'Data stream')
  },
  'progress stream': () => {
    const result = parser.readStream('\u0002Progress stream');
    assert(result.type, 'progress');
    assert(result.data, 'Progress stream')
  },
  'fatal stream': () => {
    const result = parser.readStream('\u0003Fatal stream');
    assert(result.type, 'fatal');
    assert(result.data, 'Fatal stream')
  }
};

(async () => {
  for (const testName in tests)  {
    const test = tests[testName];
    await test();
    
    console.info(`OK ${testName}`);
  }
})();