# SmartSpend - Frontend Documentation

## Overview
The frontend of SmartSpend is a Single Page Application (SPA) built with React and Vite. It is designed with an "Elegant Dark" aesthetic, prioritizing high contrast, clear typography, and a modern user experience. The application communicates with a secure Node.js backend to fetch and mutate financial data.

## Tech Stack
*   **Framework:** React 19 + Vite
*   **Styling:** Tailwind CSS v4
*   **Routing:** React Router v7 (`react-router-dom`)
*   **State Management:** React Context API (`AuthContext`) + Local Component State
*   **Authentication:** Firebase Auth Client SDK (`firebase/auth`)
*   **Data Visualization:** Recharts
*   **Icons:** Lucide React
*   **CSV Parsing:** PapaParse
*   **HTTP Client:** Axios (via custom `useApi` hook)

## Application Architecture

### 1. Authentication & Security
The app uses Firebase for client-side authentication (Google OAuth & Email/Password). 
*   **`AuthContext.tsx`**: Manages global authentication state, handles login/register/logout methods, and stores the JWT ID token.
*   **`PrivateRoute` (in `App.tsx`)**: A wrapper component that checks the `AuthContext`. If the user is unauthenticated, they are redirected to `/login`.

### 2. Layout & Navigation
*   **`Layout.tsx`**: The main structural shell of the app. It includes a responsive sidebar navigation (collapsible on mobile) and a main content area.
*   **Navigation Items**: Dashboard, Transactions, Upload, Budgets, Goals, Assistant.

### 3. Core Pages / Views
*   **Login (`/login`)**: Custom UI with tabs for Sign In and Create Account, plus a Google OAuth option.
*   **Dashboard (`/`)**: Displays high-level financial KPIs (Total Income, Total Expenses, Net Savings, Financial Health Score) and renders Recharts visualizations (Spending by Category, Income vs. Expenses trends).
*   **Transactions (`/transactions`)**: A tabular view of all financial transactions with search filtering capabilities.
*   **Upload (`/upload`)**: A drag-and-drop CSV file importer. It parses the CSV client-side using `PapaParse`, displays a preview, and sends the payload to the backend for automated categorization and persistence.
*   **Budgets (`/budgets`)**: Allows users to set monthly spending limits per category and tracks progress using Radix UI Progress bars.
*   **Goals (`/goals`)**: A tracker for long-term savings goals. Users can create goals with target amounts and dates, and manually add funds to them.
*   **AI Assistant (`/assistant`)**: A conversational interface powered by Gemini AI, allowing users to ask natural language questions about their spending habits and get tailored financial advice. Rendered with `react-markdown`.

## Design System (Elegant Dark)
*   **Backgrounds**: Charcoal/Off-Black (`#0A0A0B`, `#0C0C0E`).
*   **Text**: High contrast off-white (`#EDEDED`, `text-white`) and muted slates (`text-slate-400`).
*   **Accents**: Indigo (`indigo-500`, `indigo-600`) for primary actions, Emerald (`emerald-400`) for positive numbers/income, Red (`red-400`) for negative numbers/expenses.
*   **Effects**: Soft glassmorphic borders (`border-[#ffffff10]`) and subtle colored background blurs for depth.

## API Integration
The frontend uses a custom hook, `useApi.ts`, which configures an Axios instance. It automatically intercepts requests and attaches the Firebase JWT token as a Bearer token in the `Authorization` header, ensuring all calls to the backend are securely authenticated.
