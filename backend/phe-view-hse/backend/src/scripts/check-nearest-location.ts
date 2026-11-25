
import { db } from '../db/index.ts';
import { locations } from '../db/schema/auth.schema.ts';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function checkNearest(targetLat: number, targetLon: number) {
  console.log(`Checking nearest locations for: ${targetLat}, ${targetLon}`);

  const allLocations = await db.select().from(locations);

  const results = allLocations.map(loc => {
    if (!loc.geometry || !loc.geometry.startsWith('POINT')) return null;

    const match = loc.geometry.match(/\(([^)]+)\)/);
    if (!match) return null;

    const coords = match[1].trim().split(/\s+/);
    const lon = parseFloat(coords[0]);
    const lat = parseFloat(coords[1]);

    const distance = calculateDistance(targetLat, targetLon, lat, lon);
    return {
      name: loc.name,
      distance: distance,
      status: loc.status
    };
  }).filter((l): l is { name: string; distance: number; status: boolean | null } => l !== null);

  results.sort((a, b) => a.distance - b.distance);

  console.log('\nTop 10 Nearest Locations:');
  console.table(results.slice(0, 10).map(r => ({
    Location: r.name,
    'Distance (km)': (r.distance / 1000).toFixed(2),
    Status: r.status ? 'Active' : 'Inactive'
  })));
}

// Get arguments from command line
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx tsx src/scripts/check-nearest-location.ts <latitude> <longitude>');
  process.exit(1);
}

const lat = parseFloat(args[0]);
const lon = parseFloat(args[1]);

if (isNaN(lat) || isNaN(lon)) {
  console.error('Invalid coordinates provided.');
  process.exit(1);
}

checkNearest(lat, lon).then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
