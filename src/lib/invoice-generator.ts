import jsPDF from 'jspdf';
import { BillingHistory, Customer, Subscription } from './api-client';

export interface InvoiceData {
  billingHistory: BillingHistory;
  customer: Customer;
  subscription?: Subscription;
  companyInfo: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    email: string;
    website: string;
  };
}

export class InvoiceGenerator {
  private doc: jsPDF;
  private currentY: number = 0;
  private pageWidth: number = 210;
  private pageHeight: number = 297;
  private margin: number = 20;

  constructor() {
    this.doc = new jsPDF();
    this.currentY = this.margin;
  }

  generateInvoice(data: InvoiceData): jsPDF {
    // Set up the document
    this.doc.setFont('helvetica');
    
    // Add header
    this.addHeader(data.companyInfo);
    
    // Add invoice details
    this.addInvoiceDetails(data.billingHistory);
    
    // Add customer information
    this.addCustomerInfo(data.customer);
    
    // Add billing details
    this.addBillingDetails(data.billingHistory, data.subscription);
    
    // Add payment information
    this.addPaymentInfo(data.billingHistory);
    
    // Add footer
    this.addFooter(data.companyInfo);
    
    return this.doc;
  }

  private addHeader(companyInfo: InvoiceData['companyInfo']): void {
    // Company logo/name
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(34, 139, 34); // Green color
    this.doc.text('CleanApp', this.margin, this.currentY);
    
    // Company address
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(0, 0, 0);
    this.currentY += 8;
    this.doc.text(companyInfo.address, this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text(`${companyInfo.city}, ${companyInfo.state} ${companyInfo.zip}`, this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text(companyInfo.country, this.margin, this.currentY);
    
    // Contact information
    this.currentY += 5;
    this.doc.text(`Phone: ${companyInfo.phone}`, this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text(`Email: ${companyInfo.email}`, this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text(`Website: ${companyInfo.website}`, this.margin, this.currentY);
    
    // Invoice title
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.currentY += 15;
    this.doc.text('INVOICE', this.pageWidth - this.margin - 30, this.currentY);
    
    this.currentY += 20;
  }

  private addInvoiceDetails(billingHistory: BillingHistory): void {
    const rightColumn = this.pageWidth - this.margin - 60;
    
    // Invoice number
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Invoice Number:', rightColumn, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`INV-${billingHistory.id.toString().padStart(6, '0')}`, rightColumn + 40, this.currentY);
    
    // Invoice date
    this.currentY += 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Invoice Date:', rightColumn, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(this.formatDate(billingHistory.payment_date), rightColumn + 40, this.currentY);
    
    // Due date
    this.currentY += 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Due Date:', rightColumn, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(this.formatDate(billingHistory.payment_date), rightColumn + 40, this.currentY);
    
    // Status
    this.currentY += 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Status:', rightColumn, this.currentY);
    this.doc.setFont('helvetica', 'normal');
    const statusColor = this.getStatusColor(billingHistory.status);
    this.doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    this.doc.text(this.capitalizeFirst(billingHistory.status), rightColumn + 40, this.currentY);
    this.doc.setTextColor(0, 0, 0);
    
    this.currentY += 20;
  }

  private addCustomerInfo(customer: Customer): void {
    // Customer section title
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Bill To:', this.margin, this.currentY);
    
    // Customer details
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.currentY += 8;
    this.doc.text(customer.name, this.margin, this.currentY);
    this.currentY += 6;
    this.doc.text(customer.email, this.margin, this.currentY);
    
    this.currentY += 15;
  }

  private addBillingDetails(billingHistory: BillingHistory, subscription?: Subscription): void {
    // Items table header
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Description', this.margin, this.currentY);
    this.doc.text('Amount', this.pageWidth - this.margin - 30, this.currentY);
    
    // Line
    this.currentY += 2;
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    // Item details
    this.currentY += 8;
    this.doc.setFont('helvetica', 'normal');
    
    const planName = subscription ? this.getPlanDisplayName(subscription.plan_type) : 'Subscription';
    const billingCycle = subscription ? subscription.billing_cycle : 'monthly';
    
    this.doc.text(`${planName} - ${this.capitalizeFirst(billingCycle)} Subscription`, this.margin, this.currentY);
    this.doc.text(this.formatCurrency(billingHistory.amount, billingHistory.currency), this.pageWidth - this.margin - 30, this.currentY);
    
    // Line
    this.currentY += 8;
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    // Total
    this.currentY += 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Total:', this.pageWidth - this.margin - 50, this.currentY);
    this.doc.text(this.formatCurrency(billingHistory.amount, billingHistory.currency), this.pageWidth - this.margin - 30, this.currentY);
    
    this.currentY += 20;
  }

  private addPaymentInfo(billingHistory: BillingHistory): void {
    // Payment information section
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Payment Information:', this.margin, this.currentY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.currentY += 8;
    this.doc.text(`Payment Method: Credit Card`, this.margin, this.currentY);
    this.currentY += 6;
    this.doc.text(`Transaction ID: ${billingHistory.stripe_payment_intent_id || 'N/A'}`, this.margin, this.currentY);
    this.currentY += 6;
    this.doc.text(`Payment Date: ${this.formatDate(billingHistory.payment_date)}`, this.margin, this.currentY);
    
    if (billingHistory.description) {
      this.currentY += 6;
      this.doc.text(`Description: ${billingHistory.description}`, this.margin, this.currentY);
    }
    
    this.currentY += 20;
  }

  private addFooter(companyInfo: InvoiceData['companyInfo']): void {
    // Footer line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.pageHeight - 40, this.pageWidth - this.margin, this.pageHeight - 40);
    
    // Footer text
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('Thank you for your business!', this.margin, this.pageHeight - 30);
    this.doc.text(`For questions, please contact us at ${companyInfo.email}`, this.margin, this.pageHeight - 25);
    this.doc.text(`Visit us at ${companyInfo.website}`, this.margin, this.pageHeight - 20);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getStatusColor(status: string): [number, number, number] {
    switch (status) {
      case 'completed':
        return [34, 139, 34]; // Green
      case 'failed':
        return [220, 53, 69]; // Red
      case 'pending':
        return [255, 193, 7]; // Yellow
      case 'refunded':
        return [108, 117, 125]; // Gray
      default:
        return [0, 0, 0]; // Black
    }
  }

  private getPlanDisplayName(planType: string): string {
    const planNames: Record<string, string> = {
      base: 'Lite',
      advanced: 'Enterprise',
      exclusive: 'Civic'
    };
    return planNames[planType] || planType;
  }
}

// Default company information
export const DEFAULT_COMPANY_INFO = {
  name: 'CleanApp',
  address: '123 Innovation Drive',
  city: 'San Francisco',
  state: 'CA',
  zip: '94105',
  country: 'United States',
  phone: '+1 (555) 123-4567',
  email: 'support@cleanapp.com',
  website: 'www.cleanapp.com'
};

// Helper function to generate invoice PDF
export const generateInvoicePDF = async (
  billingHistory: BillingHistory,
  customer: Customer,
  subscription?: Subscription,
  companyInfo = DEFAULT_COMPANY_INFO
): Promise<Blob> => {
  const generator = new InvoiceGenerator();
  const pdf = generator.generateInvoice({
    billingHistory,
    customer,
    subscription,
    companyInfo
  });
  
  return pdf.output('blob');
}; 