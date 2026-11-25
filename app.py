import os
import re
import socket
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, File, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from services.bible_service import search_bible, list_books, get_chapter, get_verse
from services.song_service import (
    init_app_db, list_songs, get_song, save_song, delete_song,
    get_settings, update_settings, get_setlists, save_setlist
)
from services.ai_service import format_with_nvidia_nemotron
from services.scraper_service import import_song_from_web
from services.state_service import state_manager

# Initialize database
init_app_db()

app = FastAPI(title="Remidos Projeção & Transmissão")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

# Pydantic schemas
class PushSlideRequest(BaseModel):
    current_slide: Dict[str, Any]
    next_slide: Optional[Dict[str, Any]] = None
    presentation: Optional[List[Dict[str, Any]]] = None
    index: Optional[int] = 0

class ToggleAction(BaseModel):
    value: Optional[bool] = None

class StyleRequest(BaseModel):
    theme: Optional[str] = None
    font_family: Optional[str] = None
    font_size: Optional[str] = None
    text_weight: Optional[str] = None
    text_align: Optional[str] = None
    text_position: Optional[str] = None
    bg_dim: Optional[int] = None
    text_shadow: Optional[str] = None

class AIFormatRequest(BaseModel):
    text: str
    mode: Optional[str] = "worship"
    model: Optional[str] = None

class SongSaveRequest(BaseModel):
    id: Optional[int] = None
    title: str
    artist: Optional[str] = ""
    tags: Optional[str] = ""
    slides: List[Dict[str, Any]]

class ImportSongRequest(BaseModel):
    url_or_query: str

class BackgroundChangeRequest(BaseModel):
    bg_type: str
    bg_url: Optional[str] = ""
    theme_name: Optional[str] = "Personalizado"

class StageAlertRequest(BaseModel):
    message: str

class ProjectorAlertRequest(BaseModel):
    message: str
    alert_type: Optional[str] = "general"

class TimerStartRequest(BaseModel):
    minutes: int
    label: Optional[str] = "Pregação"

class SetlistSaveRequest(BaseModel):
    id: Optional[int] = None
    name: str
    items: List[Dict[str, Any]]

class SettingsUpdateRequest(BaseModel):
    church_name: Optional[str] = None
    church_subtitle: Optional[str] = None
    theme: Optional[str] = None
    font_family: Optional[str] = None
    font_size: Optional[str] = None
    text_weight: Optional[str] = None
    text_align: Optional[str] = None
    text_position: Optional[str] = None
    bg_dim: Optional[int] = None
    text_shadow: Optional[str] = None
    nvidia_api_key: Optional[str] = None
    nvidia_model: Optional[str] = None
    obs_chroma_color: Optional[str] = None

# --- HTML Views ---
@app.get("/manifest.json")
async def manifest_endpoint():
    return FileResponse(os.path.join(STATIC_DIR, "manifest.json"), media_type="application/manifest+json")

@app.get("/sw.js")
async def sw_endpoint():
    return FileResponse(
        os.path.join(STATIC_DIR, "sw.js"),
        media_type="application/javascript",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
    )

@app.get("/", response_class=FileResponse)
@app.get("/admin", response_class=FileResponse)
async def admin_page():
    return FileResponse(
        os.path.join(TEMPLATES_DIR, "admin.html"),
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
    )

@app.get("/projector", response_class=FileResponse)
async def projector_page():
    return FileResponse(
        os.path.join(TEMPLATES_DIR, "projector.html"),
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
    )

@app.get("/stage", response_class=FileResponse)
async def stage_page():
    return FileResponse(
        os.path.join(TEMPLATES_DIR, "stage.html"),
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
    )

@app.get("/obs", response_class=FileResponse)
async def obs_page():
    return FileResponse(
        os.path.join(TEMPLATES_DIR, "obs.html"),
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
    )

# --- WebSocket ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await state_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        state_manager.disconnect(websocket)
    except Exception:
        state_manager.disconnect(websocket)

