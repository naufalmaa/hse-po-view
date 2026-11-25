import time
from typing import Dict, Any, List, Optional
from collections import defaultdict

from engine.utils.chunking_config import ChunkingMode


class EvidenceStore:
    """
    Hybrid evidence storage: memory-first with optional DB persistence.
    """
    
    _memory_cache = defaultdict(dict)
    _cache_ttl = {}
    DEFAULT_TTL = 86400  # 24 hours
    
    def __init__(self, mode: ChunkingMode = ChunkingMode.MEMORY_ONLY, db_pool=None):
        self.mode = mode
        self.db_pool = db_pool
        self._cleanup_expired()
    
    def store_chunks(
        self,
        contract_folder_id: str,
        chunks: List[Dict[str, Any]],
        ttl: Optional[int] = None
    ) -> bool:
        """Store chunks in memory or DB based on mode."""
        if self.mode == ChunkingMode.MEMORY_ONLY:
            return self._store_memory(contract_folder_id, chunks, ttl)
        elif self.mode in [ChunkingMode.PERSIST_SELECTIVE, ChunkingMode.PERSIST_ALL]:
            return self._store_db(contract_folder_id, chunks)
        return False
    
    def get_chunks(self, contract_folder_id: str) -> List[Dict[str, Any]]:
        """Retrieve chunks from memory or DB."""
        if self.mode == ChunkingMode.MEMORY_ONLY:
            return self._get_memory(contract_folder_id)
        else:
            return self._get_db(contract_folder_id)
    
    def delete_chunks(self, contract_folder_id: str) -> bool:
        """Delete chunks from memory or DB."""
        if self.mode == ChunkingMode.MEMORY_ONLY:
            return self._delete_memory(contract_folder_id)
        else:
            return self._delete_db(contract_folder_id)
    
    def _store_memory(
        self,
        contract_folder_id: str,
        chunks: List[Dict[str, Any]],
        ttl: Optional[int] = None
    ) -> bool:
        """Store chunks in memory with TTL."""
        self._memory_cache[contract_folder_id] = {
            "chunks": chunks,
            "stored_at": time.time()
        }
        self._cache_ttl[contract_folder_id] = ttl or self.DEFAULT_TTL
        return True
    
    def _get_memory(self, contract_folder_id: str) -> List[Dict[str, Any]]:
        """Retrieve chunks from memory."""
        if contract_folder_id not in self._memory_cache:
            return []
        
        entry = self._memory_cache[contract_folder_id]
        ttl = self._cache_ttl.get(contract_folder_id, self.DEFAULT_TTL)
        
        if time.time() - entry["stored_at"] > ttl:
            self._delete_memory(contract_folder_id)
            return []
        
        return entry["chunks"]
    
    def _delete_memory(self, contract_folder_id: str) -> bool:
        """Delete chunks from memory."""
        if contract_folder_id in self._memory_cache:
            del self._memory_cache[contract_folder_id]
            self._cache_ttl.pop(contract_folder_id, None)
            return True
        return False
    
    def _store_db(self, contract_folder_id: str, chunks: List[Dict[str, Any]]) -> bool:
        """Store chunks in DB (async operation)."""
        # Placeholder for DB implementation
        # In production: use asyncpg to insert into csms_evidence_chunk
        print(f"[EvidenceStore] DB persistence not implemented - skipping {len(chunks)} chunks for {contract_folder_id}")
        return False
    
    def _get_db(self, contract_folder_id: str) -> List[Dict[str, Any]]:
        """Retrieve chunks from DB."""
        # Placeholder for DB implementation
        return []
    
    def _delete_db(self, contract_folder_id: str) -> bool:
        """Delete chunks from DB."""
        # Placeholder for DB implementation
        return False
    
    def _cleanup_expired(self):
        """Remove expired entries from memory cache."""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._memory_cache.items()
            if current_time - entry["stored_at"] > self._cache_ttl.get(key, self.DEFAULT_TTL)
        ]
        for key in expired_keys:
            self._delete_memory(key)
