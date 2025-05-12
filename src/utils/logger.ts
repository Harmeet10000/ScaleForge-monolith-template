import util from 'util';
import { PostgresTransport } from '@innova2/winston-pg';
import DailyRotateFile from 'winston-daily-rotate-file';
import { createLogger, format, transports, Logger } from 'winston';
import { ConsoleTransportInstance, FileTransportInstance } from 'winston/lib/winston/transports';
import { red, blue, yellow, green, magenta, cyan } from 'colorette';
import { EApplicationEnvironment } from '../constant/application.js';
import * as sourceMapSupport from 'source-map-support';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../config/dotenvConfig.js';

// Linking Trace Support
sourceMapSupport.install();

const colorizeLevel = (level: string): string => {
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

const consoleTransport = (): Array<ConsoleTransportInstance> => {
  if (config.NODE_ENV === EApplicationEnvironment.DEVELOPMENT) {
    return [
      new transports.Console({
        level: 'info',
        format: format.combine(format.timestamp(), consoleLogFormat)
      })
    ];
  }

  return [];
};

const fileLogFormat = format.printf((info) => {
  const { level, message, timestamp, meta = {} } = info;
  const logMeta: Record<string, unknown> = {};
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

const FileTransport = (): Array<FileTransportInstance> => [
  new transports.File({
    filename: path.join(__dirname, '../', '../', 'logs', `${config.NODE_ENV || 'development'}.log`),
    level: 'info',
    format: format.combine(format.timestamp(), fileLogFormat)
  })
];

const PostgresTransportInstance = (): PostgresTransport[] => [
  new PostgresTransport({
    level: 'info',
    connectionString: config.DATABASE,
    tableName: 'application_logs',
    maxPool: 10,
    metaKey: 'meta', // Use a similar meta structure as MongoDB
    expiration: 3600 * 24 * 30 // 30 days
  })
];

const DailyRotateFileTransport = (): DailyRotateFile[] => [
  new DailyRotateFile({
    filename: path.join(__dirname, '../', '../', 'logs', 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: format.combine(format.timestamp(), fileLogFormat),
    dirname: path.join(__dirname, '../', '../', 'logs')
  })
];

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

export const logger: Logger = createLogger({
  levels,
  defaultMeta: {
    meta: {}
  },
  transports: [
    ...FileTransport(),
    ...consoleTransport(),
    ...PostgresTransportInstance(),
    ...DailyRotateFileTransport()
  ]
});