# --- State Control API ---
@app.get("/api/state")
async def get_state():
    return state_manager.get_state()

@app.get("/api/network-info")
async def get_network_info():
    ip = get_local_ip()
    return {
        "local_ip": ip,
        "port": 8765,
        "admin_url": f"http://{ip}:8765/admin",
        "projector_url": f"http://{ip}:8765/projector"
    }

@app.post("/api/projector/push")
async def push_slide(req: PushSlideRequest):
    if req.presentation is not None:
        await state_manager.set_presentation(req.presentation, req.index or 0)
    else:
        await state_manager.push_slide(req.current_slide, req.next_slide)
    return {"status": "ok", "state": state_manager.get_state()}

@app.post("/api/projector/next")
async def projector_next():
    await state_manager.next_slide()
    return {"status": "ok", "state": state_manager.get_state()}

@app.post("/api/projector/prev")
async def projector_prev():
    await state_manager.prev_slide()
    return {"status": "ok", "state": state_manager.get_state()}

@app.post("/api/projector/blackout")
async def toggle_blackout(req: Optional[ToggleAction] = None):
    if req and req.value is not None:
        await state_manager.set_blackout(req.value)
    else:
        await state_manager.toggle_blackout()
    return {"status": "ok", "is_blackout": state_manager.is_blackout}

@app.post("/api/projector/clear")
async def toggle_clear(req: Optional[ToggleAction] = None):
    if req and req.value is not None:
        await state_manager.set_clear(req.value)
    else:
        await state_manager.toggle_clear()
    return {"status": "ok", "is_clear": state_manager.is_clear}

@app.post("/api/projector/logo")
async def toggle_logo(req: Optional[ToggleAction] = None):
    if req and req.value is not None:
        await state_manager.set_logo(req.value)
    else:
        await state_manager.toggle_logo()
    return {"status": "ok", "is_logo": state_manager.is_logo}

@app.post("/api/projector/styles")
async def update_projector_styles(req: StyleRequest):
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    await state_manager.update_styles(data)
    update_settings(data)
    return {"status": "ok", "styles": data}

# --- Bible API ---
@app.get("/api/bible/books")
async def api_list_books():
    return list_books()

@app.get("/api/bible/chapter")
async def api_get_chapter(book_id: int, chapter: int, version: str = "NVI"):
    chap = get_chapter(book_id, chapter, version)
    if not chap:
        return JSONResponse({"error": "Capítulo não encontrado"}, status_code=404)
    return chap

@app.get("/api/bible/search")
async def api_search_bible(q: str, version: str = "NVI", limit: int = 40):
    return search_bible(q, version, limit)

# --- Songs API ---
@app.get("/api/songs")
async def api_list_songs(search: str = ""):
    return list_songs(search)

@app.get("/api/songs/{song_id}")
async def api_get_song(song_id: int):
    song = get_song(song_id)
    if not song:
        return JSONResponse({"error": "Louvor não encontrado"}, status_code=404)
    return song

@app.post("/api/songs")
async def api_save_song(req: SongSaveRequest):
    saved = save_song(req.title, req.artist or "", req.tags or "", req.slides, req.id)
    return saved

@app.delete("/api/songs/{song_id}")
async def api_delete_song(song_id: int):
    delete_song(song_id)
    return {"status": "ok"}

# --- Setlists API ---
@app.get("/api/setlists")
async def api_get_setlists():
    return get_setlists()

@app.post("/api/setlists")
async def api_save_setlist(req: SetlistSaveRequest):
    saved_id = save_setlist(req.name, req.items, req.id)
    return {"status": "ok", "id": saved_id}

# --- NVIDIA NeMoTron AI API ---
@app.post("/api/ai/format")
async def api_ai_format(req: AIFormatRequest):
    settings = get_settings()
    api_key = settings.get("nvidia_api_key", "").strip()
    model = req.model or settings.get("nvidia_model", "nvidia/llama-3.1-nemotron-70b-instruct")
    result = format_with_nvidia_nemotron(req.text, api_key=api_key, model=model, mode=req.mode or "worship")
    return result

