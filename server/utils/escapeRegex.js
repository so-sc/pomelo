// Escapes regex metacharacters so a user-typed search term matches literally
// (and cannot be used to craft a catastrophically backtracking pattern).
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { escapeRegex };
