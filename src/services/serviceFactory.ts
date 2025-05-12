import { PgTable } from 'drizzle-orm/pg-core';
import * as repositoryFactory from '../repository/repositoryFactory'; // Use .ts if that's the convention
import { catchAsync } from '../utils/catchAsync'; // Use .ts
import { Request, Response, NextFunction } from 'express';

// Define a helper type for the table's selectable shape, similar to repositoryFactory
// type TableSelectType<T extends PgTable> = T['_']['inferSelect'];

export const getAll = <TTable extends PgTable>(table: TTable) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // The filter argument for repositoryFactory.getAll is optional and comes from req.query internally
    // If you need to pass a specific pre-defined filter from the service layer, it would be the 4th argument.
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const documents = await repositoryFactory.getAll<TTable>(table)(req, res, next);
    return documents;
  });

export const getOne = <TTable extends PgTable>(table: TTable) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const document = await repositoryFactory.getOne<TTable>(table)(req, res, next);
    return document;
  });

export const createOne = <TTable extends PgTable>(table: TTable) =>
  catchAsync(async (req: Request, res: Response) => {
    // repositoryFactory.createOne expects req.body to contain the data
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const newDocument = await repositoryFactory.createOne<TTable>(table)(req, res);
    return newDocument;
  });

export const updateOne = <TTable extends PgTable>(table: TTable) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // repositoryFactory.updateOne expects req.params.id and req.body
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const updatedDocument = await repositoryFactory.updateOne<TTable>(table)(req, res, next);
    return updatedDocument;
  });

export const deleteOne = <TTable extends PgTable>(table: TTable) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // repositoryFactory.deleteOne expects req.params.id
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const deletedDocument = await repositoryFactory.deleteOne<TTable>(table)(req, res, next);
    return deletedDocument;
  });
