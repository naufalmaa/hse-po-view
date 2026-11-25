# 08. Model AI (LLM) untuk CSMS AI

Fitur Evaluasi AI CSMS memanggil model bahasa lewat API yang kompatibel dengan OpenAI (`/v1/chat/completions`). Model **tidak** dikemas di repo maupun di image Docker; tim penerima menyediakan server model sendiri. Tanpa LLM, semua modul lain tetap berjalan.

## Peran model

| Peran | Variabel | Model yang dipakai saat serah terima | Fungsi |
| --- | --- | --- | --- |
| Juri (reasoning) | `LLM_REASONING_ENDPOINT`, `LLM_REASONING_MODEL` | Qwen 3.5 lewat vLLM (`qwen35`) | Menilai tiap elemen CSMS terhadap rubric dan bukti |
| Konsensus | `LLM_CONSENSUS_ENDPOINT`, `LLM_CONSENSUS_MODEL` | sama dengan juri | Menyatukan pendapat juri menjadi skor dan catatan |
| OCR visi | `LLM_VISION_ENDPOINT`, `LLM_VISION_MODEL` | Qwen3-VL 8B (`qwen3-vl`) | Membaca halaman pindaian/gambar |
| Cadangan | `OPENAI_API_KEY`, `OPENAI_FALLBACK_MODEL` | OpenAI (mis. `gpt-5-mini`) | Dipakai bila juri/konsensus gagal |
| Embedding (opsional) | `OLLAMA_BASE_URL`, `OLLAMA_EMBED_MODEL` | `bge-large-en-v1.5` lewat Ollama | Hanya untuk membangun ulang knowledge base |

Bila model visi tidak tersedia, OCR otomatis memakai PaddleOCR lokal di dalam csms-ai (lebih lambat, akurasi lebih rendah untuk tulisan tangan/tabel).

## Kebutuhan perangkat keras (perkiraan)

| Model | GPU | Catatan |
| --- | --- | --- |
| Qwen 3.5 (juri + konsensus) | 1 GPU 24 GB (mis. L4/A10/RTX 4090) untuk varian terkuantisasi; 40 to 80 GB untuk presisi penuh | Konteks minimal 16k token (`LLM_MAX_PROMPT_CHARS` = 40000 karakter) |
| Qwen3-VL 8B (visi) | 1 GPU 16 to 24 GB | Bisa di host yang sama bila VRAM cukup |

Angka di atas perkiraan; sesuaikan dengan varian model dan beban. Satu evaluasi berjalan sekaligus secara bawaan (`CSMS_AI_CONCURRENCY=1`).

## Contoh menyiapkan vLLM

```bash
# Juri + konsensus (port 8000)
vllm serve <nama-model-qwen-di-huggingface> --served-model-name qwen35 --port 8000 --max-model-len 16384
# Visi (port 5163)
vllm serve Qwen/Qwen3-VL-8B-Instruct --served-model-name qwen3-vl --port 5163 --max-model-len 8192
```

Lalu di env csms-ai:

```env
LLM_REASONING_ENDPOINT=http://<HOST_LLM>:8000/v1
LLM_REASONING_MODEL=qwen35
LLM_CONSENSUS_ENDPOINT=http://<HOST_LLM>:8000/v1
LLM_CONSENSUS_MODEL=qwen35
LLM_VISION_ENDPOINT=http://<HOST_LLM_VISION>:5163/v1
LLM_VISION_MODEL=qwen3-vl
```

Nama `--served-model-name` harus sama dengan `LLM_*_MODEL`. Ollama juga bisa dipakai lewat endpoint OpenAI-compatible-nya (`http://<host>:11434/v1`), begitu pula layanan LLM terkelola yang kompatibel OpenAI.

## Memeriksa koneksi

```bash
curl -s -m 5 http://<HOST_LLM>:8000/v1/models          # harus HTTP 200 dan menyebut nama model
cd csms-ai && ENV_FILE=.env.production .venv/bin/python -m server.preflight
```

Preflight menampilkan status juri, konsensus, visi, dan ada/tidaknya cadangan OpenAI.

## Mengganti model

Model lain bisa dipakai selama kompatibel OpenAI dan cukup kuat berbahasa Indonesia. Setelah mengganti model, kalibrasi ulang hasil AI terhadap penilaian evaluator memakai fitur uji coba rubric (menu Admin > CSMS AI) dan panduan `docs/safeview-demo/GUIDE_KALIBRASI_AI.md`. Rubric (kriteria penilaian) dikelola sebagai Excel berversi dari menu yang sama, tanpa mengubah kode.

## Data dan privasi

Dokumen kontraktor dikirim ke server LLM untuk dinilai. Dengan LLM internal, data tidak keluar jaringan. Bila `OPENAI_API_KEY` diisi, potongan dokumen dapat dikirim ke OpenAI saat model internal gagal; kosongkan key ini bila kebijakan data tidak mengizinkan.
