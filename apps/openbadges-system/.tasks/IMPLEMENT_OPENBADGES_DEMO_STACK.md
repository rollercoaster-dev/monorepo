# Implement OpenBadges Demo Stack

## Current Status

Initial planning phase. The READMEs for `openbadges-modular-server`, `openbadges-ui`, and `openbadges-types` have been reviewed to understand their purpose and integration points. The goal is to create a monolithic application using Bun, Hono, and Vue, with the `openbadges-modular-server` running in Docker.

## Objective

Create a monolithic application using Bun, Hono, and Vue. This application will integrate:
1.  `openbadges-modular-server` (running via Docker Compose) as the core Open Badges API.
2.  `openbadges-ui` (NPM package) for Vue components.
3.  `openbadges-types` (NPM package) for TypeScript type safety.

The application should provide a basic demonstration of a functional Open Badges system, where the Vue frontend interacts with a Hono backend (within the monolith), which in turn communicates with the Dockerized `openbadges-modular-server`.

## Requirements

- [x] Set up a Bun project for the monolith.
- [x] Integrate Hono for the backend API routes within the monolith.
- [x] Integrate Vue 3 for the frontend UI.
- [x] Configure Vue with `unplugin-vue-router`, `unplugin-auto-import`, and `unplugin-vue-components`.
- [x] Set up Docker Compose to run `openbadges-modular-server` using its pre-built Docker image.
- [x] Install `openbadges-ui` and `openbadges-types` as NPM dependencies in the monolith.
- [x] Create a basic Vue page that utilizes at least one component from `openbadges-ui`.
- [x] Create a basic Hono backend route in the monolith that can proxy requests or fetch data from the `openbadges-modular-server` API (e.g., list issuers or badge classes).
- [x] Ensure the Vue frontend can make API calls to the Hono backend, which then communicates with the `openbadges-modular-server`.
- [ ] Use `openbadges-types` for type definitions when handling badge-related data in both the Hono backend and Vue frontend.

## Technical Details

### Architecture

