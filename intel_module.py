# intel_module.py
# Módulo de Inteligencia de Mercado Territorial y Evaluación de Oportunidad B2B
# Diseñado para LeadScrapper MX - Combina datos del DENUE del INEGI con analítica comercial

import urllib.parse
from typing import Dict, Any, List, Optional
from inegi_module import (
    buscar_en_denue,
    generar_link_denue,
    generar_link_inegi_nse,
    obtener_token_denue
)

# Alcaldías y municipios de alta densidad comercial e industrial en México
MUNICIPIOS_ALTA_DENSIDAD = {
    "iztacalco", "iztapalapa", "venustiano carranza", "gustavo a madero",
    "cuauhtémoc", "cuauhtemoc", "benito juárez", "benito juarez",
    "miguel hidalgo", "alvaro obregón", "alvaro obregon", "azcapotzalco",
    "zapopan", "guadalajara", "tlaquepaque", "tonala", "tlajomulco",
    "monterrey", "san pedro garza garcía", "san pedro garza garcia", "san nicolás", "guadalupe", "apodaca",
    "puebla", "querétaro", "queretaro", "león", "leon", "tijuana", "mexicali",
    "toluca", "naucalpan", "tlalnepantla", "ecatepec", "cuautitlan izcalli",
    "mérida", "merida", "san luis potosí", "san luis potosi", "hermosillo", "chihuahua", "aguascalientes"
}

# Marcas automotrices comunes en México para deducción automática
MARCAS_AUTOMOTRICES = [
    "Chevrolet", "Nissan", "Volkswagen", "Ford", "Toyota", "Honda",
    "Kia", "Hyundai", "Mazda", "Stellantis", "Renault", "Suzuki",
    "BYD", "MG", "Chirey", "Geely", "GWM", "Omoda", "JAC", "Peugeot",
    "Audi", "BMW", "Mercedes-Benz", "RAM", "Jeep", "Dodge", "Fiat"
]


def _deducir_marca_automotriz(nombre: str) -> str:
    """Extrae la marca automotriz estimada a partir del nombre comercial de la agencia."""
    nombre_lower = nombre.lower()
    for marca in MARCAS_AUTOMOTRICES:
        if marca.lower() in nombre_lower:
            return marca
    return "Multimarca / Agencia Local"


