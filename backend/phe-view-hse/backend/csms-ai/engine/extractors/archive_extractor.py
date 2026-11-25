import os
import shutil
import tempfile
import zipfile
from typing import Dict, Any, TYPE_CHECKING, List, Optional, Tuple

from .base_extractor import BaseExtractor

if TYPE_CHECKING:
    from .router import ExtractorRouter

try:
    import rarfile
except ImportError:
    rarfile = None

try:
    import py7zr
except ImportError:
    py7zr = None

# Safety limits for archives uploaded by contractors (configurable)
MAX_MEMBERS = int(os.getenv("CSMS_AI_ARCHIVE_MAX_FILES", "500"))
MAX_TOTAL_BYTES = int(os.getenv("CSMS_AI_ARCHIVE_MAX_MB", "1024")) * 1024 * 1024
JUNK = ("__macosx/", ".ds_store", "thumbs.db", "desktop.ini")

_WIN_7Z = [r"C:\Program Files\7-Zip\7z.exe", r"C:\Program Files (x86)\7-Zip\7z.exe"]


def configure_rar_tools() -> bool:
    """rarfile needs an external tool (unrar, unar, 7z or bsdtar). Point it to whatever is installed,
    including 7-Zip in its default Windows location. Returns True when RAR can be read."""
    if not rarfile:
        return False
    for path in _WIN_7Z:
        if os.path.exists(path):
            rarfile.SEVENZIP_TOOL = path
            break
    try:
        rarfile.tool_setup(force=True)
        return True
    except Exception:
        return False


RAR_SUPPORTED = configure_rar_tools()


def _is_junk(name: str) -> bool:
    n = name.replace("\\", "/").lower()
    return n.endswith("/") or any(j in n for j in JUNK)


class ArchiveExtractor(BaseExtractor):
    def __init__(self, router: 'ExtractorRouter' = None):
        self.router = router

    # -- per format: list members (name, size, encrypted) and extract to a folder -----------------------
    def _open(self, file_path: str, kind: str):
        if kind == "zip":
            zf = zipfile.ZipFile(file_path, "r")
            members = [(i.filename, i.file_size, bool(i.flag_bits & 0x1)) for i in zf.infolist() if not i.is_dir()]
            return zf, members
        if kind == "rar":
            if not rarfile:
                raise RuntimeError("paket rarfile belum terpasang")
            if not RAR_SUPPORTED:
                raise RuntimeError("RAR membutuhkan tool 'unrar' atau 7-Zip di server")
            rf = rarfile.RarFile(file_path, "r")
            members = [(i.filename, i.file_size, i.needs_password()) for i in rf.infolist() if not i.is_dir()]
            return rf, members
        if kind == "7z":
            if not py7zr:
                raise RuntimeError("paket py7zr belum terpasang")
            sz = py7zr.SevenZipFile(file_path, "r")
            if sz.needs_password():
                raise RuntimeError("arsip terkunci password")
            members = [(i.filename, i.uncompressed or 0, False) for i in sz.list() if not i.is_directory]
            return sz, members
        raise RuntimeError(f"format arsip tidak didukung: {kind}")

    def extract(self, file_path: str, current_depth: int = 1, max_depth: int = 3, kind: Optional[str] = None) -> Dict[str, Any]:
        kind = kind or os.path.splitext(file_path)[1].lower().lstrip(".")
        metadata: Dict[str, Any] = {"files_extracted": 0, "skipped": []}
        if current_depth > max_depth:
            return self._create_response("archive", {"error": "arsip bertingkat terlalu dalam"}, [], 0.0)

        evidence: List[str] = []
        temp_dir = None
        handle = None
        try:
            handle, members = self._open(file_path, kind)
            members = [m for m in members if not _is_junk(m[0])]
            if any(enc for _, _, enc in members):
                raise RuntimeError("arsip terkunci password")
            if len(members) > MAX_MEMBERS:
                raise RuntimeError(f"isi arsip terlalu banyak ({len(members)} berkas, batas {MAX_MEMBERS})")
            total = sum(size for _, size, _ in members)
            if total > MAX_TOTAL_BYTES:
                raise RuntimeError(f"isi arsip terlalu besar ({total // 1048576} MB, batas {MAX_TOTAL_BYTES // 1048576} MB)")

            temp_dir = tempfile.mkdtemp(prefix="archive_ext_")
            if kind == "7z":
                handle.extractall(path=temp_dir)
            else:
                # member-by-member, never outside temp_dir (zip-slip)
                for name, _, _ in members:
                    target = os.path.realpath(os.path.join(temp_dir, name))
                    if not target.startswith(os.path.realpath(temp_dir)):
                        metadata["skipped"].append(name)
                        continue
                    handle.extract(name, temp_dir)

            for root, _, files in os.walk(temp_dir):
                for fname in sorted(files):
                    sub_path = os.path.join(root, fname)
                    rel = os.path.relpath(sub_path, temp_dir).replace("\\", "/")
                    if _is_junk(rel):
                        continue
                    metadata["files_extracted"] += 1
                    sub_kind = self.router.sniff(sub_path) if self.router else os.path.splitext(fname)[1].lower().lstrip(".")
                    if sub_kind in ("zip", "rar", "7z"):
                        sub_res = self.extract(sub_path, current_depth + 1, max_depth, kind=sub_kind)
                    elif self.router:
                        sub_res = self.router.extract_document(sub_path)
                    else:
                        continue
                    ev = sub_res.get("evidence") or []
                    if ev:
                        evidence.extend(f"[{rel}] {e}" for e in ev)
                    else:
                        reason = (sub_res.get("errors") or [sub_res.get("reason") or "tidak ada teks"])[0]
                        evidence.append(f"[{rel}] [BERKAS TIDAK TERBACA: {reason}]")
        except Exception as e:
            return self._create_response("archive", {"error": str(e)}, [], 0.0)
        finally:
            try:
                if handle:
                    handle.close()
            except Exception:
                pass
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

        return self._create_response("archive", metadata, evidence, 0.85)
