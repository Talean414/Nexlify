const concurrently = require("concurrently");

const { result } = concurrently([
  { command: "pnpm --filter auth-service dev", name: "auth", prefixColor: "blue" },
  { command: "pnpm --filter courier-service dev", name: "courier", prefixColor: "cyan" },
  { command: "pnpm --filter order-service dev", name: "order", prefixColor: "green" },
  { command: "pnpm --filter product-service dev", name: "product", prefixColor: "magenta" },
  { command: "pnpm --filter vendor-service dev", name: "vendor", prefixColor: "yellow" },
  { command: "pnpm --filter location-service dev", name: "location", prefixColor: "red" },
  { command: "pnpm --filter notification-service dev", name: "notify", prefixColor: "white" }
], {
  prefix: "name",
  killOthers: ["failure"],
  restartTries: 0,
});

result.catch(() => {
  console.error("At least one service failed.");
});
