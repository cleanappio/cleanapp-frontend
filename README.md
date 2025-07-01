# CleanApp Frontend

A Next.js application for CleanApp's property monitoring and reporting system.

## Features

### CleanApp Pro Page
The `/cleanapppro` page now displays real data from the CleanApp API:

#### ReportOverview Component
- **Real Report Data**: Displays actual report information including coordinates, timestamps, and analysis details
- **Full Report Fetching**: Automatically fetches complete report data including high-resolution images using `/api/v3/reports/by-seq?seq=<seq>`
- **Image Display**: Handles images from bytes arrays, converting them to displayable data URLs
- **Interactive Display**: Shows report details overlay with:
  - Report ID and sequence number
  - GPS coordinates
  - Timestamp
  - Litter probability percentage
  - Hazard probability percentage
  - Severity level (1-10 scale)
  - AI analysis summary
- **Error Handling**: Graceful error states with retry functionality
- **Loading States**: Visual feedback during data fetching

#### RecentReports Component
- **Live Data**: Fetches recent reports with images using `/api/v3/reports/by-id?id=<id>&n=<N>` or `/api/v3/reports/last?n=10`
- **Image Processing**: Converts bytes array images to displayable format for each report card
- **Dynamic Content**: Displays real report cards with:
  - Report images from bytes arrays or URLs
  - Priority indicators based on severity levels
  - Category classification (Litter/Hazard/General)
  - Probability percentages
  - GPS coordinates
- **Statistics Dashboard**: Real-time statistics showing:
  - Total report count
  - High/Medium priority breakdown
  - Litter issue count
- **Responsive Design**: Grid layout that adapts to different screen sizes

#### Navbar Component
- **Dynamic Title**: Displays the actual title from `reportItem.analysis.title`
- **Real Coordinates**: Shows actual GPS coordinates from the report
- **Live Timestamp**: Displays the real timestamp from the report

### Image Handling
The application now supports multiple image formats:
- **Bytes Arrays**: JPEG images coming as number arrays are converted to base64 data URLs
- **URL Strings**: Direct image URLs are supported as before
- **Fallback Handling**: Graceful fallbacks when images are unavailable

#### Image Utilities (`src/lib/image-utils.ts`)
- `bytesToDataUrl(bytes: number[], mimeType?: string)`: Converts bytes array to data URL
- `getDisplayableImage(imageData: number[] | string | null)`: Universal image converter

### Data Flow
1. **Report Selection**: Users click on reports from the GlobeView map
2. **URL Parameters**: Report data is passed via URL query parameters
3. **API Integration**: Components fetch additional data from CleanApp's live API
4. **Image Processing**: Bytes arrays are converted to displayable format
5. **Real-time Updates**: Recent reports are updated dynamically

### API Endpoints Used
- `GET /api/v3/reports/by-seq?seq=<seq>` - Fetch full report details with images
- `GET /api/v3/reports/by-id?id=<id>&n=<N>` - Fetch recent reports around a specific ID
- `GET /api/v3/reports/last?n=10` - Fetch latest reports

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Environment Variables
```bash
NEXT_PUBLIC_LIVE_API_URL=https://live.cleanapp.io
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### Installation
```bash
npm install
npm run dev
```

### Building
```bash
npm run build
npm start
```

## Component Architecture

### ReportOverview
- **Props**: `reportItem?: LatestReport | null`
- **State**: `fullReport`, `loading`, `error`
- **API Calls**: Fetches complete report data when a report is selected
- **Image Handling**: Uses `getDisplayableImage()` utility for bytes array conversion

### RecentReports
- **Props**: `reportItem?: LatestReport | null`
- **State**: `recentReports`, `loading`, `error`
- **API Calls**: Fetches recent reports list with images
- **Image Processing**: Converts bytes arrays to displayable format for each card

### Navbar
- **Props**: `reportItem?: LatestReport | null`
- **Dynamic Content**: Displays real title, coordinates, and timestamp from report data

### Data Types
```typescript
interface LatestReport {
  report: {
    seq: number;
    timestamp: string;
    id: string;
    latitude: number;
    longitude: number;
  };
  analysis: {
    seq: number;
    source: string;
    analysis_text: string;
    analysis_image: number[] | string | null; // Bytes array, URL, or null
    title: string;
    description: string;
    litter_probability: number;
    hazard_probability: number;
    severity_level: number;
    summary: string;
    created_at: string;
    updated_at: string;
  };
}
```

## Error Handling
- Network errors are caught and displayed with retry options
- Image loading failures are handled gracefully
- Bytes array conversion errors are logged and handled
- Loading states provide user feedback
- Empty states guide users on next steps

## Performance
- Images are optimized using Next.js Image component
- Bytes arrays are efficiently converted to base64
- API calls are debounced and cached appropriately
- Loading states prevent UI blocking
- Error boundaries prevent component crashes

## Image Processing
The application handles images in multiple formats:
1. **Bytes Arrays**: Number arrays representing JPEG data are converted to base64 data URLs
2. **URL Strings**: Direct image URLs are used as-is
3. **Null Values**: Graceful fallback to placeholder content
4. **Error Handling**: Failed image loads show fallback content

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
