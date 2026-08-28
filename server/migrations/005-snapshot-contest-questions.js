const mongoose = require("mongoose");

module.exports = {
  version: 6,
  name: "Snapshot bank questions into contests",
  up: async () => {
    // Raw driver on purpose: the new subdoc schema casts a legacy ObjectId array
    // into empty {_id} stubs without erroring, which would look like a contest
    // whose questions all lost their text.
    const db = mongoose.connection.db;
    const contests = db.collection("contests");
    const questions = db.collection("questions");

    const cursor = contests.find({ "questions.0": { $type: "objectId" } });
    for await (const contest of cursor) {
      const docs = await questions.find({ _id: { $in: contest.questions } }).toArray();
      const byId = new Map(docs.map((q) => [String(q._id), q]));
      const snapshot = contest.questions.map((id) => byId.get(String(id))).filter(Boolean);

      const missing = contest.questions.length - snapshot.length;
      if (missing > 0) {
        console.warn(`[Migrations] Contest ${contest._id}: ${missing} question(s) already deleted from the bank, dropped.`);
      }

      await contests.updateOne({ _id: contest._id }, { $set: { questions: snapshot } });
    }
  }
};
