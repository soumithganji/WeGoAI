import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy route for AI suggestions
 * Forwards requests to the Python AI backend
 */

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:5328';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(`${AI_BACKEND_URL}/api/ai/suggest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI Backend error:', errorText);
            return NextResponse.json(
                { success: false, error: 'AI backend error' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error proxying to AI backend:', error);

        // Check if backend is unreachable
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'AI backend is not running. Start it with: npm run dev:ai'
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
