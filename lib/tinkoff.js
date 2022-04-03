const crypto = require("crypto");

exports.signPayload = function (payload) {
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

  return { ...payload, Token: token };
};
