# SmartSpend - API Documentation

Base URL for all endpoints in development: `http://localhost:3000/api`
All routes require a valid Firebase ID Token sent in the `Authorization` header:
`Authorization: Bearer <token>`

---

## 1. Transactions (`/api/transactions`)

### `GET /`
Retrieves all transactions for the authenticated user.
*   **Response**: `200 OK`
*   **Body**: Array of transaction objects.

### `POST /`
Creates a single transaction.
*   **Payload**: `{ amount: number, type: 'income'|'expense', category: string, merchant?: string, description?: string, date: string }`
*   **Response**: `201 Created`

### `DELETE /:id`
Deletes a transaction by ID.
*   **Response**: `200 OK`

### `POST /upload`
Bulk imports transactions and applies ML categorization.
*   **Payload**: `{ items: Array<{amount, type, description, merchant, date}> }`
*   **Response**: `201 Created`, `{ success: true, count: number }`

---

## 2. Analytics (`/api/analytics`)

### `GET /summary`
Returns high-level KPIs for the current month.
*   **Response**: `200 OK`, `{ income: number, expenses: number, savings: number, healthScore: number }`

### `GET /categories`
Returns grouped expense data for charting.
*   **Response**: `200 OK`, `Array<{ name: string, value: number, color: string }>`

### `GET /trends`
Returns 6-month historical data comparing income vs expenses.
*   **Response**: `200 OK`, `Array<{ month: string, income: number, expenses: number }>`

---

## 3. Budgets (`/api/budgets`)

### `GET /`
Retrieves all budgets and calculates the current `spent` amount for each category in the current month.
*   **Response**: `200 OK`, `Array<{ id, categoryName, amount, spent }>`

### `POST /`
Creates a new category budget.
*   **Payload**: `{ categoryName: string, amount: number }`
*   **Response**: `201 Created`

### `DELETE /:id`
Deletes a budget.

---

## 4. Savings Goals (`/api/goals`)

### `GET /`
Retrieves all active savings goals.
*   **Response**: `200 OK`, `Array<{ id, name, targetAmount, currentAmount, targetDate }>`

### `POST /`
Creates a new goal.
*   **Payload**: `{ name: string, targetAmount: number, targetDate?: string }`

### `PUT /:id`
Updates an existing goal (used for adding funds).
*   **Payload**: `{ currentAmount: number }`

---

## 5. AI Assistant (`/api/ai`)

### `POST /chat`
Submits a user query to the Gemini AI, providing financial context behind the scenes.
*   **Payload**: `{ prompt: string }`
*   **Response**: `200 OK`, `{ response: string (Markdown formatted text) }`
