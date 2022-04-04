import * as tinkoff from "../lib/tinkoff.mjs";

export async function start(req, res) {
  const { user } = req.body;

  const paymentUrl = await tinkoff.newSubscription(user);
  if (!paymentUrl) {
    return res.code(500).send("Unable to start the payment process");
  }

  return { url: paymentUrl };
}

export async function notification(req, res) {
  const success = await tinkoff.acceptNotification(req.body);
  if (success) {
    res.status(200).send("OK");
  } else {
    res.code(400).send("Bad Request");
  }
}

export async function disableRebill(req, res) {
  const { user } = req.body;
  await tinkoff.disableRebill(user);
  res.status(200).send("OK");
}
