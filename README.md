# 🌍☄️ NASA Meteor Bears

**Interactive Asteroid Impact Simulator** | Island Polar Bears @ NASA Space Apps Hackathon 2024

Transform complex NASA and USGS data into immersive planetary defense scenarios. Simulate asteroid impacts with scientifically accurate physics, visualize catastrophic consequences, and explore real Near-Earth Object threats—all in your browser.

---

## Project Overview

**NASA Meteor Bears** is a web-based asteroid impact simulator that integrates real NASA NEO API data and USGS seismic datasets to create an educational and decision-support tool for scientists, policymakers, educators, and the public. Using peer-reviewed physics formulas and advanced 3D/2D visualizations, it simulates asteroid trajectories, calculates impact physics (kinetic energy, crater formation, earthquake magnitudes, tsunami heights), and provides AI-driven risk assessments by correlating asteroids with historical earthquake data.

### Challenge: Impactor-2025

This project addresses the **NASA Space Apps 2024 "Asteroid Threat Simulator"** challenge by developing an interactive tool that:

- Integrates NASA Near-Earth Object (NEO) API with USGS geological datasets
- Simulates asteroid trajectories using Keplerian orbital mechanics
- Calculates impact consequences with scientifically accurate formulas
- Visualizes 3D orbital paths and 2D impact zones with realistic terrain
- Provides enhanced predictions using LLM-based earthquake correlation analysis

---

## Key Features

### Real NASA Data Integration

- **30,000+ Near-Earth Asteroids** from NASA's NEO database
- Live data fetching via NASA NEO Feed, Browse, and Lookup APIs
- Asteroid characteristics: diameter, velocity, orbital elements, hazard classification
- Direct links to NASA JPL Small-Body Database

### USGS Environmental Data

- **Real-time USGS Earthquake API** integration (10-year historical analysis)
- Seismic zone identification (Pacific Ring of Fire, Alpide Belt, Mid-Atlantic Ridge, etc.)
- Tsunami risk assessment based on coastal proximity and elevation
- Secondary hazard analysis (fault activation, atmospheric disturbance, ejecta patterns)

### Scientific Physics Engine

All calculations use peer-reviewed formulas:

- **Kinetic Energy**: KE = 0.5 × m × v² (assuming 3000 kg/m³ asteroid density)
- **Crater Size**: Pike et al. scaling laws → E = 9.1×10²⁴ D²·⁵⁹ erg
- **Earthquake Magnitude**: Gutenberg-Richter → log₁₀(E) = 1.5M + 4.8
- **Tsunami Height**: Ward & Asphaug (2000) cavity scaling → H = 1.88 × E⁰·²²
- **Affected Radius**: Up to 20× crater diameter for shockwave damage

### Advanced Visualizations

#### 3D Orbital Simulation (Three.js)

