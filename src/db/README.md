# Drizzle ORM with Neon PostgreSQL Setup

This directory contains the Drizzle ORM setup for PostgreSQL using Neon as the database provider.

## Directory Structure

```
src/db/
├── schema/           # Database schemas
│   ├── index.js      # Schema exports
│   ├── userSchema.js # User table schema
│   ├── auditSchema.js # Audit entries schema
│   └── paymentSchema.js # Payment table schema
├── migrations/       # Database migrations
├── seeders/          # Database seeders
│   ├── index.js      # Main seeder runner
│   ├── userSeeder.js # User data seeder
│   └── auditSeeder.js # Audit data seeder
├── repositories/     # Data access layer
│   ├── userRepository.js # User operations
│   ├── auditRepository.js # Audit operations
│   └── paymentRepository.js # Payment operations
├── migrate.js        # Migration runner
└── README.md         # This file
```

## Environment Variables

Add the following to your `.env.development` file:

```env
POSTGRES_DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

## Available Scripts

### Database Operations

```bash
# Generate migrations from schema changes
npm run db:generate

# Run pending migrations
npm run db:migrate

# Seed the database with initial data
npm run db:seed

# Open Drizzle Studio (database GUI)
npm run db:studio

# Push schema changes directly (development only)
npm run db:push

# Drop all tables (dangerous!)
npm run db:drop
```

## Usage Examples

### 1. Using Repositories in Services

```javascript
import { userRepository } from '../db/repositories/userRepository.js';

// Create a new user
const newUser = await userRepository.create({
  name: 'John Doe',
  emailAddress: 'john@example.com',
  password: hashedPassword
});

// Find user by email
const user = await userRepository.findByEmailAddress('john@example.com');

// Update user
const updatedUser = await userRepository.update(userId, {
  name: 'John Smith'
});
```

### 2. Using Raw Drizzle Queries

```javascript
import { getDB } from '../connections/connectPostgres.js';
import { users } from '../db/schema/userSchema.js';
import { eq } from 'drizzle-orm';

const db = getDB();

// Custom query
const activeUsers = await db.select().from(users).where(eq(users.isActive, true));
```

### 3. Creating Audit Entries

```javascript
import { auditRepository } from '../db/repositories/auditRepository.js';

await auditRepository.create({
  entityType: 'user',
  entityId: user.id,
  operation: 'CREATE',
  status: 'success',
  userId: user.id,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  newData: { action: 'User created' }
});
```

## Schema Design Principles

### 1. JSONB Fields

- Use JSONB for flexible, structured data (preferences, metadata)
- Index JSONB fields when needed for performance
- Validate JSONB structure in application layer

### 2. Indexing Strategy

- Primary keys: UUID with CUID2 generation
- Foreign keys: Indexed automatically
- Composite indexes for common query patterns
- Timestamp indexes for time-based queries

### 3. Soft Deletes

- Use `deletedAt` timestamp for soft deletes
- Always filter out soft-deleted records in queries
- Maintain referential integrity with soft deletes

## Migration Workflow

### 1. Development

```bash
# Make schema changes in src/db/schema/
# Generate migration
npm run db:generate

# Review generated migration in src/db/migrations/
# Apply migration
npm run db:migrate
```

### 2. Production

```bash
# Run migrations in production
NODE_ENV=production npm run db:migrate
```

## Best Practices

### 1. Repository Pattern

- All database operations through repositories
- Business logic in service layer
- Consistent error handling and logging

### 2. Type Safety

- Use Drizzle's TypeScript integration
- Define proper schema types
- Validate data at boundaries

### 3. Performance

- Use appropriate indexes
- Implement pagination for large datasets
- Use select() to limit returned fields
- Consider query optimization for complex operations

### 4. Security

- Validate all inputs
- Use parameterized queries (Drizzle handles this)
- Implement proper access controls
- Audit sensitive operations

## Troubleshooting

### Common Issues

1. **Connection Errors**

   - Verify POSTGRES_DATABASE_URL format
   - Check Neon database status
   - Ensure SSL configuration is correct

2. **Migration Errors**

   - Check for schema conflicts
   - Verify migration order
   - Review generated SQL

3. **Performance Issues**
   - Add appropriate indexes
   - Use EXPLAIN ANALYZE for query optimization
   - Consider connection pooling settings

### Debugging

```javascript
// Enable query logging in development
const db = drizzle(sql, {
  logger: process.env.NODE_ENV === 'development'
});
```

## Integration with Existing MongoDB

This PostgreSQL setup runs alongside the existing MongoDB setup:

- MongoDB: User sessions, caching, legacy data
- PostgreSQL: Structured data, audit trails, payments
- Both databases can be used simultaneously
- Use appropriate database for each use case

## Monitoring

- Use Drizzle Studio for database inspection
- Monitor query performance with Neon dashboard
- Implement application-level metrics
- Set up alerts for connection issues
