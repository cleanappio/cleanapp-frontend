# CleanApp Frontend

A modern React/Next.js frontend for the CleanApp service management platform.

## Features

- User authentication and authorization
- Subscription management with Stripe integration
- Service area selection with interactive map drawing
- Multi-language support (English, Montenegrin)
- Responsive design with Tailwind CSS
- Real-time billing and payment management

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_AREAS_API_URL=http://localhost:8081

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Authentication
NEXT_PUBLIC_AUTH_API_URL=http://localhost:8082
```

### Environment Variables Explained

- `NEXT_PUBLIC_API_URL`: Main API service URL for customer, subscription, and billing endpoints
- `NEXT_PUBLIC_AREAS_API_URL`: Areas service URL for managing service areas and polygons
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key for payment processing
- `NEXT_PUBLIC_AUTH_API_URL`: Authentication service URL for user management

## API Clients

### Main API Client (`src/lib/api-client.ts`)
Handles customer, subscription, billing, and payment method operations.

### Areas API Client (`src/lib/areas-api-client.ts`)
Handles service area management including:
- Creating and updating areas with GeoJSON polygons
- Retrieving areas with viewport filtering
- Managing area counts and customer consent
- Health check endpoint

### Authentication API Client (`src/lib/auth-api-client.ts`)
Handles user authentication, registration, and session management.

## Areas API Usage

```typescript
import { areasApiClient } from '@/lib/areas-api-client';

// Create a new service area
await areasApiClient.createArea(
  'Downtown Service Area',
  geoJsonPolygon,
  'Service area covering downtown business district',
  'customer-123'
);

// Get areas within a bounding box
const areas = await areasApiClient.getAreasInBounds(
  40.7128, -74.0060, // Southwest corner
  40.7589, -73.9857  // Northeast corner
);

// Get total areas count
const count = await areasApiClient.getAreasCount();
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── components/          # React components
│   ├── AreasSelection.tsx    # Service area selection with map
│   ├── SearchableMap.tsx     # Interactive map component
│   └── ...
├── lib/                # API clients and utilities
│   ├── api-client.ts         # Main API client
│   ├── areas-api-client.ts   # Areas service API client
│   ├── auth-api-client.ts    # Authentication API client
│   └── ...
├── pages/              # Next.js pages
│   ├── checkout.tsx          # Subscription checkout
│   ├── dashboard.tsx         # User dashboard
│   └── ...
└── styles/             # Global styles
```

## Areas Service Integration

The frontend integrates with a dedicated areas service that manages GeoJSON polygons for service areas. The areas API client provides:

- **Area Creation**: Save drawn polygons as service areas
- **Area Retrieval**: Get areas with optional viewport filtering
- **Area Updates**: Modify existing service areas
- **Customer Association**: Link areas to specific customers
- **Consent Management**: Handle email consent updates

### Areas API Endpoints

- `GET /health` - Service health check
- `POST /api/v3/create_or_update_area` - Create or update service areas
- `GET /api/v3/get_areas` - Retrieve areas with optional viewport filtering
- `GET /api/v3/get_areas_count` - Get total areas count
- `POST /api/v3/update_consent` - Update customer email consent

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.
