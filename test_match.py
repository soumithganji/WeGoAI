
query_lower = "create entire itinerary"
phrases = [
    "initial itinerary", "make itinerary", "plan itinerary", "create itinerary",
    "overall plan", "full plan", "entire trip", "whole trip", "general plan",
    "plan the trip", "make a plan", "initial plan"
]
is_general_planning = any(phrase in query_lower for phrase in phrases)
print(f"Query: '{query_lower}'")
print(f"Is General Planning: {is_general_planning}")
