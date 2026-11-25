#!/usr/bin/env bash
# Backup database (.sql.gz) dan folder uploads (.tar.gz) di server HSE Proview.
# Dijalankan DI SERVER. Kredensial DB dibaca dari file .env backend di server (tidak pernah dicetak).
#
#   bash backup-server.sh <file .env backend> [folder tujuan]
#   contoh: bash backup-server.sh /srv/hse-proview/backend/.env /srv/backups
#
# Dari laptop tanpa menyalin skrip ke server:
#   ssh -p <SSH_PORT> <SSH_USER>@<IP_SERVER> 'bash -s' -- /path/backend/.env /tmp/hse-backup < backup-server.sh
#   scp -P <SSH_PORT> '<SSH_USER>@<IP_SERVER>:/tmp/hse-backup/*' .
#
# Hasil (di folder tujuan, di server):
#   <db>_<YYYY-MM-DD>.sql.gz          pg_dump format SQL biasa (restore: gunzip -c f.sql.gz | psql -d <db_baru>)
#   uploads_<db>_<YYYY-MM-DD>.tar.gz  isi UPLOADS_DIR      (restore: tar -xzf f.tar.gz -C <UPLOADS_DIR induk>)
#   SHA256SUMS                        checksum untuk verifikasi setelah dipindah
set -uo pipefail

# ---------- tampilan ----------
if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; N=$'\e[0m'; else B=; G=; Y=; R=; N=; fi
step() { printf '\n%s[%s]%s %s\n' "$B" "$1" "$N" "$2"; }
info() { printf '      %s\n' "$*"; }
ok()   { printf '      %sOK%s %s\n' "$G" "$N" "$*"; }
warn() { printf '      %sPERINGATAN%s %s\n' "$Y" "$N" "$*"; }
die()  { printf '\n%sGAGAL:%s %s\n' "$R" "$N" "$*" >&2; exit 1; }
human() { awk -v b="${1:-0}" 'BEGIN{s="B KB MB GB TB";split(s,u," ");i=1;while(b>=1024&&i<5){b/=1024;i++}printf (i==1?"%d %s":"%.1f %s"),b,u[i]}'; }
fsize() { if [ -f "$1" ]; then stat -c %s "$1" 2>/dev/null || wc -c < "$1"; else echo 0; fi; }

# Menampilkan ukuran berkas yang sedang ditulis + waktu berjalan, sampai proses PID selesai.
progress() {
  local pid=$1 file=$2 label=$3 total=${4:-0} start=$SECONDS spin='|/-\' i=0 size pct=""
  while kill -0 "$pid" 2>/dev/null; do
    size=$(fsize "$file")
    if [ "$total" -gt 0 ]; then pct=" (sumber $(human "$total"))"; fi
    printf '\r      %s %s: %s ditulis, %ds%s   ' "${spin:i++%4:1}" "$label" "$(human "$size")" $((SECONDS - start)) "$pct"
    sleep 1
  done
  printf '\r\033[K'
}

trap 'printf "\n%sDibatalkan.%s Berkas yang belum selesai mungkin tertinggal di folder tujuan.\n" "$R" "$N" >&2; exit 130' INT TERM

# ---------- argumen ----------
ENV_FILE="${1:-}"
OUT_DIR="${2:-./hse-backup}"
[ -n "$ENV_FILE" ] || die "Pakai: bash backup-server.sh <file .env backend> [folder tujuan]"
[ -f "$ENV_FILE" ] || die "File env tidak ditemukan: $ENV_FILE"

printf '%sBackup HSE Proview%s  (%s)\n' "$B" "$N" "$(date '+%F %T')"

