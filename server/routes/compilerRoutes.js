const express = require("express");
const router = express.Router();
const { requireAuth, options } = require("../middlewares/checkAuth");
const { getAns, testCode } = require("../controllers/compilerCon");
router.get("/pgs", (req, res) => {
  res.send("I'm up");
});
router.post("/run", requireAuth(options), async (req, res) => {
  const { lang, ver, inp, code } = req.body;
  const rs = await fetch(process.env.cmpAPI, {
    method: "POST",
    body: JSON.stringify({
      language: lang,
      version: ver,
      files: [
        {
          name: "main",
          content: code,
        },
      ],
      stdin: inp,
    }),
  });
  const rj = await rs.json();
  if (rj.stderr)
    return res.status(500).json({ Compilation: "failed", Error: rj.stderr });
  return res
    .status(200)
    .json({ compilation: "success", stdout: rj.run.stdout });
});

router.post("/submit", requireAuth(), async (req, res) => {
  const { lang, ver, inp, code } = req.body;
  const rs = await fetch(process.env.cmpAPI, {
    method: "POST",
    body: JSON.stringify({
      language: lang,
      version: ver,
      files: [
        {
          name: "main",
          content: code,
        },
      ],
      stdin: inp,
    }),
  });
  const rj = await rs.json();
  if (rj.run.stderr)
    return res.status(500).json({ Compilation: "failed", Error: rj.stderr });
  const curans = rj.run.stdout;
  const exp = await getAns(req.query.q_id);
  if (!exp) {
    console.log("Invalid QID");
    return res.json({ msg: "Failed" });
  }
  const resp = await testCode(exp.trim(), curans.trim());
  return res.json(resp);
});

module.exports = router;
