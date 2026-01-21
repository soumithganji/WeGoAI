
query_lower = "create entire itenary"

query_words = query_lower.split()
has_action = any(w in query_lower for w in ["create", "make", "plan", "generate", "suggest", "build"])
has_object = any(w in query_lower for w in ["itinerary", "plan", "trip", "schedule"])

is_general_planning = has_action and has_object

print(f"Query: {query_lower}")
print(f"Has Action: {has_action}")
print(f"Has Object: {has_object}")
print(f"Is General Planning: {is_general_planning}")
