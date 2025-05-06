import bcrypt from 'bcryptjs';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { getTimezonesForCountry } from 'countries-and-timezones';
import { v4 } from 'uuid';
import { randomInt } from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import dayjs from 'dayjs';

export const extractInfoPhoneNumber = (phoneNumber: string): { countryCode: string | null; isoCode: string | null; internationalNumber: string | null } => {
  try {
    const parsedContactNumber = parsePhoneNumberWithError(phoneNumber);
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
  } catch (err) {
    return {
      countryCode: null,
      isoCode: null,
      internationalNumber: null
    };
  }
};

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, 10);

export const comparePassword = (attemptedPassword: string, encPassword: string): Promise<boolean> =>
  bcrypt.compare(attemptedPassword, encPassword);

export const countryTimezone = (isoCode: string): ReturnType<typeof getTimezonesForCountry> =>
  getTimezonesForCountry(isoCode);

export const generateRandomId = (): string => v4();

export const generateOtp = (length: number): string => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;

  return randomInt(min, max + 1).toString();
};

export const generateToken = (payload: Record<string, any>, secret: string, expiry: number): string => {
  const options: SignOptions = {
    expiresIn: expiry
  };
  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string, secret: string): string | object =>
  jwt.verify(token, secret);

export const getDomainFromUrl = (url: string): string => {
  const parsedUrl = new URL(url);
  return parsedUrl.hostname;
};

export const generateResetPasswordExpiry = (minute: number): number =>
  dayjs().valueOf() + minute * 60 * 1000;

export const getKeyName = (objectType: string, ...args: Array<string | number>): string =>
  `${objectType}:${args.join(':')}`;
