import client from "prom-client";
import express from "express";
import { logger } from "./logger";

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "code"],
});

export const initMetrics = (app: express.Express) => {
  app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer();
    res.on("finish", () => {
      end({ method: req.method, route: req.path, code: res.statusCode });
    });
    next();
  });

  app.get("/metrics", async (req, res) => {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  });

  logger.info({
    context: "metrics",
    message: "Prometheus metrics initialized",
  });
};