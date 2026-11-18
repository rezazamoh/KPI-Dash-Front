# KPI Dash Frontend

React and TypeScript dashboard for Gerrit review metrics, Gerrit teams, Jira issue analytics, and KPI display settings. The UI is built with Vite, Material UI, React Router, TanStack Query, Axios, and Recharts.

## Features and routes

| Route | Page |
|---|---|
| `/gerrit` | Gerrit developer, project, and team dashboard |
| `/gerrit/developers/:username` | Developer metrics and review activity |
| `/gerrit/projects/:project` | Project metrics |
| `/gerrit/teams/:team` | Team metrics |
| `/jira` | Jira project, board, issue, and performance analysis |
| `/settings` | Configure duration and patchset distribution windows |
| `/signin` | Sign-in page |

The frontend requests calculated metrics from the backend; it does not calculate Gerrit KPIs locally.

## Source layout

```text
src/
├── api/          # Axios client and Gerrit, Jira, team, and settings requests
├── assets/       # Static assets
├── components/   # App routing and shared UI components
├── layouts/      # Main application layout and navigation
├── metrics/      # Frontend metric presentation helpers
├── pages/        # Route-level pages
├── styles/       # Global styles
├── theme/        # Material UI theme
├── types/        # API and UI types
└── utils/        # Formatting, period, and graph helpers
```

## Requirements

- Node.js and npm
- The KPI Dash backend running and configured for the external services you want to use

## Local development

1. Install the locked dependencies:

   ```bash
   npm ci
   ```

2. Create `.env.local` from the example and point the frontend directly at the backend:

   ```dotenv
   VITE_API_BASE_URL=http://127.0.0.1:8000/api
   ```

   In PowerShell, run `Copy-Item .env.example .env.local` from this directory. `VITE_API_BASE_URL` defaults to `/api`. Vite's development server does not define a proxy, so use the backend URL above for local development. The backend allows browser requests from `http://localhost:3000` and `http://127.0.0.1:3000`.

3. Start Vite:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

The frontend's API base URL is compiled into the app by Vite. Set `VITE_API_BASE_URL` before building if the deployed API is not available at `/api`.

## API

Requests are made relative to `VITE_API_BASE_URL` (normally `/api`):

- Gerrit: `/gerrit/developers`, `/gerrit/developers/{username}`, `/gerrit/developers/{username}/topics`, `/gerrit/projects`, `/gerrit/projects/{project}`
- Teams: `/gerrit/teams` and `/gerrit/teams/{team_id}` (including performance and team management)
- Jira: `/jira/projects`, `/jira/projects/{project_key}/boards`, `/jira/projects/{project_key}/performance`, `/jira/issues`, `/jira/issues/{issue_key}`
- Settings: `/settings`

See the backend's interactive API documentation at `http://localhost:8000/docs` for request parameters and response schemas.

## Build and preview

```bash
npm run build
npm run preview
```

The production build is written to `dist/`. The provided Dockerfile serves it with Nginx on port 80 and proxies `/api/` to a backend host named `backend` on port 8000; adjust `nginx.conf` if your deployment uses another hostname or topology.

## Some sections of the application:

![mainpage](pics\mainpage.jpeg)

![project_performance_page](pics\project_performance_page.jpeg)

![reviews](pics\reviews.jpeg)

![creating_teams](pics\creating_teams.jpeg)

![developer_performance_page](pics\developer_performance_page.jpeg)

![example of passing time period to the page](pics\example of passing time period to the page.png)

![example_of_invalid_configuration_on_time_windows_settings](pics\example_of_invalid_configuration_on_time_windows_settings.jpeg)

![example_of_valid_configuration_on_time_windows_settings](pics\example_of_valid_configuration_on_time_windows_settings.jpeg)

![file_hotspot example](pics\file_hotspot example.jpeg)

![jira_analyzing_page](pics\jira_analyzing_page.jpeg)

![jira_board_and_project_search](pics\jira_board_and_project_search.jpeg)
