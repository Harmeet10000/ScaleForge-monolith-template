// import APIFeatures from '../utils/apiFeatures';
// import { httpError } from '../utils/httpError';
// import { catchAsync } from '../utils/catchAsync';
// import { logger } from '../utils/logger';
// import { Model, Document, PopulateOptions } from 'mongoose';
// import { Request, Response, NextFunction } from 'express';

// // Define a type for popOptions that's compatible with mongoose's populate
// type PopulateType = PopulateOptions | (string | PopulateOptions)[];

// export const getAll = <T extends Document>(model: Model<T>, popOptions?: PopulateType) =>
//   catchAsync(
//     async (
//       req: Request,
//       res: Response,
//       next: NextFunction,
//       filter: Record<string, unknown> = {}
//     ) => {
//       // Convert Express query to a compatible object for APIFeatures
//       const queryObj: Record<string, string | undefined> = {};
//       Object.entries(req.query).forEach(([key, value]) => {
//         queryObj[key] = value as string;
//       });

//       const features = new APIFeatures(model.find(filter), queryObj)
//         .filter()
//         .sort()
//         .limitFields()
//         .paginate();

//       if (popOptions) {
//         // Use type assertion to ensure compatibility with mongoose's populate
//         features.query = features.query.populate(popOptions as any);
//       }

//       const doc = await features.query;

//       if (!doc || doc.length === 0) {
//         logger.warn('No documents found with the given criteria', { filter });
//         return httpError(next, new Error('No documents found with the given criteria'), req, 404);
//       }
//       return doc;
//     }
//   );

// export const getOne = <T extends Document>(model: Model<T>, popOptions?: PopulateType) =>
//   catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//     let query = model.findById(req.params.id);
//     if (popOptions) {
//       // Use type assertion to ensure compatibility with mongoose's populate
//       query = query.populate(popOptions as any);
//     }

//     const doc = await query;

//     if (!doc) {
//       logger.warn('No document found with that ID', { id: req.params.id });
//       return httpError(next, new Error('No document found with that ID'), req, 404);
//     }
//     return doc;
//   });

// export const createOne = <T extends Document>(model: Model<T>) =>
//   catchAsync(async (req: Request) => {
//     const doc = await model.create(req.body);
//     return doc;
//   });

// export const updateOne = <T extends Document>(model: Model<T>) =>
//   catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//     const doc = await model.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       runValidators: true
//     });

//     if (!doc) {
//       logger.warn('No document found with that ID', { id: req.params.id });
//       return httpError(next, new Error('No document found with that ID'), req, 404);
//     }
//     return doc;
//   });

// export const deleteOne = <T extends Document>(model: Model<T>) =>
//   catchAsync(async (req: Request, res: Response, next: NextFunction) => {
//     const doc = await model.findByIdAndDelete(req.params.id);

//     if (!doc) {
//       logger.warn('No document found with that ID', { id: req.params.id });
//       return httpError(next, new Error('No document found with that ID'), req, 404);
//     }
//     return doc;
//   });
