import { Novu } from '@novu/node';

export const novuClient = new Novu(process.env.NOVU_API_KEY);
