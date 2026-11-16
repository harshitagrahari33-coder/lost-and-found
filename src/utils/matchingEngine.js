/**
 * Smart Item Matching Engine for KIET Lost & Found
 * Computes heuristic multi-factor similarity scores between lost and found items.
 */

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he",
  "in", "is", "it", "its", "of", "on", "that", "the", "to", "was", "were",
  "will", "with", "lost", "found", "item", "my", "near", "campus", "left",
  "some", "here", "there", "this", "please", "help"
]);

function extractKeywords(text = "") {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function calculateGeoDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Score two opposing items (0 to 100)
 */
export function calculateMatchScore(targetItem, candidateItem) {
  if (!targetItem || !candidateItem) return { score: 0, confidence: "None", reasons: [] };

  // Must be opposite type (lost <-> found)
  if (targetItem.type === candidateItem.type) {
    return { score: 0, confidence: "None", reasons: [] };
  }

  let score = 0;
  const reasons = [];

  // 1. Category match (25 pts)
  if (targetItem.category && targetItem.category === candidateItem.category) {
    score += 25;
    reasons.push(`Matching category: ${targetItem.category}`);
  }

  // 2. Keyword & Text Similarity (up to 45 pts)
  const targetTitleWords = extractKeywords(targetItem.title);
  const candidateTitleWords = extractKeywords(candidateItem.title);
  const targetDescWords = extractKeywords(targetItem.description);
  const candidateDescWords = extractKeywords(candidateItem.description);

  // Title keyword overlap
  const sharedTitleWords = targetTitleWords.filter((w) => candidateTitleWords.includes(w));
  if (sharedTitleWords.length > 0) {
    const titlePts = Math.min(30, sharedTitleWords.length * 15);
    score += titlePts;
    reasons.push(`Shared title keywords (${sharedTitleWords.slice(0, 3).join(", ")})`);
  }

  // Cross description/title overlap
  const crossWords = targetTitleWords.concat(targetDescWords).filter(
    (w) => candidateTitleWords.includes(w) || candidateDescWords.includes(w)
  );
  const uniqueCross = [...new Set(crossWords)];
  if (uniqueCross.length > sharedTitleWords.length) {
    const additionalWords = uniqueCross.length - sharedTitleWords.length;
    score += Math.min(15, additionalWords * 5);
  }

  // 3. Location Proximity (up to 20 pts)
  const lat1 = Number(targetItem.latitude || targetItem.locationDetails?.latitude);
  const lon1 = Number(targetItem.longitude || targetItem.locationDetails?.longitude);
  const lat2 = Number(candidateItem.latitude || candidateItem.locationDetails?.latitude);
  const lon2 = Number(candidateItem.longitude || candidateItem.locationDetails?.longitude);

  if (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2) && lat1 !== 0 && lat2 !== 0) {
    const distanceMeters = calculateGeoDistanceMeters(lat1, lon1, lat2, lon2);
    if (distanceMeters <= 150) {
      score += 20;
      reasons.push(`Close campus proximity (~${Math.round(distanceMeters)}m)`);
    } else if (distanceMeters <= 400) {
      score += 12;
      reasons.push(`Same campus zone (~${Math.round(distanceMeters)}m)`);
    }
  } else {
    // Landmark name matching
    const loc1 = (typeof targetItem.location === "string" ? targetItem.location : targetItem.location?.name || "").toLowerCase();
    const loc2 = (typeof candidateItem.location === "string" ? candidateItem.location : candidateItem.location?.name || "").toLowerCase();

    const landmarks = ["library", "cafeteria", "canteen", "sports", "gym", "hostel", "block a", "block b", "auditorium", "gate"];
    const sharedLandmark = landmarks.find((lm) => loc1.includes(lm) && loc2.includes(lm));
    if (sharedLandmark) {
      score += 15;
      reasons.push(`Same campus building (${sharedLandmark.toUpperCase()})`);
    }
  }

  // 4. Date/Time Proximity (up to 10 pts)
  const date1 = new Date(targetItem.date || targetItem.createdAt || Date.now()).getTime();
  const date2 = new Date(candidateItem.date || candidateItem.createdAt || Date.now()).getTime();
  const diffDays = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);

  if (diffDays <= 3) {
    score += 10;
    reasons.push("Reported within 3 days of each other");
  } else if (diffDays <= 7) {
    score += 5;
    reasons.push("Reported within the same week");
  }

  // Cap at 99% for heuristics
  const finalScore = Math.min(98, score);

  let confidence = "Low";
  if (finalScore >= 65) confidence = "High";
  else if (finalScore >= 40) confidence = "Moderate";

  return {
    score: finalScore,
    confidence,
    reasons,
  };
}

/**
 * Find all high-confidence potential matches in a list of items for a given item
 */
export function findPotentialMatches(targetItem, allItems = [], minScore = 35) {
  if (!targetItem || !Array.isArray(allItems)) return [];

  const targetId = targetItem._id || targetItem.id;

  return allItems
    .filter((candidate) => {
      const candidateId = candidate._id || candidate.id;
      return (
        candidateId !== targetId &&
        candidate.type !== targetItem.type &&
        candidate.status !== "resolved" &&
        !candidate.resolved
      );
    })
    .map((candidate) => {
      const matchResult = calculateMatchScore(targetItem, candidate);
      return {
        item: candidate,
        ...matchResult,
      };
    })
    .filter((res) => res.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
