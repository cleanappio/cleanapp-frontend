import React, { useState, useEffect, useRef } from "react";
import { LatestReport } from "./GlobeView";
import { getDisplayableImage } from "@/lib/image-utils";
import { authApiClient } from "@/lib/auth-api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useTranslations, getCurrentLocale, filterAnalysesByLanguage } from "@/lib/i18n";
import { reportProcessingApiClient } from "@/lib/report-processing-api-client";
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Map controller component to set center and zoom
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  
  return null;
}

interface CustomDashboardReportProps {
  reportItem: LatestReport | null;
  onClose?: () => void;
  onReportFixed?: (reportSeq: number) => void;
}

const CustomDashboardReport: React.FC<CustomDashboardReportProps> = ({ reportItem, onClose, onReportFixed }) => {
  const { isAuthenticated } = useAuthStore();
  const [fullReport, setFullReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAsFixed, setMarkingAsFixed] = useState(false);
  const [markFixedSuccess, setMarkFixedSuccess] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslations();

  useEffect(() => {
    if (!isAuthenticated) {
      setFullReport(null);
      setError(null);
      return;
    }
    if (reportItem?.report?.seq) {
      fetchFullReport();
    } else {
      setFullReport(null);
      setError(null);
    }
  }, [reportItem, isAuthenticated]);

  const fetchFullReport = async () => {
    if (!reportItem?.report?.seq) return;
    setLoading(true);
    setError(null);
    try {
      const locale = getCurrentLocale();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_LIVE_API_URL}/api/v3/reports/by-seq?seq=${reportItem.report.seq}&lang=${locale}`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter analyses by language and convert to single analysis format
        const filteredData = filterAnalysesByLanguage([data], locale);
        setFullReport(filteredData[0] || data);
      } else {
        setError(`${t('failedToFetchReport')}: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching full report:", error);
      setError(t('failedToFetchReport'));
    } finally {
      setLoading(false);
    }
  };

  const getGradientColor = (value: number, maxValue: number = 1) => {
    const percentage = (value / maxValue) * 100;
    if (percentage <= 33) return "from-green-500 to-green-400";
    if (percentage <= 66) return "from-yellow-500 to-yellow-400";
    return "from-red-500 to-red-400";
  };

  const getGaugeColor = (value: number, maxValue: number = 1) => {
    const percentage = (value / maxValue) * 100;
    if (percentage <= 33) return "#10b981"; // green-500
    if (percentage <= 66) return "#f59e0b"; // yellow-500
    return "#ef4444"; // red-500
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  const markAsFixed = async () => {
    if (!reportItem?.report?.seq) return;
    
    setMarkingAsFixed(true);
    setMarkFixedSuccess(null);
    setError(null);
    
    try {
      const response = await reportProcessingApiClient.markFixed({ seq: reportItem.report.seq });
      if (response.success) {
        setMarkFixedSuccess(response.message || t('reportMarkedAsFixed'));
        // Notify parent component that report was fixed
        if (onReportFixed && reportItem?.report?.seq) {
          onReportFixed(reportItem.report.seq);
        }
        // Optionally close the modal after a delay
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      } else {
        setError(response.message || t('failedToMarkAsFixed'));
      }
    } catch (error: any) {
      console.error('Error marking report as fixed:', error);
      setError(error.response?.data?.message || t('failedToMarkAsFixed'));
    } finally {
      setMarkingAsFixed(false);
    }
  };

  const exportToPDF = async () => {
    if (!contentRef.current || !reportItem) return;

    try {
      // Create a temporary map container for PDF capture
      const tempMapContainer = document.createElement('div');
      tempMapContainer.style.position = 'absolute';
      tempMapContainer.style.left = '-9999px';
      tempMapContainer.style.top = '0';
      tempMapContainer.style.width = '400px';
      tempMapContainer.style.height = '300px';
      tempMapContainer.style.borderRadius = '8px';
      tempMapContainer.style.overflow = 'hidden';
      tempMapContainer.style.border = '1px solid #d1d5db';
      document.body.appendChild(tempMapContainer);

      // Create a temporary div for the map
      const mapDiv = document.createElement('div');
      mapDiv.style.width = '100%';
      mapDiv.style.height = '100%';
      tempMapContainer.appendChild(mapDiv);

      // Initialize Leaflet map in the temporary container
      const map = L.map(mapDiv, {
        center: [reportItem.report.latitude, reportItem.report.longitude],
        zoom: 16,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Add marker
      L.circleMarker([reportItem.report.latitude, reportItem.report.longitude], {
        radius: 8,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.8,
        weight: 2,
        opacity: 1
      }).addTo(map);

      // Wait for map to render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capture the map
      let mapImageData = null;
      try {
        const mapCanvas = await html2canvas(tempMapContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 400,
          height: 300
        });
        mapImageData = mapCanvas.toDataURL('image/png');
      } catch (mapError) {
        console.warn('Failed to capture map:', mapError);
      }

      // Clean up temporary map
      map.remove();
      document.body.removeChild(tempMapContainer);

      // Create a temporary container for PDF content
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '794px'; // A4 width in pixels at 96 DPI
      tempContainer.style.minHeight = '1123px'; // A4 height in pixels at 96 DPI
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(tempContainer);

      // Add logo and title container
      const headerContainer = document.createElement('div');
      headerContainer.style.display = 'flex';
      headerContainer.style.alignItems = 'center';
      headerContainer.style.gap = '15px';
      headerContainer.style.marginBottom = '10px';
      tempContainer.appendChild(headerContainer);

      // Add logo
      const logo = document.createElement('img');
      logo.src = '/cleanapp-logo.png';
      logo.style.height = '40px';
      logo.style.width = 'auto';
      logo.style.display = 'block';
      logo.style.verticalAlign = 'middle';
      headerContainer.appendChild(logo);

      // Add title
      const title = document.createElement('h1');
      title.textContent = reportItem.analysis?.title || `${t('report')} #${reportItem.report.seq}`;
      title.style.fontSize = '20px';
      title.style.fontWeight = 'bold';
      title.style.color = '#1f2937';
      title.style.marginLeft = '10px';
      title.style.marginBottom = '10px';
      title.style.lineHeight = '48px'; // Match logo height for perfect alignment
      title.style.display = 'flex';
      title.style.alignItems = 'center';
      title.style.justifyContent = 'center';
      title.style.verticalAlign = 'middle';
      title.style.textAlign = 'center';
      headerContainer.appendChild(title);

      // Add timestamp
      const timestamp = document.createElement('p');
      timestamp.textContent = `${t('reportDate')}: ${formatTime(reportItem.report.timestamp)}`;
      timestamp.style.fontSize = '10px';
      timestamp.style.color = '#6b7280';
      timestamp.style.marginBottom = '5px';
      tempContainer.appendChild(timestamp);

      // Add spacing after timestamp
      const spacing = document.createElement('div');
      spacing.style.marginBottom = '15px';
      tempContainer.appendChild(spacing);

      // Create main content container
      const mainContainer = document.createElement('div');
      mainContainer.style.display = 'flex';
      mainContainer.style.gap = '20px';
      mainContainer.style.marginBottom = '20px';
      tempContainer.appendChild(mainContainer);

      // Left side - Image
      const imageContainer = document.createElement('div');
      imageContainer.style.width = '50%';
      imageContainer.style.height = '600px'; // Increased to match location + analysis height
      imageContainer.style.backgroundColor = '#f3f4f6';
      imageContainer.style.borderRadius = '8px';
      imageContainer.style.overflow = 'hidden';
      imageContainer.style.display = 'flex';
      imageContainer.style.alignItems = 'center';
      imageContainer.style.justifyContent = 'center';
      mainContainer.appendChild(imageContainer);

      // Add image if available
      const imageUrl = getDisplayableImage(fullReport?.report?.image || reportItem.report?.image);
      if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.width = 'auto';
        img.style.height = 'auto';
        imageContainer.appendChild(img);
      } else {
        const noImage = document.createElement('p');
        noImage.textContent = t('noImageAvailable');
        noImage.style.color = '#9ca3af';
        imageContainer.appendChild(noImage);
      }

      // Right side - Location and Analysis
      const rightContainer = document.createElement('div');
      rightContainer.style.width = '50%';
      rightContainer.style.display = 'flex';
      rightContainer.style.flexDirection = 'column';
      rightContainer.style.gap = '15px';
      mainContainer.appendChild(rightContainer);

      // Location section
      const locationSection = document.createElement('div');
      locationSection.style.backgroundColor = '#f9fafb';
      locationSection.style.padding = '15px';
      locationSection.style.borderRadius = '8px';
      locationSection.style.border = '1px solid #e5e7eb';
      rightContainer.appendChild(locationSection);

      const locationTitle = document.createElement('h3');
      locationTitle.textContent = t('location');
      locationTitle.style.fontSize = '14px';
      locationTitle.style.fontWeight = 'bold';
      locationTitle.style.marginBottom = '10px';
      locationTitle.style.color = '#374151';
      locationSection.appendChild(locationTitle);

      // Add map for PDF - matching CustomDashboardReport exactly
      const pdfMapContainer = document.createElement('div');
      pdfMapContainer.style.width = '100%';
      pdfMapContainer.style.height = 'auto';
      pdfMapContainer.style.borderRadius = '8px';
      pdfMapContainer.style.marginBottom = '12px';
      pdfMapContainer.style.overflow = 'hidden';
      pdfMapContainer.style.border = '1px solid #d1d5db';
      
      if (mapImageData) {
        const mapImg = document.createElement('img');
        mapImg.src = mapImageData;
        mapImg.style.width = '100%';
        mapImg.style.height = 'auto';
        mapImg.style.display = 'block';
        mapImg.style.borderRadius = '8px';
        pdfMapContainer.appendChild(mapImg);
      } else {
        // Fallback if map capture failed
        pdfMapContainer.style.backgroundColor = '#e5e7eb';
        pdfMapContainer.style.display = 'flex';
        pdfMapContainer.style.alignItems = 'center';
        pdfMapContainer.style.justifyContent = 'center';
        pdfMapContainer.style.fontSize = '10px';
        pdfMapContainer.style.color = '#6b7280';
        pdfMapContainer.textContent = `${t('map')}: ${reportItem.report.latitude.toFixed(4)}, ${reportItem.report.longitude.toFixed(4)}`;
      }
      locationSection.appendChild(pdfMapContainer);

      const coords = document.createElement('div');
      coords.style.fontSize = '12px';
      coords.style.color = '#6b7280';
      coords.innerHTML = `
        <div style="margin-bottom: 5px;"><strong>${t('latitude')}:</strong> ${reportItem.report.latitude.toFixed(6)}</div>
        <div><strong>${t('longitude')}:</strong> ${reportItem.report.longitude.toFixed(6)}</div>
      `;
      locationSection.appendChild(coords);

      // Brand section for PDF
      if (reportItem.analysis?.brand_display_name || reportItem.analysis?.brand_name) {
        const brandSection = document.createElement('div');
        brandSection.style.backgroundColor = '#eff6ff';
        brandSection.style.padding = '15px';
        brandSection.style.borderRadius = '8px';
        brandSection.style.border = '1px solid #bfdbfe';
        brandSection.style.marginBottom = '15px';
        rightContainer.appendChild(brandSection);

        const brandTitle = document.createElement('h3');
        brandTitle.textContent = t('brand');
        brandTitle.style.fontSize = '14px';
        brandTitle.style.fontWeight = 'bold';
        brandTitle.style.marginBottom = '10px';
        brandTitle.style.color = '#1e40af';
        brandSection.appendChild(brandTitle);

        const brandName = document.createElement('div');
        brandName.style.fontSize = '12px';
        brandName.style.fontWeight = 'bold';
        brandName.style.color = '#1e40af';
        brandName.textContent = reportItem.analysis.brand_display_name || reportItem.analysis.brand_name || '';
        brandSection.appendChild(brandName);
      }

      // Analysis section
      if (reportItem.analysis) {
        const analysisSection = document.createElement('div');
        analysisSection.style.backgroundColor = '#f9fafb';
        analysisSection.style.padding = '15px';
        analysisSection.style.borderRadius = '8px';
        analysisSection.style.border = '1px solid #e5e7eb';
        rightContainer.appendChild(analysisSection);

        const analysisTitle = document.createElement('h3');
        analysisTitle.textContent = t('analysis');
        analysisTitle.style.fontSize = '14px';
        analysisTitle.style.fontWeight = 'bold';
        analysisTitle.style.marginBottom = '10px';
        analysisTitle.style.color = '#374151';
        analysisSection.appendChild(analysisTitle);

        // Severity Level
        const severityDiv = document.createElement('div');
        severityDiv.style.marginBottom = '8px';
        severityDiv.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <span style="font-size: 11px; color: #374151;">${t('severityLevel')}</span>
            <span style="font-size: 11px; font-weight: bold;">${(reportItem.analysis.severity_level * 10).toFixed(0)}/10</span>
          </div>
          <div style="width: 100%; height: 6px; background-color: #e5e7eb; border-radius: 3px; overflow: hidden;">
            <div style="width: ${reportItem.analysis.severity_level * 100}%; height: 100%; background-color: ${getGaugeColor(reportItem.analysis.severity_level)}; border-radius: 3px;"></div>
          </div>
        `;
        analysisSection.appendChild(severityDiv);

        // Litter Probability
        if (reportItem.analysis.litter_probability !== undefined) {
          const litterDiv = document.createElement('div');
          litterDiv.style.marginBottom = '8px';
          litterDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span style="font-size: 11px; color: #374151;">${t('litterProbability')}</span>
              <span style="font-size: 11px; font-weight: bold;">${(reportItem.analysis.litter_probability * 100).toFixed(0)}%</span>
            </div>
            <div style="width: 100%; height: 6px; background-color: #e5e7eb; border-radius: 3px; overflow: hidden;">
              <div style="width: ${reportItem.analysis.litter_probability * 100}%; height: 100%; background-color: ${getGaugeColor(reportItem.analysis.litter_probability)}; border-radius: 3px;"></div>
            </div>
          `;
          analysisSection.appendChild(litterDiv);
        }

        // Hazard Probability
        if (reportItem.analysis.hazard_probability !== undefined) {
          const hazardDiv = document.createElement('div');
          hazardDiv.style.marginBottom = '8px';
          hazardDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span style="font-size: 11px; color: #374151;">${t('hazardProbability')}</span>
              <span style="font-size: 11px; font-weight: bold;">${(reportItem.analysis.hazard_probability * 100).toFixed(0)}%</span>
            </div>
            <div style="width: 100%; height: 6px; background-color: #e5e7eb; border-radius: 3px; overflow: hidden;">
              <div style="width: ${reportItem.analysis.hazard_probability * 100}%; height: 100%; background-color: ${getGaugeColor(reportItem.analysis.hazard_probability)}; border-radius: 3px;"></div>
            </div>
          `;
          analysisSection.appendChild(hazardDiv);
        }
      }

      // Description section (full width below)
      if (reportItem.analysis) {
        const descriptionSection = document.createElement('div');
        descriptionSection.style.backgroundColor = '#f9fafb';
        descriptionSection.style.padding = '15px';
        descriptionSection.style.borderRadius = '8px';
        descriptionSection.style.border = '1px solid #e5e7eb';
        descriptionSection.style.width = '100%';
        tempContainer.appendChild(descriptionSection);

        const descriptionTitle = document.createElement('h3');
        descriptionTitle.textContent = t('description');
        descriptionTitle.style.fontSize = '14px';
        descriptionTitle.style.fontWeight = 'bold';
        descriptionTitle.style.marginBottom = '10px';
        descriptionTitle.style.color = '#374151';
        descriptionSection.appendChild(descriptionTitle);

        if (reportItem.analysis.title) {
          const titleDiv = document.createElement('h4');
          titleDiv.textContent = reportItem.analysis.title;
          titleDiv.style.fontSize = '12px';
          titleDiv.style.fontWeight = 'bold';
          titleDiv.style.marginBottom = '8px';
          titleDiv.style.color = '#374151';
          descriptionSection.appendChild(titleDiv);
        }

        if (reportItem.analysis.description) {
          const descDiv = document.createElement('p');
          descDiv.textContent = reportItem.analysis.description;
          descDiv.style.fontSize = '11px';
          descDiv.style.lineHeight = '1.4';
          descDiv.style.color = '#6b7280';
          descriptionSection.appendChild(descDiv);
        }
      }

      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: Math.max(tempContainer.scrollHeight, 1123) // Use full content height or A4 minimum
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // If content is taller than A4, create multiple pages
      if (imgHeight > pdfHeight - 20) {
        const pagesNeeded = Math.ceil(imgHeight / (pdfHeight - 20));
        for (let i = 0; i < pagesNeeded; i++) {
          if (i > 0) {
            pdf.addPage();
          }
          const sourceY = i * (canvas.height / pagesNeeded);
          const sourceHeight = canvas.height / pagesNeeded;
          const destY = 10;
          const destHeight = pdfHeight - 20;
          
          // Create a temporary canvas for this page section
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = canvas.width;
          tempCanvas.height = sourceHeight;
          tempCtx?.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          
          const pageImgData = tempCanvas.toDataURL('image/png');
          pdf.addImage(pageImgData, 'PNG', 10, destY, imgWidth, destHeight);
        }
      } else {
        // Add image to PDF (single page)
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      }

      // Save PDF
      pdf.save(`${t('report')}-${reportItem.report.seq}.pdf`);

      // Clean up
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('failedToGeneratePDF'));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-white z-[2000] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-6 max-w-md text-center">
          <h3 className="text-lg font-medium text-red-800 mb-2">{t('authenticationRequired')}</h3>
          <p className="text-red-700 mb-4">{t('mustBeLoggedInToViewReportDetails')}</p>
          <Link href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} className="text-sm font-medium text-red-800 hover:text-red-600 underline">
            {t('goToLogin')} →
          </Link>
        </div>
      </div>
    );
  }

  if (!reportItem) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">{t('noReportSelected')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading')} {t('report').toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-2">{t('errorLoadingReport')}</p>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const report = reportItem.report;
  const analysis = reportItem.analysis;
  const imageUrl = getDisplayableImage(fullReport?.report?.image || report?.image);

  return (
    <div className="fixed inset-0 bg-white z-[2000] overflow-hidden">
      {/* Custom CSS for zoom controls z-index */}
      <style jsx>{`
        :global(.leaflet-control-zoom) {
          z-index: 1000 !important;
        }
        :global(.leaflet-control-zoom-in),
        :global(.leaflet-control-zoom-out) {
          z-index: 1000 !important;
        }
      `}</style>
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-6 z-10">
        <div className="flex items-center space-x-4">
          <img 
            src="/cleanapp-logo.png" 
            alt={t('cleanAppLogo')} 
            className="h-8 w-auto"
          />
          <h1 className="text-xl font-semibold text-gray-900">
            {analysis?.title || `${t('report')} #${report.seq}`}
          </h1>
          <span className="text-sm text-gray-500">
            {formatTime(report.timestamp)}
          </span>
        </div>
        
        {/* Success/Error Messages */}
        {(markFixedSuccess || error) && (
          <div className="flex-1 mx-4">
            {markFixedSuccess && (
              <div className="bg-green-50 border border-green-200 rounded px-3 py-1">
                <p className="text-green-800 text-sm">{markFixedSuccess}</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded px-3 py-1">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center space-x-2">
          <button
            onClick={markAsFixed}
            disabled={markingAsFixed}
            className={`px-3 py-1 text-white text-sm rounded transition-colors ${
              markingAsFixed 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {markingAsFixed ? t('markingAsFixed') : t('markAsFixed')}
          </button>
          <button
            onClick={exportToPDF}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            {t('exportAsPDF')}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
            >
              {t('close')}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-16 h-full flex" ref={contentRef}>
        {/* Left Side - Image */}
        <div className="w-1/2 h-full p-6">
          <div className="h-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={t('report')}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  console.error("Failed to load image:", imageUrl);
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : (
              <div className="text-gray-400 text-center">
                <p>{t('noImageAvailable')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Stats and Description */}
        <div className="w-1/2 h-full p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Location Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">{t('location')}</h3>
              
              {/* Map */}
              <div className="h-80 mb-3 rounded-lg overflow-hidden border">
                <MapContainer
                  center={[report.latitude, report.longitude]}
                  zoom={16}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                  scrollWheelZoom={true}
                  dragging={true}
                  touchZoom={true}
                  doubleClickZoom={true}
                  boxZoom={true}
                  keyboard={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CircleMarker
                    center={[report.latitude, report.longitude]}
                    radius={8}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#ef4444',
                      fillOpacity: 0.8,
                      weight: 2,
                      opacity: 1
                    }}
                  />
                  <MapController center={[report.latitude, report.longitude]} />
                </MapContainer>
              </div>
              
              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">{t('latitude')}:</span>
                  <span className="ml-2 font-medium">{report.latitude.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-gray-600">{t('longitude')}:</span>
                  <span className="ml-2 font-medium">{report.longitude.toFixed(6)}</span>
                </div>
              </div>
            </div>

            {/* Brand Info */}
            {(analysis?.brand_display_name || analysis?.brand_name) && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">{t('brand')}</h3>
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-2 mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <span className="text-lg font-medium text-blue-900">{analysis.brand_display_name || analysis.brand_name}</span>
                </div>
              </div>
            )}

            {/* Analysis Stats */}
            {analysis && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">{t('analysis')}</h3>
                
                {/* Severity Level */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">{t('severityLevel')}</span>
                    <span className="text-sm font-semibold">{(analysis.severity_level * 10).toFixed(0)}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.severity_level)}`}
                      style={{ width: `${analysis.severity_level * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Litter Probability */}
                {analysis.litter_probability !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('litterProbability')}</span>
                      <span className="text-sm font-semibold">{(analysis.litter_probability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.litter_probability)}`}
                        style={{ width: `${analysis.litter_probability * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Hazard Probability */}
                {analysis.hazard_probability !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('hazardProbability')}</span>
                      <span className="text-sm font-semibold">{(analysis.hazard_probability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full bg-gradient-to-r ${getGradientColor(analysis.hazard_probability)}`}
                        style={{ width: `${analysis.hazard_probability * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {analysis && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{t('description')}</h3>
                {analysis.title && (
                  <h4 className="font-medium text-gray-800 mb-2">{analysis.title}</h4>
                )}
                {analysis.description && (
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {analysis.description}
                  </p>
                )}
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomDashboardReport; 