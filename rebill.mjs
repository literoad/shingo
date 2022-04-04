import moment from "moment";

import clientPromise from "./lib/mongo.mjs";
import * as tinkoff from "./lib/tinkoff.mjs";

export async function rebillExpired() {
  const now = moment().toDate();

  const client = await clientPromise;
  const users = await client
    .db("shingo")
    .collection("users")
    .find({
      "subscription.expires": { $lte: now },
      rebill: { $exists: true },
    });

  for (const user of users) {
    try {
      await tinkoff.rebill(user);
    } catch (e) {
      console.error("Unable to rebill", user, e);
    }
  }
}
