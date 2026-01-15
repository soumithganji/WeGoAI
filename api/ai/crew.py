"""
CrewAI Trip Planner Agents
3 Agents: Planner (manager), Search, Preference
"""
import os
from crewai import Agent, Crew, Task, Process
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_nvidia_ai_endpoints import ChatNVIDIA
import requests

# Initialize NVIDIA NIM LLM
llm = ChatNVIDIA(
    model="meta/llama-3.1-70b-instruct",
    api_key=os.environ.get("NVIDIA_NIM_API_KEY"),
    base_url="https://integrate.api.nvidia.com/v1"
)

from crewai.tools import tool

# Tool 1: FREE web search (DuckDuckGo)
@tool("Web Search")
def search_tool(query: str):
    """Search for information on the internet. Useful for finding travel options, restaurants, and attractions."""
    return DuckDuckGoSearchRun().run(query)

# Tool 2: Travel time calculator (OpenRouteService)
def get_travel_time(origin: str, destination: str) -> str:
    """Calculate travel time between two locations using OpenRouteService."""
    try:
        api_key = os.environ.get("ORS_API_KEY")
        if not api_key:
            return "Travel time unavailable (no API key)"
        
        # First geocode the locations
        geocode_url = "https://api.openrouteservice.org/geocode/search"
        
        # Get origin coords
        origin_resp = requests.get(geocode_url, params={
            "api_key": api_key,
            "text": origin,
            "size": 1
        })
        origin_coords = origin_resp.json()["features"][0]["geometry"]["coordinates"]
        
        # Get destination coords
        dest_resp = requests.get(geocode_url, params={
            "api_key": api_key,
            "text": destination,
            "size": 1
        })
        dest_coords = dest_resp.json()["features"][0]["geometry"]["coordinates"]
        
        # Get route
        route_url = "https://api.openrouteservice.org/v2/directions/driving-car"
        route_resp = requests.get(route_url, params={
            "api_key": api_key,
            "start": f"{origin_coords[0]},{origin_coords[1]}",
            "end": f"{dest_coords[0]},{dest_coords[1]}"
        })
        
        duration_seconds = route_resp.json()["features"][0]["properties"]["segments"][0]["duration"]
        duration_minutes = int(duration_seconds / 60)
        
        return f"Travel time from {origin} to {destination}: approximately {duration_minutes} minutes by car"
    except Exception as e:
        return f"Could not calculate travel time: {str(e)}"


