from enum import Enum
from typing import Optional


class ChunkingMode(str, Enum):
    """
    Chunking persistence modes:
    - MEMORY_ONLY: Chunks stay in memory, no DB writes (fastest)
    - PERSIST_SELECTIVE: Only persist failed/appealed evaluations
    - PERSIST_ALL: Current behavior, full DB persistence (slowest)
    """
    MEMORY_ONLY = "memory_only"
    PERSIST_SELECTIVE = "persist_selective"
    PERSIST_ALL = "persist_all"


def should_persist(
    chunking_mode: ChunkingMode,
    score: int,
    requires_review: bool,
    persist_failed: bool = True
) -> bool:
    """Determine if chunks should be persisted based on mode and evaluation result."""
    if chunking_mode == ChunkingMode.PERSIST_ALL:
        return True
    elif chunking_mode == ChunkingMode.MEMORY_ONLY:
        return False
    elif chunking_mode == ChunkingMode.PERSIST_SELECTIVE:
        return persist_failed and (score < 6 or requires_review)
    return False
