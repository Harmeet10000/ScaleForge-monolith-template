import { eq } from 'drizzle-orm';
import { db } from '../connections/connectDB';
import { users, type User, type NewUser } from '../db/models/userModel';
import dayjs from 'dayjs';

export const registerUser = async (payload: Omit<NewUser, 'id'>): Promise<User> => {
  const [user] = await db.insert(users).values(payload).returning();
  return user;
};

export const findUserById = async (
  id: string,
  select?: Array<keyof User>
): Promise<User | null> => {
  const [user] = await db
    .select(select ? select.map((col) => users[col]) : users)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return user || null;
};

export const findByIdWithPassword = async (id: string): Promise<User | null> => {
  return await findUserById(id);
};

export const findUserByEmailAddress = async (
  emailAddress: string,
  select?: Array<keyof User>
): Promise<User | null> => {
  const [user] = await db
    .select(select ? select.map((col) => users[col]) : users)
    .from(users)
    .where(eq(users.emailAddress, emailAddress))
    .limit(1);
  return user || null;
};

export const findUserByConfirmationTokenAndCode = async (
  token: string,
  code: string
): Promise<User | null> => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.accountConfirmation, JSON.stringify({ token, code })))
    .limit(1);
  return user || null;
};

export const findByResetToken = async (token: string): Promise<User | null> => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.passwordReset, JSON.stringify({ token })))
    .limit(1);
  return user || null;
};

export const updateUserLastLogin = async (userId: string): Promise<User | null> => {
  const [user] = await db
    .update(users)
    .set({
      lastLoginAt: dayjs().utc().toDate(),
      updatedAt: new Date()
    })
    .where(eq(users.id, userId))
    .returning();
  return user || null;
};
