import { NextRequest, NextResponse } from 'next/server';

// Amadeus OAuth token cache
let amadeusToken: { token: string; expiresAt: number } | null = null;

async function getAmadeusToken(): Promise<string> {
    // Check if we have a valid cached token
    if (amadeusToken && amadeusToken.expiresAt > Date.now()) {
        return amadeusToken.token;
    }

    const clientId = process.env.AMADEUS_API_KEY;
    const clientSecret = process.env.AMADEUS_API_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Amadeus API credentials not configured');
    }

    // Get new token from Amadeus (using test environment)
    const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Token error:', errorText);
        throw new Error('Failed to get Amadeus token');
    }

    const data = await response.json();

    // Cache the token (expires_in is in seconds, subtract 60s as buffer)
    amadeusToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    return amadeusToken.token;
}

// City code mapping for common destinations
const cityCodeMap: Record<string, string> = {
    'paris': 'PAR',
    'london': 'LON',
    'new york': 'NYC',
    'los angeles': 'LAX',
    'tokyo': 'TYO',
    'dubai': 'DXB',
    'singapore': 'SIN',
    'hong kong': 'HKG',
    'bangkok': 'BKK',
    'rome': 'ROM',
    'barcelona': 'BCN',
    'amsterdam': 'AMS',
    'berlin': 'BER',
    'madrid': 'MAD',
    'lisbon': 'LIS',
    'sydney': 'SYD',
    'melbourne': 'MEL',
    'miami': 'MIA',
    'las vegas': 'LAS',
    'san francisco': 'SFO',
    'chicago': 'CHI',
    'boston': 'BOS',
    'seattle': 'SEA',
    'orlando': 'ORL',
    'bali': 'DPS',
    'hyderabad': 'HYD',
    'mumbai': 'BOM',
    'delhi': 'DEL',
    'bangalore': 'BLR',
    'chennai': 'MAA',
};

async function getCityCode(token: string, keyword: string): Promise<string | null> {
    // Check static mapping first
    const normalizedKeyword = keyword.toLowerCase().trim();
    for (const [city, code] of Object.entries(cityCodeMap)) {
        if (normalizedKeyword.includes(city) || city.includes(normalizedKeyword)) {
            return code;
        }
    }

    // Try to find city via Amadeus Location API
    try {
        const apiUrl = new URL('https://test.api.amadeus.com/v1/reference-data/locations');
        apiUrl.searchParams.set('keyword', keyword);
        apiUrl.searchParams.set('subType', 'CITY');
        apiUrl.searchParams.set('page[limit]', '1');

        const response = await fetch(apiUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data[0]) {
                return data.data[0].iataCode;
            }
        }
    } catch (error) {
        console.error('Error fetching city code:', error);
    }

    return null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const keyword = searchParams.get('keyword');
        const cityCode = searchParams.get('cityCode');
        const destination = searchParams.get('destination'); // Trip destination

        if (!keyword || keyword.length < 2) {
            return NextResponse.json({ hotels: [] });
        }

        // Check if Amadeus credentials are configured
        if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
            console.warn('Amadeus API not configured, returning empty hotel list');
            return NextResponse.json({ hotels: [], message: 'Hotel search not configured' });
        }

        const token = await getAmadeusToken();

        // Determine the city code - prioritize destination over keyword
        let targetCityCode = cityCode;
        if (!targetCityCode && destination) {
            // First try to get city code from destination
            targetCityCode = await getCityCode(token, destination);
        }
        if (!targetCityCode) {
            // Fallback to keyword
            targetCityCode = await getCityCode(token, keyword);
        }

        if (targetCityCode) {
            // Use Hotel List API - search hotels by city code
            const hotelListUrl = new URL('https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city');
            hotelListUrl.searchParams.set('cityCode', targetCityCode);
            hotelListUrl.searchParams.set('radius', '30');
            hotelListUrl.searchParams.set('radiusUnit', 'KM');
            hotelListUrl.searchParams.set('hotelSource', 'ALL');

            const response = await fetch(hotelListUrl.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();

                // Filter hotels by keyword and limit results
                const keyword_lower = keyword.toLowerCase();
                const hotels = (data.data || [])
                    .filter((hotel: any) => hotel.name.toLowerCase().includes(keyword_lower))
                    .slice(0, 10)
                    .map((hotel: any) => ({
                        name: hotel.name,
                        address: hotel.address?.cityName || targetCityCode,
                        hotelId: hotel.hotelId,
                    }));

                // If we have filtered results, return them
                if (hotels.length > 0) {
                    return NextResponse.json({ hotels });
                }

                // Otherwise return first 10 hotels in the city
                const allHotels = (data.data || [])
                    .slice(0, 10)
                    .map((hotel: any) => ({
                        name: hotel.name,
                        address: hotel.address?.cityName || targetCityCode,
                        hotelId: hotel.hotelId,
                    }));

                return NextResponse.json({ hotels: allHotels });
            } else {
                const errorData = await response.json();
                console.error('Hotel List API error:', errorData);
            }
        }

        // Fallback: Return empty if we couldn't find hotels
        return NextResponse.json({ hotels: [], message: 'No hotels found for this search' });

    } catch (error) {
        console.error('Error in hotel search API:', error);
        return NextResponse.json({ hotels: [], error: 'Internal server error' });
    }
}
