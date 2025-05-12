import { db } from '../connections/connectDB';
import { httpError } from '../utils/httpError';
import { catchAsync } from '../utils/catchAsync';
import { logger } from '../utils/logger';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { SQL, asc, desc, eq, and, getTableColumns } from 'drizzle-orm';
import { Request, Response, NextFunction } from 'express';

// Define a helper type for the table's selectable and insertable shapes
type TableTypes<T extends PgTable> = {
  select: T['_']['inferSelect'];
  insert: T['_']['inferInsert'];
};

// Helper to get the 'id' column if it exists
function getIdColumn<T extends PgTable>(table: T): PgColumn | undefined {
  const columns = getTableColumns(table);
  return columns.id as PgColumn | undefined; // Assumes 'id' is the name of the primary key column
}

// New helper function to ensure 'id' column exists or call httpError
function ensureIdColumnOrError<TTable extends PgTable>(
  table: TTable,
  operationName: string,
  req: Request,
  next: NextFunction
): PgColumn | undefined {
  const idColumn = getIdColumn(table);
  if (!idColumn) {
    const errorMessage = `Table does not have an "id" column for ${operationName} operation`;
    logger.error(errorMessage, { tableName: table._.name });
    // httpError calls next(error), so the execution of the current async handler will be stopped by catchAsync
    httpError(
      next,
      new Error(`Configuration error: No ID column defined for this table for ${operationName}.`),
      req,
      500
    );
    return undefined;
  }
  return idColumn;
}

// New helper function to handle "document not found" scenarios
function handleDocumentNotFound(
  doc: unknown | unknown[] | null | undefined,
  isListOperation: boolean,
  next: NextFunction,
  req: Request,
  loggerMessage: string,
  errorMessage: string,
  logContext?: Record<string, unknown>
): boolean {
  const notFound = isListOperation ? !doc || (Array.isArray(doc) && doc.length === 0) : !doc;

  if (notFound) {
    logger.warn(loggerMessage, logContext || { query: req.query, params: req.params });
    httpError(next, new Error(errorMessage), req, 404);
    return true; // Indicates document was not found and error was handled
  }
  return false; // Indicates document was found
}

export const getAll = <TTable extends PgTable>(table: TTable) =>
  catchAsync(
    async (
      req: Request,
      _res: Response, // Renamed as res is not directly used for sending response here
      next: NextFunction,
      filter?: Partial<TableTypes<TTable>['select']>
    ) => {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 100;
      const offset = (page - 1) * limit;
      const sort = req.query.sort as string; // e.g., "name" or "-name"

      let query = db.select().from(table).limit(limit).offset(offset);

      // Basic Filtering
      if (filter && Object.keys(filter).length > 0) {
        const conditions: SQL[] = [];
        for (const key in filter) {
          if (
            Object.prototype.hasOwnProperty.call(filter, key) &&
            table[key as keyof TTable] &&
            filter[key as keyof typeof filter] !== undefined // Ensure value is not undefined
          ) {
            conditions.push(
              eq(table[key as keyof TTable] as PgColumn, filter[key as keyof typeof filter]!)
            );
          }
        }
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }

      // Basic Sorting
      if (sort) {
        const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
        const columnToSort = getTableColumns(table)[sortField] as PgColumn | undefined;
        if (columnToSort) {
          const sortOrder = sort.startsWith('-') ? desc : asc;
          query = query.orderBy(sortOrder(columnToSort));
        }
      }

      const doc = await query;

      if (
        handleDocumentNotFound(
          doc,
          true, // isListOperation
          next,
          req,
          'No documents found with the given criteria',
          'No documents found with the given criteria',
          { filter, query: req.query }
        )
      ) {
        return; // Error handled by handleDocumentNotFound
      }
      return doc as TableTypes<TTable>['select'][];
    }
  );

export const getOne = <TTable extends PgTable>(table: TTable) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const idColumn = ensureIdColumnOrError(table, 'getOne', req, next);
    const idValue = req.params.id;

    const result = await db
      .select()
      .from(table)
      .where(eq(idColumn, idValue))
      .limit(1);
    const doc = result[0];

    if (
      handleDocumentNotFound(
        doc,
        false, // isListOperation
        next,
        req,
        'No document found with that ID',
        'No document found with that ID',
        { id: req.params.id, tableName: table._.name }
      )
    ) {
      return; // Error handled
    }
    return doc as TableTypes<TTable>['select'];
  });

export const createOne = <TTable extends PgTable>(table: TTable) =>
  catchAsync(async (req: Request) => {
    const insertData = req.body as TableTypes<TTable>['insert'];
    const result = await db.insert(table).values(insertData).returning();
    // Assuming returning() always gives at least one result if successful
    return result[0] as TableTypes<TTable>['select'];
  });

export const updateOne = <TTable extends PgTable>(table: TTable) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const idColumn = ensureIdColumnOrError(table, 'updateOne', req, next);
    if (!idColumn) {
      return; // Error already handled
    }
    const idValue = req.params.id;
    const updateData = req.body as Partial<TableTypes<TTable>['insert']>;

    const result = await db
      .update(table)
      .set(updateData)
      .where(eq(idColumn, idValue))
      .returning();

    const doc = result[0];

    if (
      handleDocumentNotFound(
        doc,
        false, // isListOperation
        next,
        req,
        'No document found with that ID to update',
        'No document found with that ID',
        { id: req.params.id, tableName: table._.name }
      )
    ) {
      return; // Error handled
    }
    return doc as TableTypes<TTable>['select'];
  });

export const deleteOne = <TTable extends PgTable>(table: TTable) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const idColumn = ensureIdColumnOrError(table, 'deleteOne', req, next);
    const idValue = req.params.id;

    const result = await db
      .delete(table)
      .where(eq(idColumn, idValue))
      .returning();
    const doc = result[0];

    if (
      handleDocumentNotFound(
        doc,
        false, // isListOperation
        next,
        req,
        'No document found with that ID to delete',
        'No document found with that ID',
        { id: req.params.id, tableName: table._.name }
      )
    ) {
      return; // Error handled
    }
    return doc as TableTypes<TTable>['select'];
  });
