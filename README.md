# Climatrix: Climate Data Management and Geospatial Analytics Platform

A full-stack MERN (MongoDB, Express.js, React.js, Node.js) platform for ingesting, validating, analyzing, and visualizing multi-variate climate records with localized spatial heatmaps and interactive trends.

---

## Table of Contents
1. [Overview](#overview)
2. [Key Capabilities](#key-capabilities)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Directory Hierarchy](#directory-hierarchy)
6. [Data Models and Schemas](#data-models-and-schemas)
7. [REST API Specifications](#rest-api-specifications)
8. [Installation and Setup](#installation-and-setup)
9. [Sample Dataset Specifications](#sample-dataset-specifications)
10. [Academic and Viva Defense Reference](#academic-and-viva-defense-reference)

---

## Overview

Climatrix addresses the challenge of managing fragmented meteorological and environmental observation datasets. The platform enables climate researchers, meteorologists, and environmental scientists to upload raw comma-separated value (CSV) observation files, run automated schema validation and missing-value analysis, compute descriptive statistics, and render interactive temporal and spatial visualizations powered by Mapbox GL JS.

The user interface adheres to Apple Human Interface Guidelines and minimalist design standards, emphasizing clean typography, high contrast, subtle borders, and intuitive user workflows.

---

## Key Capabilities

* **Climate Event Correlation Explorer**: Empirical pairwise investigation comparing two climate variables across exact overlapping observation dates with Pearson correlation coefficient calculation ($r \in [-1, 1]$), descriptive strength heuristic classification, bivariate scatter plotting, and synchronized dual-axis time-series visualization.
* **Research Workspaces**: Collaborative project spaces organized around central scientific research questions. Workspaces support attaching dataset references without data duplication, persisting correlation analysis snapshots, recording dated research notes, linking external research outputs, and enforcing role-based permissions (Owner, Editor, Viewer).
* **Manual User Authentication**: Secure JSON Web Token (JWT) based email and password registration and login without third-party OAuth dependencies.
* **Stream-Based CSV Ingestion**: High-throughput file parsing with automated header extraction, missing value detection, data type casting, and spatial coordinate boundary validation (latitude [-90, 90], longitude [-180, 180]).
* **Area and City Level Localized Analytics**: Dynamic spatial segmentation enabling users to drill down into specific municipalities or review nationwide aggregates.
* **Statistical Computation Engine**: Real-time evaluation of descriptive statistics including mean, minimum, maximum, median, standard deviation, and observation counts.
* **Interactive Temporal Analytics**: Responsive line and bar visualizations rendered via Recharts, dynamically aggregated by day or by station.
* **Geospatial Density Heatmaps**: Mapbox GL JS integration providing dynamic density gradients, layer style toggles (Light, Dark, Satellite, Terrain), observation station pins, and inspection overlays.
* **Multi-Point CSV Export**: Downloadable raw datasets and filtered subsets accessible from the dataset manager, preview modals, and analytical dashboards.
* **Zero-Setup Demonstration Fallback**: Integrated in-memory model proxies ensuring uninterrupted local evaluation and oral presentation even when external database daemons are offline.

---

## Technology Stack

### Frontend (Client Tier)
* **Framework**: React 18 with Vite build tooling
* **Styling**: Tailwind CSS, custom design tokens based on Apple design principles
* **Cartography & Maps**: Mapbox GL JS (v3)
* **Data Visualization**: Recharts (v2)
* **Typography**: DM Sans (Display), Inter (Body), JetBrains Mono (Data/Metrics)
* **Icons**: Lucide React
* **HTTP Client**: Axios with Bearer token request interceptors

### Backend (Server Tier)
* **Runtime**: Node.js (v18+)
* **Framework**: Express.js
* **Database Object Modeling**: Mongoose (v8)
* **Database**: MongoDB (with automated in-memory proxy fallback for offline demonstrations)
* **Authentication**: JSON Web Tokens (jsonwebtoken)
* **File Upload Handling**: Multer with 10MB memory-disk buffers
* **CSV Parsing**: Streaming row-level validation parser

---

## System Architecture

```
+-----------------------------------------------------------------------+
|                           CLIENT TIER (React)                         |
|  - Auth Views (Sign In / Register)                                    |
|  - Dashboard (Aggregated Metrics, Recents)                            |
|  - Datasets Manager (Upload, CRUD, Table Preview, CSV Download)       |
|  - Analytics (Localized Dropdown Filter, Recharts Line/Bar Series)     |
|  - Geospatial Explorer (Mapbox GL JS Heatmap, Coordinate Inspection)  |
+-----------------------------------^-----------------------------------+
                                    | HTTP / REST (JWT Bearer Auth)
+-----------------------------------v-----------------------------------+
|                        BACKEND TIER (Node/Express)                    |
|  - Auth Controller: Token generation, credential verification         |
|  - Dataset Controller: Multer intake, schema validator, stats engine  |
|  - Middleware: JWT authentication guard, error handlers               |
+-----------------------------------^-----------------------------------+
                                    | Mongoose ODM / Driver
+-----------------------------------v-----------------------------------+
|                           DATABASE TIER                               |
|  - MongoDB: Users Collection, Datasets Collection                     |
|  - In-Memory Mock Store (Active during offline viva demonstrations)   |
+-----------------------------------------------------------------------+
```

---

## Directory Hierarchy

```
Climatrix/
├── sample_data/
│   ├── india_climate_dataset_2026.csv   # 110-observation, 11-city benchmark dataset
│   └── sample_climate_data.csv          # Introductory verification dataset
│
├── server/                              # Express REST API Tier
│   ├── config/
│   │   └── db.js                        # MongoDB Mongoose connection manager
│   ├── controllers/
│   │   ├── authController.js            # User signup, login, and profile controllers
│   │   ├── datasetController.js         # Dataset upload, retrieval, analytics, and export
│   │   ├── analysisController.js        # Bivariate climate correlation computation
│   │   └── workspaceController.js       # Workspace CRUD, membership, notes, and activity
│   ├── middleware/
│   │   ├── authMiddleware.js            # JWT verification and route protection
│   │   └── uploadMiddleware.js          # Multer storage configuration
│   ├── models/
│   │   ├── User.js                      # User document schema and in-memory mock proxy
│   │   ├── Dataset.js                   # Dataset document schema and in-memory mock proxy
│   │   ├── ResearchWorkspace.js         # Collaborative workspace model with role policies
│   │   ├── WorkspaceNote.js             # Dated researcher observation notes
│   │   ├── SavedAnalysis.js             # Persisted correlation snapshots and chart states
│   │   ├── WorkspaceActivity.js         # Audit log for workspace operations
│   │   └── ResearchOutput.js            # Linked agency reports, findings, and papers
│   ├── routes/
│   │   ├── authRoutes.js                # Endpoints for /api/auth
│   │   ├── datasetRoutes.js             # Endpoints for /api/datasets
│   │   ├── analysisRoutes.js            # Endpoints for /api/analyses
│   │   └── workspaceRoutes.js           # Endpoints for /api/workspaces
│   ├── services/
│   │   └── correlationService.js        # Pearson math, pairwise-complete filter, zero-variance check
│   ├── test/
│   │   └── test_correlation_workspaces.js # Unit test suite with fixtures and permission tests
│   ├── utils/
│   │   ├── csvParser.js                 # Header extraction and validation routines
│   │   └── statsEngine.js               # Mathematical aggregation engine
│   ├── .env.example                     # Backend environment configuration template
│   └── server.js                        # Express server bootstrap
│
└── client/                              # React Single Page Application Tier
    ├── public/
    │   ├── india_climate_dataset_2026.csv
    │   └── sample_climate_data.csv
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.jsx              # Navigation controller with session state
    │   │   ├── Dashboard.jsx            # High-level metrics overview
    │   │   ├── Datasets.jsx             # Dataset records table, preview modal, export
    │   │   ├── Analytics.jsx            # City filter dropdown, statistics cards, Recharts
    │   │   ├── Geospatial.jsx           # Dedicated Mapbox interactive explorer
    │   │   ├── CorrelationExplorer.jsx  # Feature 4: Empirical correlation builder & charts
    │   │   ├── Workspaces.jsx           # Feature 5: Research workspace list & detail sections
    │   │   ├── UploadModal.jsx          # Drag-and-drop CSV modal with schema check
    │   │   └── MapboxHeatmap.jsx        # Mapbox GL JS lifecycle management and heatmap layers
    │   ├── context/
    │   │   └── AuthContext.jsx          # Session state provider and token manager
    │   ├── pages/
    │   │   └── AuthPage.jsx             # Manual authentication interface
    │   ├── services/
    │   │   └── api.js                   # Axios client with request interceptors
    │   ├── App.jsx                      # Primary layout router
    │   ├── main.jsx                     # Application entry point
    │   └── index.css                    # Design tokens and font imports
    ├── .env.example                     # Frontend environment configuration template
    ├── package.json                     # Frontend dependencies
    └── vite.config.js                   # Vite configuration
```

---

## Data Models and Schemas

### User Schema (`server/models/User.js`)
| Field | Type | Attributes | Description |
|---|---|---|---|
| `_id` | ObjectId / String | Primary Key | Unique user identifier |
| `name` | String | Required | Full name of the researcher or student |
| `email` | String | Required, Unique, Lowercase | Authentication account identifier |
| `password` | String | Required | Account credential |
| `role` | String | Default: 'Researcher' | Role designation |
| `createdAt` | Date | Timestamp | Record creation timestamp |

### Dataset Schema (`server/models/Dataset.js`)
| Field | Type | Attributes | Description |
|---|---|---|---|
| `_id` | ObjectId / String | Primary Key | Unique dataset identifier |
| `userId` | ObjectId / String | Foreign Key | Owner reference |
| `name` | String | Required | Human-readable dataset title |
| `originalFileName` | String | Required | Uploaded source file name |
| `columns` | Array of Strings | Required | Parsed column headers |
| `parameters` | Array of Strings | Detected | Numerical metrics available (temperature, rainfall, etc.) |
| `locations` | Array of Strings | Detected | Unique geographic locations/cities identified in dataset |
| `rowCount` | Number | Integer | Total observation rows processed |
| `columnCount` | Number | Integer | Total columns processed |
| `missingValueCount` | Number | Integer | Count of missing or unparseable cells |
| `hasCoordinates` | Boolean | Boolean | Flag indicating latitude and longitude presence |
| `records` | Array of Objects | Subdocuments | Ingested observation data points |

---

## REST API Specifications

### Authentication Endpoints
* `POST /api/auth/signup`: Create a new user account with `name`, `email`, and `password`. Returns JWT token and user profile.
* `POST /api/auth/login`: Authenticate existing credentials with `email` and `password`. Returns JWT token.
* `GET /api/auth/me`: Retrieve current user profile using Bearer token.

### Dataset Management Endpoints
* `POST /api/datasets`: Ingest and validate a multipart CSV file.
* `GET /api/datasets`: List all datasets owned by or accessible to the authenticated user.
* `GET /api/datasets/:id`: Fetch dataset metadata, columns, and records for tabular preview.
* `PATCH /api/datasets/:id`: Update dataset title.
* `DELETE /api/datasets/:id`: Remove dataset and associated records.
* `GET /api/datasets/:id/download`: Stream dataset records back as a downloadable `.csv` file.

### Analytics and Visualization Endpoints
* `GET /api/datasets/:id/statistics?parameter={metric}&location={city}`: Compute mean, minimum, maximum, median, standard deviation, and count.
* `GET /api/datasets/:id/chart?parameter={metric}&location={city}`: Generate aggregated time-series or cross-location series for Recharts.
* `GET /api/datasets/:id/geojson?parameter={metric}&location={city}`: Generate GeoJSON FeatureCollection formatted for Mapbox GL JS heatmap and point rendering.

### Climate Correlation Explorer Endpoints (Feature 4)
* `POST /api/analyses/correlation`: Validate Source A and Source B variables, execute exact-date and location alignment, filter non-finite pairs under pairwise-complete policy, verify minimum sample size and non-zero variance, and compute Pearson correlation coefficient ($r$), scatter dataset, and synchronized dual-axis time series.
* `GET /api/analyses/:id`: Retrieve a saved correlation snapshot with verified workspace membership authorization.

### Research Workspace Endpoints (Feature 5)
* `GET /api/workspaces`: List all workspaces accessible to the authenticated user with filter support (`all`, `owned`, `shared`, `archived`) and aggregate counts.
* `POST /api/workspaces`: Create a new research workspace with a mandatory title (3–100 chars) and central research question (10–500 chars).
* `GET /api/workspaces/:id`: Fetch comprehensive workspace details including attached datasets, saved analyses, notes, linked outputs, activity logs, and current user role.
* `PATCH /api/workspaces/:id`: Update workspace metadata (Owner/Editor).
* `DELETE /api/workspaces/:id`: Permanently delete a workspace while preserving underlying datasets and external publications (Owner only).
* `POST /api/workspaces/:id/archive`: Move workspace into read-only archived state (Owner only).
* `POST /api/workspaces/:id/restore`: Restore an archived workspace to active collaborative status (Owner only).
* `POST /api/workspaces/:id/datasets`: Attach an existing dataset reference without duplicating records (Owner/Editor).
* `DELETE /api/workspaces/:id/datasets/:datasetId`: Detach dataset reference (Owner/Editor).
* `GET /api/workspaces/:id/analyses`: Retrieve saved analysis snapshots in workspace.
* `POST /api/workspaces/:id/analyses`: Persist an analysis configuration and result snapshot to workspace (Owner/Editor).
* `DELETE /api/workspaces/:id/analyses/:analysisId`: Delete saved analysis snapshot (Owner/Editor).
* `POST /api/workspaces/:id/notes`: Add a dated research observation note (Owner/Editor).
* `PATCH /api/workspaces/:id/notes/:noteId`: Update note content (Owner/Editor/Author).
* `DELETE /api/workspaces/:id/notes/:noteId`: Delete note (Owner/Editor/Author).
* `POST /api/workspaces/:id/outputs`: Link an external research paper, technical report, or published finding (Owner/Editor).
* `DELETE /api/workspaces/:id/outputs/:outputId`: Unlink research output (Owner/Editor).
* `POST /api/workspaces/:id/members`: Invite a registered researcher and assign Editor or Viewer role (Owner only).
* `PATCH /api/workspaces/:id/members/:memberUserId`: Update collaborator role (Owner only).
* `DELETE /api/workspaces/:id/members/:memberUserId`: Remove collaborator from workspace (Owner only).
* `GET /api/workspaces/users/search?q={query}`: Search registered researchers by name or email for collaborator invitation.

---

## Installation and Setup

### Prerequisites
* Node.js v18.0.0 or higher
* npm v9.0.0 or higher
* Optional: MongoDB v6.0+ (the system incorporates automatic in-memory mock proxies when MongoDB is offline)

### 1. Clone the Repository
```bash
git clone https://github.com/soujhi/Climatrix.git
cd Climatrix
```

### 2. Configure Backend Server
```bash
cd server
npm install
```
Create a `.env` file in `server/` (or duplicate `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/climatrix
JWT_SECRET=climatrix_jwt_secret_key_change_in_production_2026
CLIENT_URL=http://localhost:5173
```
Start the server:
```bash
npm run dev
```

### 3. Configure Frontend Client
In a new terminal window:
```bash
cd ../client
npm install
```
Create a `.env` file in `client/` (or duplicate `.env.example`):
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_MAPBOX_TOKEN=your_mapbox_public_token_here
```
Start the frontend development server:
```bash
npm run dev
```
Open `http://localhost:5173` in a web browser.

### 4. Run Automated Test Suite
To verify the Pearson correlation calculation fixtures, edge cases (zero variance, insufficient samples, missing value exclusion), and role-based workspace permissions:
```bash
node server/test/test_correlation_workspaces.js
```

---

## Sample Dataset Specifications

A comprehensive Indian national climate dataset is pre-seeded in the system and provided in two repository locations:
* `sample_data/india_climate_dataset_2026.csv`
* `client/public/india_climate_dataset_2026.csv`

### Dataset Attributes
* **Observation Count**: 110 records
* **Temporal Coverage**: 2026-01-01 through 2026-01-10 (daily observations)
* **Covered Municipalities**:
  * Chennai (Tamil Nadu)
  * Mumbai (Maharashtra)
  * Delhi (National Capital Region)
  * Bengaluru (Karnataka)
  * Kolkata (West Bengal)
  * Hyderabad (Telangana)
  * Ahmedabad (Gujarat)
  * Jaipur (Rajasthan)
  * Kochi (Kerala)
  * Shimla (Himachal Pradesh)
  * Guwahati (Assam)
* **Observed Metrics**:
  * Surface Temperature (degrees Celsius)
  * Precipitation / Rainfall (millimeters)
  * Relative Humidity (percentage)
  * Wind Velocity (kilometers per hour)

---

## Academic and Viva Defense Reference

### Architectural Design Justifications
1. **Decoupled Architecture**: Separating the React single-page application from the Express REST API ensures clear separation of concerns, independent deployability, and standard CORS protection.
2. **Schema Flexibility**: Climate datasets from distinct meteorological sources frequently contain heterogeneous columns. The Mongoose document schema captures primary geospatial attributes as indexed properties while placing arbitrary observation metrics into extensible key-value maps.
3. **In-Memory Fault-Tolerant Proxy**: Designed specifically for defense presentations in offline academic environments where local database services may not be running. The system automatically shifts to in-memory store proxies without breaking the REST contracts.
4. **Client-Side Spatial Rendering**: Offloading GeoJSON heatmap rendering to Mapbox GL JS on the browser GPU minimizes server workload, enabling fluid zoom, pitch, and layer changes at 60 frames per second.
5. **Stateful Filtering**: The Area/City localized analytics pipeline re-queries the backend with location bounds, returning mathematically sound subset statistics rather than computing naive client-side slices.
