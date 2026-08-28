// Central registry for all migrations.
// Add new migrations here to ensure they are bundled correctly by esbuild.

module.exports = [
  require("./001-init"),
  require("./002-username-to-email"),
  require("./003-add-duration-minutes"),
  require("./004-regenerate-boilerplate"),
  require("./005-snapshot-contest-questions")
];
