const moment = require("moment");

const clientPromise = require("../lib/mongo");

exports.create = async function (req) {
  const client = await clientPromise;
  const { user } = req.body;

  const signedUp = moment();
  const trialEnds = signedUp.add(7, "days");

  await client
    .db("shingo")
    .collection("users")
    .insertOne({
      _id: user.id,
      email: user.email,
      signedUp: signedUp.toDate(),
      subscription: {
        expires: trialEnds.toDate(),
        trial: true,
      },
      payment: {
        status: "not-started",
      },
    });
};
