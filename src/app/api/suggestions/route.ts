import { NextRequest, NextResponse } from 'next/server';

// Mapping of popular destinations to their airports and hotels
const destinationData: Record<string, { airports: string[]; hotels: string[] }> = {
    // Europe
    'paris': {
        airports: ['Charles de Gaulle Airport (CDG)', 'Paris Orly Airport (ORY)', 'Paris Beauvais Airport (BVA)'],
        hotels: ['Hotel Plaza Athénée', 'The Ritz Paris', 'Four Seasons Hotel George V', 'Le Bristol Paris', 'Shangri-La Hotel Paris', 'Mandarin Oriental Paris']
    },
    'london': {
        airports: ['London Heathrow Airport (LHR)', 'London Gatwick Airport (LGW)', 'London Stansted Airport (STN)', 'London Luton Airport (LTN)', 'London City Airport (LCY)'],
        hotels: ['The Savoy', 'Claridge\'s', 'The Ritz London', 'The Dorchester', 'Shangri-La The Shard', 'Four Seasons Hotel London']
    },
    'rome': {
        airports: ['Leonardo da Vinci International Airport (FCO)', 'Rome Ciampino Airport (CIA)'],
        hotels: ['Hotel Eden', 'Hassler Roma', 'The St. Regis Rome', 'Hotel de Russie', 'Portrait Roma', 'J.K. Place Roma']
    },
    'barcelona': {
        airports: ['Barcelona–El Prat Airport (BCN)', 'Girona-Costa Brava Airport (GRO)'],
        hotels: ['Hotel Arts Barcelona', 'W Barcelona', 'Mandarin Oriental Barcelona', 'Majestic Hotel & Spa', 'El Palace Barcelona', 'Cotton House Hotel']
    },
    'amsterdam': {
        airports: ['Amsterdam Airport Schiphol (AMS)', 'Rotterdam The Hague Airport (RTM)'],
        hotels: ['Waldorf Astoria Amsterdam', 'The Hoxton Amsterdam', 'Conservatorium Hotel', 'Pulitzer Amsterdam', 'Hotel V Nesplein', 'Sofitel Legend The Grand Amsterdam']
    },
    'berlin': {
        airports: ['Berlin Brandenburg Airport (BER)'],
        hotels: ['Hotel Adlon Kempinski', 'The Ritz-Carlton Berlin', 'Regent Berlin', 'Das Stue', 'Soho House Berlin', 'Hotel de Rome']
    },
    'madrid': {
        airports: ['Adolfo Suárez Madrid–Barajas Airport (MAD)'],
        hotels: ['The Westin Palace Madrid', 'Hotel Ritz Madrid', 'Four Seasons Hotel Madrid', 'Gran Meliá Palacio de los Duques', 'Rosewood Villa Magna', 'Mandarin Oriental Ritz Madrid']
    },
    'lisbon': {
        airports: ['Lisbon Humberto Delgado Airport (LIS)'],
        hotels: ['Four Seasons Hotel Ritz Lisbon', 'Bairro Alto Hotel', 'The Lumiares Hotel & Spa', 'Pestana Palace Lisboa', 'Memmo Alfama', 'Verride Palácio Santa Catarina']
    },
    // Asia
    'tokyo': {
        airports: ['Narita International Airport (NRT)', 'Haneda Airport (HND)'],
        hotels: ['Park Hyatt Tokyo', 'Aman Tokyo', 'The Peninsula Tokyo', 'Mandarin Oriental Tokyo', 'The Ritz-Carlton Tokyo', 'Palace Hotel Tokyo']
    },
    'singapore': {
        airports: ['Singapore Changi Airport (SIN)'],
        hotels: ['Marina Bay Sands', 'Raffles Hotel Singapore', 'The Fullerton Hotel', 'Capella Singapore', 'The Ritz-Carlton Millenia Singapore', 'Shangri-La Singapore']
    },
    'bangkok': {
        airports: ['Suvarnabhumi Airport (BKK)', 'Don Mueang International Airport (DMK)'],
        hotels: ['Mandarin Oriental Bangkok', 'The Peninsula Bangkok', 'Shangri-La Hotel Bangkok', 'Four Seasons Hotel Bangkok', 'The Siam', 'Rosewood Bangkok']
    },
    'dubai': {
        airports: ['Dubai International Airport (DXB)', 'Al Maktoum International Airport (DWC)'],
        hotels: ['Burj Al Arab', 'Atlantis The Palm', 'One&Only Royal Mirage', 'Armani Hotel Dubai', 'Four Seasons Resort Dubai', 'Jumeirah Beach Hotel']
    },
    'hong kong': {
        airports: ['Hong Kong International Airport (HKG)'],
        hotels: ['The Peninsula Hong Kong', 'Mandarin Oriental Hong Kong', 'The Ritz-Carlton Hong Kong', 'Four Seasons Hotel Hong Kong', 'Rosewood Hong Kong', 'The Upper House']
    },
    // North America
    'new york': {
        airports: ['John F. Kennedy International Airport (JFK)', 'LaGuardia Airport (LGA)', 'Newark Liberty International Airport (EWR)'],
        hotels: ['The Plaza Hotel', 'The St. Regis New York', 'The Peninsula New York', 'Four Seasons Hotel New York', 'Mandarin Oriental New York', 'The Carlyle']
    },
    'los angeles': {
        airports: ['Los Angeles International Airport (LAX)', 'Hollywood Burbank Airport (BUR)', 'John Wayne Airport (SNA)'],
        hotels: ['The Beverly Hills Hotel', 'Chateau Marmont', 'Shutters on the Beach', 'Waldorf Astoria Beverly Hills', 'The Peninsula Beverly Hills', 'Hotel Bel-Air']
    },
    'miami': {
        airports: ['Miami International Airport (MIA)', 'Fort Lauderdale-Hollywood International Airport (FLL)'],
        hotels: ['Faena Miami Beach', 'The Setai Miami Beach', 'Four Seasons Hotel Miami', 'Mandarin Oriental Miami', 'The Ritz-Carlton South Beach', 'Fontainebleau Miami Beach']
    },
    'san francisco': {
        airports: ['San Francisco International Airport (SFO)', 'Oakland International Airport (OAK)', 'San Jose International Airport (SJC)'],
        hotels: ['The Ritz-Carlton San Francisco', 'Fairmont San Francisco', 'Palace Hotel', 'The St. Regis San Francisco', 'Four Seasons Hotel San Francisco', 'Hotel Vitale']
    },
    'las vegas': {
        airports: ['Harry Reid International Airport (LAS)'],
        hotels: ['Bellagio', 'The Venetian', 'Wynn Las Vegas', 'The Cosmopolitan', 'Encore at Wynn', 'Four Seasons Hotel Las Vegas']
    },
    // Oceania
    'sydney': {
        airports: ['Sydney Kingsford Smith Airport (SYD)'],
        hotels: ['Park Hyatt Sydney', 'The Langham Sydney', 'Four Seasons Hotel Sydney', 'Shangri-La Hotel Sydney', 'InterContinental Sydney', 'The Fullerton Hotel Sydney']
    },
    'melbourne': {
        airports: ['Melbourne Airport (MEL)', 'Avalon Airport (AVV)'],
        hotels: ['The Langham Melbourne', 'Crown Towers Melbourne', 'Park Hyatt Melbourne', 'The Ritz-Carlton Melbourne', 'InterContinental Melbourne', 'Grand Hyatt Melbourne']
    },
    // South America
    'rio de janeiro': {
        airports: ['Rio de Janeiro/Galeão International Airport (GIG)', 'Santos Dumont Airport (SDU)'],
        hotels: ['Belmond Copacabana Palace', 'Hotel Fasano Rio de Janeiro', 'JW Marriott Hotel Rio de Janeiro', 'Grand Hyatt Rio de Janeiro', 'Fairmont Rio de Janeiro', 'Liven Hotel Rio']
    },
    'buenos aires': {
        airports: ['Ministro Pistarini International Airport (EZE)', 'Aeroparque Jorge Newbery (AEP)'],
        hotels: ['Four Seasons Hotel Buenos Aires', 'Faena Hotel Buenos Aires', 'Alvear Palace Hotel', 'Park Hyatt Buenos Aires', 'Palacio Duhau', 'Sofitel Buenos Aires Recoleta']
    },
    // Additional popular destinations
    'bali': {
        airports: ['Ngurah Rai International Airport (DPS)'],
        hotels: ['Four Seasons Resort Bali at Sayan', 'COMO Uma Ubud', 'The Mulia Bali', 'Bulgari Resort Bali', 'Mandapa Ritz-Carlton Reserve', 'Alila Villas Uluwatu']
    },
    'maldives': {
        airports: ['Velana International Airport (MLE)'],
        hotels: ['Soneva Fushi', 'One&Only Reethi Rah', 'Four Seasons Resort Maldives', 'Cheval Blanc Randheli', 'St. Regis Maldives Vommuli', 'Waldorf Astoria Maldives']
    },
    'hawaii': {
        airports: ['Daniel K. Inouye International Airport (HNL)', 'Kahului Airport (OGG)', 'Kona International Airport (KOA)'],
        hotels: ['Four Seasons Resort Maui', 'Halekulani', 'The Ritz-Carlton Kapalua', 'Grand Hyatt Kauai', 'Montage Kapalua Bay', 'Fairmont Orchid Hawaii']
    },
    'cancun': {
        airports: ['Cancún International Airport (CUN)'],
        hotels: ['The Ritz-Carlton Cancun', 'Le Blanc Spa Resort', 'Live Aqua Beach Resort', 'Nizuc Resort & Spa', 'Secrets The Vine Cancun', 'Hyatt Zilara Cancun']
    },
    'phuket': {
        airports: ['Phuket International Airport (HKT)'],
        hotels: ['Amanpuri', 'Trisara', 'Anantara Layan Phuket', 'The Surin Phuket', 'Rosewood Phuket', 'Six Senses Yao Noi']
    }
};

