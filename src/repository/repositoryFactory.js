import APIFeatures from '../utils/apiFeatures.js';
import { httpError } from '../utils/httpError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { logger } from '../utils/logger.js';

export const getAll = (Model, popOptions) =>
  catchAsync(async (req, res, next, filter = {}) => {
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    if (popOptions) {
      features.query = features.query.populate(popOptions);
    }

    const doc = await features.query;

    if (!doc || doc.length === 0) {
      logger.warn('No documents found with the given criteria', { filter });
      return httpError(next, new Error('No documents found with the given criteria'), req, 404);
    }
    return doc;
  });

export const getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) {
      query = query.populate(popOptions);
    }

    const doc = await query;

    if (!doc) {
      logger.warn('No document found with that ID', { id: req.params.id });
      return httpError(next, new Error('No document found with that ID'), req, 404);
    }
    return doc;
  });

export const createOne = (Model) =>
  catchAsync(async (req) => {
    const doc = await Model.create(req.body);
    return doc;
  });

export const updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      logger.warn('No document found with that ID', { id: req.params.id });
      return httpError(next, new Error('No document found with that ID'), req, 404);
    }
    return doc;
  });

export const deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      logger.warn('No document found with that ID', { id: req.params.id });
      return httpError(next, new Error('No document found with that ID'), req, 404);
    }
    return doc;
  });
