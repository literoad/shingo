import "dotenv/config";

import Fastify from "fastify";
import fastifyGracefulShutdown from "fastify-graceful-shutdown";

import * as users from "./routes/users.mjs";
import * as payments from "./routes/payments.mjs";

const fastify = Fastify({ logger: true });

fastify.register(fastifyGracefulShutdown);

fastify.post(
  "/users",
  {
    schema: {
      body: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
            },
            required: ["id"],
          },
        },
        required: ["user"],
      },
    },
  },
  users.create
);

fastify.get("/users/:id", users.get);

fastify.post(
  "/payments",
  {
    schema: {
      body: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
            },
            required: ["id"],
          },
        },
        required: ["user"],
      },
    },
  },
  payments.start
);

fastify.post("/payments/notification", {}, payments.notification);

fastify.post("/payments/disable-rebill", {}, payments.disableRebill);

fastify.after(() => {
  fastify.gracefulShutdown((signal, next) => {
    next();
  });
});

fastify.listen(process.env.PORT, "0.0.0.0").catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
