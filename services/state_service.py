import asyncio
from typing import List, Dict, Any
from fastapi import WebSocket

class ProjectionState:
    def __init__(self):
        self.is_blackout: bool = False
        self.is_clear: bool = False
        self.is_logo: bool = True  # Starts showing church background/logo
        self.theme: str = "worship_bg"
        self.font_family: str = "'Montserrat', sans-serif"
        self.font_size: str = "48px"
        self.text_weight: str = "700"
        self.text_align: str = "center"
        self.text_position: str = "center" # 'center', 'upper', 'lower'
        self.bg_dim: int = 15 # percentage dimming overlay (0 to 50)
        self.text_shadow: str = "cinematic" # 'cinematic', 'soft', 'none'
        self.bg_type: str = "image" # 'image', 'video', 'color', 'motion_particles', 'motion_clouds'
        self.bg_url: str = "/static/img/projector_bg.jpg"
        self.theme_name: str = "Dourado Litúrgico"
        
        # Altar & Culto Tools: Alerts & Preacher Timer
        self.stage_alert: str = ""
        self.projector_alert: str = ""
        self.projector_alert_type: str = "general" # 'general', 'nursery', 'car'
        self.timer_active: bool = False
        self.timer_target_timestamp: float = 0.0
        self.timer_label: str = "Pregação"
        self.timer_duration_minutes: int = 40
        
        self.current_slide: Dict[str, Any] = {
            "title": "Remidos em Cristo",
            "subtitle": "Nova Aliança",
            "type": "Logo",
            "text": "Bem-vindos à Igreja Remidos em Cristo\nNova Aliança",
            "reference": "",
            "slide_index": 0,
            "total_slides": 1
        }
        self.next_slide: Dict[str, Any] = {
            "title": "",
            "text": ""
        }
        self.active_presentation: List[Dict[str, Any]] = []
        self.active_index: int = 0
        self.history: List[Dict[str, Any]] = []
        self.active_connections: List[WebSocket] = []

    def get_state(self) -> Dict[str, Any]:
        return {
            "is_blackout": self.is_blackout,
            "is_clear": self.is_clear,
            "is_logo": self.is_logo,
            "theme": self.theme,
            "font_family": self.font_family,
            "font_size": self.font_size,
            "text_weight": self.text_weight,
            "text_align": self.text_align,
            "text_position": self.text_position,
            "bg_dim": self.bg_dim,
            "text_shadow": self.text_shadow,
            "bg_type": self.bg_type,
            "bg_url": self.bg_url,
            "theme_name": self.theme_name,
            "stage_alert": self.stage_alert,
            "projector_alert": self.projector_alert,
            "projector_alert_type": self.projector_alert_type,
            "timer_active": self.timer_active,
            "timer_target_timestamp": self.timer_target_timestamp,
            "timer_label": self.timer_label,
            "timer_duration_minutes": self.timer_duration_minutes,
            "current_slide": self.current_slide,
            "next_slide": self.next_slide,
            "active_presentation": self.active_presentation,
            "active_index": self.active_index,
            "history": self.history[-10:]
        }

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await websocket.send_json(self.get_state())

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_state(self):
        state_data = self.get_state()
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(state_data)
            except Exception:
                dead.append(connection)
                
        for d in dead:
            if d in self.active_connections:
                self.active_connections.remove(d)

    async def set_blackout(self, val: bool):
        self.is_blackout = val
        await self.broadcast_state()

    async def toggle_blackout(self):
        self.is_blackout = not self.is_blackout
        await self.broadcast_state()

    async def set_clear(self, val: bool):
        self.is_clear = val
        await self.broadcast_state()

    async def toggle_clear(self):
        self.is_clear = not self.is_clear
        await self.broadcast_state()

    async def set_logo(self, val: bool):
        self.is_logo = val
        if val:
            self.is_blackout = False
            self.is_clear = False
        await self.broadcast_state()

    async def toggle_logo(self):
        self.is_logo = not self.is_logo
        if self.is_logo:
            self.is_blackout = False
            self.is_clear = False
        await self.broadcast_state()

    async def push_slide(self, slide_data: Dict[str, Any], next_slide_data: Dict[str, Any] = None):
        if self.current_slide and self.current_slide.get("text") and not self.is_logo:
            self.history.append(self.current_slide)
            
        self.current_slide = slide_data
        if next_slide_data is not None:
            self.next_slide = next_slide_data
        self.is_blackout = False
        self.is_clear = False
        self.is_logo = False
        await self.broadcast_state()

    async def set_presentation(self, slides: List[Dict[str, Any]], start_index: int = 0):
        self.active_presentation = slides
        self.active_index = start_index
        if slides and 0 <= start_index < len(slides):
            cur = slides[start_index]
            nxt = slides[start_index + 1] if start_index + 1 < len(slides) else None
            await self.push_slide(cur, nxt)
        else:
            await self.broadcast_state()

    async def next_slide(self):
        if not self.active_presentation:
            return
        if self.active_index < len(self.active_presentation) - 1:
            self.active_index += 1
            cur = self.active_presentation[self.active_index]
            nxt = self.active_presentation[self.active_index + 1] if self.active_index + 1 < len(self.active_presentation) else None
            await self.push_slide(cur, nxt)

    async def prev_slide(self):
        if not self.active_presentation:
            return
        if self.active_index > 0:
            self.active_index -= 1
            cur = self.active_presentation[self.active_index]
            nxt = self.active_presentation[self.active_index + 1] if self.active_index + 1 < len(self.active_presentation) else None
            await self.push_slide(cur, nxt)

    async def update_styles(self, styles: Dict[str, Any]):
        if "theme" in styles: self.theme = styles["theme"]
        if "font_family" in styles: self.font_family = styles["font_family"]
        if "font_size" in styles: self.font_size = styles["font_size"]
        if "text_weight" in styles: self.text_weight = styles["text_weight"]
        if "text_align" in styles: self.text_align = styles["text_align"]
        if "text_position" in styles: self.text_position = styles["text_position"]
        if "bg_dim" in styles: self.bg_dim = int(styles["bg_dim"])
        if "text_shadow" in styles: self.text_shadow = styles["text_shadow"]
        if "bg_type" in styles: self.bg_type = styles["bg_type"]
        if "bg_url" in styles: self.bg_url = styles["bg_url"]
        if "theme_name" in styles: self.theme_name = styles["theme_name"]
        await self.broadcast_state()

    async def set_background(self, bg_type: str, bg_url: str, theme_name: str = "Personalizado"):
        self.bg_type = bg_type
        self.bg_url = bg_url
        self.theme_name = theme_name
        await self.broadcast_state()

    # --- ALTAR & CULTO TOOLS (STAGE ALERTS, PROJECTOR ALERTS & TIMER) ---
    async def set_stage_alert(self, message: str):
        self.stage_alert = message.strip()
        await self.broadcast_state()

    async def clear_stage_alert(self):
        self.stage_alert = ""
        await self.broadcast_state()

    async def set_projector_alert(self, message: str, alert_type: str = "general"):
        self.projector_alert = message.strip()
        self.projector_alert_type = alert_type
        await self.broadcast_state()

    async def clear_projector_alert(self):
        self.projector_alert = ""
        await self.broadcast_state()

    async def start_timer(self, minutes: int, label: str = "Pregação"):
        import time
        self.timer_duration_minutes = minutes
        self.timer_label = label
        self.timer_target_timestamp = time.time() + (minutes * 60)
        self.timer_active = True
        await self.broadcast_state()

    async def stop_timer(self):
        self.timer_active = False
        await self.broadcast_state()

    async def reset_timer(self):
        self.timer_active = False
        self.timer_target_timestamp = 0.0
        await self.broadcast_state()

state_manager = ProjectionState()
