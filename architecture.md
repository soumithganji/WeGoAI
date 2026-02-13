# WeGoAI System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                                 │
│  ┌──────────────────┐  ┌────────────────────┐  ┌──────────────────────┐ │
│  │  Trip Dashboard  │  │  Chat Interface    │  │  Itinerary Panel     │ │
│  │  (page.tsx)      │  │(ChatInterface.tsx) │  │  (DayEditor.tsx)     │ │
│  └────────┬─────────┘  └─────────┬──────────┘  └──────────────────────┘ │
└───────────┼──────────────────────┼──────────────────────────────────────┘
            │                      │ User types "@weai suggest breakfast options"
            │                      ▼
┌───────────┼─────────────────────────────────────────────────────────────┐
│           │          MESSAGE HANDLING (src/app/trip/[id]/page.tsx)      │
│           │  ┌──────────────────────────────────────────────────────┐   │
│           │  │  handleSendMessage(content)                          │   │
│           │  │  - Check for @weai mention                           │   │
│           │  │  - Build tripContext {settings,preferences,itinerary}│   │
│           │  │  - Gather chatHistory (last 20 messages)             │   │
│           │  └──────────────────────────────────────────────────────┘   │
└───────────┼─────────────────────────────────────────────────────────────┘
            │ POST request sent to /api/ai/suggest
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              NEXT.JS API PROXY (src/app/api/ai/suggest/route.ts)        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  POST /api/ai/suggest                                             │  │
│  │  - Receives: {query, tripContext, chatHistory, action}            │  │
│  │  - Forwards to Python backend at localhost:5328                   │  │
│  │  - Returns: {success: true, result: JSON}                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────────────────┘
            │ Acts as proxy — forwards request to Python backend
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PYTHON AI BACKEND (backend/server.py)                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  HTTP Server on port 5328                                         │  │
│  │  - Loads .env for API keys                                        │  │
│  │  - Routes POST /api/ai/suggest to handler                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              REQUEST HANDLER (backend/ai/handlers.py)                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  class handler(BaseHTTPRequestHandler)                            │  │
│  │  - Parse: query, tripContext, chatHistory, action, scope          │  │
│  │  - Route to: create_suggestion_crew()                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              QUERY ROUTING (backend/ai/crew.py)                         │
│  ┌───────────────────────┐    ┌─────────────────────────────────────┐   │
│  │  LLM Intent Classifier│───►│  Route to appropriate path          │   │
│  │  (classify_intent)    │    └─────────────────────────────────────┘   │
│  │  Model: Llama 3.1 8B  │    Fallback: keyword-based if LLM fails      │
│  └─────────┬─────────────┘                                              │
│            │                                                            │
│  ┌─────────▼───────────────────────────────────────────────────────┐    │
│  │  Intent: REMOVE                                                 │    │
│  │     → PATH 1: REMOVAL (8B Model)                                │    │
│  │                                                                 │    │
│  │  Intent: MODIFY                                                 │    │
│  │     → PATH 2: MODIFICATION (8B Model)                           │    │
│  │                                                                 │    │
│  │  Intent: SUGGEST                                                │    │
│  │     → PATH 3: SUGGESTION (8B Model + Serper Search)             │    │
│  │                                                                 │    │
│  │  Intent: PLAN                                                   │    │
│  │     → PATH 4: GENERAL PLANNING (70B Model)                      │    │
│  │                                                                 │    │
│  │  Intent: GENERAL                                                │    │
│  │     → PATH 5: FULL CREW (3 Agents, 70B Models)                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└───────────┼────────────────────────────────────────────────────────────-┘
            │
