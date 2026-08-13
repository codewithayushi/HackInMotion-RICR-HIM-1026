# Smart City Issue Reporting & Resolution Platform

> "Because a pothole reported today shouldn't still be a pothole six months from now."

## Overview

A comprehensive web platform that enables citizens to report civic issues with location and photo evidence, while providing city administrators with powerful tools to manage, route, and resolve issues efficiently.

## Features

### Citizens
- Report issues with map-based location selection
- Upload photo evidence (up to 5 images)
- Track issue status in real-time
- View nearby issues on interactive map
- Upvote existing issues
- Receive notifications on status updates

### Administrators
- Department-specific issue queues
- Status workflow management (Reported → Acknowledged → In Progress → Resolved → Verified → Closed)
- Resolution notes and proof photos
- City-wide analytics dashboard
- Performance metrics and hotspot detection
- SLA monitoring and escalation

### Smart Features
- AI-powered duplicate detection
- Automated department routing
- Real-time status updates
- Interactive city map view
- Comprehensive analytics

## Tech Stack

### Frontend
- React.js 18
- React Router v6
- Leaflet.js for maps
- TailwindCSS
- Chart.js & Recharts
- Axios

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT Authentication
- Multer for file uploads
- Socket.IO for real-time updates

### Infrastructure
- Docker & Docker Compose
- AWS S3 for image storage
- Nginx for reverse proxy

## Quick Start

### Prerequisites
- Node.js v16+
- MongoDB 6.0+
- Docker (optional)

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd smart-city-platform