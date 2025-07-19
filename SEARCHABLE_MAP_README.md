# SearchableMap Component

A React component that displays a Leaflet map with an integrated search box that uses the Google Maps Places API to search for locations and display them as interactive pins on the map.

## Features

- 🗺️ **Interactive Leaflet Map**: Built with react-leaflet for smooth map interactions
- 🔍 **Google Places Search**: Real-time search using Google Maps Places API
- 🔷 **GeoJSON Polygon Support**: Display custom polygons with styling and popups
- ✏️ **Drawing Tools**: Draw, edit, and delete custom polygons directly on the map
- ⚡ **Debounced Search**: 500ms delay to prevent excessive API calls
- 📍 **Interactive Markers**: Clickable pins with detailed popups
- 🎯 **Auto-centering**: Map automatically centers on search results
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Styled with Tailwind CSS

## Prerequisites

1. **Google Maps API Key**: You need a Google Maps API key with the Places API enabled
2. **Dependencies**: The component uses existing dependencies in your project:
   - `leaflet` and `react-leaflet` for map functionality
   - `lucide-react` for icons
   - `tailwindcss` for styling

## Setup

### 1. Get a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API** from the API Library
4. Create credentials (API Key) in the Credentials section
5. **Important**: Restrict the API key to your domain for security

### 2. Add API Key to Environment Variables

