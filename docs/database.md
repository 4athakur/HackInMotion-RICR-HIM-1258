# SmartSpend - Database Documentation

## Overview
SmartSpend utilizes a relational PostgreSQL database hosted on Google Cloud SQL. The schema is designed for multi-tenant SaaS architecture, ensuring user data is securely isolated via foreign key constraints based on Firebase Auth UIDs. Database interactions are managed by Drizzle ORM.

## Connection & ORM
*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
*   **Connection Config**: `src/db/drizzle.config.ts` and `src/db/index.ts` use the `DATABASE_URL` environment variable.

## Schema Definition (`src/db/schema.ts`)

### `users`
Stores user profile information, primarily synced from Firebase Auth.
*   `id`: `varchar(128)` (Primary Key, maps to Firebase UID)
*   `email`: `varchar(255)` (Unique)
*   `displayName`: `varchar(255)`
*   `createdAt`, `updatedAt`: Timestamps

### `transactions`
The core ledger table tracking all income and expenses.
*   `id`: `serial` (Primary Key)
*   `userId`: `varchar` (Foreign Key -> `users.id`)
*   `amount`: `numeric(12,2)`
*   `type`: `varchar` (Enum: 'income', 'expense')
*   `category`: `varchar(100)`
*   `merchant`: `varchar(255)`
*   `description`: `text`
*   `date`: `timestamp`
*   *Indexes*: `userId`, `date`, `category`

### `budgets`
Tracks monthly spending limits configured by the user per category.
*   `id`: `serial` (Primary Key)
*   `userId`: `varchar` (Foreign Key -> `users.id`)
*   `categoryName`: `varchar(100)`
*   `amount`: `numeric(12,2)` (The target limit)

### `savings_goals`
Tracks long-term financial goals and current progress.
*   `id`: `serial` (Primary Key)
*   `userId`: `varchar` (Foreign Key -> `users.id`)
*   `name`: `varchar(255)` (e.g., "Emergency Fund")
*   `targetAmount`: `numeric(12,2)`
*   `currentAmount`: `numeric(12,2)` (Defaults to 0)
*   `targetDate`: `timestamp` (Optional deadline)

## Relationships & Integrity
*   **Isolation**: Every financial record (transaction, budget, goal) is tied to a specific `userId`. Backend queries explicitly filter by `userId` to ensure data privacy.
*   **Cascading Deletes**: If a user account is deleted, all associated transactions, budgets, and goals can be cascaded.
*   **Performance**: Indexes are applied on high-cardinality and frequently queried columns like `userId` and `date` to optimize the analytics aggregation queries (e.g., calculating monthly summaries and trends).
