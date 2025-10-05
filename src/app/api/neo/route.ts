import { NextRequest, NextResponse } from 'next/server';
import { neoAPI } from '@/api/nasa-neo';
import { logger } from '@/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'today';
    const asteroidId = searchParams.get('id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const days = parseInt(searchParams.get('days') || '7');
    const page = parseInt(searchParams.get('page') || '0');
    const size = parseInt(searchParams.get('size') || '20');

    switch (action) {
      case 'today':
        const todayData = await neoAPI.getTodayCloseApproaches();
        return NextResponse.json({
          success: true,
          data: todayData.map(neo => neoAPI.formatForSimulation(neo)),
          count: todayData.length
        });

      case 'hazardous':
        const hazardousData = await neoAPI.getHazardousAsteroids(days);
        return NextResponse.json({
          success: true,
          data: hazardousData.map(neo => neoAPI.formatForSimulation(neo)),
          count: hazardousData.length
        });

      case 'feed':
        if (!startDate) {
          return NextResponse.json(
            { success: false, error: 'start_date is required for feed action' },
            { status: 400 }
          );
        }
        const feedData = await neoAPI.getFeed(startDate, endDate || undefined);
        if (!feedData) {
          return NextResponse.json(
            { success: false, error: 'Failed to fetch feed data' },
            { status: 500 }
          );
        }

        // Flatten the feed data
        const allNeos = Object.values(feedData.near_earth_objects).flat();
        return NextResponse.json({
          success: true,
          data: allNeos.map(neo => neoAPI.formatForSimulation(neo)),
          count: allNeos.length,
          element_count: feedData.element_count
        });

      case 'lookup':
        if (!asteroidId) {
          return NextResponse.json(
            { success: false, error: 'id parameter is required for lookup action' },
            { status: 400 }
          );
        }
        const asteroidData = await neoAPI.getAsteroid(asteroidId);
        if (!asteroidData) {
          return NextResponse.json(
            { success: false, error: 'Asteroid not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          data: neoAPI.formatForSimulation(asteroidData)
        });

      case 'browse':
        const browseData = await neoAPI.browse(page, size);
        if (!browseData) {
          return NextResponse.json(
            { success: false, error: 'Failed to browse NEOs' },
            { status: 500 }
          );
        }
        return NextResponse.json({
          success: true,
          data: browseData.data.map(neo => neoAPI.formatForSimulation(neo)),
          count: browseData.data.length,
          total: browseData.total,
          page,
          size
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('NEO API route error', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}