# Agent 1: Search Agent (has web search + travel time tools)
search_agent = Agent(
    role="Travel Researcher",
    goal="Find the best travel options, restaurants, attractions, and activities. Calculate travel times between places.",
    backstory="You are an expert travel researcher who knows how to find the best local experiences and hidden gems.",
    tools=[search_tool],
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

def create_suggestion_crew(user_query: str, trip_context: dict, chat_history: list) -> str:
    """Create and run a crew to generate trip suggestions."""
    
    # Format context for agents
    settings = trip_context.get("settings", {})
    existing_itinerary = trip_context.get("itinerary", [])
    
    context_str = f"""
    Trip Destination: {settings.get('destination', 'Unknown')}
    Group Size: {settings.get('groupSize', 'Unknown')}
    Duration: {settings.get('daysCount', 'Unknown')} days, {settings.get('nightsCount', 'Unknown')} nights
    Age Group: {settings.get('ageGroup', 'mixed')}
    Landing Time: {settings.get('landingTime', 'Not specified')}
    Departure Time: {settings.get('departureTime', 'Not specified')}
    Hotel: {settings.get('hotel', 'Not specified')}
    """
    
    chat_str = "\n".join([f"{m.get('senderName', 'User')}: {m.get('content', '')}" for m in chat_history[-20:]])
    
    itinerary_str = "\n".join([f"Day {i.get('day')}: {i.get('title')} at {i.get('startTime')}" for i in existing_itinerary])
    
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
        
        What does this group like? What should be avoided? Any dietary restrictions? Budget concerns?""",
        agent=preference_agent,
        expected_output="A summary of group preferences including likes, dislikes, dietary needs, budget level, and activity preferences."
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
        4. Are practical given the trip duration and group size""",
        agent=planner_agent,
        expected_output="Top 5 ranked suggestions with reasons why each is a good fit for the group. Include estimated times and any potential conflicts. If the user asks to ADD items, output a JSON block with the items.",
    )

    # Special handling for "add to itinerary" intent - FAST PATH
    if "add" in user_query.lower() and ("itinerary" in user_query.lower() or "them" in user_query.lower()):
        add_task = Task(
            description=f"""The user wants to ADD the previous suggestions to the itinerary as OPTIONS TO VOTE ON.
            
            Chat History:
            {chat_str}
            
            User Request: {user_query}
            
            Extract the most recent suggested items from the AI's previous messages in the chat history.
            
            CRITICAL: These are MUTUALLY EXCLUSIVE OPTIONS - the group will vote to pick ONE.
            Therefore, ALL items MUST have the SAME day and SAME time slot.
            
            Format them as a valid JSON object:
            {{
                "action": "add_items",
                "items": [
                    {{
                        "title": "Option 1 Name",
                        "description": "Brief description",
                        "day": 1,
                        "startTime": "20:00",
                        "endTime": "23:00",
                        "location": "Address"
                    }},
                    {{
                        "title": "Option 2 Name",
                        "description": "Brief description", 
                        "day": 1,
                        "startTime": "20:00",
                        "endTime": "23:00",
                        "location": "Address"
                    }}
                ]
            }}
            
            RULES:
            1. ALL items MUST have the SAME day number.
            2. ALL items MUST have the SAME startTime and endTime.
            3. Pick a reasonable evening time like 20:00-23:00 or 19:00-22:00.
            4. Return ONLY the JSON, nothing before it.
            """,
            agent=planner_agent,
            expected_output="A JSON object with action and items, all sharing the same day and time."
        )
        
        # Use simple single-task crew for speed
        fast_crew = Crew(
            agents=[planner_agent],
            tasks=[add_task],
            process=Process.sequential,
            verbose=True
        )
        
        result = fast_crew.kickoff()
        return str(result)
    
    # Create and run full crew for regular suggestions
    crew = Crew(
        agents=[search_agent, preference_agent, planner_agent],
        tasks=[search_task, preference_task, planning_task],
        process=Process.sequential,
        verbose=True
    )
    
    result = crew.kickoff()
    return str(result)


def plan_itinerary(trip_context: dict, chat_history: list, scope: str = "everything") -> str:
    """Generate a full or partial itinerary plan."""
    
    settings = trip_context.get("settings", {})
    
    context_str = f"""
    Destination: {settings.get('destination')}
    Duration: {settings.get('daysCount')} days
    Group Size: {settings.get('groupSize')}
    Age Group: {settings.get('ageGroup')}
    Landing: {settings.get('landingTime', 'Morning')}
    Departure: {settings.get('departureTime', 'Evening')}
    """
    
    chat_str = "\n".join([f"{m.get('senderName')}: {m.get('content')}" for m in chat_history[-30:]])
    
    planning_task = Task(
        description=f"""Create a complete trip plan for: {scope}
        
        Trip context: {context_str}
        
        Group preferences from chat:
        {chat_str}
        
        Create a detailed itinerary with:
        - Specific activities for each time slot
        - Restaurant recommendations for meals
        - Travel time estimates between locations
        - Buffer time for rest
        - Mix of activities based on group preferences""",
        agent=planner_agent,
        expected_output="A detailed day-by-day itinerary with times, activities, locations, and travel time estimates."
    )
    
    crew = Crew(
        agents=[search_agent, preference_agent, planner_agent],
        tasks=[planning_task],
        process=Process.hierarchical,
        manager_agent=planner_agent,
        verbose=True
    )
    
    result = crew.kickoff()
    return str(result)