# ---------- 1. konfigurasi ----------
step 1/4 "Membaca konfigurasi dari $ENV_FILE"
# Ambil satu nilai dari file .env: abaikan komentar, CR (file dari Windows), tanda kutip, komentar di ujung baris.
val() {
  grep -E "^[[:space:]]*(export[[:space:]]+)?$1[[:space:]]*=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- \
    | tr -d '\r' | sed -E 's/[[:space:]]+#.*$//; s/^[[:space:]]+//; s/[[:space:]]+$//; s/^"(.*)"$/\1/; s/^'\''(.*)'\''$/\1/' || true
}
DB_HOST="$(val POSTGRES_HOST)"; DB_PORT="$(val POSTGRES_PORT)"; DB_USER="$(val POSTGRES_USER)"
DB_NAME="$(val POSTGRES_DB)"; DB_PASS="$(val POSTGRES_PASSWORD)"; UPLOADS="$(val UPLOADS_DIR)"
DB_HOST="${DB_HOST:-localhost}"; DB_PORT="${DB_PORT:-5432}"
missing=""
[ -n "$DB_USER" ] || missing="$missing POSTGRES_USER"
[ -n "$DB_NAME" ] || missing="$missing POSTGRES_DB"
[ -n "$missing" ] && die "Variabel tidak ada di $ENV_FILE:$missing"
[ -n "$DB_PASS" ] || warn "POSTGRES_PASSWORD kosong; pg_dump akan memakai ~/.pgpass atau meminta password."
export PGPASSWORD="$DB_PASS"
info "Database : ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

BACKEND_DIR="$(cd "$(dirname "$ENV_FILE")" && pwd)"
if [ -z "$UPLOADS" ]; then
  # Sama dengan pencarian aplikasi saat UPLOADS_DIR tidak diisi
  for c in "$BACKEND_DIR/uploads" "$BACKEND_DIR/../uploads" "$BACKEND_DIR/../../uploads"; do
    [ -d "$c" ] && { UPLOADS="$c"; break; }
  done
  [ -n "$UPLOADS" ] && warn "UPLOADS_DIR tidak diisi di .env; memakai folder yang ditemukan: $UPLOADS"