┌───────────▼───────────────────────────────────────────────────────────┐
│                    PATH 1: REMOVAL                                    │
│                    Model: Llama 3.1 8B (~170 tok/s)                   │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Agent: fast_modifier_agent                                     │  │
│  │  Task: Identify items to delete, output JSON action             │  │
│  │                                                                 │  │
│  │  Example: "remove breakfast from day 1"                         │  │
│  │  Output: {"action": "remove_items",                             │  │
│  │           "items": [{"title": "Breakfast", "day": 1}]}          │  │
│  │  Handles: "clear day X" → removes ALL items from that day       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                    PATH 2: MODIFICATION                               │
│                    Model: Llama 3.1 8B (~170 tok/s)                   │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Agent: fast_modifier_agent                                     │  │
│  │  Task: Parse modify request, output JSON action                 │  │
│  │                                                                 │  │
│  │  Example: "move lunch to 2pm"                                   │  │
│  │  Output: {"action": "update_items",                             │  │
│  │           "updates": [{"originalTitle": "Lunch", "day": 1,      │  │
│  │                        "newStartTime": "14:00"}]}               │  │
│  │  Handles: move, reschedule, rename, change time                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                    PATH 3: SUGGESTION                                 │
│                    Model: Llama 3.1 8B + Google Serper                │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  STEP 1: Web Search via Serper API                              │  │
│  │  ┌─────────────────────────────────────────────────────────┐    │  │
│  │  │  Tool: fast_search_tool (GoogleSerperAPIWrapper)        │    │  │
│  │  │  Query: "breakfast spots in [destination]"              │    │  │
│  │  └─────────────────────────────────────────────────────────┘    │  │
│  │                              │                                  │  │
│  │                              ▼                                  │  │
│  │  STEP 2: Format Results                                         │  │
│  │  ┌─────────────────────────────────────────────────────────┐    │  │
│  │  │  Agent: suggestion_agent (8B LLM)                       │    │  │
│  │  │  - Analyze existing schedule for conflicts              │    │  │
│  │  │  - Validate requested day exists in trip                │    │  │
│  │  │  - Generate 2-3 options with same time slot             │    │  │
│  │  │  - Output: smart_schedule JSON                          │    │  │
│  │  └─────────────────────────────────────────────────────────┘    │  │
│  │                                                                 │  │
│  │  Output: {"action": "smart_schedule", "isOptions": true,        │  │
│  │           "newItems": [{...}, {...}],                           │  │
│  │           "itemsToRemove": ["Breakfast"]}                       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                    PATH 4: Fast PLANNING                              │
│                    Model: Llama 3.1 70B                               │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  STEP 1: Extract Theme Keywords                                 │  │
│  │  ┌─────────────────────────────────────────────────────────┐    │  │
│  │  │  Detect: "adventurous", "romantic", "relaxing", etc.    │    │  │
│  │  │  Also detect target day: "plan day 3" → target_day = 3  │    │  │
│  │  └─────────────────────────────────────────────────────────┘    │  │
│  │                              │                                  │  │
│  │                              ▼                                  │  │
│  │  STEP 2: Generate Itinerary                                     │  │
│  │  ┌─────────────────────────────────────────────────────────┐    │  │
│  │  │  Agent: fast_planner_agent (70B LLM)                    │    │  │
│  │  │  Goal: Theme-specific (e.g., "ADVENTUROUS themed")      │    │  │
│  │  │  - 5-6 activities per day                               │    │  │
│  │  │  - Breakfast, Lunch, Dinner + activities                │    │  │
│  │  │  - Theme-appropriate activities                         │    │  │
│  │  └─────────────────────────────────────────────────────────┘    │  │
│  │                                                                 │  │
│  │  Output: {"action": "add_items", "replacementStrategy":"replace",│ │
│  │           "items": [{day: 1, title: "Breakfast", ...}, ...]}    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                    PATH 5: FULL CREW (3 AGENTS)                       │
│                    Handles: GENERAL intent (fallback)                 │
│                    Models: All Llama 3.1 70B                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  AGENT 1: Search Agent                                          │  │
│  │  ┌─────────────────────────────────────────────────────────┐    │  │
│  │  │  Role: Travel Researcher                                │    │  │
│  │  │  Tools: fast_search_tool (Serper)                       │    │  │
│  │  │  Output: 5-10 options with details                      │    │  │
│  │  └─────────────────────────────────────────────────────────┘    │  │
│  │                             │                                   │  │
│  │  AGENT 2: Preference Agent  │ (runs in parallel)                │  │
│  │  ┌─────────────────────────────────────────────────────────┐    │  │
│  │  │  Role: Group Preference Analyst                         │    │  │
│  │  │  Input: Chat history (last 20 messages)                 │    │  │
│  │  │  Output: Dietary, interests, constraints, budget        │    │  │
│  │  │  Optional: {"action": "update_preferences", ...}        │    │  │
│  │  └─────────────────────────────────────────────────────────┘    │  │
│  │                              │                                  │  │
│  │                              ▼                                  │  │
│  │  AGENT 3: Planner Agent (Manager)                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐    │  │
│  │  │  Role: Trip Itinerary Planner                           │    │  │
│  │  │  - Combines search results + preferences                │    │  │
│  │  │  - Considers travel times                               │    │  │
│  │  │  - Avoids schedule conflicts                            │    │  │
│  │  │  - Can delegate to other agents                         │    │  │
│  │  └─────────────────────────────────────────────────────────┘    │  │
│  │                                                                 │  │
│  │  Output: {"action": "add_items", "replacementStrategy": "...",  │  │
│  │           "items": [...]}                                       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              JSON RESPONSE PARSING (Frontend)                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Parse action type from LLM response:                             │  │
│  │                                                                   │  │
│  │  action: "add_items"      → Add activities to itinerary           │  │
│  │  action: "remove_items"   → Delete activities from itinerary      │  │
│  │  action: "update_items"   → Modify existing activities            │  │
│  │  action: "smart_schedule" → Add options + remove conflicts        │  │
│  │  action: "update_preferences" → Save to user preferences          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          FINAL RESPONSE                                 │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  - AI message displayed in chat                                  │   │
│  │  - Itinerary panel updated with new/modified items               │   │
│  │  - Options shown for group voting                                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## External Services

```
┌─────────────────────────────────────────────────────┐
│                       EXTERNAL APIS                 │
│                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │  NVIDIA NIM API     │  │  Google Serper API  │   │ 
│  │                     │  │                     │   │
│  │  Llama 3.1 8B       │  │  Web search for     │   │
│  │  (~170 tok/s)       │  │  restaurants,       │   │ 
│  │                     │  │  attractions,       │   │
│  │  Llama 3.1 70B      │  │  activities         │   │
│  │  (~39 tok/s)        │  │                     │   │ 
│  └─────────────────────┘  └─────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  MongoDB (via Next.js API routes)            │   │
│  │  - Stores trips, users, messages, itineraries│   │
│  │  - Connection: src/lib/db/connection.ts      │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────-┘
```
