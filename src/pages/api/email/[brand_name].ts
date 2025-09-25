import { NextApiRequest, NextApiResponse } from "next";
import { getBrandNameDisplay } from "@/lib/util";
import { Report, ReportAnalysis } from "@/components/GlobeView";
import { getDisplayableImage } from "@/lib/image-utils";

interface ReportWithAnalysis {
  seq: number;
  analysis: ReportAnalysis[];
  report: Report;
  created_at: string;
  location: {
    lat: number;
    lng: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { brand_name } = req.query;

  if (!brand_name || typeof brand_name !== "string") {
    return res.status(400).json({ error: "Brand name is required" });
  }

  try {
    // Fetch brand reports from your API
    const env = process.env.NODE_ENV;
    let apiUrl = "";
    if (env === "development") {
      apiUrl = process.env.NEXT_PUBLIC_LIVE_API_URL || "http://localhost:8080";
    } else if (env === "production") {
      apiUrl = "http://api.cleanapp.io:8080";
    }

    const locale = "en"; // default locale, TODO: use getCurrentLocale
    const n = 10;
    console.log(
      "API URL",
      `${apiUrl}/api/v3/reports/by-brand?brand_name=${encodeURIComponent(
        brand_name
      )}&n=${n}&lang=${locale}`
    );

    const response = await fetch(
      `${apiUrl}/api/v3/reports/by-brand?brand_name=${encodeURIComponent(
        brand_name
      )}&n=${n}&lang=${locale}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`API request failed:`, response);
      throw new Error(`API request failed: ${response.status}`);
    }

    const json = await response.json();
    const brandReports: ReportWithAnalysis[] = json.reports;

    if (brandReports.length === 0) {
      return res.status(404).json({ error: "No reports found for this brand" });
    }

    // Get the first report's analysis for brand display name
    const firstAnalysis = brandReports[0].analysis[0];
    const brandDisplayName =
      getBrandNameDisplay(firstAnalysis).brandDisplayName;

    // Generate static HTML
    const html = generateEmailHTML(brand_name, brandDisplayName, brandReports);

    // Set headers for HTML response
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300"); // Cache for 5 minutes
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).send(html);
  } catch (error) {
    console.error("Email API error:", error);
    return res.status(500).send(generateErrorHTML(brand_name as string));
  }
}

function generateEmailHTML(
  brandName: string,
  brandDisplayName: string,
  reports: ReportWithAnalysis[]
): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brandDisplayName} - Recent Reports | CleanApp</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .header {
            background: white;
            color: black;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
            border: 1px solid #e5e7eb;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5rem;
            font-weight: 700;
        }
        .header p {
            margin: 0;
            font-size: 1.2rem;
            opacity: 0.9;
        }
        .report-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }
        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .report-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1f2937;
            margin: 0;
        }
        .report-date {
            color: #6b7280;
            font-size: 0.875rem;
        }
        .report-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .report-description {
            color: #4b5563;
            margin-bottom: 15px;
        }
        .report-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 500;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        .btn-primary {
            background-color: #43A047;
            color: white;
        }
        .btn-primary:hover {
            background-color: #2E7D32;
        }
        .btn-secondary {
            background-color: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
        }
        .btn-secondary:hover {
            background-color: #e5e7eb;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            background: white;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 0 0 10px 0;
            color: #6b7280;
        }
        .footer a {
            color: #3b82f6;
            text-decoration: none;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .stat {
            text-align: center;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: 700;
            color: #43A047;
            display: block;
        }
        .stat-label {
            color: #6b7280;
            font-size: 0.875rem;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .header h1 {
                font-size: 2rem;
            }
            .report-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
            .stats {
                gap: 20px;
            }
            .subscribe-section {
                margin: 10px;
                padding: 15px;
            }
            .subscribe-btn {
                font-size: 14px;
                padding: 10px 20px;
            }
        }
        .subscribe-section {
            margin-top: 0px;
            padding: 0px;
            text-align: center;
        }
        .subscribe-btn {
            display: inline-block;
            width: 100%;
            max-width: 300px;
            padding: 12px 24px;
            background-color: #43A047;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            transition: background-color 0.2s;
        }
        .subscribe-btn:hover {
            background-color: #2E7D32;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${brandDisplayName}</h1>
        <p>Recent Reports</p>
    </div>

    <div class="stats">
        <div class="stat">
            <span class="stat-number">${reports.length}</span>
            <span class="stat-label">Total Reports</span>
        </div>
    </div>

    ${reports
      .slice(0, 3)
      .map((report) => {
        const analysis =
          report.analysis.find((a) => a.language === "en") ||
          report.analysis[0];

        const reportDate = analysis.created_at
          ? new Date(analysis.created_at!).toLocaleDateString("en", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "";

        const image = report.report.image
          ? getDisplayableImage(report.report.image)
          : "";

        return `
        <div class="report-card">
            <div class="report-header">
                <h3 class="report-title">${analysis.title}</h3>
                <span class="report-date">${reportDate.toString()}</span>
            </div>
            ${
              image
                ? `<img src="${image}" alt="${analysis.title}" class="report-image" />`
                : ""
            }
            <p class="report-description">${analysis.description}</p>
            <div class="report-actions">
                <a href="${baseUrl}/digital/${brandName}" class="btn btn-secondary" noopener noreferrer target="_blank">
                    View All Reports
                </a>
                <a href="${baseUrl}/pricing" class="btn btn-primary" noopener noreferrer target="_blank">
                    Subscribe
                </a>
            </div>
        </div>
        `;
      })
      .join("")}

    ${
      reports.length > 3
        ? `<div class="report-card">
          <div class="report-header">
              <h3 class="report-title">${reports.length - 3} more reports</h3>
          </div>

          <div class="report-description">
            Subscribe now to view all reports.
          </div>
        </div>
    </div>`
        : ``
    } 

    <div class="subscribe-section">
        <a href="${baseUrl}/pricing" class="subscribe-btn" noopener noreferrer target="_blank">
            Subscribe to CleanApp
        </a>
    </div>

    <div class="footer">
        <p>This report was generated by <a href="${baseUrl}" noopener noreferrer target="_blank">CleanApp</a></p>
        <p>Track issues in real-time with AI-powered insights</p>
        <p>
            <a href="${baseUrl}/digital/${brandName}" noopener noreferrer target="_blank">View Dashboard</a> | 
            <span>Download App:</span>
            <a href="https://play.google.com/store/apps/details/CleanApp?id=com.cleanapp&hl=ln" noopener noreferrer target="_blank">Android</a>
            <a href="https://apps.apple.com/ch/app/cleanapp/id6466403301?l=en-GB" noopener noreferrer target="_blank">iOS</a>
        </p>
    </div>
</body>
</html>
  `;
}

function generateErrorHTML(brandName: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - ${brandName} Reports | CleanApp</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .error-container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }
        .error-icon {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        .error-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #dc2626;
            margin-bottom: 10px;
        }
        .error-message {
            color: #6b7280;
            margin-bottom: 30px;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
        }
        .btn:hover {
            background-color: #2563eb;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h1 class="error-title">Unable to Load Reports</h1>
        <p class="error-message">
            We couldn't load the reports for ${brandName}. This might be due to a temporary issue or the brand name might not exist.
        </p>
        <a href="${baseUrl}" class="btn" noopener noreferrer target="_blank">Go to CleanApp</a>
    </div>
</body>
</html>
  `;
}
