const events = require('events');
const test = require('ava').default;
const UploadPackEmitter = require('./UploadPackEmitter');
const sinon = require('sinon');

test.beforeEach(t => {
  const sinonSb = sinon.createSandbox();
  const ee = new events.EventEmitter();
  const up = new UploadPackEmitter(ee);
  const eeMock = sinonSb.mock(ee);

  Object.assign(t.context, {sinonSb, ee, eeMock, up});
});

/**
 * @return {{sinonSb: sinon.SinonSandbox, ee: events.EventEmitter, eeMock: sinon.SinonMock, up: UploadPackEmitter}}
 */
function get(t) {
  return t.context;
}

// test('should', t => {
//   const {sinonSb, ee, eeMock, up} = get(t);
  
//   eeMock.expects('emit').calledWith('ref-info', {
//     commit: 'e4a2b67a965cdb1619e98f75123ad70d52d1ef30',
//     ref: undefined,
//     name: 'HEAD',
//     attr: 'some attributes'
//   });

//   up.write({
//     type: 'line',
//     value: 'e4a2b67a965cdb1619e98f75123ad70d52d1ef30 HEAD\u0000some attributes'
//   });

//   eeMock.verify();
// });