Create or update your `.env.local` file:

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Important**: Use `GOOGLE_MAPS_API_KEY` (not `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) to keep the API key secure on the server side.

## Usage

### Basic Usage

```tsx
import SearchableMap from '@/components/SearchableMap';

function MyComponent() {
  return (
    <SearchableMap 
      initialCenter={[40.7128, -74.0060]} // New York
      initialZoom={13}
      height="600px"
    />
  );
}
```

**Note**: The API key is now configured on the server side via environment variables, so you don't need to pass it as a prop.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialCenter` | `[number, number]` | `[40.7128, -74.0060]` | Initial map center coordinates (lat, lng) |
| `initialZoom` | `number` | `13` | Initial map zoom level |
| `height` | `string` | `"600px"` | Height of the map container |
| `polygons` | `GeoJSONPolygon[]` | `[]` | Array of GeoJSON polygons to display on the map |
| `enableDrawing` | `boolean` | `false` | Enable drawing tools for creating custom polygons |
| `onPolygonCreated` | `(polygon: GeoJSONPolygon) => void` | - | Callback when a new polygon is drawn |
| `onPolygonEdited` | `(polygon: GeoJSONPolygon, index: number) => void` | - | Callback when a polygon is edited |
| `onPolygonDeleted` | `(index: number) => void` | - | Callback when a polygon is deleted |

## Component Structure

The SearchableMap component consists of:

1. **Search Box**: Input field with search icon and clear button
2. **Search Results**: Dropdown list of search results with location details
3. **Map Container**: Leaflet map with OpenStreetMap tiles
4. **Drawing Tools**: Toolbar for creating, editing, and deleting polygons
5. **Markers**: Interactive pins for each search result
6. **Polygons**: GeoJSON polygons with custom styling and popups
7. **Popups**: Detailed information when clicking markers or polygons

## API Integration

The component uses a server-side API route to proxy requests to the Google Maps Places API:

```
GET /api/places-search?query={query}
```

This approach:
- Avoids CORS issues by proxying requests through the server
- Keeps the API key secure on the server side
- Provides better error handling and logging

### Response Handling

The component processes the API response and extracts:
- Place ID
- Formatted address
- Location coordinates (latitude/longitude)
- Place name

## Search Behavior

- **Debouncing**: Search is triggered 500ms after the user stops typing
- **Auto-centering**: Map automatically centers on the first search result
- **Zoom adjustment**: Map zooms to level 15 for search results
- **Result selection**: Clicking a result centers the map and highlights the marker

## Styling

The component uses Tailwind CSS classes for styling. Key styling features:

- Responsive design that works on all screen sizes
- Modern input styling with focus states
- Hover effects on interactive elements
- Clean, professional appearance
- Consistent spacing and typography

## Error Handling

The component includes error handling for:

- Invalid API keys
- Network errors
- API rate limiting
- Empty search results
- Missing location data

## Browser Compatibility

- Modern browsers with ES6+ support
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires internet connection for map tiles and API calls

## Performance Considerations

- Debounced search prevents excessive API calls
- Efficient marker rendering with React keys
- Minimal re-renders with proper state management
- Lazy loading of map tiles

## Security Notes

- Always restrict your Google Maps API key to your domain
- Never expose API keys in client-side code for production
- Consider implementing server-side API calls for sensitive applications
- Monitor API usage to avoid unexpected charges

## Drawing Tools

The SearchableMap component includes powerful drawing and editing tools powered by Leaflet-Geoman. When `enableDrawing` is set to `true`, a toolbar appears on the map with the following tools:

### Available Tools

| Tool | Icon | Description |
|------|------|-------------|
| **Draw Polygon** | ✏️ | Click to create vertices, double-click to finish |
| **Edit Mode** | 🔧 | Drag vertices to reshape polygons |
| **Drag Mode** | 🖐️ | Move entire polygons to new locations |
| **Delete Mode** | 🗑️ | Click polygons to remove them |

### Drawing Workflow

1. **Enable Drawing**: Set `enableDrawing={true}` on the SearchableMap component
2. **Draw Polygon**: Click the polygon tool and click on the map to create vertices
3. **Finish Drawing**: Double-click to complete the polygon
4. **Edit Polygon**: Use the edit tool to modify the shape
5. **Move Polygon**: Use the drag tool to relocate the polygon
6. **Delete Polygon**: Use the delete tool to remove unwanted polygons

## Polygon Properties

The `polygons` prop accepts an array of GeoJSON Feature objects with Polygon geometry. Each polygon can have the following properties:

### Styling Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `color` | `string` | `'#3388ff'` | Border color (hex, rgb, or named color) |
| `fillColor` | `string` | `'#3388ff'` | Fill color |
| `fillOpacity` | `number` | `0.2` | Fill opacity (0-1) |
| `weight` | `number` | `2` | Border line width |
| `opacity` | `number` | `1` | Border opacity (0-1) |

### Popup Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Displayed in popup title |
| `description` | `string` | Displayed in popup body |

### Example Polygon Structure

```tsx
{
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [longitude1, latitude1],
      [longitude2, latitude2],
      [longitude3, latitude3],
      [longitude1, latitude1] // Must close the polygon
    ]]
  },
  properties: {
    name: 'Area Name',
    description: 'Area description',
    color: '#ff4444',
    fillColor: '#ff4444',
    fillOpacity: 0.3,
    weight: 3
  }
}
```

## Examples

### Demo Pages

- Visit `/searchable-map-demo` to see a basic demo with setup instructions
- Visit `/searchable-map-polygons-demo` to see the polygon functionality in action
- Visit `/searchable-map-drawing-demo` to see the drawing and editing tools in action

### Simple Example

```tsx
// src/components/SearchableMapExample.tsx
import SearchableMap from './SearchableMap';

export default function SearchableMapExample() {
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Location Search</h1>
      <SearchableMap 
        initialCenter={[51.505, -0.09]}
        initialZoom={10}
        height="600px"
      />
    </div>
  );
}
```

### With Polygons Example

```tsx
import SearchableMap from '@/components/SearchableMap';

const polygons = [
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-74.006, 40.7128],
        [-74.006, 40.7228],
        [-73.996, 40.7228],
        [-73.996, 40.7128],
        [-74.006, 40.7128]
      ]]
    },
    properties: {
      name: 'Downtown Manhattan',
      description: 'Financial district and business center',
      color: '#ff4444',
      fillColor: '#ff4444',
      fillOpacity: 0.3,
      weight: 3
    }
  }
];

function MyComponent() {
  return (
    <SearchableMap 
      initialCenter={[40.7128, -74.0060]}
      initialZoom={12}
      height="600px"
      polygons={polygons}
    />
  );
}
```

### With Drawing Tools Example

```tsx
import SearchableMap from '@/components/SearchableMap';

function MyComponent() {
  const [polygons, setPolygons] = useState([]);
  const [enableDrawing, setEnableDrawing] = useState(false);

  const handlePolygonCreated = (polygon) => {
    setPolygons(prev => [...prev, polygon]);
  };

  const handlePolygonEdited = (polygon, index) => {
    setPolygons(prev => {
      const newPolygons = [...prev];
      newPolygons[index] = polygon;
      return newPolygons;
    });
  };

  const handlePolygonDeleted = (index) => {
    setPolygons(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SearchableMap 
      initialCenter={[40.7128, -74.0060]}
      initialZoom={12}
      height="600px"
      enableDrawing={enableDrawing}
      onPolygonCreated={handlePolygonCreated}
      onPolygonEdited={handlePolygonEdited}
      onPolygonDeleted={handlePolygonDeleted}
    />
  );
}
```

## Troubleshooting

### Common Issues

1. **"API key not valid" error**
   - Ensure the Places API is enabled in Google Cloud Console
   - Check that the API key is correctly copied
   - Verify domain restrictions are set correctly

2. **No search results**
   - Check browser console for API errors
   - Verify API key has sufficient quota
   - Ensure search query is not too specific

3. **Map not loading**
   - Check internet connection
   - Verify Leaflet CSS is imported
   - Ensure all dependencies are installed

4. **Markers not appearing**
   - Check API response format
   - Verify coordinates are valid numbers
   - Ensure Leaflet icon configuration is correct

### Debug Mode

Add console logging to debug issues:

```tsx
// In SearchableMap component, uncomment console.log statements
console.log('API response:', data);
console.log('Search results:', results);
```

## Contributing

When modifying the SearchableMap component:

1. Maintain TypeScript types for all props and state
2. Follow the existing code style and patterns
3. Test with different API responses
4. Ensure responsive design works on all devices
5. Update documentation for any new features

## License

This component is part of the CleanApp frontend project and follows the same licensing terms. 