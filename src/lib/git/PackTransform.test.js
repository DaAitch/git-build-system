const ava = require('ava');
const test = ava.default;
const PackTransform = require('./PackTransform');

test.beforeEach(t => {
  const pt = new PackTransform();
  const arr = [];
  pt.on('data', data => arr.push(data));

  Object.assign(t.context, {pt, arr});
});

test('should read no line but pack', t => {
  const {pt, arr} = get(t);

  pt.write(Buffer.from('0000'));
  pt.write(Buffer.from('pack payload'));
  pt.end();
  
  t.is(arr.length, 1);
  t.is(arr[0].type, 'pack');
  t.is(arr[0].value.toString(), 'pack payload'); // maybe buffer
});

test('should read some lines splitted', t => {
  const {pt, arr} = get(t);

  pt.write(Buffer.from('0012this is a line001fand this ')); // 18, 13
  t.is(arr.length, 1);
  t.deepEqual(arr[0], {type: 'line', value: 'this is a line'});

  pt.write(Buffer.from('should be ')); // 10
  t.is(arr.length, 1);

  pt.write(Buffer.from('splitted')); // 8
  t.is(arr.length, 2);
  t.deepEqual(arr[1], {type: 'line', value: 'and this should be splitted'});

  pt.write(Buffer.from('00')); // 2
  t.is(arr.length, 2);

  pt.write(Buffer.from('19th')); // 4
  t.is(arr.length, 2);

  pt.write(Buffer.from('at should also work')); // 19
  t.is(arr.length, 3);
  t.deepEqual(arr[2], {type: 'line', value: 'that should also work'});

  pt.write(Buffer.from('0'));
  pt.write(Buffer.from('00'));
  pt.write(Buffer.from('0'));
  
  pt.end();
});

test('should trim newlines at the end', t => {
  const {pt, arr} = get(t);

  pt.write(Buffer.from('001b\nthis is a message\nX\n\n\n0000'));
  pt.end();
  t.is(arr.length, 1);

  t.deepEqual(arr[0], {type: 'line', value: 'this is a message\nX'});
});

test('should throw for invalid size', t => {
  t.plan(1);

  const {pt} = get(t);

  pt.once('error', () => t.pass());
  pt.write(Buffer.from('0008text000?error'));
  pt.destroy();
});

test('should not throw for no 0000', t => {
  const {pt} = get(t);

  pt.once('error', () => t.fail());
  pt.write(Buffer.from('0008text'));
  pt.end();

  t.pass();
});

test('should emit line and pack', function (t) {
  const {pt, arr} = get(t);

  pt.write(Buffer.from('0008line0000this '));
  pt.write(Buffer.from('\nis\t'));
  pt.write(Buffer.from('the   pack\r'));
  pt.end();

  t.is(arr.length, 4);
  assertLine(t, arr[0], 'line');
  assertPack(t, arr[1], 'this ');
  assertPack(t, arr[2], '\nis\t');
  assertPack(t, arr[3], 'the   pack\r');
});

/**
 * @return {{pt: PackTransform, arr: {type: string, value: string|Buffer}[]}}
 */
function get(t) {
  return t.context;
}

/**
 * @param {ava.ExecutionContext} t 
 * @param {{type: string, value: string|Buffer}} item 
 * @param {string} value 
 */
function assertLine(t, item, value) {
  t.deepEqual(item, {type: 'line', value});
}

/**
 * @param {ava.ExecutionContext} t 
 * @param {{type: string, value: string|Buffer}} item 
 * @param {string} value 
 */
function assertPack(t, item, value) {
  t.deepEqual({type: item.type, value: item.value.toString()}, {type: 'pack', value});
}
