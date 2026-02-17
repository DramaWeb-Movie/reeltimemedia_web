/**
 * KHQR API Client
 * Handles communication with the KHQR payment gateway
 */

import { KHQRGenerateRequest, KHQRGenerateResponse, KHQRTransactionResponse } from './types';

export class KHQRClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.KHQR_API_KEY || '';
    this.baseUrl = baseUrl || process.env.KHQR_API_URL || 'https://api.khqr.link/v1';

    if (!this.apiKey) {
      console.warn('KHQR_API_KEY not configured. Payment integration will not work in production.');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `KHQR API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Test API connection
   */
  async ping(): Promise<{ status: string }> {
    try {
      return await this.request('/ping');
    } catch (error) {
      console.error('KHQR ping failed:', error);
      throw error;
    }
  }

  /**
   * Generate a KHQR payment QR code
   */
  async generateQR(params: KHQRGenerateRequest): Promise<KHQRGenerateResponse> {
    try {
      // Validate parameters
      if (!params.amount || params.amount <= 0) {
        return {
          success: false,
          error: {
            code: 'invalid_amount',
            message: 'Amount must be greater than 0'
          }
        };
      }

      if (!['KHR', 'USD'].includes(params.currency)) {
        return {
          success: false,
          error: {
            code: 'invalid_currency',
            message: 'Currency must be KHR or USD'
          }
        };
      }

      // Generate QR code via API
      const response = await this.request<any>('/qr/generate', {
        method: 'POST',
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency,
          description: params.description || 'ReelTime Media Payment',
          reference: params.reference,
        }),
      });

      return {
        success: true,
        data: {
          qr_id: response.qr_id,
          qr_data: response.qr_data,
          image_url: response.image_url,
          amount: params.amount,
          currency: params.currency,
          reference: params.reference || '',
          expires_at: response.expires_at || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      };
    } catch (error: any) {
      console.error('KHQR generation error:', error);
      return {
        success: false,
        error: {
          code: 'generation_failed',
          message: error.message || 'Failed to generate QR code'
        }
      };
    }
  }

  /**
   * Get transaction status
   */
  async getTransaction(transactionId: string): Promise<KHQRTransactionResponse> {
    try {
      const response = await this.request<any>(`/transactions/${transactionId}`);
      
      return {
        success: true,
        data: {
          id: response.id,
          qr_id: response.qr_id,
          status: response.status,
          amount: response.amount,
          currency: response.currency,
          description: response.description,
          reference: response.reference,
          payer_name: response.payer_name,
          payer_phone: response.payer_phone,
          completed_at: response.completed_at,
          created_at: response.created_at,
        },
      };
    } catch (error: any) {
      console.error('KHQR transaction query error:', error);
      return {
        success: false,
        error: {
          code: 'query_failed',
          message: error.message || 'Failed to query transaction'
        }
      };
    }
  }

  /**
   * List transactions with pagination
   */
  async listTransactions(limit: number = 10, offset: number = 0): Promise<any> {
    try {
      return await this.request(`/transactions?limit=${limit}&offset=${offset}`);
    } catch (error) {
      console.error('KHQR list transactions error:', error);
      throw error;
    }
  }

  /**
   * Get daily report
   */
  async getDailyReport(date: string): Promise<any> {
    try {
      return await this.request(`/reports/daily?date=${date}`);
    } catch (error) {
      console.error('KHQR daily report error:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const khqrClient = new KHQRClient();
