# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NASA Meteor Bears - Island Polar Bears NASA Space Apps Hackathon project. An interactive visualization and simulation tool for asteroid impact scenarios using real NASA and USGS datasets.

## Commands

### Development
- `npm run dev` - Start development server with Turbopack at http://localhost:3000
- `npm run build` - Build production bundle with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.4 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 via PostCSS
- **State Management**: React 19.1.0 built-in features

### Project Structure
- `src/app/` - Next.js App Router pages and layouts
- `src/api/` - API client with error handling and fallbacks (fetchWithFallback function)
- `src/logger/` - Centralized logging system with info/warn/error/debug levels
- `src/lib/` - Shared utilities and helper functions
- `src/utils/` - Data processing utilities

### Key Patterns
- **Path Aliases**: Use `@/` to import from src directory (configured in tsconfig.json)
- **API Error Handling**: All API calls use fetchWithFallback wrapper with automatic error logging
- **Logging**: Use the singleton logger instance from `@/logger` for consistent logging across the app

## Hackathon Challenge: Impactor-2025 Asteroid Threat Simulator

### Core Requirements
1. **Data Integration**
   - NASA NEO API for real asteroid data (size, velocity, trajectory, orbital elements)
   - USGS datasets for environmental impacts (topography, seismic zones, tsunami modeling)
   - Real-time data fetching with fallback mechanisms

2. **Visualization Features**
   - 3D orbital path animations using Three.js
   - 2D impact zone maps with D3.js
   - Dynamic camera controls (orbital, surface, impact views)
   - Asteroid trail effects and impact particle systems

3. **Physics Simulations**
   - Kinetic energy calculations (KE = 0.5 * m * v²)
   - Crater size estimation using scaling laws
   - TNT equivalent energy conversions
   - Threat level assessment (Local/Regional/Global)

4. **Mitigation Strategies**
   - Deflection simulations (kinetic impactors, gravity tractors)
   - Trajectory modification visualizations
   - Success probability calculations

### Target Audiences
- **Students/Educators** (13-25): Learning about space threats
- **Space Enthusiasts**: Exploring real asteroid data
- **Policymakers**: Understanding impact consequences
- **General Public**: Accessible, gamified experience

## Gamification Strategy

### Unique Features to Implement
1. **Achievement System**
   - "First Deflection" - Successfully deflect first asteroid
   - "Close Call Champion" - Save Earth with <1 second remaining
   - "Extinction Prevention" - Stop 10 global threats
   - "Threading the Needle" - Pass asteroid between Earth and Moon
   - "Pizza Delivery" - Impact precisely on Italy

2. **Progression System**
   - User ranks: Cadet → Guardian → Commander → Planetary Defender
   - XP points for successful deflections
   - Unlock advanced deflection methods
   - Daily challenges with real NEO data

3. **Interactive Elements**
   - **Doom Clock UI**: Retro DEFCON-style interface with glitch effects
   - **Emotional Earth**: Animated facial expressions on Earth
   - **Social Media Simulator**: Live fake Twitter/TikTok reactions
   - **Voice Commands**: Shout "DEFLECT!" for emergency actions
   - **AR Mode**: Project asteroids into real environment

4. **Game Modes**
   - **Story Mode**: Guided Impactor-2025 scenario
   - **Sandbox Mode**: Custom asteroid parameters
   - **Historical Mode**: Recreate Tunguska, Chicxulub events
   - **Crisis Commander**: Manage evacuations and resources
   - **Multiplayer**: Cooperative planetary defense

5. **Visual Enhancements**
   - Screen shake proportional to impact energy
   - Dramatic slow-motion for near-misses
   - Photo mode for "doomsday selfies"
   - Customizable UI themes (NASA, Retro, Cyberpunk)

## Current Implementation Status

### Completed Features
- ✅ 3D Earth, Moon, and asteroid rendering with Three.js
- ✅ Interactive controls (sliders for size, velocity, angle, distance)
- ✅ Multiple camera views (orbital, surface, impact)
- ✅ Real-time physics calculations
- ✅ Asteroid trail visualization
- ✅ Basic deflection mechanism
- ✅ Threat level assessment system
- ✅ Time to impact countdown

### Next Priority Features
1. NASA NEO API integration for real asteroid data
2. Achievement/badge system implementation
3. Sound effects and music integration
4. Save/share simulation results
5. Mobile-responsive design
6. Historical asteroid database
7. Multiplayer support via WebSockets
8. AR visualization mode