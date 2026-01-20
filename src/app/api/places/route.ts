import { NextRequest, NextResponse } from 'next/server';

// Photon API (OpenStreetMap) - Fast, typo-tolerant geocoder
const PHOTON_BASE = 'https://photon.komoot.io/api/';

interface PhotonFeature {
    type: 'Feature';
    geometry: {
        coordinates: [number, number]; // [lon, lat]
        type: 'Point';
    };
    properties: {
        osm_id: number;
        osm_type: string;
        name?: string;
        city?: string;
        state?: string;
        country?: string;
        countrycode?: string;
        postcode?: string;
        street?: string;
        housenumber?: string;
        type?: string;
    };
}

interface PhotonResponse {
    type: 'FeatureCollection';
    features: PhotonFeature[];
}

interface PlaceResult {
    id: string;
    name: string;
    displayName: string;
    lat: number;
    lon: number;
    type: string;
}

// Build a readable display name from Photon properties
function buildDisplayName(props: PhotonFeature['properties']): string {
    const parts: string[] = [];

    if (props.name) parts.push(props.name);
    if (props.street) {
        const streetPart = props.housenumber
            ? `${props.housenumber} ${props.street}`
            : props.street;
        if (!parts.includes(streetPart)) parts.push(streetPart);
    }
    if (props.city && props.city !== props.name) parts.push(props.city);
    if (props.state && props.state !== props.city) parts.push(props.state);
    if (props.country) parts.push(props.country);

    return parts.join(', ') || 'Unknown location';
}

// GET /api/places?q=<query>&type=<city|hotel|airport>&near=<lat,lon>
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'city';
    const near = searchParams.get('near'); // lat,lon for location bias

    if (!query || query.length < 2) {
        return NextResponse.json([]);
    }

    try {
        // Build Photon query parameters
        const params = new URLSearchParams({
            q: query,
            limit: '10',
            lang: 'en',
        });

        // Add location bias if provided
        if (near) {
            const [lat, lon] = near.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lon)) {
                params.set('lat', lat.toString());
                params.set('lon', lon.toString());
            }
        }

        // Add type-specific query modifications
        let searchQuery = query;
        if (type === 'hotel') {
            searchQuery = `${query} hotel`;
            params.set('q', searchQuery);
        } else if (type === 'airport') {
            searchQuery = `${query} airport`;
            params.set('q', searchQuery);
        }

        const response = await fetch(`${PHOTON_BASE}?${params.toString()}`, {
            headers: {
                'User-Agent': 'WeGoAI Trip Planner (educational project)',
            },
        });

        if (!response.ok) {
            throw new Error(`Photon API error: ${response.status}`);
        }

        const data: PhotonResponse = await response.json();

        // Transform Photon results to PlaceResult format
        const results: PlaceResult[] = data.features.map((feature) => ({
            id: `${feature.properties.osm_type}_${feature.properties.osm_id}`,
            name: feature.properties.name || feature.properties.city || 'Unknown',
            displayName: buildDisplayName(feature.properties),
            lat: feature.geometry.coordinates[1], // Photon returns [lon, lat]
            lon: feature.geometry.coordinates[0],
            type: feature.properties.type || 'place',
        }));

        // For city searches, prioritize city/town results
        let filteredResults = results;
        if (type === 'city') {
            const cityTypes = ['city', 'town', 'village', 'municipality', 'administrative'];
            const cityResults = results.filter((r) => cityTypes.includes(r.type));
            if (cityResults.length > 0) {
                filteredResults = cityResults;
            }
        }

        return NextResponse.json(filteredResults);
    } catch (error) {
        console.error('Places API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch places' },
            { status: 500 }
        );
    }
}