# --- Settings API ---
@app.get("/api/settings")
async def api_get_settings():
    return get_settings()

@app.post("/api/settings")
async def api_update_settings(req: SettingsUpdateRequest):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    saved = update_settings(updates)
    await state_manager.update_styles(updates)
    return saved

# --- Song Import from URL / Search API ---
@app.post("/api/songs/import-url")
async def api_import_song(req: ImportSongRequest):
    try:
        data = import_song_from_web(req.url_or_query)
        return data
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=400)

# --- Backgrounds & Motion Presets API ---
@app.get("/api/backgrounds/presets")
async def api_get_bg_presets():
    return [
        {
            "id": "gold_classic",
            "name": "Dourado Litúrgico",
            "type": "image",
            "url": "/static/img/projector_bg.jpg",
            "badge": "Clássico"
        },
        {
            "id": "motion_clouds",
            "name": "Nuvens Celestiais (Motion)",
            "type": "motion_clouds",
            "url": "motion_clouds",
            "badge": "Animado 60fps"
        },
        {
            "id": "motion_particles",
            "name": "Partículas de Glória (Motion)",
            "type": "motion_particles",
            "url": "motion_particles",
            "badge": "Animado 60fps"
        },
        {
            "id": "pure_black",
            "name": "Painel LED (Preto Puro)",
            "type": "color",
            "url": "#000000",
            "badge": "Zero Emissão"
        }
    ]

@app.post("/api/projector/background")
async def api_set_background(req: BackgroundChangeRequest):
    await state_manager.set_background(req.bg_type, req.bg_url or "", req.theme_name or "Personalizado")
    update_settings({"bg_type": req.bg_type, "bg_url": req.bg_url or "", "theme_name": req.theme_name or ""})
    return {"status": "ok", "state": state_manager.get_state()}

@app.post("/api/backgrounds/upload")
async def api_upload_background(file: UploadFile = File(...)):
    uploads_dir = os.path.join(STATIC_DIR, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename)
    dest_path = os.path.join(uploads_dir, clean_name)
    with open(dest_path, "wb") as buffer:
        buffer.write(await file.read())

    url = f"/static/uploads/{clean_name}"
    is_video = clean_name.lower().endswith(('.mp4', '.webm', '.mov'))
    bg_type = "video" if is_video else "image"
    theme_name = f"Upload: {file.filename[:20]}"
    await state_manager.set_background(bg_type, url, theme_name)
    update_settings({"bg_type": bg_type, "bg_url": url, "theme_name": theme_name})
    return {"url": url, "bg_type": bg_type, "theme_name": theme_name}

# --- Altar & Culto Tools: Stage Alerts, Projector Alerts & Countdown Timer ---
@app.post("/api/alerts/stage")
async def api_set_stage_alert(req: StageAlertRequest):
    await state_manager.set_stage_alert(req.message)
    return {"status": "ok", "message": req.message}

@app.delete("/api/alerts/stage")
async def api_clear_stage_alert():
    await state_manager.clear_stage_alert()
    return {"status": "ok"}

@app.post("/api/alerts/projector")
async def api_set_projector_alert(req: ProjectorAlertRequest):
    await state_manager.set_projector_alert(req.message, req.alert_type or "general")
    return {"status": "ok", "message": req.message}

@app.delete("/api/alerts/projector")
async def api_clear_projector_alert():
    await state_manager.clear_projector_alert()
    return {"status": "ok"}

@app.post("/api/timer/start")
async def api_start_timer(req: TimerStartRequest):
    await state_manager.start_timer(req.minutes, req.label or "Pregação")
    return {"status": "ok", "state": state_manager.get_state()}

@app.post("/api/timer/stop")
async def api_stop_timer():
    await state_manager.stop_timer()
    return {"status": "ok"}

@app.post("/api/timer/reset")
async def api_reset_timer():
    await state_manager.reset_timer()
    return {"status": "ok"}
