# SmartSpend 🚀

SmartSpend is an AI-powered personal finance dashboard that automatically categorizes expenses, tracks budgets, and provides intelligent financial advice using Gemini AI.

## Architecture & Documentation
To understand how the different layers of the application work, please refer to the detailed documentation located in the `docs/` directory:

1.  [**Frontend Documentation**](docs/frontend.md) - React, Vite, Tailwind CSS, and Recharts setup.
2.  [**Backend Documentation**](docs/backend.md) - Express.js, Firebase Auth verification, and AI logic.
3.  [**Database Documentation**](docs/database.md) - PostgreSQL schema and Drizzle ORM configuration.
4.  [**API Documentation**](docs/api-documentation.md) - REST API endpoints and payload structures.

## Core Features
*   **Secure Authentication**: Firebase Email/Password and Google OAuth login.
*   **Dashboard & Analytics**: Real-time KPI cards and Recharts visualizations for income vs. expenses.
*   **Smart Categorization**: Drag-and-drop CSV upload that automatically parses and categorizes banking data.
*   **Budgeting & Goals**: Set limits on categories and track progress towards long-term savings goals.
*   **AI Financial Assistant**: A conversational AI powered by Google Gemini that analyzes your spending data and offers personalized advice.

## Tech Stack Summary
*   **Frontend**: React 19, Tailwind v4, React Router v7, Radix UI, Lucide Icons, Recharts.
*   **Backend**: Node.js, Express.
*   **Database**: PostgreSQL via Google Cloud SQL, Drizzle ORM.
*   **AI**: Google GenAI SDK (Gemini 2.5 Flash).
*   **Auth**: Firebase.
