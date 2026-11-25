"""Membuat tabel milik csms-ai (rubric + trial) tanpa menjalankan server.
Dipakai saat instalasi awal dan oleh CI untuk memeriksa docs/handover/database/schema.sql.
    python -m server.scripts.ensure_schema
Tabel lain dibuat oleh backend saat start (src/db/ensure)."""
import asyncio

import asyncpg

from server.config import DATABASE_URL
from server.rubric import DDL as RUBRIC_DDL
from server.schema_ddl import TRIAL_DDL


async def main() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute(RUBRIC_DDL)
        await conn.execute(TRIAL_DDL)
        print("[CSMS-AI] Tabel rubric dan trial siap.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
