"""
CrewAI Trip Planner Agents
3 Agents: Planner (manager), Search, Preference
"""
import os
import json
import re as _re
from crewai import Agent, Crew, Task, Process
from crewai.tasks.task_output import TaskOutput
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_nvidia_ai_endpoints import ChatNVIDIA


# Initialize NVIDIA NIM LLM (70B for complex planning)
llm = ChatNVIDIA(
    model="meta/llama-3.1-70b-instruct",
    api_key=os.environ.get("NVIDIA_NIM_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1",
    max_tokens=4096
)

# Fast LLM for suggestions (8B)
fast_llm = ChatNVIDIA(
    model="meta/llama-3.1-8b-instruct",
    api_key=os.environ.get("NVIDIA_NIM_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1",
    max_tokens=2048
)

from crewai.tools import tool

# Tool: FAST web search (Serper)
@tool("Fast Web Search")
def fast_search_tool(query: str):
    """Search the web quickly using Serper API. Returns relevant results for travel, restaurants, and attractions."""
    api_key = os.environ.get("SERPER_API_KEY")
    if not api_key:
        return "Error: Serper API key not found."
    serper = GoogleSerperAPIWrapper(serper_api_key=api_key)
    return serper.run(query)

# Agent 1: Search Agent (has web search tools)
search_agent = Agent(
    role="Travel Researcher",
    goal="Find the best travel options, restaurants, attractions, and activities. Calculate travel times between places.",
    backstory="You are an expert travel researcher who knows how to find the best local experiences and hidden gems.",
    tools=[fast_search_tool],
    llm=llm,
    verbose=True
)

# Agent 2: Preference Agent  
preference_agent = Agent(
    role="Group Preference Analyst",
    goal="Analyze group chat messages to understand what the group likes and dislikes. Extract food preferences, activity interests, budget hints, and time preferences.",
    backstory="You are skilled at reading between the lines and understanding group dynamics. You pick up on subtle hints about what people really want.",
    llm=llm,
    verbose=True
)

# Agent 3: Planner Agent (TOP - orchestrates the other two)
planner_agent = Agent(
    role="Trip Itinerary Planner",
    goal="Create amazing, well-organized itineraries that balance everyone's preferences. Consider travel times between locations and avoid scheduling conflicts.",
    backstory="You are an experienced travel planner who creates perfect trip itineraries. You always consider practical constraints like travel time and make sure activities flow smoothly.",
    llm=llm,
    allow_delegation=True,
    verbose=True
)

# Agent 4: Fast Modifier Agent (using 8B model for simple JSON tasks)
fast_modifier_agent = Agent(
    role="Itinerary Modifier",
    goal="Quickly update or remove items from the itinerary JSON based on user requests.",
    backstory="You are a precise data assistant. You do not plan trips, you only manipulate JSON data structures accurately.",
    llm=fast_llm, # Using 8B model for speed and efficiency
    verbose=True
)


# ═══════════════════════════════════════════════════════════════
# GUARDRAIL FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def _extract_json(raw: str) -> dict | None:
    """Helper: extract first JSON object from raw agent output."""
    match = _re.search(r'\{.*\}', raw, _re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group())
    except json.JSONDecodeError:
        return None

def guardrail_remove(output: TaskOutput) -> tuple[bool, str]:
    """Guardrail for REMOVE tasks — expects action: remove_items with items[]."""
    data = _extract_json(output.raw)
    if data is None:
        return (False, "Output must contain a valid JSON block. Output ONLY a JSON object with action: remove_items.")
    if data.get("action") != "remove_items":
        return (False, "JSON 'action' must be 'remove_items'. Fix the action field and try again.")
    items = data.get("items", [])
    if not items:
        return (False, "JSON must contain a non-empty 'items' array. Each item needs 'title' and 'day'.")
    for item in items:
        if "title" not in item or "day" not in item:
            return (False, f"Every item must have 'title' and 'day'. This item is missing fields: {item}")
    return (True, output.raw)

def guardrail_modify(output: TaskOutput) -> tuple[bool, str]:
    """Guardrail for MODIFY tasks — expects action: update_items with updates[]."""
    data = _extract_json(output.raw)
    if data is None:
        return (False, "Output must contain a valid JSON block. Output ONLY a JSON object with action: update_items.")
    if data.get("action") != "update_items":
        return (False, "JSON 'action' must be 'update_items'. Fix the action field and try again.")
    updates = data.get("updates", [])
    if not updates:
        return (False, "JSON must contain a non-empty 'updates' array with the items to modify.")
    for u in updates:
        if "originalTitle" not in u or "day" not in u:
            return (False, f"Every update must have 'originalTitle' and 'day'. This is missing fields: {u}")
    return (True, output.raw)

def guardrail_suggest(output: TaskOutput) -> tuple[bool, str]:
    """Guardrail for SUGGEST tasks — expects action: smart_schedule with newItems[]."""
    data = _extract_json(output.raw)
    if data is None:
        return (False, "Output must contain a valid JSON block. Output ONLY a JSON object with action: smart_schedule.")
    if data.get("action") != "smart_schedule":
        return (False, "JSON 'action' must be 'smart_schedule'. Fix the action field and try again.")
    new_items = data.get("newItems", [])
    if not new_items:
        return (False, "JSON must contain a non-empty 'newItems' array with at least 2 options.")
    for item in new_items:
        missing = [f for f in ["title", "day", "duration"] if f not in item]
        if missing:
            return (False, f"Item '{item.get('title', '?')}' is missing required fields: {missing}")
    return (True, output.raw)

def guardrail_plan(output: TaskOutput) -> tuple[bool, str]:
    """Guardrail for PLAN tasks — expects action: add_items with items[]."""
    data = _extract_json(output.raw)
    if data is None:
        return (False, "Output must contain a valid JSON block. Output ONLY a JSON object with action: add_items.")
    if data.get("action") != "add_items":
        return (False, "JSON 'action' must be 'add_items'. Fix the action field and try again.")
    items = data.get("items", [])
    if not items:
        return (False, "JSON must contain a non-empty 'items' array with the planned activities.")
    for item in items:
        missing = [f for f in ["title", "day", "duration"] if f not in item]
        if missing:
            return (False, f"Item '{item.get('title', '?')}' is missing required fields: {missing}")
    return (True, output.raw)


# ═══════════════════════════════════════════════════════════════
# LLM-BASED INTENT CLASSIFIER
# Uses fast_llm
# ═══════════════════════════════════════════════════════════════
ROUTE_PROMPT = """Classify the user's intent into exactly ONE category. Reply with ONLY the category name, nothing else.

Categories:
- REMOVE: User wants to delete, remove, cancel, clear, or empty items from the itinerary
- MODIFY: User wants to move, reschedule, change time, rename, or update existing items (NOT add new ones)
- SUGGEST: User wants suggestions, recommendations, options, places, or to add new activities to a specific day
- PLAN: User wants to create, generate, or build a full itinerary or plan for the entire trip (or multiple days)
- GENERAL: Anything else — greetings, questions, off-topic

Examples:
"remove breakfast from day 1" → REMOVE
"I don't want the museum anymore" → REMOVE
"move lunch to 2pm" → MODIFY
"reschedule the hike to day 3" → MODIFY
"suggest some restaurants for day 2" → SUGGEST
"find me a good sushi place" → SUGGEST
"I want to go scuba diving on day 3" → SUGGEST
"create an adventurous itinerary" → PLAN
"plan my trip" → PLAN
"make an itinerary for 5 days" → PLAN
"hello" → GENERAL

User query: {query}
Category:"""

def classify_intent(user_query: str) -> str:
    try:
        response = fast_llm.invoke(ROUTE_PROMPT.format(query=user_query))
        intent = response.content.strip().split()[0].upper()  # Take first word only
        valid_intents = {"MODIFY", "REMOVE", "SUGGEST", "PLAN", "GENERAL"}
        if intent in valid_intents:
            print(f"[ROUTER] Query: '{user_query}' → Intent: {intent}")
            return intent
    except Exception as e:
        print(f"[ROUTER] LLM classification failed: {e}")
    
    # Fallback: keyword-based classification if LLM fails
    q = user_query.lower()
    if any(w in q for w in ["delete", "remove", "cancel", "clear", "empty", "reset"]):
        intent = "REMOVE"
    elif any(w in q for w in ["move", "change", "update", "shift", "reschedule"]):
        intent = "MODIFY"
    elif any(w in q for w in ["suggest", "recommend", "options", "places", "spots", "ideas"]):
        intent = "SUGGEST"
    elif any(w in q for w in ["create", "make", "plan", "generate", "build"]) and any(w in q for w in ["itinerary", "trip", "schedule"]):
        intent = "PLAN"
    else:
        intent = "SUGGEST"
    
    print(f"[ROUTER] Query: '{user_query}' → Intent: {intent} (keyword fallback)")
    return intent

def create_suggestion_crew(user_query: str, trip_context: dict, chat_history: list) -> str:
    """Create and run a crew to generate trip suggestions."""
    import datetime
    
    def log_to_file(tag, content):
        print(f"\n{'='*20} {tag} {datetime.datetime.now()} {'='*20}")
        print(str(content))
        print(f"{'='*50}\n")
    
    log_to_file("USER QUERY", user_query)
    
    # Format context for agents
    settings = trip_context.get("settings", {})
    preferences = trip_context.get("preferences", {})
    existing_itinerary = trip_context.get("itinerary", [])
    
    context_str = f"""
    Trip Destination: {settings.get('destination', 'Unknown')}
    Group Size: {settings.get('groupSize', 'Unknown')}
    Duration: {settings.get('daysCount', 'Unknown')} days, {settings.get('nightsCount', 'Unknown')} nights
    Age Group: {settings.get('ageGroup', 'mixed')}
    Landing Time: {settings.get('landingTime', 'Not specified')}
    Departure Time: {settings.get('departureTime', 'Not specified')}
    Hotel: {settings.get('hotel', 'Not specified')}

    USER PREFERENCES (Persistent):
    - Dietary: {", ".join(preferences.get('dietary', []))}
    - Interests: {", ".join(preferences.get('interests', []))}
    - Constraints: {", ".join(preferences.get('constraints', []))}
    - Budget: {preferences.get('budget', 'Not specified')}
    """
    
    chat_str = "\n".join([f"{m.get('senderName', 'User')}: {m.get('content', '')}" for m in chat_history[-20:]])
    
    itinerary_str = "\\n".join([f"Day {i.get('day')}: {i.get('title')} at {i.get('startTime')}-{i.get('endTime')}" for i in existing_itinerary]) if existing_itinerary else "No items scheduled yet."
    
    log_to_file("ITINERARY CONTEXT", itinerary_str)
    
    # Define tasks
    search_task = Task(
        description=f"""Search for information related to: {user_query}
        
        Trip context: {context_str}
        
        Find relevant options for the destination. Include practical details like opening hours, prices, and locations.""",
        agent=search_agent,
        expected_output="A list of 5-10 relevant options with details including name, description, location, and practical info."
    )
    
    preference_task = Task(
        description=f"""Analyze this group chat to understand preferences:
        
        {chat_str}
        
        What does this group like? What should be avoided? Any dietary restrictions? Budget concerns?
        
        If you find NEW preferences that are not already listed in the Trip Context, you MUST output a JSON block to update them.
        
        FORMAT:
        ```json
        {{
            "action": "update_preferences",
            "preferences": {{
                "dietary": ["Vegan", "Gluten-free"],
                "interests": ["Hiking", "History"],
                "constraints": ["No stairs"],
                "budget": "Medium"
            }}
        }}
        ```
        
        Merge new findings with existing ones. Only output this if there are NEW findings.""",
        agent=preference_agent,
        expected_output="A text summary of preferences, OPTIONALLY followed by a JSON block with action: update_preferences if new info is found."
    )
    
    planning_task = Task(
        description=f"""Based on the search results and group preferences, create suggestions for: {user_query}
        
        Existing itinerary:
        {itinerary_str}
        
        Trip settings: {context_str}
        
        Create ranked suggestions that:
        1. Match group preferences
        2. Don't clash with existing itinerary items
        3. Account for travel times between locations
        4. Are practical given the trip duration and group size

        Determine if the user wants to REPLACE existing suggestions or ADD MORE to the list.
        - If query has "more", "additional", "other", "else": replacementStrategy = "append"
        - If query has "instead", "change", "replace", "different", or is a new request: replacementStrategy = "replace"
        
        IMPORTANT: You must NOT output conversational text or lists.
        Output ONLY the JSON block with the action "add_items".
        
        The user wants to see the items in their itinerary UI, not in the chat text.
        
        JSON FORMAT:
        ```json
        {{
            "action": "add_items",
            "replacementStrategy": "replace",
            "items": [
                {{
                    "title": "Activity Name",
                    "description": "Brief description",
                    "day": 1,
                    "duration": 120,
                    "location": "Address or location name"
                }}
            ]
        }}
        ```
        
        "replacementStrategy" must be either "replace" or "append".
        
        If the Preference Agent found new preferences, include the "update_preferences" JSON block as well.
        
        DO NOT include "Here are the suggestions:" or any other text. JUST THE JSON.""",
        agent=planner_agent,
        expected_output="A JSON block with action: add_items. NO conversational text.",
    )

    # ═══════════════════════════════════════════════════════════════
    # LLM-BASED INTENT ROUTING
    # ═══════════════════════════════════════════════════════════════
    intent = classify_intent(user_query)
    query_lower = user_query.lower()

    # ═══════════════════════════════════════════════════════════════
    # PATH 1: REMOVAL (8B Model)
    # ═══════════════════════════════════════════════════════════════
    if intent == "REMOVE":
        # Handle removal requests with remove_items action
        mod_task = Task(
            description=f"""The user wants to REMOVE item(s) from the itinerary.
            
            User Request: {user_query}
            
            Existing Itinerary:
            {itinerary_str}
            
            Trip Settings: {context_str}
            
            Identify the EXACT item(s) to remove based on the user's request.
            Match the title and day from the existing itinerary.
            
            OUTPUT ONLY JSON (no text) with action "remove_items".
            
            Format:
            ```json
            {{
                "action": "remove_items",
                "items": [
                    {{
                        "title": "Exact title from itinerary",
                        "day": 1
                    }}
                ]
            }}
            ```
            
            RULES:
            1. Use the EXACT title as it appears in the existing itinerary.
            2. Ensure "day" matches the item's day.
            3. Output ONLY JSON, no other text.
            4. If user says "remove breakfast for day 1", find "Breakfast" on day 1.
            5. If user says "clear day X" or "empty day X" or "reset day X", include ALL items from day X in the removal list.
            6. For "clear day X", list EVERY item that has day: X in the existing itinerary.
            """,
            agent=fast_modifier_agent,
            expected_output="JSON block with action: remove_items.",
            guardrail=guardrail_remove,
            max_retries=3
        )
        
        mod_crew = Crew(
            agents=[fast_modifier_agent],
            tasks=[mod_task],
            process=Process.sequential,
            verbose=True
        )
        result = mod_crew.kickoff()
        return str(result)

    # ═══════════════════════════════════════════════════════════════
    # PATH 2: MODIFICATION (8B Model)
    # ═══════════════════════════════════════════════════════════════
    elif intent == "MODIFY":
        # Handle modifications (move, reschedule, rename)
        mod_task = Task(
            description=f"""The user wants to MODIFY the itinerary.
            
            User Request: {user_query}
            
            Existing Itinerary:
            {itinerary_str}
            
            Trip Settings: {context_str}
            
            Identify the item(s) to modify.
            
            OUTPUT ONLY JSON (no text) with action "update_items".
            
            Format:
            ```json
            {{
                "action": "update_items",
                "updates": [
                    {{
                        "originalTitle": "Exact or partial title of item",
                        "day": 1,
                        "newStartTime": "20:00",
                        "newEndTime": "22:00"
                    }}
                ]
            }}
            ```
            
            For moving items: Update startTime and endTime.
            For renaming: Add "newTitle": "New Name".
            
            RULES:
            1. Use 24-hour format for times (HH:MM).
            2. Ensure "day" matches the item's day.
            3. Output ONLY JSON.
            """,
            agent=fast_modifier_agent,
            expected_output="JSON block with action: update_items.",
            guardrail=guardrail_modify,
            max_retries=3
        )
        
        mod_crew = Crew(
            agents=[fast_modifier_agent],
            tasks=[mod_task],
            process=Process.sequential,
            verbose=True
        )
        result = mod_crew.kickoff()
        return str(result)

    # ═══════════════════════════════════════════════════════════════
    # PATH 3: SUGGESTION (8B Model + Serper Search)
    # ═══════════════════════════════════════════════════════════════
    elif intent == "SUGGEST":
        # Create a specialized agent that can search AND format
        # Uses fast_llm and fast_search_tool
        suggestion_agent = Agent(
            role="Local Expert & Planner",
            goal="Find the best places matching the request and format them for the itinerary.",
            backstory="You are a knowledgeable local guide who knows the best spots. You are efficiency-focused and always return structured data.",
            tools=[fast_search_tool],
            llm=fast_llm,
            verbose=True
        )

        suggestion_task = Task(
            description=f"""User Request: {user_query}
            
            Trip Context: {context_str}
            
            CURRENT SCHEDULE (analyze this carefully):
            {itinerary_str}
            
            **DAY VALIDATION (CRITICAL - CHECK THIS FIRST!):**
            Look at the Trip Context above for "Duration: X days".
            If the user requests something for a day that DOES NOT EXIST (e.g., "day 4" when trip is only 3 days):
            - Do NOT output JSON
            - Instead, respond with a friendly message like: "This trip only has X days. Would you like me to suggest dinner for day X instead?"
            - Be helpful and offer alternatives within the valid day range (1 to X)
            
            If the day IS valid, proceed with your task below:
            
            YOUR TASK: Intelligently add the requested activity to the schedule.
            
            SCHEDULING STRATEGY:
            1. Analyze the current schedule for the relevant day(s).
            2. Fit the new activity into the day based on feasibility (don't overfill the day).
            3. New activity should have a REALISTIC duration (scuba diving: 120-180 mins, beach visit: 120 mins, etc.).
            
            ITEM PRIORITY (which can be shortened/moved):
            - FIXED (don't change): Breakfast, Lunch, Dinner, airport transfers
            - IMPORTANT (minimize changes): Tours with tickets, activities with reservations
            - FLEXIBLE (can shorten/move): Beach visits, sightseeing, free time, generic activities
            
            OUTPUT FORMAT:
            You MUST output a JSON with BOTH new items AND any schedule adjustments:
            
            {{
                "action": "smart_schedule",
                "isOptions": true,
                "newItems": [
                    {{
                        "title": "Option A: Scuba Diving",
                        "description": "Deep dive at Neil Island",
                        "day": 3,
                        "duration": 180,
                        "startTime": "09:00",
                        "endTime": "12:00",
                        "location": "Neil Island"
                    }},
                     {{
                        "title": "Option B: Glass Bottom Boat",
                        "description": "Relaxed view of coral",
                        "day": 3,
                        "duration": 180,
                         "startTime": "09:00",
                        "endTime": "12:00",
                        "location": "Neil Jetty"
                    }}
                ],
                "itemsToRemove": ["Breakfast"],
                "reschedule": []
            }}
            ```
            
            KEY PARAMETERS:
            - "isOptions": **ALWAYS TRUE** if the user asks for "suggestions", "options", "places", "ideas", "recommendations".
            - "itemsToRemove": You MUST check the *CURRENT SCHEDULE* and list the exact title of the generic item this replaces (e.g. "Breakfast", "Lunch").
            
            CRITICAL INSTRUCTIONS:
            1. **QUANTITY**: You MUST provide **2 to 3 DIFFERENT options** for the user to choose from. Do NOT provide just one.
            2. **TIMING**: All options MUST have the **SAME** day, startTime, and duration.
            3. **REMOVAL**: If there is a generic item like "Breakfast" or "Lunch" at that time, you MUST include it in "itemsToRemove".
            
            SEARCH for real places, then create the response with 2-3 options.
            
            CRITICAL: You MUST end your response with the JSON block. Do NOT just list suggestions in text.
            The user CANNOT see text suggestions - they can ONLY see items added to the itinerary via JSON.
            """,
            agent=suggestion_agent,
            expected_output="You MUST output a JSON block with action: smart_schedule. This is REQUIRED, not optional.",
            guardrail=guardrail_suggest,
            max_retries=3
        )
        
        fast_crew = Crew(
            agents=[suggestion_agent],
            tasks=[suggestion_task],
            process=Process.sequential,
            verbose=True
        )
        
        result = fast_crew.kickoff()
        log_to_file("SUGGESTION RESULT", result)
        return str(result)
    
    # ═══════════════════════════════════════════════════════════════
    # PATH 4: Fast PLANNING (70B Model, no web search)
    # ═══════════════════════════════════════════════════════════════
    elif intent == "PLAN":
        planning_llm = ChatNVIDIA(
            model="meta/llama-3.1-70b-instruct",
            api_key=os.environ.get("NVIDIA_NIM_API_KEY"),
            base_url="https://integrate.api.nvidia.com/v1",
            max_tokens=4096
        )

        # Extract theme/adjectives from user query for emphasis
        theme_words = []
        theme_keywords = ["adventurous", "adventure", "romantic", "relaxing", "cultural", "foodie", 
                         "budget", "luxury", "family", "kid-friendly", "party", "nightlife",
                         "nature", "outdoor", "historical", "artistic", "spiritual", "wellness",
                         "shopping", "beach", "mountain", "active", "lazy", "fun", "exciting",
                         "peaceful", "quiet", "lively", "local", "authentic", "touristy", "offbeat"]
        for word in theme_keywords:
            if word in query_lower:
                theme_words.append(word)
        
        # Set agent goal based on theme
        if theme_words:
            agent_goal = f"Create a {', '.join(theme_words).upper()} themed itinerary. EVERY activity must be {', '.join(theme_words)}!"
        else:
            agent_goal = "Create themed, personalized JSON itineraries that match the user's vision"
        
        fast_planner_agent = Agent(
            role="Creative Trip Planner",
            goal=agent_goal,
            backstory="You are an expert travel planner focused on creating the perfect introduction to a destination. For most travelers, you prioritize 'must-see' iconic landmarks, local culture, and top-rated experiences that define the place. However, if a specific theme is requested (like 'adventurous' or 'romantic'), you completely pivot to match that style.",
            llm=planning_llm,
            verbose=True
        )
        
        theme_emphasis = ""
        if theme_words:
            theme_emphasis = f"""
            
            ⚠️⚠️⚠️ MANDATORY THEME REQUIREMENT ⚠️⚠️⚠️
            
            THE USER REQUESTED: **{', '.join(theme_words).upper()}**
            
            THIS IS NOT OPTIONAL. You MUST create a {', '.join(theme_words)} itinerary.
            
            THEME-SPECIFIC ACTIVITIES (use these):
            - adventurous/adventure: Hiking, Trekking, Scuba Diving, Snorkeling, Zip-lining, Rock Climbing, Paragliding, Kayaking, ATV Rides, Bungee Jumping, Cave Exploration, White Water Rafting, Cliff Jumping, Jet Skiing, Surfing
            - romantic: Couples Spa, Sunset Dinner, Scenic Walk, Wine Tasting, Private Tour, Rooftop Bar, Scenic Viewpoint, Boat Ride, Beach Picnic, Candlelit Dinner
            - relaxing: Spa Treatment, Beach Lounging, Garden Walk, Cafe Visit, Pool Time, Meditation, Yoga Session, Scenic Drive
            - cultural: Museum Visit, Temple Tour, Historical Site, Local Market, Traditional Show, Cooking Class, Art Gallery
            - foodie: Food Tour, Street Food Walk, Cooking Class, Market Visit, Wine Tasting, Local Restaurant Hop
            - nature/outdoor: National Park, Hiking Trail, Wildlife Safari, Waterfall Visit, Scenic Drive, Bird Watching
            - nightlife/party: Club Hopping, Bar Crawl, Live Music, Rooftop Lounge, Pub Crawl, Beach Party
            
            ❌ DO NOT USE generic activities like "Visit Museum", "City Tour", "Sightseeing" for an ADVENTUROUS request!
            ✅ USE activities like "Scuba Diving", "Jungle Trekking", "Cliff Jumping", "Paragliding" for ADVENTUROUS!
            
            """
        else:
            # Default to "Classic Tourist" mode
            theme_emphasis = """
            
            DEFAULT STRATEGY (No specific theme requested):
            1. Focus on the CLASSIC "Must-See" Highlights of the destination.
            2. Include the most famous landmarks, popular cultural spots, and highly-rated local experiences.
            3. Create a balanced itinerary suitable for a first-time visitor.
            4. Do NOT assume the user wants extreme adventure or niche activities unless specified.
            """
        
        # Extract target day if specified (e.g., "day 3", "day three")
        import re
        target_day = None
        day_match = re.search(r'day\s*(\d+)', query_lower)
        if day_match:
            target_day = int(day_match.group(1))
        
        # Modify instructions if a specific day is targeted
        day_instruction = ""
        output_limit_instruction = ""
        
        if target_day:
            day_instruction = f"""
            
            ⚠️⚠️⚠️ SINGLE DAY PLANNING ⚠️⚠️⚠️
            User specifically requested to plan for **DAY {target_day}**.
            
            YOU MUST:
            1. ONLY generate activities for Day {target_day}.
            2. Do NOT generate items for other days.
            3. Ensure the "day" field in JSON is exactly {target_day} for all items.
            """
            output_limit_instruction = f"ONLY items for Day {target_day}"
        else:
            output_limit_instruction = "ALL items for ALL days"

        general_task = Task(
            description=f"""USER REQUEST: {user_query}
            
            Trip settings: {context_str}
            {theme_emphasis}
            {day_instruction}
            
            IMPORTANT: READ THE USER REQUEST ABOVE. If they said "adventurous", "romantic", "relaxing", etc., 
            you MUST create activities that match that theme. Do NOT ignore adjectives!
            
            RULES:
            1. For meals, use GENERIC titles: "Breakfast", "Lunch", "Dinner" - no restaurant names.
            2. For attractions, choose activities that MATCH THE USER'S REQUESTED THEME/STYLE.
            3. Keep descriptions to MAX 5 words each (very brief).
            4. IMPORTANT: Include 5-6 activities per day covering MORNING, AFTERNOON, and EVENING.
            5. EVERY day MUST have: Breakfast, morning activity, Lunch, afternoon activity, Dinner, and optionally an evening activity.
            6. OUTPUT A SINGLE JSON OBJECT containing {output_limit_instruction} in one 'items' array.
            7. Do NOT output multiple JSON blocks.
            8. Set "replacementStrategy" to "replace" (default for new plans).
            9. CRITICAL: Use "duration" (in minutes). Time fields (startTime/endTime) are OPTIONAL.
            
            OUTPUT FORMAT:
            ```json
            {{
                "action": "add_items",
                "replacementStrategy": "replace",
                "items": [
                    {{"title": "Breakfast", "description": "Fuel up", "day": {target_day if target_day else 1}, "duration": 60, "location": "Hotel"}},
                    {{"title": "[THEMED ACTIVITY]", "description": "Brief desc", "day": {target_day if target_day else 1}, "duration": 180, "location": "Location"}},
                    ...
                ]
            }}
            ```""",
            agent=fast_planner_agent,
            expected_output="JSON block with action: add_items.",
            guardrail=guardrail_plan,
            max_retries=3
        )
        
        fast_crew = Crew(
            agents=[fast_planner_agent],
            tasks=[general_task],
            process=Process.sequential,
            verbose=True
        )
        
        result = fast_crew.kickoff()
        return str(result)


    # ═══════════════════════════════════════════════════════════════
    # PATH 5: FULL CREW FALLBACK (3 Agents, 70B Models)
    # ═══════════════════════════════════════════════════════════════
    else:
        crew = Crew(
            agents=[search_agent, preference_agent, planner_agent],
            tasks=[search_task, preference_task, planning_task],
            process=Process.sequential,
            verbose=True
        )
        
        result = crew.kickoff()
        return str(result)