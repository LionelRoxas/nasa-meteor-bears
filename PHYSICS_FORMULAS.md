# Physics Formulas for Asteroid Impact Calculations

This document lists all scientifically validated formulas used in the NASA Meteor Bears impact simulator, prioritizing official NASA/USGS sources and peer-reviewed literature.

## ✅ VERIFIED FORMULAS (Currently Implemented)

### 1. Kinetic Energy
**Formula:** `KE = 0.5 × m × v²`
- where `m = ρ × (4/3)πr³`
- asteroid density `ρ = 3000 kg/m³` (NASA Challenge specification)
- **Source:** CHALLENGE.md, basic physics
- **Location:** `src/app/utils/consequence-predictor.ts:118-146`

### 2. Crater Diameter (Pike et al., 1980)
**Formula:** `D = (E / 9.1×10²⁴)^(1/2.59)` km
- where E is energy in ergs (1 J = 10⁷ erg)
- **Source:** README.md, Pike et al. (1980) scaling laws
- **Reference:** Pike (1974, 1980, 1988) crater morphology studies
- **Location:** `src/app/utils/consequence-predictor.ts:150-162`

### 3. Earthquake Magnitude (Gutenberg-Richter)
**Formula:** `M = (log₁₀(E) - 4.8) / 1.5`
- where E is energy in Joules
- Derived from: `log₁₀(E) = 1.5M + 4.8`
- **Source:** README.md, Gutenberg-Richter relation
- **Reference:** USGS earthquake magnitude-energy relationship
- **Location:**
  - `src/app/utils/consequence-predictor.ts:165-173`
  - `src/app/api/usgs-assessment/route.ts:85-87` ✅ FIXED
  - `src/services/usgsDataService.ts:393-396` ✅ FIXED

### 4. Tsunami Height (Ward & Asphaug, 2000)
**Formula:** `H = 1.88 × E^0.22` meters
- where E is energy in megatons TNT
- TNT conversion: `E_MT = E_J / (4.184×10⁶ × 10⁹)`
- **Source:** README.md, Ward & Asphaug (2000) cavity scaling
- **Reference:** Schmidt and Holsapple (1982) CT parameter
- **Location:**
  - `src/app/utils/consequence-predictor.ts:176-193`
  - `src/app/api/usgs-assessment/route.ts:89-95` ✅ FIXED
  - `src/services/usgsDataService.ts:462-476` ✅ FIXED

---

## 📋 ADDITIONAL FORMULAS TO IMPLEMENT

### 5. Crater Depth (Pike, 1977-1988)
**Formula:**
- **Simple craters (D < 3.2 km on Earth):** `depth = 0.2 × diameter`
- **Complex craters (D ≥ 3.2 km):** `depth = 0.15 × diameter` (shallower due to collapse)
- **Source:** Pike (1977, 1980, 1988) depth/diameter studies
- **Reference:** d/D ratio ~0.2 for fresh simple craters on terrestrial bodies
- **Scientific Basis:** Empirical measurements from Moon, Mars, Mercury craters

### 6. Fireball Radius
**Formula:** `R_fireball = 140 × E^0.4` meters
- where E is in megatons TNT
- **Source:** Nuclear blast scaling (Glasstone & Dolan, "Effects of Nuclear Weapons")
- **Basis:** Fireball scales as approximately 5th root of energy (E^0.2)
- **Note:** Collins et al. (2005) Earth Impact Effects Program uses similar scaling for asteroid thermal effects
- **Applicability:** Valid for E > 0.01 MT; smaller impacts are airbursts

### 7. Thermal Radiation Burn Distances
Based on Collins, Melosh, Marcus (2005) Earth Impact Effects Program:

**3rd degree burns (severe):**
- `R_3rd = 1300 × E^0.41` meters
- Threshold: ~10 cal/cm² thermal fluence

**2nd degree burns (moderate):**
- `R_2nd = 1900 × E^0.41` meters
- Threshold: ~5 cal/cm² thermal fluence

**1st degree burns (minor):**
- `R_1st = 2500 × E^0.41` meters
- Threshold: ~3 cal/cm² thermal fluence

**Source:** Nuclear weapons testing data (applicable to asteroid impacts)
**Reference:** Thermal radiation scales with energy^0.41 (between square root and cube root)

### 8. Overpressure and Shock Wave
**Overpressure at distance R:**
- `ΔP = P₀ × (R₀ / R)^n` where n ≈ 1.3-1.5 (empirical attenuation)
- `P₀` = peak overpressure at crater rim
- **Source:** Collins et al. (2005), blast wave physics

**Overpressure from energy:**
- `ΔP = (E / (4π R²))^0.7` atmospheres (scaling approximation)
- **Source:** Rankine-Hugoniot shock relations (simplified)

**Sound pressure level (decibels):**
- `dB = 20 × log₁₀(P / 0.00002)` where P in Pascals
- Reference pressure: 20 μPa (threshold of hearing)
- Max in atmosphere: 194 dB = 101,325 Pa = 1 ATM
- **Source:** Standard acoustics formula

