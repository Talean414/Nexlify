import { Kafka } from "kafkajs";
import { logger } from "../utils/logger";

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: [process.env.KAFKA_BROKERS || "localhost:9092"],
});

export const connectKafka = async () => {
  try {
    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: [
        { topic: "auth-events", numPartitions: 3, replicationFactor: 1 },
        { topic: "order-events", numPartitions: 3, replicationFactor: 1 },
        { topic: "courier-events", numPartitions: 3, replicationFactor: 1 },
        { topic: "notifications", numPartitions: 3, replicationFactor: 1 },
      ],
    });
    await admin.disconnect();
    logger.info({
      context: "kafka.connectKafka",
      message: "Connected to Kafka and ensured topics",
    });
  } catch (err: any) {
    logger.error({
      context: "kafka.connectKafka",
      error: err.message,
      details: err.stack,
    });
    throw err;
  }
};

export { kafka };