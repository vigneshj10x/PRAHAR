/**
 * engineTest.ts — regression tests for MockSimulationService and getSimulationService()
 *
 * Run with:
 *   npx tsx src/lib/engineTest.ts
 *
 * Exits 0 on all-pass, 1 on any failure.
 */

import { getSimulationService } from '../services/index'
import type { DesignParams } from '../domain/index'
import scenarios from '../data/scenarios.json'

// ─── Pull exact params straight from the JSON so tests stay in sync ──────────

const A_PARAMS = scenarios.A_baseline.params as DesignParams
const B_PARAMS = scenarios.B_improved.params as DesignParams
const C_PARAMS = scenarios.C_optimized.params as DesignParams

// ─── Tiny assertion helpers ───────────────────────────────────────────────────

let totalPass = 0
let totalFail = 0

function check(label: string, condition: boolean): void {
  if (condition) {
    console.log(`    ✓  ${label}`)
    totalPass++
  } else {
    console.error(`    ✗  ${label}  ← FAIL`)
    totalFail++
    process.exitCode = 1
  }
}

function near(a: number, b: number, tol = 0.001): boolean {
  return Math.abs(a - b) <= tol
}

function section(title: string): void {
  console.log(`\n  ── ${title}`)
}

async function runTests() {
  const service = getSimulationService()

  console.log('\n══════════════════════════════════════════════════════')
  console.log('  ThermoShield · SimulationService — unit tests')
  console.log('══════════════════════════════════════════════════════')

  /* ── Test 1: Scenario A exact match ──────────────────────────────── */
  section('Test 1 — Scenario A (baseline) exact match')
  const rA = await service.getResults(A_PARAMS)
  console.log(`    result: ${JSON.stringify(rA)}`)
  check('estimated = false',              !rA.estimated)
  check('scenarioKey = A_baseline',       rA.scenarioKey === 'A_baseline')
  check('indoorTemp  = −3.4 °C',          near(rA.indoorTemp,    -3.4))
  check('solarGain   = 186 W/m²',         near(rA.solarGain,     186))
  check('heatLoss    = −42 W/m²',         near(rA.heatLoss,      -42))
  check('comfortHours = 2.8 h',           near(rA.comfortHours,   2.8))
  check('heatingDemand = 8.4 kWh/day',   near(rA.heatingDemand,  8.4))

  /* ── Test 2: Scenario B exact match ──────────────────────────────── */
  section('Test 2 — Scenario B (improved) exact match')
  const rB = await service.getResults(B_PARAMS)
  console.log(`    result: ${JSON.stringify(rB)}`)
  check('estimated = false',              !rB.estimated)
  check('scenarioKey = B_improved',       rB.scenarioKey === 'B_improved')
  check('indoorTemp  = 2.1 °C',           near(rB.indoorTemp,    2.1))
  check('solarGain   = 164 W/m²',         near(rB.solarGain,     164))
  check('heatLoss    = −28 W/m²',         near(rB.heatLoss,      -28))
  check('comfortHours = 8.4 h',           near(rB.comfortHours,   8.4))
  check('heatingDemand = 5.2 kWh/day',   near(rB.heatingDemand,  5.2))

  /* ── Test 3: Scenario C exact match ──────────────────────────────── */
  section('Test 3 — Scenario C (optimized) exact match')
  const rC = await service.getResults(C_PARAMS)
  console.log(`    result: ${JSON.stringify(rC)}`)
  check('estimated = false',              !rC.estimated)
  check('scenarioKey = C_optimized',      rC.scenarioKey === 'C_optimized')
  check('indoorTemp  = 7.8 °C',           near(rC.indoorTemp,     7.8))
  check('solarGain   = 218 W/m²',         near(rC.solarGain,     218))
  check('heatLoss    = −19 W/m²',         near(rC.heatLoss,      -19))
  check('comfortHours = 14.0 h',          near(rC.comfortHours,  14.0))
  check('heatingDemand = 2.7 kWh/day',   near(rC.heatingDemand,  2.7))

  /* ── Test 4: Interpolation — midpoint between A and B ─────────────── */
  section('Test 4 — Interpolation (ins=75 mm, opening=12 %, between A & B)')
  const midParams: DesignParams = {
    shape:        'rectangular',
    orientation:  180,
    wallMaterial: 'adobe',
    insulation:   75,
    openingRatio: 12,
    thermalMass:  'medium',
  }
  const rMid = await service.getResults(midParams)
  console.log(`    result: ${JSON.stringify(rMid)}`)
  check('estimated = true',                          rMid.estimated)
  check('indoorTemp between A (−3.4) and C (7.8)',   rMid.indoorTemp > -3.4 && rMid.indoorTemp < 7.8)
  check('solarGain > 0',                             rMid.solarGain  > 0)
  check('heatLoss  < 0',                             rMid.heatLoss   < 0)
  check('comfortHours ≥ A (2.8)',                    rMid.comfortHours >= 2.8)
  check('heatingDemand ≤ A (8.4)',                   rMid.heatingDemand <= 8.4)

  /* ── Test 5: getHourlyReplay exact — Scenario A ───────────────────── */
  section('Test 5 — getHourlyReplay exact match (Scenario A)')
  const hA = await service.getHourlyReplay(A_PARAMS)
  check('returns 24 data points',                    hA.length === 24)
  check('first point hour = 0',                      hA[0].hour === 0)
  check('last  point hour = 23',                     hA[23].hour === 23)
  check('noon solarRad = 520 W/m² (clear winter sky)', hA[12].solarRad === 520)
  check('all outdoorTemp values are negative',        hA.every(h => h.outdoorTemp < 0))
  check('peak indoorTemp is at hour 14 (5.8 °C)',    near(hA[14].indoorTemp, 5.8))

  /* ── Test 6: getHourlyReplay interpolation ────────────────────────── */
  section('Test 6 — getHourlyReplay interpolation (same midpoint params)')
  const hMid = await service.getHourlyReplay(midParams)
  const hC   = await service.getHourlyReplay(C_PARAMS)
  check('returns 24 data points',                    hMid.length === 24)
  check('noon indoorTemp between A (4.1) and C (15.3)',
    hMid[12].indoorTemp > hA[12].indoorTemp &&
    hMid[12].indoorTemp < hC[12].indoorTemp
  )
  check('night outdoorTemp preserved from shared table', near(hMid[4].outdoorTemp, -19.8))
  check('heatFlux positive at solar peak (hour 12)',  hMid[12].heatFlux > 0)

  /* ── Test 7: autoOptimize ─────────────────────────────────────────── */
  section('Test 7 — autoOptimize contract')
  const opt = await service.autoOptimize(A_PARAMS)
  check('optimizedParams returned', !!opt.optimizedParams)
  check('optimizedParams insulation = 150', opt.optimizedParams.insulation === 150)
  check('optimized results indoorTemp = 7.8 °C', near(opt.results.indoorTemp, 7.8))

  /* ── Summary ──────────────────────────────────────────────────────── */
  console.log('\n══════════════════════════════════════════════════════')
  console.log(`  ${totalPass + totalFail} checks — ${totalPass} passed, ${totalFail} failed`)
  if (totalFail === 0) {
    console.log('  ✓  ALL TESTS PASSED')
  } else {
    console.error(`  ✗  ${totalFail} TEST(S) FAILED`)
  }
  console.log('══════════════════════════════════════════════════════\n')
}

runTests()