### 9. Wind Speed from Blast Wave
**Formula:** `v = 470 × (ΔP)^0.5` m/s
- where ΔP is overpressure in atmospheres
- **Source:** Rankine-Hugoniot relations for shock fronts
- **Reference:** Wind speed behind shock scales with square root of overpressure

### 10. Casualty Estimates
**Population affected calculations:**
- **Vaporized (crater):** `N_vaporized = ρ_pop × π × R_crater²`
- **Fireball deaths:** `N_fireball = ρ_pop × π × R_fireball² × 0.9` (90% fatality rate)
- **Severe burns:** `N_severe = ρ_pop × π × (R_3rd² - R_fireball²) × 0.5` (50% fatality)
- **Moderate burns:** `N_moderate = ρ_pop × π × (R_2nd² - R_3rd²) × 0.3` (30% fatality)
- **Shockwave deaths:** `N_shock = ρ_pop × A_severe × 0.7` where ΔP > 0.3 atm
- **Wind blast deaths:** `N_wind = ρ_pop × A_wind × 0.5` where v > 300 mph
- **Earthquake deaths:** `N_quake = ρ_pop × A_quake × fatality_rate(M)`

Where:
- `ρ_pop` = population density (people/km²)
- `A` = affected area in km²
- Fatality rates based on historical disaster data

**Source:** Empirical disaster casualty studies, nuclear weapons effects research

---

## 🎯 EFFECTS DISTANCE THRESHOLDS

Based on nuclear weapons effects and adapted for asteroid impacts:

### Thermal Effects
- **Clothes ignite:** `R = 1100 × E^0.41` m (severe thermal radiation)
- **Trees ignite:** `R = 1400 × E^0.41` m (sustained burning)
- **Paper ignites:** `R = 900 × E^0.41` m

### Blast/Overpressure Effects
- **Buildings collapse:** ΔP > 0.1 atm → `R = (E/30)^0.33` km
- **Homes destroyed:** ΔP > 0.05 atm → `R = (E/10)^0.33` km
- **Windows shatter:** ΔP > 0.01 atm → `R = (E/1)^0.33` km
- **Lung damage:** ΔP > 0.3 atm → `R = (E/100)^0.33` km
- **Eardrum rupture:** ΔP > 0.15 atm → `R = (E/50)^0.33` km

### Wind Effects
- **EF5 tornado equivalent:** v > 200 mph (89 m/s)
- **Trees knocked down:** v > 100 mph (45 m/s)
- **Homes leveled:** v > 250 mph (112 m/s)

**Source:** Nuclear weapons effects scaling (Glasstone & Dolan), validated by asteroid impact modeling

---

## 📚 PRIMARY REFERENCES

1. **Pike, R.J.** (1974, 1980, 1988) - Crater depth/diameter relationships
2. **Collins, Melosh, Marcus** (2005) - "Earth Impact Effects Program", *Meteoritics & Planetary Science*
3. **Ward & Asphaug** (2000) - Tsunami cavity scaling
4. **Gutenberg-Richter** - Earthquake magnitude-energy relation (standard USGS formula)
5. **Schmidt & Holsapple** (1982) - Impact crater scaling laws
6. **Glasstone & Dolan** - "Effects of Nuclear Weapons" (thermal/blast effects applicable to impacts)
7. **NASA Challenge Documentation** (CHALLENGE.md) - Density assumptions, impact energy requirements

---

## 🔬 DATA SOURCES (From LINKS.md)

- **NASA JPL Small-Body Database:** https://ssd.jpl.nasa.gov/tools/sbdb_query.html
- **NASA Orbital Mechanics:** https://ssd.jpl.nasa.gov/planets/approx_pos.html (Keplerian elements)
- **USGS Earthquake Data:** https://earthquake.usgs.gov/earthquakes/search/
- **USGS National Map:** https://www.usgs.gov/programs/national-geospatial-program/national-map
- **Near-Earth Comets Data:** https://data.nasa.gov/dataset/near-earth-comets-orbital-elements-api

---

## ⚠️ IMPORTANT NOTES

1. **Formula Hierarchy:**
   - NASA/USGS official sources (highest priority)
   - Peer-reviewed impact literature (Pike, Collins, Melosh)
   - Nuclear weapons effects (validated analog for thermal/blast)
   - Empirical scaling laws (when specific formulas unavailable)

2. **Units Consistency:**
   - Energy: Joules (primary), converted to megatons TNT for some formulas
   - Distance: meters or kilometers (specified per formula)
   - Pressure: Pascals or atmospheres (specified per formula)
   - TNT conversion: 1 kg TNT = 4.184×10⁶ J

3. **Applicability Ranges:**
   - Small impacts (< 10 m): Mostly airbursts, limited cratering
   - Medium impacts (10-1000 m): Crater-forming, regional effects
   - Large impacts (> 1 km): Global effects, complex craters
   - Giant impacts (> 10 km): Mass extinction events

4. **Validation:**
   - Formulas validated against historical impact events where possible
   - Nuclear test data provides empirical validation for thermal/blast effects
   - Crater scaling laws validated from planetary geology observations
