import { eq, and } from 'drizzle-orm';
import { db } from '../connections/connectDB';
import { users, type User, type NewUser } from '../db/models/userModel';
import dayjs from 'dayjs';
import { PgColumn } from 'drizzle-orm/pg-core';

// The NewUser type is now flat. The service layer will need to adapt the payload.
// For this repository function, we assume the payload matches the flat NewUser structure.
export const registerUser = async (payload: NewUser): Promise<User> => {
  const [user] = await db.insert(users).values(payload).returning();
  return user;
};

export const findUserById = async (
  id: string,
  selectColumns?: (keyof User)[]
): Promise<User | null> => {
  let query = db.select().from(users).where(eq(users.id, id)).limit(1);

  if (selectColumns && selectColumns.length > 0) {
    const selection: Record<string, PgColumn> = {};
    selectColumns.forEach((colName) => {
      // Ensure the column exists on the users table schema
      const column = users[colName];
      if (column) {
        selection[colName as string] = column as PgColumn;
      }
    });
    // Check if selection object is not empty to prevent error with db.select({})
    if (Object.keys(selection).length > 0) {
      query = db.select(selection).from(users).where(eq(users.id, id)).limit(1);
    } else {
      // Fallback to selecting all if selection is empty (e.g. invalid columns provided)
      // Or handle as an error, depending on desired behavior
      query = db.select().from(users).where(eq(users.id, id)).limit(1);
    }
  }

  const [user] = await query;
  return user || null;
};

export const findByIdWithPassword = async (id: string): Promise<User | null> =>
  await findUserById(id);

export const findUserByEmailAddress = async (
  emailAddress: string,
  selectColumns?: (keyof User)[]
): Promise<User | null> => {
  let query = db.select().from(users).where(eq(users.emailAddress, emailAddress)).limit(1);

  if (selectColumns && selectColumns.length > 0) {
    const selection: Record<string, PgColumn> = {};
    selectColumns.forEach((colName) => {
      // Ensure the column exists on the users table schema
      const column = users[colName];
      if (column) {
        selection[colName as string] = column as PgColumn;
      }
    });
    if (Object.keys(selection).length > 0) {
      query = db.select(selection).from(users).where(eq(users.emailAddress, emailAddress)).limit(1);
    } else {
      query = db.select().from(users).where(eq(users.emailAddress, emailAddress)).limit(1);
    }
  }
  const [user] = await query;
  return user || null;
};

export const findUserByConfirmationTokenAndCode = async (
  token: string,
  code: string
): Promise<User | null> => {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.accountConfirmationToken, token), eq(users.accountConfirmationCode, code)))
    .limit(1);
  return user || null;
};

export const findByResetToken = async (token: string): Promise<User | null> => {
  const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token)).limit(1);
  return user || null;
};

export const updateUserById = async (
  userId: string,
  // Payload type needs to reflect the new flat structure of User/NewUser
  // Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'> might be too broad if NewUser is fully flat.
  // It's better to define a specific update payload type or use Partial<User> carefully.
  payload: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>> & { updatedAt?: Date }
): Promise<User | null> => {
  const updatePayload = {
    ...payload,
    updatedAt: new Date() // Ensure 'updatedAt' is always set
  };

  const [updatedUser] = await db
    .update(users)
    .set(updatePayload)
    .where(eq(users.id, userId))
    .returning();

  return updatedUser || null;
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
