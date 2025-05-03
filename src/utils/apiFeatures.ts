import { Document, Query, FilterQuery } from 'mongoose';

// More strictly type the query string, but allow unknown keys as string values
interface QueryString {
  page?: string;
  sort?: string;
  limit?: string;
  fields?: string;
  cursor?: string;
  direction?: string;
  sortField?: string;
  [key: string]: string | undefined;
}

class APIFeatures<T extends Document> {
  query: Query<T[], T>;
  queryString: QueryString;

  constructor(query: Query<T[], T>, queryString: QueryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj: Record<string, string | undefined> = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    // Type assertion: we expect the parsed object to be a valid FilterQuery<T>
    this.query = this.query.find(JSON.parse(queryStr) as FilterQuery<T>);

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      // Type assertion: select may change the result type, but we expect T[]
      this.query = this.query.select(fields) as Query<T[], T>;
    } else {
      this.query = this.query.select('-__v') as Query<T[], T>;
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page ? parseInt(this.queryString.page, 10) : 1;
    const limit = this.queryString.limit ? parseInt(this.queryString.limit, 10) : 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }

  cursorPaginate() {
    const limit = this.queryString.limit ? parseInt(this.queryString.limit, 10) : 10;
    const cursor = this.queryString.cursor || null;
    const direction = this.queryString.direction?.toLowerCase() === 'prev' ? 'prev' : 'next';
    const sortField = this.queryString.sortField || '_id';

    if (cursor) {
      if (direction === 'next') {
        this.query = this.query.find({ [sortField]: { $gt: cursor } } as FilterQuery<T>);
      } else {
        this.query = this.query.find({ [sortField]: { $lt: cursor } } as FilterQuery<T>);
      }
    }

    this.query = this.query.limit(limit);

    if (direction === 'next') {
      this.query = this.query.sort({ [sortField]: 1 });
    } else {
      this.query = this.query.sort({ [sortField]: -1 });
    }

    return this;
  }
}

export default APIFeatures;
