class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

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
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
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

    // We need to build the query based on cursor, direction, and sortField
    if (cursor) {
      // For next page, we get items after the cursor
      if (direction === 'next') {
        this.query = this.query.find({ [sortField]: { $gt: cursor } });
      }
      // For previous page, we get items before the cursor
      else {
        this.query = this.query.find({ [sortField]: { $lt: cursor } });
      }
    }

    // Set the limit
    this.query = this.query.limit(limit);

    // Sort in appropriate direction
    if (direction === 'next') {
      this.query = this.query.sort({ [sortField]: 1 });
    } else {
      this.query = this.query.sort({ [sortField]: -1 });
    }

    return this;
  }
}

export default APIFeatures;