function findMatchingDestination(query: string): { airports: string[]; hotels: string[] } | null {
    const normalizedQuery = query.toLowerCase().trim();

    // Direct match
    if (destinationData[normalizedQuery]) {
        return destinationData[normalizedQuery];
    }

    // Partial match - check if query contains any destination key
    for (const [key, data] of Object.entries(destinationData)) {
        if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
            return data;
        }
    }

    return null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const destination = searchParams.get('destination');
        const type = searchParams.get('type'); // 'airports' or 'hotels'
        const query = searchParams.get('query'); // For filtering within results

        if (!destination) {
            return NextResponse.json({ error: 'Destination is required' }, { status: 400 });
        }

        const data = findMatchingDestination(destination);

        if (!data) {
            // Return generic suggestions for unknown destinations
            return NextResponse.json({
                airports: [`${destination} International Airport`, `${destination} Regional Airport`],
                hotels: [`${destination} Grand Hotel`, `${destination} Resort & Spa`, `${destination} City Center Hotel`]
            });
        }

        // Filter by type if specified
        if (type === 'airports') {
            let airports = data.airports;
            if (query) {
                const lowerQuery = query.toLowerCase();
                airports = airports.filter(a => a.toLowerCase().includes(lowerQuery));
            }
            return NextResponse.json({ airports });
        }

        if (type === 'hotels') {
            let hotels = data.hotels;
            if (query) {
                const lowerQuery = query.toLowerCase();
                hotels = hotels.filter(h => h.toLowerCase().includes(lowerQuery));
            }
            return NextResponse.json({ hotels });
        }

        // Return both if no type specified
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error in suggestions API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