- Photorealistic Earth with atmospheric glow (Fresnel shader)
- 3,000+ distant stars with realistic colors and brightness variation
- Dynamic asteroid with irregular geometry and hazard warning ring
- Real-time particle trail effects (30 trail points)
- Explosion particle system on impact (20 particles with physics)
- Orbital camera controls (rotate, zoom, pan)
- Dynamic camera movement tracking asteroid approach
- Camera shake on impact
- Distance tracking (km from Earth's surface)

#### 2D Impact Terrain Visualization

- **Real-world terrain data** from Open-Meteo Elevation API
- Geographic biome rendering (oceans, mountains, deserts, ice sheets, forests)
- Animated environmental effects:
  - Ocean wave shimmer
  - Mountain shadow gradients
  - Desert dune patterns
  - Ice sheet sparkles
- Population center visualization with impact damage states
- Crater rendering with depth gradients and rim elevation
- Shockwave animations with energy attenuation
- Seismic wave propagation (5 concurrent waves)
- Debris particle physics (100 particles with gravity simulation)

### AI-Enhanced Predictions

- **GROQ LLM Integration** for intelligent risk assessment
- Correlation with **top 10 similar historical earthquakes**
- Energy comparison between asteroid impacts and seismic events
- Confidence scoring and threat categorization (LOW/MEDIUM/HIGH/CRITICAL)
- Historical comparison analysis
- Detailed recommendations based on impact characteristics
- Fallback predictions when LLM unavailable

### Interactive Controls

- Asteroid diameter slider (10m - 10,000m)
- Velocity slider (5 km/s - 50 km/s)
- Impact angle slider (15° - 90°)
- Starting distance slider (1,000 km - 500,000 km)
- Load real NASA asteroids with one click
- 10-second countdown before simulation
- Auto-reset after 30 seconds
- Real-time parameter updates

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm/bun

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nasa-meteor-bears.git
cd nasa-meteor-bears

# Install dependencies
npm install

# Set up environment variables (for LLM features)
cp .env.example .env.local
# Add your GROQ_API_KEY to .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

```bash
# Required for LLM-enhanced predictions
GROQ_API_KEY=your_groq_api_key_here

# NASA API key (optional - uses DEMO_KEY by default)
NASA_API_KEY=your_nasa_api_key
```

Get a free GROQ API key at: https://console.groq.com/keys
Get a NASA API key at: https://api.nasa.gov/

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Main application page
│   ├── game/page.tsx                     # Game mode
│   ├── api/
│   │   ├── neo-feed/route.ts             # NASA NEO Feed API
│   │   ├── neo-browse/route.ts           # NASA NEO Browse API
│   │   ├── neo-lookup/route.ts           # NASA NEO Lookup API
│   │   ├── llm-enhanced-prediction/      # LLM risk assessment
│   │   ├── correlate-asteroid-earthquakes/ # Earthquake correlation
│   │   └── usgs-assessment/              # USGS seismic analysis
│   └── utils/
│       ├── consequence-predictor.ts      # Physics engine (crater, energy, tsunami)
│       └── asteroid-trajectory.ts        # Keplerian orbital mechanics
├── components/
│   ├── ImpactSimulator.tsx               # 3D Three.js simulation
│   ├── TerrainVisualizer.tsx             # 2D impact terrain renderer
│   ├── NASADataPanel.tsx                 # NASA asteroid browser
│   ├── USGSDataPanel.tsx                 # USGS data display
│   ├── LeftSidebar.tsx                   # Control panel
│   └── Navbar.tsx                        # Top navigation
├── hooks/
│   ├── useNASAData.ts                    # NASA data fetching hook
│   └── useEnhancedPredictions.ts         # Prediction pipeline hook
├── services/
│   ├── usgsDataService.ts                # USGS API integration
│   └── realTerrainData.ts                # Terrain data fetching
├── lib/
│   └── EnhancedEarth.ts                  # 3D Earth rendering with shaders
├── api/
│   └── index.ts                          # Fetch utilities with fallbacks
└── logger/
    └── index.ts                          # Centralized logging system
```

---

## How to Use

### 1. **Browse Real Asteroids**

- Click **"NASA DATA"** in the top-right corner
- Switch between **Feed** (recent), **Browse** (all), or **Lookup** (by ID)
- Click **"Load"** on any asteroid to import its real data

### 2. **Customize Parameters**

- Adjust sliders in the left sidebar:
  - **Diameter**: Size of the asteroid (10m - 10km)
  - **Velocity**: Impact speed (5 - 50 km/s)
  - **Angle**: Entry angle (15° - 90°)
  - **Distance**: Starting distance (1,000 - 500,000 km)

### 3. **Run Simulation**

- Click **"START IMPACT SIMULATION"**
- Watch the 10-second countdown
- Observe 3D orbital descent with trail effects
- Experience transition to 2D impact visualization
- View real terrain, crater formation, shockwaves, and debris

### 4. **Analyze Results**

- Click on the asteroid in 2D view to see:
  - **Impact Info**: Energy, crater size, affected radius, threat level
  - **USGS Assessment**: Seismic zone, tsunami risk, expected magnitude
  - **Enhanced Prediction**: AI-driven risk analysis with historical comparisons

### 5. **Auto-Reset**

- Simulation automatically resets after 30 seconds
- Manual reset available via **"RESET"** button

---

## Scientific Accuracy

### Physics Formulas

All impact calculations are based on peer-reviewed scientific literature:

**1. Kinetic Energy**

```
KE = 0.5 × m × v²
where m = ρ × (4/3)πr³ (asteroid density ρ = 3000 kg/m³)
```

**2. Crater Diameter** (Pike et al., 1980)

```
E = 9.1×10²⁴ D^2.59 erg
D = (E / 9.1×10²⁴)^(1/2.59) km
```

**3. Earthquake Magnitude** (Gutenberg-Richter)

```
log₁₀(E) = 1.5M + 4.8
M = (log₁₀(E) - 4.8) / 1.5
```

**4. Tsunami Height** (Ward & Asphaug, 2000)

```
H = 1.88 × E^0.22 meters
where E = energy in megatons TNT
```

**5. Affected Radius**

```
R = crater_diameter × (10 to 20)
Varies by impact energy and geographic features
```

### Data Sources

- **NASA NEO API**: https://api.nasa.gov/neo/rest/v1/
- **USGS Earthquake API**: https://earthquake.usgs.gov/fdsnws/event/1/
- **Open-Meteo Elevation API**: https://api.open-meteo.com/v1/elevation
- **GROQ LLM**: Llama 3.1 70B for risk analysis

---

## Technology Stack

- **Framework**: Next.js 15.5.4 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **3D Graphics**: Three.js with OrbitControls
- **State Management**: React 19.1.0 hooks
- **APIs**: NASA NEO, USGS Earthquake, Open-Meteo, GROQ
- **Runtime**: Node.js 18+

---

## 🔗 Links

- **Live Demo**: [Coming Soon]
- **NASA Space Apps**: https://www.spaceappschallenge.org/
- **Challenge Page**: [Insert Challenge URL]
- **Documentation**: [See `/docs` folder]

---
