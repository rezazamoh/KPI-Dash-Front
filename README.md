# KPI Dash Frontend

This frontend is built with React, TypeScript, Vite, Material UI, React Router, TanStack Query, and Recharts.
It connects to the backend implementation in the sibling `KPI-dash-backend` repository and uses the backend as the source of truth for all Gerrit metrics.

## Project Structure

```
src/
├── api/                  # API clients for backend endpoints
├── components/           # Shared UI components and view logic
│   └── ui/               # Reusable UI primitives
├── layouts/              # Application layout and navigation
├── pages/                # Route-specific page components
├── styles/               # Global CSS
├── theme/                # MUI theme configuration
├── types/                # API response types and models
└── main.tsx              # App entry point
```

## API Contract

The frontend consumes these backend endpoints:

- `GET /gerrit/developers`
- `GET /gerrit/developers/{username}`
- `GET /gerrit/developers/{username}/topics`
- `GET /gerrit/projects`
- `GET /gerrit/projects/{project}`

Query parameters are forwarded from the UI filters to the backend without local KPI recalculation.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file at the project root with your backend base URL and local development proxy target:
   ```bash
   VITE_API_BASE_URL=http://localhost:8000
   VITE_DEV_API_PROXY_TARGET=http://localhost:8000
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:3000`.
