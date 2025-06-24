import Kafka from 'node-rdkafka';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOPIC_NAME = process.env.KAFKA_TOPIC || 'chats';
const CERT_PATH = path.join(__dirname, '../../certs');

const kafkaConfig = {
  'metadata.broker.list': process.env.KAFKA_BROKER,
  'security.protocol': 'ssl',
  'ssl.key.location': path.join(CERT_PATH, 'service.key'),
  'ssl.certificate.location': path.join(CERT_PATH, 'service.cert'),
  'ssl.ca.location': path.join(CERT_PATH, 'ca.pem'),
  'sasl.mechanisms': 'SCRAM-SHA-256',
  'sasl.username': process.env.KAFKA_USERNAME,
  'sasl.password': process.env.KAFKA_PASSWORD,
  'retry.backoff.ms': 200,
  'message.send.max.retries': 10
  // dr_cb: true
};

// Producer Configuration
export const producer = new Kafka.Producer(kafkaConfig);

// Consumer Configuration
export const consumer = Kafka.createReadStream(
  {
    ...kafkaConfig,
    'group.id': 'chats'
  },
  { 'auto.offset.reset': 'earliest' },
  { topics: [TOPIC_NAME] }
);

// Connect Producer
export const connectKafkaProducer = async () => {
  producer.setPollInterval(100);

  producer.on('ready', () => {
    logger.info('Kafka Producer ready');
  });

  producer.on('connection.failure', (err) => {
    logger.error('Failed to connect to Kafka:', err);
    throw err;
  });

  await producer.connect({});
  return producer;
};

export const disconnectAdmin = async () => {
  if (producer) {
    await producer.disconnect();
    logger.info('Kafka Admin client disconnected');
  }
};
