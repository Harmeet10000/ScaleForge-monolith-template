# Drizzle ORM with Neon PostgreSQL - Setup Guide

## ✅ What's Been Added

### 1. Database Connection

- **File**: `src/connections/connectPostgres.js`
- Neon PostgreSQL connection with Drizzle ORM
- Automatic connection management (no pooling needed for Neon)
- Graceful shutdown handling

### 2. Database Schemas

- **Location**: `src/db/schema/`
- `userSchema.js` - User accounts and authentication
- `auditSchema.js` - Audit trail and logging
- `paymentSchema.js` - Payment transactions

### 3. Repositories (Data Access Layer)

- **Location**: `src/db/repositories/`
- `userRepository.js` - User CRUD operations
- `auditRepository.js` - Audit entry operations
- `paymentRepository.js` - Payment operations

### 4. Migrations & Seeders

- **Migration runner**: `src/db/migrate.js`
- **Seeders**: `src/db/seeders/`
  - Creates admin user (admin@example.com / Admin@123)
  - Creates test user (test@example.com / Test@123)
  - Sample audit entries

### 5. Integration

- PostgreSQL connection added to `src/index.js`
- Runs migrations automatically on startup
- Graceful shutdown for both MongoDB and PostgreSQL

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

**New packages added:**

- `drizzle-orm` - ORM for PostgreSQL
- `@neondatabase/serverless` - Neon PostgreSQL driver
- `@paralleldrive/cuid2` - ID generation
- `drizzle-kit` - Migration toolkit (dev dependency)

### 2. Environment Setup

Your `.env.development` already has the PostgreSQL URL:

```env
POSTGRES_DATABASE_URL=postgresql://Auth_Template_owner:npg_lI3HDdFiP7kt@ep-tiny-breeze-a1ktfkye-pooler.ap-southeast-1.aws.neon.tech/Auth_Template?sslmode=require&channel_binding=require
```

### 3. Generate Initial Migration

```bash
npm run db:generate
```

This creates migration files in `src/db/migrations/`

### 4. Run Migrations

```bash
npm run db:migrate
```

Or migrations run automatically when you start the server:

```bash
npm run dev
```

### 5. Seed Database (Optional)

```bash
npm run db:seed
```

## 📝 Available Scripts

```bash
# Generate migrations from schema changes
npm run db:generate

# Run pending migrations
npm run db:migrate

# Seed database with initial data
npm run db:seed

# Open Drizzle Studio (database GUI)
npm run db:studio

# Push schema changes directly (dev only)
npm run db:push

# Drop all tables (dangerous!)
npm run db:drop
```

## 💡 Usage Examples

### Using Repositories in Your Services

```javascript
import { userRepository } from '../db/repositories/userRepository.js';
import { auditRepository } from '../db/repositories/auditRepository.js';

// Create user
const newUser = await userRepository.create({
  name: 'John Doe',
  emailAddress: 'john@example.com',
  password: hashedPassword,
  role: 'user'
});

// Find user by email
const user = await userRepository.findByEmailAddress('john@example.com');

// Update user
await userRepository.update(user.id, {
  name: 'John Smith'
});

// Create audit entry
await auditRepository.create({
  entityType: 'user',
  entityId: user.id,
  operation: 'UPDATE',
  status: 'success',
  userId: req.user.id,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  previousData: { name: 'John Doe' },
  newData: { name: 'John Smith' }
});
```

### Using Raw Drizzle Queries

```javascript
import { getDB } from '../connections/connectPostgres.js';
import { users } from '../db/schema/userSchema.js';
import { eq, and, like } from 'drizzle-orm';

const db = getDB();

// Custom query
const activeUsers = await db
  .select()
  .from(users)
  .where(and(eq(users.isActive, true), like(users.emailAddress, '%@example.com')))
  .limit(10);
```

## 🏗️ Architecture

### Dual Database Setup

Your application now uses both databases:

**MongoDB** (existing):

- Sessions and caching
- Legacy data
- Flexible document storage

**PostgreSQL** (new):

- Structured relational data
- Audit trails
- Payment transactions
- User accounts (can migrate from MongoDB)

### Repository Pattern

```
Controller → Service → Repository → Database
```

All database operations go through repositories for:

- Consistent error handling
- Logging
- Validation
- Reusability

## 🔧 Connection Pooling

**You don't need connection pooling with Neon!**

Neon is serverless and handles:

- Automatic connection management
- Built-in pooling at infrastructure level
- HTTP-based stateless connections
- Auto-scaling based on demand

Your current setup is optimal for Neon.

## 📊 Monitoring

### Drizzle Studio

```bash
npm run db:studio
```

Opens a web GUI at `https://local.drizzle.studio` to:

- Browse tables
- Run queries
- View data
- Manage schema

### Neon Dashboard

- Monitor query performance
- View connection stats
- Check database metrics
- Manage backups

## 🔐 Security Notes

1. **Environment Variables**: PostgreSQL URL is already in `.env.development`
2. **SSL**: Enabled by default with Neon
3. **Validation**: Use Joi schemas before database operations
4. **Audit Trail**: All operations can be logged via `auditRepository`

## 🚨 Troubleshooting

### Migration Errors

```bash
# Reset migrations (development only)
npm run db:drop
npm run db:generate
npm run db:migrate
```

### Connection Issues

- Verify `POSTGRES_DATABASE_URL` in `.env.development`
- Check Neon dashboard for database status
- Ensure SSL is enabled

### Schema Changes

1. Modify schema files in `src/db/schema/`
2. Generate migration: `npm run db:generate`
3. Review migration in `src/db/migrations/`
4. Apply migration: `npm run db:migrate`

## 📚 Next Steps

1. **Migrate existing data** from MongoDB to PostgreSQL (if needed)
2. **Update services** to use new repositories
3. **Add more schemas** as needed (subscriptions, invoices, etc.)
4. **Implement audit logging** across all features
5. **Set up automated backups** via Neon dashboard

## 🎯 Benefits

✅ Type-safe database operations with Drizzle
✅ Automatic migrations with version control
✅ Serverless PostgreSQL with Neon (no infrastructure management)
✅ Built-in connection pooling and scaling
✅ Comprehensive audit trail system
✅ Repository pattern for clean architecture
✅ Dual database support (MongoDB + PostgreSQL)

## 📖 Documentation

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Neon Docs](https://neon.tech/docs)
- [Project README](./src/db/README.md)

---

**Ready to use!** Start your server with `npm run dev` and migrations will run automatically.
