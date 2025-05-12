import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { SQLWrapper, asc, desc, eq, and, getTableColumns } from 'drizzle-orm';

// Use a more generic type for the query
type AnyPgSelectQuery = {
  where: (condition: SQLWrapper) => AnyPgSelectQuery;
  orderBy: (orderClause: unknown) => AnyPgSelectQuery;
  limit: (limit: number) => AnyPgSelectQuery;
  offset: (offset: number) => AnyPgSelectQuery;
  // [key: string]: any;
};

type QueryParams = Record<string, string | string[] | undefined>;

export class APIFeatures<TTable extends PgTable, TQuery extends AnyPgSelectQuery> {
  private _query: TQuery;
  private _queryParams: QueryParams;
  private _table: TTable;

  constructor(table: TTable, query: TQuery, queryParams: QueryParams) {
    this._table = table;
    this._query = query;
    this._queryParams = queryParams;
  }

  get query(): TQuery {
    return this._query;
  }

  filter(): APIFeatures<TTable, TQuery> {
    // Extract filter params (exclude pagination and sorting params)
    const queryObj = { ...this._queryParams };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((field) => delete queryObj[field]);

    // Apply filter conditions
    if (Object.keys(queryObj).length > 0) {
      const conditions: SQLWrapper[] = [];
      const tableColumns = getTableColumns(this._table);

      for (const key in queryObj) {
        if (tableColumns[key] && queryObj[key] !== undefined) {
          const value = queryObj[key];
          // For simplicity, we just handle simple equality here
          // For complex operators like gt, gte, lt, lte, you'd need more logic
          conditions.push(eq(tableColumns[key] as PgColumn, value));
        }
      }

      if (conditions.length > 0) {
        // Add the WHERE clause to our query
        // We're using any casting here as TypeScript struggles with the complex types
        this._query = this._query.where(and(...conditions)!) as TQuery;
      }
    }

    return this;
  }

  sort(): APIFeatures<TTable, TQuery> {
    if (this._queryParams.sort) {
      const sortBy = (this._queryParams.sort as string).split(',');
      const tableColumns = getTableColumns(this._table);

      for (const sortItem of sortBy) {
        const sortField = sortItem.startsWith('-') ? sortItem.substring(1) : sortItem;

        if (tableColumns[sortField]) {
          const sortOrder = sortItem.startsWith('-') ? desc : asc;
          // Add ORDER BY to our query
          // We're using any casting here as TypeScript struggles with the complex types
          this._query = this._query.orderBy(
            sortOrder(tableColumns[sortField] as PgColumn)
          ) as TQuery;
        }
      }
    }

    return this;
  }

  paginate(): APIFeatures<TTable, TQuery> {
    const page = parseInt(this._queryParams.page as string, 10) || 1;
    const limit = parseInt(this._queryParams.limit as string, 10) || 100;
    const offset = (page - 1) * limit;

    // Add LIMIT and OFFSET to our query
    // We're using any casting here as TypeScript struggles with the complex types
    this._query = this._query.limit(limit).offset(offset) as TQuery;

    return this;
  }
}
