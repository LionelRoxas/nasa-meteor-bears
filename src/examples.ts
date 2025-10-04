/**
 * Usage Examples
 * 
 * This file demonstrates how to use the utilities created in the project.
 * Feel free to delete this file once you're familiar with the patterns.
 */

// Example 1: Using the Logger
import { logger } from '@/logger';

export function exampleLoggerUsage() {
  logger.info('Application started');
  logger.debug('Debug information', { userId: 123 });
  logger.warn('Warning message', { reason: 'API rate limit approaching' });
  logger.error('Error occurred', { error: 'Connection failed' });
}

// Example 2: Using the API Fetch Wrapper
import { fetchWithFallback } from '@/api';

interface MeteorData {
  name: string;
  mass: number;
  year: string;
}

export async function exampleApiUsage() {
  // Example NASA API call with error handling
  const response = await fetchWithFallback<MeteorData[]>(
    'https://data.nasa.gov/resource/gh4g-9sfh.json?$limit=10'
  );

  if (response.error) {
    logger.error('Failed to fetch meteor data', { error: response.error });
    // Handle error - show fallback UI, cached data, etc.
    return [];
  }

  logger.info('Successfully fetched meteor data', { 
    count: response.data?.length 
  });
  
  return response.data || [];
}

// Example 3: Combining Logger and API in a Component
export async function loadMeteorDataWithLogging() {
  logger.info('Starting meteor data fetch');
  
  try {
    const data = await exampleApiUsage();
    logger.info('Meteor data loaded successfully', { count: data.length });
    return data;
  } catch (error) {
    logger.error('Unexpected error in loadMeteorDataWithLogging', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
}
