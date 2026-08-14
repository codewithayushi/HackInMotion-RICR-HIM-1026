# 🛠️ SmartCity Issue Platform — API Documentation

Welcome to the official REST API documentation for the **SmartCity Issue Reporting & Municipal Governance Platform**.

---

## 🌐 Base URL

- **Production (Vercel Serverless)**: `https://hack-in-motion-ricr-him-1026.vercel.app/api`
- **Local Development**: `http://localhost:5000/api`

---

## 🔑 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Creates a new citizen or administrator account with 10-digit phone and 6-character password enforcement.

- **Request Body**:
```json
{
  "name": "Ayushi Pawar",
  "email": "ayushi@example.com",
  "password": "password123",
  "phone": "9876543210",
  "role": "citizen",
  "department": "roads"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 101,
    "name": "Ayushi Pawar",
    "email": "ayushi@example.com",
    "role": "citizen"
  }
}
```

---

### `POST /api/auth/login`
Authenticates existing citizen/admin and issues JWT Bearer token.

- **Request Body**:
```json
{
  "email": "ayushi@example.com",
  "password": "password123"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1...",
  "user": { "id": 101, "role": "citizen" }
}
```

---

### `GET /api/auth/me`
Retrieves currently logged-in user profile details (Requires `Authorization: Bearer <token>`).

---

### `PUT /api/auth/profile`
Updates full name and 10-digit mobile number. Role escalation restricted for citizens.

---

## 🗺️ 2. Geocoding & Address Autocomplete Endpoint (`/api/issues/geocode`)

### `GET /api/issues/geocode?q={query}`
Performs live address search and autocomplete using server-side Esri & OpenStreetMap engines.

- **Sample Request**: `GET /api/issues/geocode?q=Vijay+Nagar+Indore`
- **Response `200 OK`**:
```json
[
  {
    "name": "Vijay Nagar, Indore, Madhya Pradesh, 452010, India",
    "lat": "22.7533",
    "lon": "75.8937"
  }
]
```

---

## 📝 3. Issue Management Endpoints (`/api/issues`)

### `POST /api/issues`
Submits a new civic issue complaint with automatic spatial duplicate detection and auto-department routing.

- **Request Body**:
```json
{
  "title": "Deep Pothole on Main Road",
  "description": "Hazardous pothole near square causing traffic delays",
  "category": "roads",
  "priority": "high",
  "latitude": 22.7533,
  "longitude": 75.8937,
  "address": "Vijay Nagar, Indore",
  "photos": ["data:image/png;base64,..."]
}
```

---

### `GET /api/issues`
Lists all reported issues with filters (`category`, `status`, `department`).

---

### `GET /api/issues/:id`
Retrieves detailed information for a specific issue including status history and resolution proof.

---

### `POST /api/issues/:id/upvote`
Allows citizens to upvote existing reported issues to boost priority.

---

### `POST /api/issues/:id/reopen`
Allows citizens to reopen an issue if the resolution is unsatisfactory.

---

## 📊 4. Admin Management & Analytics (`/api/admin`)

### `GET /api/admin/dashboard`
Generates live database-driven analytics for municipal administrators:
- Total & Departmental Issue Counts
- Category & Status Breakdowns
- SLA Deadline Compliance
- Hotspot Map Coordinates

---

### `PUT /api/admin/issues/:id/status`
Updates status lifecycle (`Reported` -> `Acknowledged` -> `In Progress` -> `Resolved` -> `Closed`) with resolution notes and photo proof.
