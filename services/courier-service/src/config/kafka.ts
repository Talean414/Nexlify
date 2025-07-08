import { Kafka } from "kafkajs";
import { logger } from "../utils/logger";

const brokers = (process.env.KAFKA_BROKER?.split(",") || ["localhost:9092"]);

const kafka = new Kafka({
  clientId: "courier-service",
  brokers,
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "courier-service-group" });

export const initializeKafka = async () => {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: "courier-events", fromBeginning: false });
  logger.info({ context: "kafka", message: "Kafka initialized" });
};

export { producer, consumer };