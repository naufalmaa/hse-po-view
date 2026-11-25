from dataclasses import dataclass, field
from typing import Optional

from engine.utils.chunking_config import ChunkingMode


@dataclass
class EvaluationConfig:
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    company: Optional[str] = None
    marine_dir: Optional[str] = None
    juror_role: str = "reasoning_model"
    consensus_role: str = "consensus_model"
    chunking_mode: ChunkingMode = ChunkingMode.MEMORY_ONLY
    persist_failed: bool = True
    company_info: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "start_date": self.start_date,
            "end_date": self.end_date,
            "company": self.company or "agnostic",
            "marine_dir": self.marine_dir,
            "juror_role": self.juror_role,
            "consensus_role": self.consensus_role,
            "chunking_mode": self.chunking_mode.value,
            "persist_failed": self.persist_failed,
            "company_info": self.company_info,
        }
