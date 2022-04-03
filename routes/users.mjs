import moment from "moment";

import clientPromise from "../lib/mongo.mjs";

export async function create(req) {
  const client = await clientPromise;
  const { user } = req.body;

  const signedUp = moment();
  const trialEnds = moment(signedUp).add(7, "days");

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

  return "OK";
}

export async function get(req, res) {
  const client = await clientPromise;
  const userId = req.params.id;

  const user = await client.db("shingo").collection("users").findOne({
    _id: userId,
  });

  if (user) {
    const { signedUp, subscription, payment } = user;
    const active = moment().isBefore(subscription.expires);

    return {
      signedUp,
      subscription,
      active,
      willRebill: payment.status !== "not-started",
    };
  }

  res.code(404);
  return "Not Found";
}
