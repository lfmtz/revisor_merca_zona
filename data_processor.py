"""
LeadScrapper MX - Data Processor
Limpieza de números telefónicos a 10 dígitos, formateo de datos y exportación a Excel y CSV.
"""
import re
import pandas as pd
from datetime import datetime
import urllib.parse

def clean_phone(phone: str) -> str:
    """Limpia el teléfono a formato estándar de 10 dígitos."""
    if not phone or phone == "N/A":
        return "N/A"
    
    digits = re.sub(r'\D', '', phone)
    if digits.startswith('521') and len(digits) == 13:
        digits = digits[3:]
    elif digits.startswith('52') and len(digits) == 12:
        digits = digits[2:]
    elif (digits.startswith('044') or digits.startswith('045')) and len(digits) >= 12:
        digits = digits[3:]

    if len(digits) == 10:
        return f"{digits[:2]} {digits[2:6]} {digits[6:]}"
    return phone.strip()

def build_nav_link(nombre: str, direccion: str, lat: float = None, lon: float = None) -> str:
    """Construye enlace de navegación GPS de Google Maps con ruta desde ubicación actual."""
    if lat and lon:
        return f"https://www.google.com/maps/dir/?api=1&destination={lat},{lon}"
    dest = direccion.strip() if direccion and direccion != "N/A" else nombre.strip()
    return f"https://www.google.com/maps/dir/?api=1&destination={urllib.parse.quote_plus(dest)}"

def generate_filename(business_type: str, estado: str, municipio: str, ext: str = "csv") -> str:
    """Genera el nombre estándar de archivo para descarga."""
    clean = lambda t: re.sub(r'[^a-zA-Z0-9]', '_', t.lower().strip())
    b_type = clean(business_type) if business_type else "negocios"
    est = clean(estado) if estado else "mexico"
    mun = clean(municipio) if municipio else "estado_completo"
    today = datetime.now().strftime("%Y-%m-%d")
    return f"leads_{b_type}_{est}_{mun}_{today}.{ext}"

def export_to_excel_buffer(df: pd.DataFrame) -> bytes:
    """Genera archivo Excel estilizado en memoria con columna Link GPS."""
    import io
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Prospectos')
    return output.getvalue()
