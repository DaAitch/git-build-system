/**
 * @param {string} string 
 */
exports.pack = string => {
  const n = (4 + string.length).toString(16);
  return '0'.repeat(4 - n.length) + n + string;
};