exports.assert = (given, expected = true, msg) => {
  if (given !== expected) {
    throw new Error(`Assertion failed expect '${JSON.stringify(given)}' to be '${JSON.stringify(expected)}'${msg ? `:${msg}` : ''}`);
  }
};