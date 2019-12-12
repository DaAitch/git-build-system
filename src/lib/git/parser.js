
module.exports = {
  readRefInfo,
  readUnknown,
  readStream
};

/**
 * @param {string} str 
 * @param {number} offset 
 */
function readHex40(str, offset) {
  if (str.length < 40) {
    return false;
  }

  for (let i = offset; i < offset + 40; i++) {
    const char = str[i];
    if (!(char >= 'a' && char <= 'f') && !(char >= '0' && char <= '9')) {
      return false;
    }
  }

  return [str.substr(offset, 40), offset + 40];
}

/**
 * 
 * @param {string} str 
 * @param {number} offset 
 */
function readWhitespace(str, offset) {
  let i;
  for (i = offset; i < str.length; i++) {
    switch (str[i]) {
      case ' ':
      case '\n':
      case '\r':
      case '\t': {
        continue;
      }
      default: {
        break;
      }
    }

    break;
  }

  return [str.substring(offset, i), i];
}

/**
 * @param {string} str 
 * @param {number} offset 
 */
function readNullByteTerminated(str, offset) {
  let i;
  for (i = offset; i < str.length; i++) {
    if (str[i] === '\u0000') {
      return [str.substring(offset, i), i + 1];
    }
  }

  return false;
}

/**
 * @param {string} str 
 * @param {number} offset 
 */
function readAll(str, offset) {
  return [str.substr(offset), str.length];
}

/**
 * @param {string} str 
 */
function readRefInfo(str) {
  let match;
  let offset = 0;
  let result;

  // commit: mandatory
  if (!(result = readHex40(str, offset))) {
    return false;
  }
  [match, offset] = result;
  const commit = match;

  // whitespace
  [match, offset] = readWhitespace(str, offset);

  // ref: optional
  let ref = undefined;
  if (result = readHex40(str, offset)) {
    [match, offset] = result;
    ref = match;
  }

  // whitespace
  [match, offset] = readWhitespace(str, offset);

  // name: mandatory
  if (!(result = readNullByteTerminated(str, offset))) {
    return false;
  }
  [match, offset] = result;
  const name = match;

  // whitespace
  [match, offset] = readWhitespace(str, offset);

  // attributes: mandatory
  result = readAll(str, offset);
  [match, offset] = result;
  const attr = match;

  return {
    commit,
    ref,
    name,
    attr
  };
};

/**
 * @param {string} str 
 */
function readUnknown(str) {
  let match;
  let offset = 0;
  let result;


  if (!(result = readHex40(str, offset))) {
    return false;
  }
  [match, offset] = result;
  const commit = match;


  [match, offset] = readWhitespace(str, offset);


  if (!(result = readNullByteTerminated(str, offset))) {
    return false;
  }
  [match, offset] = result;
  const name = match;


  [match, offset] = readWhitespace(str, offset);


  if (!(result = readAll(str, offset))) {
    return false;
  }
  [match, offset] = result;
  const attr = match;


  return {
    commit,
    name,
    attr
  };
};

/**
 * @param {string} str 
 */
function readStream(str) {
  let type;
  switch (str[0]) {
    case '\u0001': {
      type = 'data';
      break;
    }
    case '\u0002': {
      type = 'progress';
      break;
    }
    case '\u0003': {
      type = 'fatal';
      break;
    }
    default: {
      return false;
    }
  }

  const data = str.substr(1);
  return {
    type,
    data
  };
};