export async function start(req, res) {
  const { user } = req.body;

  const tinkoff = await import("../lib/tinkoff.mjs");
  const paymentUrl = await tinkoff.newSubscription(user);
  if (!paymentUrl) {
    return res.code(500).send("Unable to start the payment process");
  }

  return { url: paymentUrl };
}
