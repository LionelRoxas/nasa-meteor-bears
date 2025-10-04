/**
 * API client and utilities
 * 
 * This directory contains API client implementations and related utilities for:
 * - NASA API integrations
 * - External data sources
 * - Error handling and fallbacks for API failures
 * - Request/response transformations
 */

import { logger } from '@/logger';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Generic API fetch wrapper with error handling
 * Implements fallbacks for potential API failures
 */
export async function fetchWithFallback<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      logger.error(`API request failed: ${url}`, { 
        status: response.status,
        statusText: response.statusText 
      });
      
      return {
        error: `Request failed with status ${response.status}`,
        status: response.status,
      };
    }

    const data = await response.json() as T;
    return {
      data,
      status: response.status,
    };
  } catch (error) {
    logger.error('API request error', { 
      url, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      status: 500,
    };
  }
}

export {};
