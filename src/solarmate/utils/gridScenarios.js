function kwh(val) {
  return Number(val.toFixed(1));
}

function percentage(val) {
  return Number(val.toFixed(1));
}

export function generateScenario(liveData, scenarioType) {
  if (!liveData || scenarioType === 'live') return liveData;
  
  const baseSupply = liveData.summary.base_prosumer_supply_kwh;
  const consumerDemand = liveData.summary.forecasted_consumer_demand_kwh;
  
  const hourly = [];
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  
  for (let i = 0; i < 24; i++) {
    const time = new Date(startOfDay.getTime() + i * 60 * 60 * 1000);
    const hour = time.getHours();
    
    // Simulate daylight curve (0 before 7am, peaks at 1pm, 0 after 7pm)
    let daylight = 0;
    if (hour >= 7 && hour <= 19) {
      // Parabolic curve: sin((hour - 7) / 12 * PI)
      daylight = Math.sin(((hour - 7) / 12) * Math.PI);
    }
    
    let cloudCover = 0;
    let rainProbability = 0;
    let rainMm = 0;
    let weatherCondition = 'Clear solar window';
    
    if (scenarioType === 'sunny') {
      cloudCover = 10 + Math.random() * 15;
      rainProbability = 5;
      rainMm = 0;
      weatherCondition = 'Clear solar window';
    } else if (scenarioType === 'rainy') {
      cloudCover = 85 + Math.random() * 15;
      rainProbability = 80 + Math.random() * 20;
      rainMm = 3 + Math.random() * 5;
      weatherCondition = 'Rain impact likely';
    } else if (scenarioType === 'variable') {
      // Sunny morning, stormy afternoon (13:00 - 18:00)
      if (hour >= 13 && hour <= 18) {
        cloudCover = 90;
        rainProbability = 85;
        rainMm = 5;
        weatherCondition = 'Rain impact likely';
      } else {
        cloudCover = 20;
        rainProbability = 10;
        rainMm = 0;
        weatherCondition = 'Clear solar window';
      }
    }
    
    // Calculate simulated solar factor based on same logic as backend
    let radiationFactor = daylight;
    let cloudPenalty = 1 - (0.15 * (cloudCover / 100));
    let rainPenalty = 1.0;
    if (rainMm >= 5) rainPenalty = 0.60;
    else if (rainMm >= 2) rainPenalty = 0.75;
    else if (rainProbability >= 85) rainPenalty = 0.85;
    else if (rainProbability >= 65) rainPenalty = 0.92;
    
    let factor = radiationFactor * cloudPenalty * rainPenalty;
    factor = Math.max(0, Math.min(1, factor));
    factor = Number(factor.toFixed(3));
    
    const forecastedSupply = baseSupply * factor;
    const matched = Math.min(forecastedSupply, consumerDemand);
    const shortfall = Math.max(consumerDemand - forecastedSupply, 0);
    const surplus = Math.max(forecastedSupply - consumerDemand, 0);
    
    let risk = 'High';
    let riskRec = 'Major TNB fallback is required. Solar generation is expected to cover less than half of demand.';
    if (consumerDemand > 0) {
      const coverage = forecastedSupply / consumerDemand;
      if (coverage >= 0.75) {
        risk = 'Low';
        riskRec = 'Solar coverage is healthy. SolarMate can support most green energy demand with limited TNB fallback.';
      } else if (coverage >= 0.50) {
        risk = 'Medium';
        riskRec = 'Partial TNB fallback is required. SolarMate should continue monitoring solar output and weather changes.';
      }
    }
    
    const solarCoveragePercent = consumerDemand > 0 ? (forecastedSupply / consumerDemand) * 100 : 0;
    const fallbackPercent = consumerDemand > 0 ? (shortfall / consumerDemand) * 100 : 0;
    
    hourly.push({
      time: time.toISOString(),
      weather_condition: weatherCondition,
      cloud_cover: percentage(cloudCover),
      rain_probability: percentage(rainProbability),
      rain_mm: Number(rainMm.toFixed(2)),
      shortwave_radiation: Number((daylight * 800).toFixed(1)),
      solar_factor: factor,
      forecasted_solar_supply_kwh: kwh(forecastedSupply),
      forecasted_consumer_demand_kwh: kwh(consumerDemand),
      matched_energy_kwh: kwh(matched),
      expected_shortfall_kwh: kwh(shortfall),
      expected_surplus_kwh: kwh(surplus),
      recommended_tnb_fallback_kwh: kwh(shortfall),
      solar_coverage_percent: percentage(solarCoveragePercent),
      fallback_percent: percentage(fallbackPercent),
      risk_level: risk
    });
  }
  
  // Use 1 PM (13:00) as the reference hour to show active data on the summary panels
  const peakHour = hourly[13];
  let recommendation = `[SIMULATED] ${scenarioType.toUpperCase()} - Simulated peak hour (1:00 PM) metrics shown.`;
  if (scenarioType === 'rainy') recommendation += " Severe weather heavily suppresses solar yield.";
  if (scenarioType === 'variable') recommendation += " Afternoon thunderstorm drastically impacts generation.";
  if (scenarioType === 'sunny') recommendation += " Ideal conditions maximize prosumer export capacity.";
  
  return {
    ...liveData,
    source: 'simulator',
    current_hour: peakHour,
    summary: {
      base_prosumer_supply_kwh: baseSupply,
      forecasted_solar_supply_kwh: peakHour.forecasted_solar_supply_kwh,
      forecasted_consumer_demand_kwh: peakHour.forecasted_consumer_demand_kwh,
      matched_energy_kwh: peakHour.matched_energy_kwh,
      expected_shortfall_kwh: peakHour.expected_shortfall_kwh,
      expected_surplus_kwh: peakHour.expected_surplus_kwh,
      recommended_tnb_fallback_kwh: peakHour.recommended_tnb_fallback_kwh,
      solar_coverage_percent: peakHour.solar_coverage_percent,
      fallback_percent: peakHour.fallback_percent,
      risk_level: peakHour.risk_level,
      recommendation: recommendation
    },
    hourly_forecast: hourly
  };
}