1.  **Monolith (Bun/Hono/Vue)**:
    *   **Runtime**: Bun (for speed, built-in TypeScript support, and package management).
    *   **Backend**: Hono (lightweight web framework for API routes within the monolith). This backend will:
        *   Serve the Vue 3 frontend (static assets in production).
        *   Act as a Backend-For-Frontend (BFF), proxying requests to the `openbadges-modular-server`.
    *   **Frontend**: Vue 3 (for the user interface).
        *   Bundling/Dev Server: Vite (or leverage Bun's native capabilities if sufficient).

2.  **`openbadges-modular-server` (Docker)**:
    *   Runs as a separate service managed by Docker Compose, using the official image `ghcr.io/rollercoaster-dev/openbadges-modular-server:main`.
    *   Exposes its API (e.g., on `http://localhost:3000` by default, configurable via `.env` for the Docker container).
    *   Will be configured to use SQLite for simplicity in this demo stack.

3.  **Communication Flow**:
    *   User interacts with Vue Frontend.
    *   Vue Frontend sends API requests to Hono Backend (Monolith).
    *   Hono Backend (Monolith) forwards requests or makes new requests to `openbadges-modular-server` (Docker).

### Dependencies

*   **Monolith**:
    *   `bun` (runtime)
    *   `hono`
    *   `vue`
    *   `vite` (or Bun's equivalent for frontend tooling)
    *   `typescript`
    *   `unplugin-vue-router`
    *   `unplugin-auto-import`
    *   `unplugin-vue-components`
    *   `openbadges-ui` (npm package)
    *   `openbadges-types` (npm package)
*   **External**:
    *   `docker`
    *   `docker-compose`

### Implementation Plan

1.  **Project Setup (Monolith)**:
    *   Initialize a new Bun project: `bun init`.
    *   Install core dependencies: `bun add hono vue openbadges-ui openbadges-types`.
    *   Install dev dependencies for Vue tooling: `bun add -d vite @vitejs/plugin-vue unplugin-vue-router unplugin-auto-import unplugin-vue-components typescript`.

2.  **Docker Compose for `openbadges-modular-server`**:
    *   Create `docker-compose.yml` in the project root.
    *   Define a service for `openbadges-modular-server` using `ghcr.io/rollercoaster-dev/openbadges-modular-server:main`.
    *   Configure environment variables for the service (e.g., `DB_TYPE=sqlite`, `PORT=3000`).
    *   Map port `3000` from the container to a host port (e.g., `3000:3000`).
    *   Verify it runs: `docker-compose up -d`.

3.  **Hono Backend Setup (Monolith)**:
    *   Create `src/server/index.ts` (or similar) for the Hono application.
    *   Implement a basic Hono app that listens on a different port (e.g., 8080).
    *   Add a health check route (e.g., `/api/health`).
    *   Add a proxy route to communicate with `openbadges-modular-server`. For example, `/api/bs/health` could fetch from `http://localhost:3000/health`.
        *   Ensure proper error handling and response forwarding.

4.  **Vue Frontend Setup (Monolith)**:
    *   Organize frontend code (e.g., in `src/client/`).
    *   Create `src/client/main.ts` to initialize the Vue app.
    *   Create `src/client/App.vue` as the root component.
    *   Set up `vite.config.ts` (or Bun equivalent):
        *   Include `@vitejs/plugin-vue`.
        *   Configure `unplugin-vue-router` (for file-system based routing, e.g., `src/client/pages`).
        *   Configure `unplugin-auto-import` (for Vue, Vue Router APIs).
        *   Configure `unplugin-vue-components` (for auto-importing components from `src/client/components` and `openbadges-ui`).
    *   Create a sample page (e.g., `src/client/pages/Index.vue` or `HomePage.vue`).
    *   In the sample page, import and use a component from `openbadges-ui` (e.g., `BadgeDisplay` or `BadgeList`).
        *   Initially, this might use mock data or data fetched via the Hono backend.
    *   Ensure `openbadges-ui/dist/style.css` is imported.
    *   Configure Hono to serve the Vue app's static files in production mode and integrate with Vite's dev server in development.

5.  **Integration & Basic Functionality**:
    *   **Frontend to Hono Backend**: Implement a service/composable in Vue to fetch data from the Hono backend API (e.g., `/api/bs/issuers`).
    *   **Hono Backend to Modular Server**: The Hono backend route (e.g., `/api/bs/issuers`) will fetch data from the corresponding `openbadges-modular-server` endpoint (e.g., `http://localhost:3000/v2/issuers`).
    *   **Data Display**: The Vue component will display the data fetched (e.g., a list of issuer names).
    *   **Type Safety**: Utilize `openbadges-types` in both the Hono backend (when fetching/transforming data from the modular server) and the Vue frontend (when receiving/displaying data).

## Testing Strategy

Primarily manual testing for this initial demo stack.

### Test Cases

1.  **Test Case 1: `openbadges-modular-server` Health**
    *   Description: Start the `openbadges-modular-server` via `docker-compose up`. Access its health endpoint directly (e.g., `http://localhost:3000/health`).
    *   Expected Result: Server responds with a 200 OK and success status.
    *   Actual Result:
    *   Status: [Pass/Fail]

2.  **Test Case 2: Monolith Hono Backend Health**
    *   Description: Start the monolith's Hono backend. Access its health endpoint (e.g., `http://localhost:8080/api/health`).
    *   Expected Result: Server responds with a 200 OK.
    *   Actual Result:
    *   Status: [Pass/Fail]

3.  **Test Case 3: Monolith Backend Proxy/Communication with Modular Server**
    *   Description: Access a Hono backend route that communicates with the `openbadges-modular-server` (e.g., `http://localhost:8080/api/bs/health` or `/api/bs/issuers`).
    *   Expected Result: Hono backend successfully fetches data from the modular server and returns it.
    *   Actual Result:
    *   Status: [Pass/Fail]

4.  **Test Case 4: Vue Frontend Loads**
    *   Description: Start the Vue frontend development server (via Vite/Bun). Open the frontend URL in a browser (e.g., `http://localhost:5173` if using Vite default).
    *   Expected Result: The main page of the Vue application loads without console errors.
    *   Actual Result:
    *   Status: [Pass/Fail]

5.  **Test Case 5: Vue Frontend Displays Data from Backend**
    *   Description: The Vue frontend makes an API call to the Hono backend, which in turn fetches data from `openbadges-modular-server`. This data is then displayed in a Vue component.
    *   Expected Result: Data (e.g., a list of issuers or badge classes) is correctly displayed on the page.
    *   Actual Result:
    *   Status: [Pass/Fail]

6.  **Test Case 6: Vue Plugins Verification**
    *   Description: Confirm that `unplugin-vue-router` correctly sets up routes based on file structure, `unplugin-auto-import` makes Vue/Router APIs available without explicit imports, and `unplugin-vue-components` auto-imports local and `openbadges-ui` components.
    *   Expected Result: Routing works, no "not defined" errors for auto-imported items, components render correctly.
    *   Actual Result:
    *   Status: [Pass/Fail]

## Issues Encountered

| Issue | Description | Resolution | Status |
|-------|-------------|------------|--------|
| #1    |             |            |        |

## Code Changes

### Files Modified/Created

- `.gitignore`
- `README.md` (Project README)
- `bun.lock`
- `package.json`
- `docker-compose.yml`
- `index.html` (Vite entry point for Vue app)
- `index.ts` (Main entry point, likely for Bun server)
- `postcss.config.js`
- `tailwind.config.js`
- `tsconfig.json` (TypeScript configuration for the project)
- `tsconfig.node.json` (TypeScript configuration for Node.js specific parts, e.g. Vite config)
- `vite.config.ts` (Vite configuration file)
- `src/server/index.ts` (Hono backend entry point)
- `src/client/main.ts` (Vue 3 application entry point)
- `src/client/App.vue` (Root Vue component)
- `src/client/vue-shim.d.ts` (Vue TypeScript shim file)
- `src/client/assets/` (Directory for static client assets like images, fonts)
- `src/client/components/` (Directory for local Vue components)
- `src/client/composables/` (Directory for Vue composables)
- `src/client/layouts/` (Directory for Vue layout components)
- `src/client/pages/` (Directory for Vue pages/routes, e.g., `index.vue`)
- `src/client/stores/` (Directory for Pinia stores or other state management)

### Key Changes

(To be populated)

## Review Checklist

- [ ] Code follows project conventions (maintain clarity and simplicity for the demo).
- [ ] All requirements for the basic demo stack are met.
- [ ] Vue plugins (`unplugin-vue-router`, `unplugin-auto-import`, `unplugin-vue-components`) are configured and demonstrably working.
- [ ] Docker Compose setup for `openbadges-modular-server` is functional and uses SQLite.
- [ ] Dependencies (`openbadges-ui`, `openbadges-types`) are correctly installed and utilized.
- [ ] Basic end-to-end data flow (Vue -> Hono -> Modular Server -> Vue) is working.
- [ ] All test cases pass.

## Notes

*   Port Management: `openbadges-modular-server` might default to port 3000. The monolith's Hono backend should use a different port (e.g., 8080). The Vue dev server (Vite) will also use its own port (e.g., 5173).
*   Simplicity: For this demo, prioritize a minimal viable setup. Advanced features, extensive error handling, or complex UI can be deferred.
*   `.env` files: The `openbadges-modular-server` uses `.env` for configuration. This will be managed within its Docker service definition in `docker-compose.yml`. The monolith might also use an `.env` file for its own configuration (e.g., the URL of the modular server).

## References

- [openbadges-modular-server](https://github.com/rollercoaster-dev/openbadges-modular-server)
- [openbadges-ui](https://github.com/rollercoaster-dev/openbadges-ui)
- [openbadges-types](https://github.com/rollercoaster-dev/openbadges-types)
- [Bun Documentation](https://bun.sh/docs)
- [Hono Documentation](https://hono.dev/)
- [Vue 3 Documentation](https://vuejs.org/guide/introduction.html)
- [Vite Documentation](https://vitejs.dev/guide/)
- [unplugin-vue-router](https://github.com/posva/unplugin-vue-router)
- [unplugin-auto-import](https://github.com/unplugin/unplugin-auto-import)
- [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components)
