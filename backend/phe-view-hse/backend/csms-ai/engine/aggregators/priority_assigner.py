from typing import Dict, Any

class PriorityAssigner:
    def assign_priority(self, classification: str) -> int:
        if "Tier 1" in classification:
            return 1 # Highest priority - deep analysis
        elif "Tier 2" in classification:
            return 2 # Medium priority - structured parsing
        elif "Tier 3" in classification:
            return 3 # Low priority - metadata aggregation
        return 4 # Lowest priority / Unknown
