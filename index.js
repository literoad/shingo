require("dotenv").config();

const users = require("./routes/users");

const fastify = require("fastify")({ logger: true });

fastify.register(require("fastify-graceful-shutdown"));

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

fastify.after(() => {
  fastify.gracefulShutdown((signal, next) => {
    next();
  });
});

fastify.listen(process.env.PORT, "0.0.0.0").catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
