// Entry point for the API and for its password-hashing worker threads. Workers run this
// same file because the production image ships only the esbuild bundle (dist/index.js),
// so a worker can't load a separate script or anything from node_modules.
const { isMainThread, workerData } = require("worker_threads");

if (!isMainThread && workerData?.role === "password") {
  require("./utils/passwordWorker");
} else {
  require("./app");
}
