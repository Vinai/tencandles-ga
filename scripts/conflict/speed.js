/** Valeurs physiques conservées ; conversion limitée à la résolution mécanique. */
export function speedApplies(resolution) {
  return resolution?.gameplayMode === "speed" &&
    Number(resolution.litCandlesAtRoll) >= Number(resolution.speedLastCandle) &&
    Number(resolution.litCandlesAtRoll) <= 10;
}

export function effectiveBlueResults(rawResults, active) {
  const results = [...rawResults];
  if (!active) return results;
  let firstTwo = -1;
  for (let index = 0; index < results.length; index++) {
    if (results[index] !== 2) continue;
    if (firstTwo === -1) {
      firstTwo = index;
    } else {
      results[firstTwo] = 1;
      firstTwo = -1;
    }
  }
  return results;
}
