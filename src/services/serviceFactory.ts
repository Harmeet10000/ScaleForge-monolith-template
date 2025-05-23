// import { Model, Document, PopulateOptions } from 'mongoose';
// import * as repositoryFactory from '../repository/repositoryFactory.js';
// import { catchAsync } from '../utils/catchAsync.js';
// import { Request, Response, NextFunction } from 'express';

// // Define PopulateType to match repository implementation
// type PopulateType = PopulateOptions | (string | PopulateOptions)[];

// export const getAll = <T extends Document>(model: Model<T>, popOptions?: PopulateType) =>
//   catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//     const documents = await repositoryFactory.getAll<T>(model, popOptions)(req, res, next);
//     return documents;
//   });

// export const getOne = <T extends Document>(model: Model<T>, popOptions?: PopulateType) =>
//   catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//     const document = await repositoryFactory.getOne<T>(model, popOptions)(req, res, next);
//     return document;
//   });

// export const createOne = <T extends Document>(model: Model<T>) =>
//   catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//     const newDocument = await repositoryFactory.createOne<T>(model)(req, res, next);
//     return newDocument;
//   });

// export const updateOne = <T extends Document>(model: Model<T>) =>
//   catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//     const updatedDocument = await repositoryFactory.updateOne<T>(model)(req, res, next);
//     return updatedDocument;
//   });

// export const deleteOne = <T extends Document>(model: Model<T>) =>
//   catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//     const deletedDocument = await repositoryFactory.deleteOne<T>(model)(req, res, next);
//     return deletedDocument;
//   });
