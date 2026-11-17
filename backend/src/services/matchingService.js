const Item = require('../models/Item');
const ApiError = require('../utils/ApiError');

const MAX_RESULTS = 5;
const MIN_SCORE = 32;
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'at', 'for', 'in', 'is', 'it', 'of', 'on', 'or', 'the',
  'to', 'with', 'this', 'that', 'my', 'near', 'item',
]);

function tokenize(value = '') {
  return new Set(
    String(value)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
  );
}

function calculateTextSimilarity(first, second) {
  const firstTokens = tokenize(first);
  const secondTokens = tokenize(second);
  if (!firstTokens.size || !secondTokens.size) return 0;

  let intersection = 0;
  for (const token of firstTokens) {
    if (secondTokens.has(token)) intersection += 1;
  }
  const union = new Set([...firstTokens, ...secondTokens]).size;
  return union ? intersection / union : 0;
}

function calculateLocationSimilarity(firstLocation, secondLocation) {
  const firstLat = Number(firstLocation?.latitude);
  const firstLng = Number(firstLocation?.longitude);
  const secondLat = Number(secondLocation?.latitude);
  const secondLng = Number(secondLocation?.longitude);

  if ([firstLat, firstLng, secondLat, secondLng].every(Number.isFinite)) {
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const earthRadiusMeters = 6371000;
    const latDelta = toRadians(secondLat - firstLat);
    const lngDelta = toRadians(secondLng - firstLng);
    const a =
      Math.sin(latDelta / 2) ** 2 +
      Math.cos(toRadians(firstLat)) *
        Math.cos(toRadians(secondLat)) *
        Math.sin(lngDelta / 2) ** 2;
    const distance = earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let points = 0;
    if (distance <= 150) points = 15;
    else if (distance <= 400) points = 11;
    else if (distance <= 800) points = 6;
    return { points, distance };
  }

  const firstText = `${firstLocation?.name || ''} ${firstLocation?.address || ''}`.trim();
  const secondText = `${secondLocation?.name || ''} ${secondLocation?.address || ''}`.trim();
  return {
    points: calculateTextSimilarity(firstText, secondText) > 0 ? 6 : 0,
    distance: null,
  };
}

function calculateDateSimilarity(firstDate, secondDate) {
  const firstTime = new Date(firstDate).getTime();
  const secondTime = new Date(secondDate).getTime();
  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) return 0;
  const differenceDays = Math.abs(firstTime - secondTime) / (24 * 60 * 60 * 1000);
  if (differenceDays <= 1) return 5;
  if (differenceDays <= 3) return 4;
  if (differenceDays <= 7) return 2;
  return 0;
}

function calculateMatch(source, candidate) {
  const categoryPoints = source.category === candidate.category ? 25 : 0;
  const titleSimilarity = calculateTextSimilarity(source.title, candidate.title);
  const descriptionSimilarity = calculateTextSimilarity(source.description, candidate.description);
  const location = calculateLocationSimilarity(source.location, candidate.location);
  const datePoints = calculateDateSimilarity(source.date, candidate.date);
  const score = Math.round(
    categoryPoints +
      titleSimilarity * 35 +
      descriptionSimilarity * 20 +
      location.points +
      datePoints
  );
  const reasons = [];
  if (categoryPoints) reasons.push('Same category');
  if (titleSimilarity >= 0.25) reasons.push('Title details overlap');
  if (descriptionSimilarity >= 0.2) reasons.push('Description details are similar');
  if (location.points >= 6) reasons.push(location.distance === null ? 'Matching location details' : 'Nearby locations');
  if (datePoints >= 2) reasons.push('Reported dates are close');

  return {
    score: Math.min(100, score),
    confidence: score >= 75 ? 'High' : score >= 55 ? 'Moderate' : 'Low',
    reasons,
  };
}

function sanitizeMatchedItem(item) {
  return {
    _id: item._id,
    title: item.title,
    description: item.description,
    type: item.type,
    category: item.category,
    images: item.images || [],
    location: {
      name: item.location?.name || '',
      address: item.location?.address || '',
      isApproximate: true,
    },
    date: item.date,
    status: item.status,
  };
}

async function findMatches(source) {
  if (!source || !['lost', 'found'].includes(source.type)) return [];

  const matches = [];
  const cursor = Item.find({
    type: source.type === 'lost' ? 'found' : 'lost',
    status: 'active',
  })
    .select('title description type category images location date status')
    .lean()
    .cursor();

  for await (const candidate of cursor) {
    const titleSimilarity = calculateTextSimilarity(source.title, candidate.title);
    const descriptionSimilarity = calculateTextSimilarity(source.description, candidate.description);
    if (titleSimilarity < 0.2 && descriptionSimilarity < 0.2) continue;

    const calculated = calculateMatch(source, candidate);
    if (calculated.score < MIN_SCORE) continue;
    matches.push({
      item: sanitizeMatchedItem(candidate),
      ...calculated,
    });
    matches.sort((a, b) => b.score - a.score);
    if (matches.length > MAX_RESULTS) matches.pop();
  }

  return matches;
}

async function previewMatches(draft) {
  return findMatches(draft);
}

async function getMatchesForItem(itemId, user) {
  const item = await Item.findById(itemId).lean();
  if (!item) throw ApiError.notFound('Item report not found', 'ITEM_NOT_FOUND');

  const isOwner = item.reporterId.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You are not authorized to view item matches', 'NOT_ITEM_OWNER');
  }
  if (item.status !== 'active') return [];
  return findMatches(item);
}

module.exports = {
  calculateMatch,
  calculateTextSimilarity,
  calculateLocationSimilarity,
  calculateDateSimilarity,
  findMatches,
  previewMatches,
  getMatchesForItem,
  MIN_SCORE,
};
