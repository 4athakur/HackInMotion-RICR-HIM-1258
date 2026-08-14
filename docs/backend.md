# SmartSpend - Backend Documentation

## Overview
The SmartSpend backend is a robust Node.js and Express server that serves as the secure data layer and AI processing engine for the frontend application. It handles authentication verification, database operations via Drizzle ORM, machine learning categorization, and AI assistant prompt generation using Google's GenAI SDK.

## Tech Stack
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database ORM:** Drizzle ORM (PostgreSQL)
*   **Authentication:** Firebase Admin SDK
*   **AI Integration:** `@google/genai` (Gemini Models)
*   **Build/Dev Tools:** `tsx` (Development), `esbuild` (Production Bundle)

## Server Architecture

### 1. Entry Point (`server.ts`)
The Express application is configured to run on port 3000 (bind `0.0.0.0`). 
*   **Development Mode**: Uses Vite's middleware to serve the React application and API from the same process, preventing CORS issues.
*   **Production Mode**: Serves the compiled static frontend files from the `dist` directory alongside the API routes.

### 2. Authentication Middleware
*   **`verifyToken`**: All protected API routes (`/api/*`) are secured by this middleware. It extracts the Bearer token from the `Authorization` header and verifies it using `firebase-admin`. The decoded user ID (`uid`) is attached to the request object for use in downstream controllers.

### 3. API Routes

#### Transactions (`/api/transactions`)
*   `GET /`: Fetches all transactions for the authenticated user, ordered by date.
*   `POST /`: Creates a new transaction.
*   `DELETE /:id`: Deletes a specific transaction.
*   `POST /upload`: Accepts an array of bulk transaction objects (from CSV import). Before inserting into the database, it passes the data through the **ML Categorization Engine** to automatically assign categories.

#### Analytics (`/api/analytics`)
*   `GET /summary`: Aggregates the current month's income, expenses, savings, and calculates a proprietary Financial Health Score based on budget utilization and saving rates.
*   `GET /categories`: Groups current month's expenses by category for pie-chart rendering.
*   `GET /trends`: Aggregates historical data over the last 6 months to compare income vs. expenses.

#### Budgets & Goals (`/api/budgets`, `/api/goals`)
*   CRUD operations for monthly category budgets and long-term savings goals.
*   The API calculates real-time `spent` amounts for budgets by querying the transactions table for the current month.

#### AI Assistant (`/api/ai/chat`)
*   **Gemini Integration**: Accepts a user prompt.
*   **Context Injection**: Before sending the prompt to the Gemini model, the backend fetches the user's recent transactions, active budgets, and overall financial summary from the database. It constructs a rich, data-grounded system prompt.
*   **Response Generation**: Calls the Gemini API (`gemini-2.5-flash`) to generate personalized financial advice and returns the Markdown-formatted response to the frontend.

## ML Categorization Engine
When CSV data is uploaded, the backend attempts to auto-categorize transactions.
1.  **Rule-Based Preprocessing**: Checks the merchant/description against a dictionary of common keywords (e.g., "Uber" -> "Travel", "Netflix" -> "Entertainment").
2.  **Fallback Mechanism**: If no rule matches, it applies a basic NLP heuristic (e.g., TF-IDF/Naive Bayes conceptual logic) based on historical user data to predict the most likely category.
