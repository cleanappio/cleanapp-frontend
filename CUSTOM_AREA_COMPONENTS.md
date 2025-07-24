# Custom Area Components

This document describes the universal `CustomAreaDashboard` and `CustomAreaMap` components that can be used to create area-specific dashboards for any country or region.

## Components Overview

### CustomAreaDashboard
A universal dashboard component that provides a complete interface for viewing area-specific reports and statistics.

### CustomAreaMap
A universal map component that displays area boundaries, reports, and statistics with configurable administrative levels.

## Usage

### Basic Usage

```tsx
import CustomAreaDashboard from '../components/CustomAreaDashboard';

export default function MyAreaPage() {
  return (
    <CustomAreaDashboard 
      apiUrl="https://your-api-url.com"
      mapCenter={[latitude, longitude]}
      adminLevel={2}
      subAdminLevel={6}
      countryOsmId={-12345}
      areaName="My Country"
      areaFlag="🏳️"
    />
  );
}
```

### Parameters

#### CustomAreaDashboard Props

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiUrl` | `string` | Yes | The base URL for the area's API endpoint |
| `mapCenter` | `[number, number]` | Yes | The center coordinates for the map (latitude, longitude) |
| `adminLevel` | `number` | Yes | The administrative level for country boundaries (typically 2) |
| `subAdminLevel` | `number` | Yes | The administrative level for sub-areas like municipalities (typically 6) |
| `countryOsmId` | `number` | Yes | The OpenStreetMap ID for the country/area |
| `areaName` | `string` | Yes | The display name for the area |
| `areaFlag` | `string` | No | Optional flag emoji to display in the header |

#### CustomAreaMap Props

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mapCenter` | `[number, number]` | Yes | The center coordinates for the map |
| `apiUrl` | `string` | Yes | The base URL for the area's API endpoint |
| `adminLevel` | `number` | Yes | The administrative level for country boundaries |
| `subAdminLevel` | `number` | Yes | The administrative level for sub-areas |
| `countryOsmId` | `number` | Yes | The OpenStreetMap ID for the country/area |
| `areaName` | `string` | No | Optional area name for internal use |

## Administrative Levels

The components use OpenStreetMap administrative levels:

- **Admin Level 2**: Country boundaries
- **Admin Level 6**: Municipality/county boundaries

These levels can be adjusted based on your specific area's administrative structure.

## API Requirements

The components expect the following API endpoints:

### Required Endpoints

1. **Reports**: `${apiUrl}/reports?osm_id=${countryOsmId}&n=1000`
2. **Aggregated Data**: `${apiUrl}/reports_aggr`
3. **Country Polygons**: `${apiUrl}/polygons?osm_id=${countryOsmId}&admin_level=${adminLevel}`
4. **Municipality Polygons**: `${apiUrl}/polygons?osm_id=${countryOsmId}&admin_level=${subAdminLevel}`

### API Response Formats

#### Reports Response
```json
{
  "reports": [
    {
      "report": {
        "seq": 12345,
        "timestamp": "2024-01-01T12:00:00Z",
        "id": "report-id",
        "latitude": 42.7087,
        "longitude": 19.3744,
        "image": "image-url"
      },
      "analysis": {
        "seq": 12345,
        "title": "Report Title",
        "description": "Report Description",
        "litter_probability": 0.8,
        "hazard_probability": 0.2,
        "severity_level": 0.7,
        "summary": "Report Summary"
      }
    }
  ]
}
```

#### Aggregated Data Response
```json
{
  "areas": [
    {
      "osm_id": 12345,
      "name": "Area Name",
      "reports_count": 100,
      "reports_max": 200,
      "reports_mean": 150,
      "mean_severity": 0.6,
      "mean_litter_probability": 0.7,
      "mean_hazard_probability": 0.3
    }
  ]
}
```

#### Polygons Response
```json
{
  "polygons": [
    {
      "osm_id": 12345,
      "name": "Area Name",
      "area": {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[lat1, lng1], [lat2, lng2], ...]]
        }
      }
    }
  ]
}
```

## Examples

### Montenegro Dashboard
```tsx
<CustomAreaDashboard 
  apiUrl={process.env.NEXT_PUBLIC_MONTENEGRO_API_URL || ''}
  mapCenter={[42.7087, 19.3744]}
  adminLevel={2}
  subAdminLevel={6}
  countryOsmId={-53296}
  areaName="Montenegro"
  areaFlag="🇲🇪"
/>
```

### Custom Country Dashboard
```tsx
<CustomAreaDashboard 
  apiUrl="https://api.mycountry.com"
  mapCenter={[40.7128, -74.0060]}
  adminLevel={2}
  subAdminLevel={6}
  countryOsmId={-12345}
  areaName="My Country"
  areaFlag="🏳️"
/>
```

## Features

- **Interactive Map**: View area boundaries and reports
- **Statistics Mode**: Color-coded areas based on report statistics
- **Reports Mode**: View individual report markers
- **Report Management**: Mark reports as fixed and remove them from the map
- **Authentication**: Secure access with bearer token authentication
- **Multi-language Support**: Built-in internationalization support
- **Responsive Design**: Works on desktop and mobile devices

## Migration from Montenegro Components

The new components are backward compatible. To migrate from the old Montenegro components:

1. Replace `MontenegroDashboard` with `CustomAreaDashboard`
2. Replace `MontenegroMap` with `CustomAreaMap`
3. Add the required props as shown in the examples above
4. Update any import statements

The old Montenegro components can be safely removed after migration. 