def generar_reporte_inteligencia(
    estado: str,
    municipio: str,
    lat: float,
    lon: float,
    token_inegi: Optional[str] = None,
    radio_km: int = 10
) -> Dict[str, Any]:
    """
    Genera el reporte integral de inteligencia de mercado territorial para prospección B2B.
    Cubre tanto vehículos comerciales (RAM, pick-ups, vans) como autos de pasajeros (Jeep, Peugeot, Dodge, Fiat).
    
    Devuelve un diccionario estructurado con:
    1. PROSPECTOS_B2B:
       - hospitales: Sector salud y médicos
       - empresas_reparto: Logística, paquetería y mensajería
       - empresas_flotilla: Construcción, manufactura e industria pesada
       - educacion_profesionistas: Escuelas privadas, despachos contables, notarías, arquitectos
       - restaurantes_comercio: Restaurantes >10 empleados, panaderías, plazas comerciales, distribuidoras
       - gobierno_servicios: Alcaldías, dependencias, seguridad privada y limpieza empresarial
    2. COMPETENCIA: Lista de agencias automotrices cercanas
    3. LINKS_UTILES: URLs directas a DENUE, INEGI NSE y Google Maps
    4. SCORE_OPORTUNIDAD: Calificación numérica del 1 al 10
    5. INTERPRETACION_SCORE: Diagnóstico estratégico y plan de acción comercial
    """
    token_val = token_inegi or obtener_token_denue()
    radio_busqueda_m = int(radio_km * 1000)  # Radio de búsqueda por defecto 10 km (10,000 m)

    # 1. Búsqueda de prospectos en DENUE por categoría estratégica
    raw_hospitales = buscar_en_denue(lat, lon, radio_busqueda_m, "hospital", token_val)
    if not raw_hospitales or len(raw_hospitales) < 3:
        raw_hospitales += buscar_en_denue(lat, lon, radio_busqueda_m, "clinica", token_val)

    raw_reparto = buscar_en_denue(lat, lon, radio_busqueda_m, "transporte", token_val)
    if not raw_reparto or len(raw_reparto) < 3:
        raw_reparto += buscar_en_denue(lat, lon, radio_busqueda_m, "mensajeria", token_val)

    raw_flotilla = buscar_en_denue(lat, lon, radio_busqueda_m, "construccion", token_val)
    if not raw_flotilla or len(raw_flotilla) < 3:
        raw_flotilla += buscar_en_denue(lat, lon, radio_busqueda_m, "industria", token_val)

    # NUEVAS CATEGORÍAS B2B:
    # 1. Educación y Profesionistas (escuelas privadas, despachos contables/fiscales, notarías, despachos jurídicos, arquitectos)
    raw_educacion = buscar_en_denue(lat, lon, radio_busqueda_m, "escuela", token_val)
    if not raw_educacion or len(raw_educacion) < 3:
        raw_educacion += buscar_en_denue(lat, lon, radio_busqueda_m, "despacho", token_val)
    if len(raw_educacion) < 5:
        raw_educacion += buscar_en_denue(lat, lon, radio_busqueda_m, "notaria", token_val)

    # 2. Restaurantes y Comercio (restaurantes >10 emp, panaderías con sucursales, plazas comerciales, distribuidoras de alimentos)
    raw_restaurantes = buscar_en_denue(lat, lon, radio_busqueda_m, "restaurante", token_val)
    if not raw_restaurantes or len(raw_restaurantes) < 3:
        raw_restaurantes += buscar_en_denue(lat, lon, radio_busqueda_m, "alimentos", token_val)
    if len(raw_restaurantes) < 5:
        raw_restaurantes += buscar_en_denue(lat, lon, radio_busqueda_m, "plaza comercial", token_val)

    # 3. Gobierno y Servicios (alcaldías/dependencias, seguridad privada, limpieza empresarial)
    raw_gobierno = buscar_en_denue(lat, lon, radio_busqueda_m, "alcaldia", token_val)
    if not raw_gobierno or len(raw_gobierno) < 2:
        raw_gobierno += buscar_en_denue(lat, lon, radio_busqueda_m, "seguridad", token_val)
    if len(raw_gobierno) < 4:
        raw_gobierno += buscar_en_denue(lat, lon, radio_busqueda_m, "limpieza", token_val)

    # Competencia automotriz
    raw_agencias = buscar_en_denue(lat, lon, radio_busqueda_m, "agencia automovil", token_val)
    if not raw_agencias:
        raw_agencias = buscar_en_denue(lat, lon, radio_busqueda_m, "distribuidora autos", token_val)

    # 2. Formateo de Prospectos B2B (nombre, telefono, web, direccion, distancia_km)
    def formatear_prospectos(lista: List[Dict[str, Any]], tipo_enfoque: str = "comercial") -> List[Dict[str, Any]]:
        limpios = []
        vistos = set()
        for item in lista:
            nom = item.get("nombre", "").strip()
            if nom and nom not in vistos:
                vistos.add(nom)
                coords = item.get("coordenadas")
                if coords and isinstance(coords, dict) and coords.get("lat") and coords.get("lon"):
                    link_gps = f"https://www.google.com/maps/dir/?api=1&destination={coords['lat']},{coords['lon']}"
                else:
                    dir_encoded = urllib.parse.quote(item.get("direccion") or nom)
                    link_gps = f"https://www.google.com/maps/dir/?api=1&destination={dir_encoded}"

                limpios.append({
                    "nombre": nom,
                    "actividad": item.get("actividad", "Giro comercial"),
                    "telefono": item.get("telefono") or "Sin teléfono registrado",
                    "web": item.get("web") or "",
                    "direccion": item.get("direccion", "Dirección no disponible"),
                    "distancia_km": item.get("distancia_km", 0.0),
                    "enfoque_vehiculo": tipo_enfoque,
                    "coordenadas": coords,
                    "link_gps": link_gps
                })
        return sorted(limpios, key=lambda x: x["distancia_km"])

    prospectos_hospitales = formatear_prospectos(raw_hospitales, "Médicos / Flotilla Ambulancias & Ejecutivos")
    prospectos_reparto = formatear_prospectos(raw_reparto, "Comercial / RAM & Utilitarios de Reparto")
    prospectos_flotilla = formatear_prospectos(raw_flotilla, "Pesado & Flotillas / RAM Heavy Duty & Pick-ups")
    prospectos_educacion = formatear_prospectos(raw_educacion, "Pasajeros & Ejecutivos / Jeep, Peugeot, Dodge, Fiat")
    prospectos_restaurantes = formatear_prospectos(raw_restaurantes, "Utilitarios & Carga Ligera / RAM 700, Vans")
    prospectos_gobierno = formatear_prospectos(raw_gobierno, "Licitaciones & Utilitarios / RAM ProMaster, Seguridad")

    # 3. Formateo de Competencia (nombre, marca_estimada, distancia_km, link_maps)
    competencia = []
    vistos_comp = set()
    for item in raw_agencias:
        nom = item.get("nombre", "").strip()
        if nom and nom not in vistos_comp:
            vistos_comp.add(nom)
            marca = _deducir_marca_automotriz(nom)
            encoded_query = urllib.parse.quote(f"{nom} {municipio} {estado}")
            link_maps = f"https://www.google.com/maps/search/?api=1&query={encoded_query}"
            coords = item.get("coordenadas")
            if coords and isinstance(coords, dict) and coords.get("lat") and coords.get("lon"):
                link_gps = f"https://www.google.com/maps/dir/?api=1&destination={coords['lat']},{coords['lon']}"
            else:
                link_gps = f"https://www.google.com/maps/dir/?api=1&destination={encoded_query}"

            competencia.append({
                "nombre": nom,
                "marca_estimada": marca,
                "distancia_km": item.get("distancia_km", 0.0),
                "link_maps": link_maps,
                "coordenadas": coords,
                "link_gps": link_gps
            })
    competencia = sorted(competencia, key=lambda x: x["distancia_km"])

    # 4. Enlaces Útiles directos
    query_maps_comp = urllib.parse.quote(f"agencias de autos en {municipio} {estado}")
    links_utiles = {
        "denue_hospitales": generar_link_denue("hospital", estado, municipio),
        "denue_transporte": generar_link_denue("transporte", estado, municipio),
        "denue_educacion": generar_link_denue("escuela", estado, municipio),
        "denue_restaurantes": generar_link_denue("restaurante", estado, municipio),
        "denue_gobierno": generar_link_denue("alcaldia", estado, municipio),
        "inegi_nse": generar_link_inegi_nse(lat, lon),
        "google_maps_competencia": f"https://www.google.com/maps/search/?api=1&query={query_maps_comp}"
    }

    # 5. Cálculo del Score de Oportunidad Territorial (1 al 10)
    score = 0
    desglose_puntos = []

    # Regla 1: +2 si hay más de 5 hospitales o clínicas en radio de 5km
    if len(prospectos_hospitales) > 5:
        score += 2
        desglose_puntos.append("+2 pts: Alta concentración médica (>5 hospitales/clínicas)")
    elif len(prospectos_hospitales) >= 2:
        score += 1
        desglose_puntos.append("+1 pto: Presencia médica moderada")

    # Regla 2: +2 si hay más de 3 empresas de reparto en radio de 5km
    if len(prospectos_reparto) > 3:
        score += 2
        desglose_puntos.append("+2 pts: Nodo logístico activo (>3 empresas de reparto/transporte)")
    elif len(prospectos_reparto) >= 1:
        score += 1
        desglose_puntos.append("+1 pto: Presencia logística identificada")

    # Regla 3: +2 si hay más de 5 empresas industriales/flotilla en radio de 5km
    if len(prospectos_flotilla) > 5:
        score += 2
        desglose_puntos.append("+2 pts: Zona de alto potencial de flotillas (>5 industrias/constructoras)")
    elif len(prospectos_flotilla) >= 2:
        score += 1
        desglose_puntos.append("+1 pto: Actividad industrial moderada")

    # NUEVA REGLA 4: +1 pt si hay más de 3 escuelas privadas en la zona
    escuelas_privadas = [p for p in prospectos_educacion if any(w in p["nombre"].lower() or w in p["actividad"].lower() for w in ["colegio", "escuela", "universidad", "instituto"])]
    if len(escuelas_privadas) >= 3 or len(prospectos_educacion) >= 4:
        score += 1
        desglose_puntos.append("+1 pto: Clúster educativo relevante (colegios y universidades privadas para autos familiares/ejecutivos)")

    # NUEVA REGLA 5: +1 pt si hay más de 5 restaurantes con empleados / comercio activo
    if len(prospectos_restaurantes) >= 5:
        score += 1
        desglose_puntos.append("+1 pto: Zona gastronómica y comercial activa (>5 restaurantes/plazas para utilitarios y entregas)")

    # NUEVA REGLA 6: +1 pt si hay despachos profesionales registrados
    hay_despachos = any(
        any(w in p["nombre"].lower() or w in p["actividad"].lower() for w in ["despacho", "notar", "arquitect", "fiscal", "juridic", "legal", "auditor"])
        for p in prospectos_educacion
    )
    if hay_despachos or len(prospectos_educacion) >= 5:
        score += 1
        desglose_puntos.append("+1 pto: Concentración de profesionistas independientes (despachos, notarías y consultorías)")

    # Regla 7: +2 si hay menos de 2 agencias competidoras directas
    if len(competencia) < 2:
        score += 2
        desglose_puntos.append("+2 pts: Baja saturación de competencia automotriz (<2 agencias)")
    elif len(competencia) <= 3:
        score += 1
        desglose_puntos.append("+1 pto: Competencia automotriz moderada")
    else:
        desglose_puntos.append("0 pts: Zona saturada de agencias automotrices competidoras")

    # Regla 8: +2 si municipio es de alta densidad comercial
    mun_norm = municipio.lower().strip()
    if any(m in mun_norm for m in MUNICIPIOS_ALTA_DENSIDAD):
        score += 2
        desglose_puntos.append(f"+2 pts: Municipio '{municipio}' catalogado de alta densidad comercial e industrial")
    else:
        desglose_puntos.append(f"0 pts: Municipio '{municipio}' en zona residencial o de densidad estándar")

    # Normalización del score entre 1 y 10
    score_final = max(1, min(10, score))

    # 6. Interpretación del Score
    if score_final >= 8:
        interpretacion = "🔥 ZONA CALIENTE - Prioridad máxima de prospección comercial (Flotillas + Pasajeros)"
    elif score_final >= 5:
        interpretacion = "✅ ZONA BUENA - Vale la pena trabajar sistemáticamente con visitas mixtas"
    elif score_final >= 3:
        interpretacion = "🟡 ZONA MEDIA - Visitar con estrategia de financiamiento y precio"
    else:
        interpretacion = "⚪ ZONA FRÍA - No priorizar en este período"

    return {
        "PROSPECTOS_B2B": {
            "hospitales": prospectos_hospitales,
            "empresas_reparto": prospectos_reparto,
            "empresas_flotilla": prospectos_flotilla,
            "educacion_profesionistas": prospectos_educacion,
            "restaurantes_comercio": prospectos_restaurantes,
            "gobierno_servicios": prospectos_gobierno
        },
        "COMPETENCIA": competencia,
        "LINKS_UTILES": links_utiles,
        "SCORE_OPORTUNIDAD": score_final,
        "INTERPRETACION_SCORE": interpretacion,
        "DESGLOSE_PUNTOS": desglose_puntos,
        "METADATA": {
            "estado": estado,
            "municipio": municipio,
            "coordenadas": {"lat": lat, "lon": lon},
            "radio_km": radio_km,
            "total_prospectos_encontrados": (
                len(prospectos_hospitales) + len(prospectos_reparto) + 
                len(prospectos_flotilla) + len(prospectos_educacion) + 
                len(prospectos_restaurantes) + len(prospectos_gobierno)
            ),
            "total_competidores": len(competencia),
            "cobertura_vehicular": "Comerciales (RAM, Pick-ups) + Pasajeros (Jeep, Peugeot, Dodge, Fiat)",
            "origen_datos": "API Oficial DENUE INEGI + Mapeo Territorial"
        }
    }
