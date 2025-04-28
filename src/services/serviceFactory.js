import * as repositoryFactory from '../repository/repositoryFactory.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getAll = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const documents = await repositoryFactory.getAll(Model, popOptions)(req, res, next);
    return documents;
  });

export const getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    const document = await repositoryFactory.getOne(Model, popOptions)(req, res, next);
    return document;
  });

export const createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDocument = await repositoryFactory.createOne(Model)(req, res, next);
    return newDocument;
  });

export const updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const updatedDocument = await repositoryFactory.updateOne(Model)(req, res, next);
    return updatedDocument;
  });

export const deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const deletedDocument = await repositoryFactory.deleteOne(Model)(req, res, next);
    return deletedDocument;
  });
