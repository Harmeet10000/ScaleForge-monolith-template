import { toNodeHandler } from 'better-auth/node';
import { auth } from './betterAuth.js';

export const betterAuthHandler = toNodeHandler(auth);
