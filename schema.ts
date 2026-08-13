import { relations } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, integer, boolean, numeric, date } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // Bank, Credit Card, Cash, UPI, Other
  balance: numeric('balance', { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // expense or income
  icon: text('icon').notNull(),
  color: text('color').notNull(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  accountId: integer('account_id').references(() => accounts.id),
  categoryId: integer('category_id').references(() => categories.id),
  date: date('date').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  type: text('type').notNull(), // expense or income
  merchant: text('merchant'),
  description: text('description'),
  source: text('source').default('manual'), // manual, csv
  isRecurring: boolean('is_recurring').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const budgets = pgTable('budgets', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savingsGoals = pgTable('savings_goals', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  name: text('name').notNull(),
  targetAmount: numeric('target_amount', { precision: 12, scale: 2 }).notNull(),
  currentAmount: numeric('current_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  deadline: date('deadline'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const recurringTransactions = pgTable('recurring_transactions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  merchant: text('merchant').notNull(),
  averageAmount: numeric('average_amount', { precision: 12, scale: 2 }).notNull(),
  frequency: text('frequency').notNull(), // monthly, yearly, weekly
  lastDate: date('last_date'),
  nextExpectedDate: date('next_expected_date'),
  confidence: numeric('confidence', { precision: 5, scale: 4 }), // e.g. 0.95
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  transactions: many(transactions),
  budgets: many(budgets),
  savingsGoals: many(savingsGoals),
  recurringTransactions: many(recurringTransactions)
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.uid] })
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  budgets: many(budgets)
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.uid] }),
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] })
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.uid] }),
  category: one(categories, { fields: [budgets.categoryId], references: [categories.id] })
}));
