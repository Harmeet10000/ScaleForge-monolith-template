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

export const connectKafkaProducer = () =>
  new Promise((resolve, reject) => {
    producer.setPollInterval(100);

    producer.on('ready', () => {
      logger.info('Kafka Producer ready');
      resolve();
    });

    producer.on('connection.failure', (err) => {
      logger.error('Failed to connect to Kafka:', err);
      reject(err);
    });

    producer.connect({}, (err) => {
      if (err) {
        logger.error('Error connecting to Kafka:', err);
        reject(err);
      }
    });
  });

// Send Message Helper with retries
export const sendMessage = async (message, retries = 3) => {
  new Promise((resolve, reject) => {
    try {
      if (!producer.isConnected()) {
        throw new Error('Producer not connected');
      }

      producer.produce(TOPIC_NAME, null, Buffer.from(message), null, Date.now(), (err) => {
        if (err) {
          if (retries > 0) {
            logger.warn(`Retrying message send. Attempts remaining: ${retries}`);
            setTimeout(() => {
              sendMessage(message, retries - 1)
                .then(resolve)
                .catch(reject);
            }, 1000);
          } else {
            reject(err);
          }
          return;
        }
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
};

// Event Handlers
producer.on('event.error', (err) => {
  logger.error('Producer error:', err);
});

consumer.on('error', (err) => {
  logger.error('Consumer error:', err);
});

consumer.on('data', (message) => {
  logger.info('Received message:', message.value.toString());
});
