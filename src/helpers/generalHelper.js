import bcrypt from 'bcryptjs';
import { parsePhoneNumber } from 'libphonenumber-js';
import { getTimezonesForCountry } from 'countries-and-timezones';
import { v4 } from 'uuid';
import { randomInt } from 'crypto';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import superjson from 'superjson';
import { logger } from '../utils/logger.js';

export const extractInfoPhoneNumber = (phoneNumber) => {
  const parsedContactNumber = parsePhoneNumber(phoneNumber);
  if (parsedContactNumber) {
    return {
      countryCode: parsedContactNumber.countryCallingCode,
      isoCode: parsedContactNumber.country || null,
      internationalNumber: parsedContactNumber.formatInternational()
    };
  }

  return {
    countryCode: null,
    isoCode: null,
    internationalNumber: null
  };
};

export const hashPassword = (password) => bcrypt.hash(password, 10);

export const comparePassword = (attemptedPassword, encPassword) =>
  bcrypt.compare(attemptedPassword, encPassword);

export const countryTimezone = (isoCode) => getTimezonesForCountry(isoCode);

export const generateRandomId = () => v4();

export const generateOtp = (length) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;

  return randomInt(min, max + 1).toString();
};

export const generateToken = (payload, secret, expiry) =>
  jwt.sign(payload, secret, {
    expiresIn: expiry
  });

export const verifyToken = (token, secret) => jwt.verify(token, secret);

export const getDomainFromUrl = (url) => {
  const parsedUrl = new URL(url);
  return parsedUrl.hostname;
};

export const generateResetPasswordExpiry = (minute) => dayjs().valueOf() + minute * 60 * 1000;

export const getKeyName = (objectType, ...args) => `${objectType}:${args.join(':')}`;

export const getCacheKey = (objectType, key) =>
  getKeyName(objectType, ...(Array.isArray(key) ? key : [key]));

// Reusable validation function (consistent with existing pattern)
export const validateJoiSchema = (schema, value) => {
  const result = schema.validate(value, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  return {
    value: result.value,
    error: result.error
  };
};

// Serialize nested objects for Redis hash storage using superjson
export const serializeHashData = (data) => {
  const serialized = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      serialized[key] = value && typeof value === 'object' ? superjson.stringify(value) : value;
    }
  }
  return serialized;
};

// Deserialize nested objects from Redis hash storage using superjson
export const deserializeHashData = (data) => {
  const deserialized = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      try {
        deserialized[key] = superjson.parse(data[key]);
      } catch (err) {
        logger.error('Error parsing data from Redis hash:', { meta: { err } });
        deserialized[key] = data[key]; // Keep original if parsing fails
      }
    }
  }
  return deserialized;
};
