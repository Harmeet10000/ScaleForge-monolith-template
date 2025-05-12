import { db } from '../connections/connectDB';
import { refreshTokens, NewRefreshToken, RefreshToken } from '../db/models/refreshToken';
import { eq } from 'drizzle-orm';

export const createRefreshToken = async (
  tokenData: Pick<NewRefreshToken, 'token'>
): Promise<RefreshToken[]> => await db.insert(refreshTokens).values(tokenData).returning();

export const findRefreshToken = async (token: string): Promise<RefreshToken | undefined> => {
  const result = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, token))
    .limit(1);
  return result[0];
};

export const deleteRefreshToken = async (token: string): Promise<RefreshToken[]> =>
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token)).returning();
