import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/lib/auth-store';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useTranslations } from '@/lib/i18n';
import { areasApiClient, Area, CreateAreaResponse } from '@/lib/areas-api-client';
import { Feature, FeatureCollection } from 'geojson';

interface ProcessingResult {
  area: Area;
  success: boolean;
  response?: CreateAreaResponse;
  error?: string;
}

export default function AreasAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { t } = useTranslations();
  
  // Debug environment variables
  console.log('NEXT_PUBLIC_AREAS_API_URL:', process.env.NEXT_PUBLIC_AREAS_API_URL);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check authentication
  if (!isLoading && !isAuthenticated) {
    router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File selected:', event.target.files?.[0]);
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json') && !file.name.endsWith('.geojson')) {
      setError('Please select a valid JSON or GeoJSON file (.json or .geojson)');
      return;
    }

    setSelectedFile(file);
    setError('');
    setResults([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      console.log('File content loaded, length:', content.length);
      setFileContent(content);
    };
    reader.onerror = (e) => {
      console.error('File reading error:', e);
      setError('Error reading file');
    };
    reader.readAsText(file);
  };

  const validateFeatureCollection = (data: any): data is FeatureCollection => {
    console.log('=== FeatureCollection Validation ===');
    console.log('Data type:', typeof data);
    console.log('Data:', data);
    
    if (!data || typeof data !== 'object') {
      console.log('❌ Failed: data is null/undefined or not an object');
      return false;
    }
    
    if (data.type !== 'FeatureCollection') {
      console.log('❌ Failed: data.type is not "FeatureCollection", got:', data.type);
      return false;
    }
    
    if (!Array.isArray(data.features)) {
      console.log('❌ Failed: data.features is not an array, got:', typeof data.features);
      return false;
    }
    
    console.log('✅ FeatureCollection validation passed');
    console.log('Features count:', data.features.length);
    return true;
  };

  const validateGeoJSONFeature = (feature: any): feature is Feature => {
    console.log('=== GeoJSON Feature Validation ===');
    console.log('Feature:', feature);
    
    if (!feature || typeof feature !== 'object') {
      console.log('❌ Failed: feature is null/undefined or not an object');
      return false;
    }
    
    if (feature.type !== 'Feature') {
      console.log('❌ Failed: feature.type is not "Feature", got:', feature.type);
      return false;
    }
    
    if (!feature.geometry || typeof feature.geometry !== 'object') {
      console.log('❌ Failed: feature.geometry is missing or not an object');
      console.log('Geometry:', feature.geometry);
      return false;
    }
    
    if (!feature.properties || typeof feature.properties !== 'object') {
      console.log('❌ Failed: feature.properties is missing or not an object');
      console.log('Properties:', feature.properties);
      return false;
    }
    
    if (!feature.properties.name || typeof feature.properties.name !== 'string') {
      console.log('❌ Failed: feature.properties.name is missing or not a string');
      console.log('Properties name:', feature.properties.name);
      return false;
    }
    
    console.log('✅ GeoJSON Feature validation passed');
    console.log('Feature name:', feature.properties.name);
    console.log('Feature type:', feature.properties.type);
    return true;
  };

  const convertGeoJSONFeatureToArea = (feature: Feature): Area => {
    const properties = feature.properties as any;
    
    return {
      name: properties.name,
      type: 'admin',
      is_custom: false,
      coordinates: feature,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  const processAreas = async () => {
    console.log('processAreas called');
    console.log('fileContent:', fileContent ? 'exists' : 'null');
    console.log('isProcessing:', isProcessing);
    
    if (!fileContent) {
      console.log('No file content, setting error');
      setError('No file content to process');
      return;
    }

    try {
      console.log('Parsing JSON...');
      const data = JSON.parse(fileContent);
      console.log('Parsed data:', data);
      
      if (!validateFeatureCollection(data)) {
        console.log('Invalid FeatureCollection structure');
        setError('Invalid JSON structure. Expected a FeatureCollection with a "features" array.');
        return;
      }

      console.log('Starting processing...');
      setIsProcessing(true);
      setResults([]);
      setError('');

      const processingResults: ProcessingResult[] = [];
      console.log('Features to process:', data.features.length);

      for (let i = 0; i < data.features.length; i++) {
        const feature = data.features[i];
        console.log(`Processing feature ${i + 1}:`, feature);
        
        if (!validateGeoJSONFeature(feature)) {
          console.log(`Feature ${i + 1} validation failed`);
          processingResults.push({
            area: {
              name: `Feature ${i + 1}`,
              type: 'poi',
              coordinates: feature as Feature,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            success: false,
            error: 'Invalid GeoJSON feature structure. Missing required fields: properties.name, properties.type, or geometry.'
          });
          continue;
        }

        try {
          console.log(`Converting feature ${i + 1} to area...`);
          const area = convertGeoJSONFeatureToArea(feature);
          console.log(`Sending area ${i + 1} to API...`);
          const response = await areasApiClient.createOrUpdateArea({ area });
          console.log(`Area ${i + 1} processed successfully:`, response);
          processingResults.push({
            area,
            success: true,
            response
          });
        } catch (error: any) {
          console.log(`Error processing area ${i + 1}:`, error);
          const area = convertGeoJSONFeatureToArea(feature);
          processingResults.push({
            area,
            success: false,
            error: error.response?.data?.message || error.message || 'Unknown error'
          });
        }

        // Update results after each area is processed
        setResults([...processingResults]);
      }

      console.log('Processing completed');

    } catch (parseError) {
      console.log('JSON parse error:', parseError);
      setError('Invalid JSON format. Please check your file.');
    } finally {
      console.log('Setting isProcessing to false');
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFileContent('');
    setResults([]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Areas Admin</h1>
          <p className="text-gray-600 mt-2">Upload and process areas from JSON files</p>
        </div>

        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload JSON File</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                Select JSON File
              </label>
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".json,.geojson,application/json"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </div>

            {selectedFile && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span>{selectedFile.name}</span>
                <span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  console.log('Button clicked');
                  console.log('fileContent exists:', !!fileContent);
                  console.log('isProcessing:', isProcessing);
                  processAreas();
                }}
                disabled={!fileContent || isProcessing}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span>{isProcessing ? 'Processing...' : 'Process Areas'}</span>
              </button>

              <button
                onClick={resetForm}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Processing Results</h2>
            
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-semibold">Success: {successCount}</span>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800 font-semibold">Errors: {errorCount}</span>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-800 font-semibold">Total: {results.length}</span>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-gray-900">
                          {result.area.name || `Area ${index + 1}`}
                        </span>
                        <span className="text-sm text-gray-500">({result.area.type})</span>
                      </div>
                      
                      {result.success && result.response && (
                        <p className="text-sm text-green-700">
                          Area ID: {result.response.area_id} - {result.response.message}
                        </p>
                      )}
                      
                      {!result.success && result.error && (
                        <p className="text-sm text-red-700">{result.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Expected JSON Format</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>The JSON file should contain a FeatureCollection with an array of Area objects:</p>
            <pre className="bg-blue-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lon1, lat1], [lon2, lat2], ...]]
      },
      "properties": {
        "name": "Area Name",
        "type": "poi",
        "description": "Optional description",
        "contact_name": "Optional contact",
        "contact_emails": [
          {
            "email": "contact@example.com",
            "consent_report": true
          }
        ]
      }
    }
  ]
}`}
            </pre>
            <p className="mt-2">
              <strong>Required fields:</strong> properties.name, properties.type (must be "poi" or "admin"), geometry
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 