import util from 'util';
import 'winston-mongodb';
import { createLogger, format, transports } from 'winston';
import { EApplicationEnvironment } from '../helpers/application.js';
import { red, blue, yellow, green, magenta, cyan } from 'colorette';
// import { ConsoleTransportInstance, FileTransportInstance } from 'winston/lib/winston/transports'
// import { MongoDBTransportInstance } from 'winston-mongodb'
// import LokiTransport from 'winston-loki';
import * as sourceMapSupport from 'source-map-support';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// Linking Trace Support
sourceMapSupport.install();

const colorizeLevel = (level) => {
  switch (level) {
    case 'ERROR':
      return red(level);
    case 'INFO':
      return blue(level);
    case 'WARN':
      return yellow(level);
    case 'DEBUG':
      return cyan(level);
    default:
      return level;
  }
};

const consoleLogFormat = format.printf((info) => {
  const { level, message, timestamp, meta = {} } = info;

  const customLevel = colorizeLevel(level.toUpperCase());
  // Convert timestamp to string before applying color
  const customTimestamp = green(String(timestamp));

  // Convert message to string
  const customMessage = String(message);

  const customMeta = util.inspect(meta, {
    showHidden: false,
    depth: null,
    colors: true
  });

  const customLog = `${customLevel} [${customTimestamp}] ${customMessage}\n${magenta('META')} ${String(customMeta)}\n`;

  return customLog;
});

const consoleTransport = () => {
  if (process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT) {
    return [
      new transports.Console({
        level: process.env.LOG_LEVEL || 'debug',
        format: format.combine(format.timestamp(), consoleLogFormat)
      })
    ];
  }

  if (process.env.NODE_ENV === EApplicationEnvironment.PRODUCTION) {
    return [
      new transports.Console({
        level: process.env.LOG_LEVEL || 'info',
        format: format.combine(format.timestamp(), consoleLogFormat)
      })
    ];
  }

  return [];
};

const fileLogFormat = format.printf((info) => {
  const { level, message, timestamp, meta = {} } = info;

  const logMeta = {};

  // Type guard to ensure meta is an object before using Object.entries
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    for (const [key, value] of Object.entries(meta)) {
      if (value instanceof Error) {
        logMeta[key] = {
          name: value.name,
          message: value.message,
          trace: value.stack || ''
        };
      } else {
        logMeta[key] = value;
      }
    }
  }

  const logData = {
    level: level.toUpperCase(),
    message,
    timestamp,
    meta: logMeta
  };

  return JSON.stringify(logData, null, 4);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FileTransport = () => [
  new transports.File({
    filename: path.join(__dirname, '../', '../', 'logs', `${process.env.NODE_ENV}.log`),
    level: 'debug', // Changed from 'info' to 'debug' to capture debug logs
    format: format.combine(format.timestamp(), fileLogFormat)
  })
];

// const MongodbTransport = () => {
//     // Ensure DATABASE exists and is a string before using it
//     if (!config.DATABASE) {
//         logger.error('Database URL is undefined or null')
//         return []
//     }

//     return [
//         new transports.MongoDB({
//             level: 'debug',
//             db: String(config.DATABASE),
//             metaKey: 'meta',
//             expireAfterSeconds: 3600 * 24 * 30,
//             capped: true,
//             cappedSize: 10000000, // 10MB
//             cappedMax: 1000
//             collection: 'application-logs'
//         })
//     ]
// }

// const LokiTransportConfig = () => {
//   if (
//     process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT ||
//     process.env.NODE_ENV === EApplicationEnvironment.PRODUCTION
//   ) {
//     return [
//       new LokiTransport({
//         host: process.env.LOKI_HOST,
//         labels: {
//           app: 'auth-service',
//           environment: process.env.NODE_ENV
//         },
//         json: true,
//         format: format.json(),
//         replaceTimestamp: true,
//         onConnectionError: (err) => {
//           logger.error('Loki transport error:', { meta: { error: err } });
//         }
//       })
//     ];
//   }
//   return [];
// };

// Adding custom levels configuration with debug level
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const Logger = createLogger({
  levels,
  defaultMeta: {
    meta: {}
  },
  transports: [...FileTransport(), ...consoleTransport()]
});

// Async logger wrapper
export const logger = {
  info: (message, meta) => Logger.info(message, meta),
  error: (message, meta) => Logger.error(message, meta),
  warn: (message, meta) => Logger.warn(message, meta),
  debug: (message, meta) => Logger.debug(message, meta)
};
