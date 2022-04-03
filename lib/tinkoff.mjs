import crypto from "crypto";
import fetch from "node-fetch";
import moment from "moment";

import clientPromise from "./mongo.mjs";

export async function newSubscription(user) {
  const orderId = crypto.randomUUID();

  const payload = signPayload({
    Amount: 1500 * 100, // in kopecks
    OrderId: orderId,
    Description: "Подписка Literoad (30 дней)",
    Recurrent: "Y",
    CustomerKey: user.id,
    DATA: {
      Email: user.email,
    },
  });

  const req = await fetch("https://securepay.tinkoff.ru/v2/Init", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await req.json();

  if (result.Success) {
    const client = await clientPromise;
    await client.db("shingo").collection("orders").insertOne({
      _id: orderId,
      user,
      meta: result,
      timestamp: moment().toDate(),
    });
    return result.PaymentURL;
  }

  return null;
}

function signPayload(payload) {
  const { Shops, Receipt, DATA, Token, ...signed } = payload;

  signed.TerminalKey = process.env.TERMINAL_KEY;
  signed.Password = process.env.TERMINAL_PASSWORD;

  const entries = Object.entries(signed);
  entries.sort((a, b) => {
    if (a[0] < b[0]) {
      return -1;
    }
    if (a[0] > b[0]) {
      return 1;
    }
    return 0;
  });

  const tokenSrc = entries.map((e) => e[1]).join("");
  const token = crypto.createHash("sha256").update(tokenSrc).digest("hex");

  return {
    ...payload,
    TerminalKey: process.env.TERMINAL_KEY,
    Password: process.env.TERMINAL_PASSWORD,
    Token: token,
  };
}
