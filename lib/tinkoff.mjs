import crypto from "crypto";
import fetch from "node-fetch";
import moment from "moment";

import clientPromise from "./mongo.mjs";

export async function newSubscription(user, days = 30) {
  if (days !== 30 && days !== 180) {
    return null;
  }

  const orderId = crypto.randomUUID();
  const payload = makeInitPayload(orderId, user.id, user.email, days, false);

  const client = await clientPromise;
  const userDoc = await client.db("shingo").collection("users").findOne({
    _id: user.id,
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
    await client.db("shingo").collection("orders").insertOne({
      _id: orderId,
      user,
      meta: result,
      days,
      timestamp: moment().toDate(),
      subscriptionBeforeOrder: userDoc.subscription,
      auto: false,
    });
    return result.PaymentURL;
  }

  return null;
}

// https://www.tinkoff.ru/kassa/develop/api/notifications/setup-request/
export async function acceptNotification(notification) {
  // Verifying payload signature by re-signing it
  const signedNotification = signPayload(notification);
  if (
    notification.TerminalKey !== signedNotification.TerminalKey ||
    notification.Token !== signedNotification.Token
  ) {
    return false;
  }

  const orderId = notification.OrderId;
  const status = notification.Status;

  const client = await clientPromise;
  const order = await client.db("shingo").collection("orders").findOne({
    _id: orderId,
  });

  if (!order.status && (status === "AUTHORIZED" || status === "CONFIRMED")) {
    // Add 30 days to subscriptionBeforeOrder and save info for rebill in user object
    const newSubscription = {
      expires: moment(order.subscriptionBeforeOrder.expires)
        .add(order.days ?? 30, "days")
        .toDate(),
      trial: false,
    };
    const rebill = notification.RebillId
      ? {
          rebillId: notification.RebillId,
          cardId: notification.CardId,
          pan: notification.Pan,
          expirationDate: notification.ExpDate,
        }
      : null;
    await client
      .db("shingo")
      .collection("users")
      .updateOne(
        {
          _id: order.user.id,
        },
        {
          $set: {
            subscription: newSubscription,
            rebill,
          },
        }
      );
  }

  if (
    (order.status === "AUTHORIZED" || order.status === "CONFIRMED") &&
    (status === "REVERSED" ||
      status === "PARTIAL_REFUNDED" ||
      status === "PARTIAL_REVERSED" ||
      status === "REFUNDED" ||
      status === "REJECTED")
  ) {
    // Roll back to subscriptionBeforeOrder, unless it expired before
    // current date. If it expired before current day, give one day grace
    // and discard the trial flag. Remove rebill info from user object
    const subscriptionBeforeOrder = order.subscriptionBeforeOrder;
    subscriptionBeforeOrder.trial = false;

    if (moment(subscriptionBeforeOrder.expires).isSameOrBefore(moment())) {
      subscriptionBeforeOrder.expires = moment().add(12, "hours").toDate();
    }

    await client
      .db("shingo")
      .collection("users")
      .updateOne(
        {
          _id: order.user.id,
        },
        {
          $set: { subscription: subscriptionBeforeOrder },
          $unset: { rebill: "" },
        }
      );
  }

  await client
    .db("shingo")
    .collection("orders")
    .updateOne({ _id: orderId }, { $set: { status } });

  return true;
}

export async function disableRebill(user) {
  const client = await clientPromise;
  await client
    .db("shingo")
    .collection("users")
    .updateOne(
      {
        _id: user.id,
      },
      {
        $unset: { rebill: "" },
      }
    );
}

export async function rebill(userDoc) {
  const orderId = crypto.randomUUID();
  // const initPayload = makeInitPayload(
  //   orderId,
  //   userDoc._id,
  //   userDoc.email,
  //   30,
  //   false
  // );

  const initReq = await fetch("https://securepay.tinkoff.ru/v2/Init", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(initPayload),
  });
  const initResult = await initReq.json();

  const paymentId = initResult.PaymentId;
  if (!initResult.success || !paymentId) {
    return false;
  }

  await client
    .db("shingo")
    .collection("orders")
    .insertOne({
      _id: orderId,
      user: { id: userDoc._id, email: userDoc.email },
      meta: initResult,
      timestamp: moment().toDate(),
      subscriptionBeforeOrder: userDoc.subscription,
      auto: true,
    });

  const chargePayload = makeChargePayload(
    paymentId,
    userDoc.rebill.rebillId,
    userDoc.email
  );
  await fetch("https://securepay.tinkoff.ru/v2/Charge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(chargePayload),
  });
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

function makeInitPayload(orderId, userId, userEmail, days, recurring = true) {
  const price = days === 180 ? 8000 : 1500;

  const payload = {
    Amount: price * 100, // in kopecks
    OrderId: orderId,
    Description: `Подписка Literoad (${days} дней)`,
    CustomerKey: userId,
    DATA: {
      Email: userEmail,
    },
  };

  if (recurring) {
    payload.Recurrent = "Y";
  }

  return signPayload(payload);
}

function makeChargePayload(paymentId, rebillId, userEmail) {
  return signPayload({
    PaymentId: paymentId,
    RebillId: rebillId,
    SendEmail: true,
    InfoEmail: userEmail,
  });
}