else
  case "$UPLOADS" in /*) ;; *) UPLOADS="$BACKEND_DIR/$UPLOADS" ;; esac
fi
if [ -n "$UPLOADS" ] && [ -d "$UPLOADS" ]; then
  UPLOADS="$(cd "$UPLOADS" && pwd)"
  info "Uploads  : $UPLOADS"
else
  warn "Folder uploads tidak ditemukan (${UPLOADS:-tidak diisi}). Hanya database yang di-backup."
  UPLOADS=""
fi

command -v pg_dump >/dev/null || die "pg_dump tidak ada. Pasang: sudo apt install postgresql-client"
info "pg_dump  : $(pg_dump --version)"

STAMP="$(date +%F)"
mkdir -p "$OUT_DIR" || die "Tidak bisa membuat folder tujuan: $OUT_DIR"
OUT_DIR="$(cd "$OUT_DIR" && pwd)"
info "Tujuan   : $OUT_DIR"
DB_FILE="$OUT_DIR/${DB_NAME}_${STAMP}.sql.gz"
UP_FILE="$OUT_DIR/uploads_${DB_NAME}_${STAMP}.tar.gz"
ERR_LOG="$OUT_DIR/.backup-error.log"

# ---------- 2. database ----------
step 2/4 "Dump database"
pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t 5 >/dev/null 2>&1 \
  || warn "pg_isready tidak menjawab; tetap mencoba pg_dump."
DB_BYTES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "select pg_database_size(current_database())" 2>/dev/null || echo 0)
[ "$DB_BYTES" -gt 0 ] 2>/dev/null && info "Ukuran database: $(human "$DB_BYTES") (hasil .gz biasanya jauh lebih kecil)"
( pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges 2>"$ERR_LOG" | gzip -6 > "$DB_FILE"
  exit "${PIPESTATUS[0]}" ) &
PID=$!
progress "$PID" "$DB_FILE" "pg_dump" "${DB_BYTES:-0}"
wait "$PID" || die "pg_dump gagal:
$(sed 's/^/      /' "$ERR_LOG")"
gzip -t "$DB_FILE" || die "Berkas dump rusak: $DB_FILE"
ok "$(basename "$DB_FILE") ($(human "$(fsize "$DB_FILE")"))"

# ---------- 3. uploads ----------
step 3/4 "Arsip folder uploads"
if [ -n "$UPLOADS" ]; then
  UP_BYTES=$(du -sb "$UPLOADS" 2>/dev/null | cut -f1 || echo 0)
  UP_COUNT=$(find "$UPLOADS" -type f 2>/dev/null | wc -l)
  info "Isi: $UP_COUNT berkas, $(human "${UP_BYTES:-0}")"
  # Ruang kosong: berkas uploads (PDF/foto) hampir tidak menyusut saat dikompres, jadi butuh ~ukuran sumber.
  FREE=$(df -PB1 "$OUT_DIR" 2>/dev/null | awk 'NR==2{print $4}')
  if [ -n "$FREE" ] && [ "${UP_BYTES:-0}" -gt 0 ] && [ "$FREE" -lt "$UP_BYTES" ]; then
    die "Ruang kosong di $OUT_DIR hanya $(human "$FREE"), sedangkan uploads $(human "$UP_BYTES").
      Pilih folder tujuan di disk yang lebih lega, mis.: bash backup-server.sh $ENV_FILE /data/hse-backup
      Cek ruang kosong: df -h"
  fi
  info "Ruang kosong di tujuan: $(human "${FREE:-0}")"
  # Aplikasi tetap berjalan, jadi berkas bisa berubah saat dibaca. GNU tar keluar dengan kode 1 untuk itu
  # (arsip tetap valid); kode 2 ke atas = gagal sungguhan.
  tar --warning=no-file-changed --warning=no-file-removed --ignore-failed-read \
      -czf "$UP_FILE" -C "$(dirname "$UPLOADS")" "$(basename "$UPLOADS")" 2>"$ERR_LOG" &
  PID=$!
  progress "$PID" "$UP_FILE" "tar" "${UP_BYTES:-0}"
  wait "$PID"; RC=$?
  if [ "$RC" -ge 2 ]; then
    die "tar gagal (kode $RC):
$(sed 's/^/      /' "$ERR_LOG")"
  fi
  if [ "$RC" -eq 1 ] || [ -s "$ERR_LOG" ]; then
    warn "Beberapa berkas berubah/dihapus aplikasi saat diarsipkan (wajar saat aplikasi berjalan):"
    sed -n '1,5s/^/        /p' "$ERR_LOG"
  fi
  info "Memeriksa isi arsip (membaca ulang seluruh arsip, bisa beberapa menit)..."
  N_IN=$(tar -tzf "$UP_FILE" 2>/dev/null | grep -vc '/$') || die "Arsip rusak: $UP_FILE"
  ok "$(basename "$UP_FILE") ($(human "$(fsize "$UP_FILE")"), $N_IN berkas)"
else
  info "Dilewati (folder uploads tidak ditemukan)."
  UP_FILE=""
fi
rm -f "$ERR_LOG"

# ---------- 4. checksum ----------
step 4/4 "Checksum"
( cd "$OUT_DIR" && sha256sum "$(basename "$DB_FILE")" ${UP_FILE:+"$(basename "$UP_FILE")"} > SHA256SUMS ) || die "sha256sum gagal"
ok "SHA256SUMS"
unset PGPASSWORD

printf '\n%sSelesai.%s Berkas di %s:\n' "$G" "$N" "$OUT_DIR"
ls -lh "$DB_FILE" ${UP_FILE:+"$UP_FILE"} "$OUT_DIR/SHA256SUMS" | awk '{print "      " $5 "\t" $9}'
cat <<EOF

Tarik ke laptop:
      scp -P <SSH_PORT> '<SSH_USER>@<IP_SERVER>:$OUT_DIR/*' .
Data produksi: kirim hanya lewat kanal terenkripsi dan hapus salinan di server setelah dipindah.
EOF
