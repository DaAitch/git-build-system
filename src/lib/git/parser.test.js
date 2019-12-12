const test = require('ava').default;
const parser = require('./parser');

test('should read ref info', t => {
  const result = parser.readRefInfo('3026f71b700866a330f19d42a22da913c6cb7022 d40fa1063b522d2d38c87db6d6a6e9b83298772c ' +
    'refs/heads/master\u0000 report-status side-band-64k agent=git/2.7.4');

  t.deepEqual(result, {
    commit: '3026f71b700866a330f19d42a22da913c6cb7022',
    ref: 'd40fa1063b522d2d38c87db6d6a6e9b83298772c',
    name: 'refs/heads/master',
    attr: 'report-status side-band-64k agent=git/2.7.4'
  });
});

test('should data stream', t => {
  const result = parser.readStream('\u0001Data stream');
  t.deepEqual(result, {type: 'data', data: 'Data stream'});
});

test('should progress stream', t => {
  const result = parser.readStream('\u0002Progress stream');
  t.deepEqual(result, {type: 'progress', data: 'Progress stream'});
});

test('should fatal stream', t => {
  const result = parser.readStream('\u0003Fatal stream');
  t.deepEqual(result, {type: 'fatal', data: 'Fatal stream'});
});

test('should understand optional ref', t => {
  const result = parser.readRefInfo('e4a2b67a965cdb1619e98f75123ad70d52d1ef30 HEAD\u0000some attributes');
  t.deepEqual(result, {
    commit: 'e4a2b67a965cdb1619e98f75123ad70d52d1ef30',
    ref: undefined,
    name: 'HEAD',
    attr: 'some attributes'
  });
});