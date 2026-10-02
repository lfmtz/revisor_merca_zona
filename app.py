"""
LeadScrapper MX - Aplicación Principal Streamlit
Motor de Cuadrículas para Superar el Límite de 120 Resultados en Google Maps México.
Incluye Módulo de Inteligencia de Mercado Territorial con API DENUE del INEGI.
"""
import streamlit as st
import pandas as pd
import asyncio
import time

from geo_filter import ESTADOS_MEXICO
from grid_engine import (
    MODOS_CUADRICULA,
    ESTADOS_GEO,
    geocodificar_municipio,
    estimar_antes_de_ejecutar,
    escanear_zona_completa
)
from inegi_module import (
    obtener_token_denue,
    generar_link_denue,
    generar_link_inegi_nse
)
from intel_module import generar_reporte_inteligencia
from apify_module import (
    ejecutar_extraccion_apify,
    calcular_costo_extraccion,
    obtener_apify_token
)

# Configuración de página
st.set_page_config(
    page_title="LeadScrapper MX - Cuadrículas Google Maps & DENUE INEGI",
    page_icon="🇲🇽",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Estilos CSS con colores morados del sistema de diseño LeadScrapper MX
st.markdown("""
<style>
    .stApp {
        background-color: #0A0713;
        color: #F3F4F6;
    }
    .metric-card {
        background: linear-gradient(135deg, #1C1433 0%, #120B20 100%);
        border: 1px solid #4C2889;
        border-radius: 12px;
        padding: 1.2rem;
        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
    }
    .intel-card {
        background: #140E24;
        border: 1px solid #6B21A8;
        border-radius: 12px;
        padding: 1rem;
        margin-bottom: 0.8rem;
    }
    .score-badge-caliente {
        background: linear-gradient(90deg, #7C2D12, #581C87);
        border: 1px solid #F97316;
        color: #FDBA74;
        padding: 0.4rem 0.8rem;
        border-radius: 8px;
        font-weight: 800;
        display: inline-block;
    }
    .score-badge-buena {
        background: linear-gradient(90deg, #064E3B, #581C87);
        border: 1px solid #10B981;
        color: #6EE7B7;
        padding: 0.4rem 0.8rem;
        border-radius: 8px;
        font-weight: 800;
        display: inline-block;
    }
    .score-badge-media {
        background: linear-gradient(90deg, #78350F, #581C87);
        border: 1px solid #F59E0B;
        color: #FCD34D;
        padding: 0.4rem 0.8rem;
        border-radius: 8px;
        font-weight: 800;
        display: inline-block;
    }
    .score-badge-fria {
        background: #1F1B2E;
        border: 1px solid #6B21A8;
        color: #C084FC;
        padding: 0.4rem 0.8rem;
        border-radius: 8px;
        font-weight: 800;
        display: inline-block;
    }
</style>
""", unsafe_allow_html=True)

# Inicialización de variables de estado
if "escaneando" not in st.session_state:
    st.session_state.escaneando = False
if "resultado" not in st.session_state:
    st.session_state.resultado = None
if "token_inegi" not in st.session_state:
    st.session_state.token_inegi = obtener_token_denue() or ""
if "total_gastado_mes" not in st.session_state:
    st.session_state.total_gastado_mes = 0.0
if "extraccion_apify_resultado" not in st.session_state:
    st.session_state.extraccion_apify_resultado = None

# =========================================================
# SIDEBAR DE CONFIGURACIÓN Y PARÁMETROS
# =========================================================
with st.sidebar:
    st.markdown("## 🗺️ LeadScrapper MX")
    st.caption("Inteligencia Comercial y Cuadrículas para México")
    
    st.markdown("### 🏢 Mi base de operaciones")
    mi_estado = st.selectbox(
        "Mi estado",
        ESTADOS_MEXICO,
        index=ESTADOS_MEXICO.index("Ciudad de México") if "Ciudad de México" in ESTADOS_MEXICO else 0,
        key="mi_estado"
    )
    mi_municipio = st.text_input(
        "Mi municipio o alcaldía",
        placeholder="Ej: Iztacalco",
        key="mi_municipio"
    )
    radio_op = st.slider(
        "🎯 Radio de operación (km)",
        1, 30, 8,
        key="radio_op"
    )
    
    st.divider()
    
    st.markdown("### 📍 Zona a explorar")
    estado_busqueda = st.selectbox(
        "Estado *",
        ["-- Selecciona --"] + ESTADOS_MEXICO,
        index=ESTADOS_MEXICO.index("Ciudad de México") + 1 if "Ciudad de México" in ESTADOS_MEXICO else 0,
        key="estado_busqueda"
    )
    municipio_busqueda = st.text_input(
        "Municipio / Alcaldía",
        value="Iztacalco",
        placeholder="Ej: Iztacalco, Guadalajara...",
        key="municipio_busqueda"
    )
    
    st.divider()
    
    st.markdown("### ⚡ Modo de escaneo")
    modo = st.radio(
        "Profundidad de cuadrícula:",
        ["express", "estandar", "completo"],
        format_func=lambda x: {
            "express":   "🚀 Express (5-15 min, ~40%)",
            "estandar":  "🎯 Estándar (20-45 min, ~70%)",
            "completo":  "🔬 Completo (1-3 hrs, ~90%)"
        }[x],
        index=1,
        key="modo_escaneo"
    )
    
    if estado_busqueda != "-- Selecciona --":
        geo = ESTADOS_GEO.get(estado_busqueda, {"lat": 19.4326, "lon": -99.1332, "radio_km": 25})
        radio_zona = radio_op if municipio_busqueda.strip() else geo.get("radio_km", 25)
        est = estimar_antes_de_ejecutar(radio_zona, modo)
        
        st.markdown(f"""
        <div class="metric-card">
            <span style="color:#C084FC;font-size:0.75rem;font-weight:700;">ESTIMACIÓN ANTES DE EJECUTAR</span>
            <div style="font-size:0.85rem;margin-top:0.4rem;color:#E9D5FF;">
                <div>📐 Celdas: <b>{est['num_celdas']}</b></div>
                <div>🏪 Negocios: <b style="color:#22C55E;">~{est['resultados_esperados']:,}</b></div>
                <div>⏱️ Tiempo: <b style="color:#F59E0B;">{est['tiempo_estimado_str']}</b></div>
            </div>
        </div>
        """, unsafe_allow_html=True)
    
    boton_escanear = st.button(
        "⚡ INICIAR ESCANEO DE CUADRÍCULA",
        use_container_width=True,
        type="primary",
        disabled=(estado_busqueda == "-- Selecciona --")
    )

if boton_escanear:
    st.session_state.escaneando = True
    st.session_state.resultado = None

# =========================================================
# NAVEGACIÓN PRINCIPAL: CUADRÍCULAS vs INTELIGENCIA DENUE
# =========================================================
tab_principal1, tab_principal2 = st.tabs([
    "⚡ Escaneo Territorial (Google Maps)",
    "🧠 Inteligencia de Mercado B2B & DENUE INEGI"
])

# ─────────────────────────────────────────────────────────
# TAB 1: ESCANEO DE CUADRÍCULAS (GOOGLE MAPS)
# ─────────────────────────────────────────────────────────
with tab_principal1:
    if st.session_state.get("escaneando"):
        st.markdown(f"## ⚡ Escaneando {municipio_busqueda + ', ' if municipio_busqueda else ''}{estado_busqueda}...")
        st.caption("Subdivisión geodésica con Playwright Stealth sin límite de 120 resultados.")
        
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        col1, col2, col3 = st.columns(3)
        metric_total = col1.empty()
        metric_cats = col2.empty()
        metric_celda = col3.empty()
        
        def actualizar_progreso(data):
            tipo = data.get("tipo", "")
            if tipo == "progreso":
                pct = min(data["porcentaje"] / 100, 1.0)
                progress_bar.progress(pct)
                status_text.markdown(f'<p style="color:#C084FC;">{data["mensaje"]}</p>', unsafe_allow_html=True)
                metric_total.metric("🏪 Negocios únicos", f'{data["total_encontrados"]:,}')
                metric_cats.metric("📂 Categorías", data["categorias_detectadas"])
                metric_celda.metric("📐 Celda", f'{data["celda_actual"]}/{data["total_celdas"]}')

        try:
            res = asyncio.run(
                escanear_zona_completa(
                    estado=estado_busqueda,
                    municipio=municipio_busqueda,
                    radio_km=radio_op,
                    modo=modo,
                    callback=actualizar_progreso
                )
            )
            st.session_state.resultado = res
            st.session_state.escaneando = False
            st.rerun()
        except Exception as e:
            st.error(f"Error en escaneo: {e}")
            st.session_state.escaneando = False

    elif st.session_state.get("resultado"):
        res = st.session_state.resultado
        st.markdown(f"## 📋 Resultados: Radiografía Comercial de {municipio_busqueda or estado_busqueda}")
        
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("🏪 Total Negocios", f"{res['total_negocios_unicos']:,}")
        c2.metric("🏷️ Categorías Reales", res['categorias_unicas'])
        c3.metric("📐 Celdas Procesadas", f"{res['celdas_procesadas']}/{res['celdas_totales']}")
        c4.metric("⏱️ Tiempo Total", f"{res['tiempo_total_seg']}s")
        
        # Tabla de categorías
        df_cats = pd.DataFrame(res["categorias"])
        st.dataframe(df_cats, use_container_width=True)

        # ── SECCIÓN DE EXTRACCIÓN CON APIFY (COMPASS/CRAWLER-GOOGLE-PLACES) ──
        st.divider()
        st.markdown("### ⚡ Extracción Masiva con Apify (`compass/crawler-google-places`)")
        st.caption("Extrae directamente desde Google Maps con soporte para dos categorías simultáneas, deduplicación y separación por canal de contacto.")

        # Obtener lista de categorías disponibles del escaneo
        cats_disponibles = [c.get("categoria", "") for c in res.get("categorias", []) if c.get("categoria")]
        if not cats_disponibles:
            cats_disponibles = ["Hospitales", "Talleres mecánicos", "Refaccionarias", "Restaurantes", "Escuelas"]

        col_ap1, col_ap2, col_ap3 = st.columns([4, 4, 2])
        with col_ap1:
            cat_input_1 = st.selectbox(
                "CATEGORÍA 1:",
                options=cats_disponibles,
                index=0,
                key="apify_sel_cat1"
            )
        with col_ap2:
            cat_input_2 = st.text_input(
                "CATEGORÍA 2 (OPCIONAL):",
                placeholder="Ej: Clínicas privadas",
                help="Opcional — combina dos búsquedas en una sola extracción",
                key="apify_input_cat2"
            )
        with col_ap3:
            st.write("")
            st.write("")
            btn_ejecutar_apify = st.button("⚡ Extraer con Apify", use_container_width=True, type="primary")

        geo = ESTADOS_GEO.get(estado_busqueda, {"lat": 19.4326, "lon": -99.1332})
        lat_base, lon_base = geo["lat"], geo["lon"]
        if municipio_busqueda.strip():
            lat_mun, lon_mun, _ = geocodificar_municipio(municipio_busqueda, estado_busqueda)
            if lat_mun and lon_mun:
                lat_base, lon_base = lat_mun, lon_mun

        if btn_ejecutar_apify:
            with st.spinner(f"Llamando al actor compass/crawler-google-places de Apify para '{cat_input_1}'{' y ' + cat_input_2 if cat_input_2.strip() else ''} en {municipio_busqueda or estado_busqueda}..."):
                res_ap = ejecutar_extraccion_apify(
                    cat1=cat_input_1,
                    cat2=cat_input_2.strip() or None,
                    municipio=municipio_busqueda,
                    estado=estado_busqueda,
                    base_lat=lat_base,
                    base_lon=lon_base
                )
                st.session_state.extraccion_apify_resultado = res_ap
                st.session_state.total_gastado_mes = round(st.session_state.total_gastado_mes + res_ap["costo_usd"], 2)

        if st.session_state.get("extraccion_apify_resultado"):
            ap_data = st.session_state.extraccion_apify_resultado
            tot_reg = ap_data["total_registros"]
            con_em = ap_data["con_email"]
            sin_em = ap_data["sin_email"]
            pct_em = round((len(con_em) / tot_reg) * 100) if tot_reg > 0 else 0
            pct_sin = round((len(sin_em) / tot_reg) * 100) if tot_reg > 0 else 0
            costo_ext = ap_data["costo_usd"]
            gastado_mes = st.session_state.total_gastado_mes
            disp_mes = max(0.0, round(5.00 - gastado_mes, 2))

            # MEJORA 2: TARJETA DE RESUMEN DE COSTOS
            st.markdown(f"""
            <div style="background:#0F0A1E; border:2px solid #F59E0B; border-radius:12px; padding:18px; margin:16px 0; font-family:monospace;">
                <div style="color:#FBBF24; font-weight:bold; font-size:1.15rem; margin-bottom:10px;">💰 RESUMEN DE ESTA EXTRACCIÓN</div>
                <div style="color:#E9D5FF; font-size:0.95rem; line-height:1.7;">
                    Registros extraídos: &nbsp;&nbsp;&nbsp;&nbsp; <b>{tot_reg}</b><br>
                    Con email: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>{len(con_em)} ({pct_em}%)</b><br>
                    Sin email: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>{len(sin_em)} ({pct_sin}%)</b><br><br>
                    Costo de esta extracción: <b>~${costo_ext:.2f} USD</b><br>
                    Créditos usados este mes: <b>${gastado_mes:.2f} USD</b><br>
                    Créditos disponibles: &nbsp;&nbsp;&nbsp;&nbsp; <b>${disp_mes:.2f} USD</b><br>
                    <span style="color:#9CA3AF; font-size:0.8rem;">(de $5.00 USD mensuales gratuitos)</span>
                </div>
            </div>
            """, unsafe_allow_html=True)

            if disp_mes < 1.00:
                st.warning("⚠️ Te quedan menos de $1 USD de crédito este mes. Úsalo con cuidado.")

            # NOTA IMPORTANTE EN LA INTERFAZ (MEJORA 3)
            st.info("📌 **Nota importante:** Ambos grupos son prospectos a visitar. El grupo **CON email** recibe además campaña digital. El grupo **SIN email** es visita presencial directa.")

            # MEJORA 3: DOS TABS
            tab_em, tab_vis = st.tabs([f"📧 Con email ({len(con_em)})", f"🚶 Visitar en persona ({len(sin_em)})"])

            with tab_em:
                if con_em:
                    df_em = pd.DataFrame([{
                        "Nombre": r["nombre"],
                        "Categoría": r["categoria"],
                        "Email": r["email"],
                        "Teléfono": r["telefono"],
                        "Dirección": r["direccion"],
                        "Link GPS": r["link_gps"],
                        "Web": r["web"],
                        "Origen": r["origen"]
                    } for r in con_em])

                    st.dataframe(
                        df_em,
                        column_config={
                            "Link GPS": st.column_config.LinkColumn("Link GPS", display_text="🧭 Ir")
                        },
                        use_container_width=True
                    )

                    c_btn1, c_btn2 = st.columns(2)
                    with c_btn1:
                        # CSV para campaña de email (con columna Link_GPS)
                        csv_em = df_em.rename(columns={"Link GPS": "Link_GPS"}).to_csv(index=False).encode('utf-8')
                        st.download_button(
                            "📥 CSV para campaña de email",
                            data=csv_em,
                            file_name=f"apify_campana_email_{municipio_busqueda or estado_busqueda}.csv",
                            mime="text/csv",
                            use_container_width=True
                        )
                    with c_btn2:
                        # CSV para SenderPlus (solo columnas: nombre, teléfono)
                        df_sp = pd.DataFrame([{"Nombre": r["nombre"], "Teléfono": r["telefono"]} for r in con_em])
                        csv_sp = df_sp.to_csv(index=False).encode('utf-8')
                        st.download_button(
                            "📱 CSV para SenderPlus",
                            data=csv_sp,
                            file_name=f"senderplus_{municipio_busqueda or estado_busqueda}.csv",
                            mime="text/csv",
                            use_container_width=True
                        )
                else:
                    st.caption("No se encontraron registros con correo público para esta búsqueda.")

            with tab_vis:
                if sin_em:
                    df_vis = pd.DataFrame([{
                        "#": idx + 1,
                        "Nombre": r["nombre"],
                        "Categoría": r["categoria"],
                        "Teléfono": r["telefono"],
                        "Colonia": r["colonia"],
                        "Distancia": f"{r['distancia_km']} km",
                        "Link GPS": r["link_gps"],
                        "Origen": r["origen"]
                    } for idx, r in enumerate(sin_em)])

                    st.dataframe(
                        df_vis,
                        column_config={
                            "Link GPS": st.column_config.LinkColumn("Link GPS", display_text="🧭 Ir")
                        },
                        use_container_width=True
                    )

                    c_v1, c_v2 = st.columns(2)
                    with c_v1:
                        # CSV de ruta de visitas (con columna Link_GPS)
                        csv_vis = df_vis.rename(columns={"Link GPS": "Link_GPS"}).to_csv(index=False).encode('utf-8')
                        st.download_button(
                            "📥 CSV de ruta de visitas",
                            data=csv_vis,
                            file_name=f"apify_ruta_visitas_{municipio_busqueda or estado_busqueda}.csv",
                            mime="text/csv",
                            use_container_width=True
                        )
                    with c_v2:
                        ver_mapa_apify = st.toggle("🗺️ Ver todos en mapa", value=False, key="toggle_mapa_apify_visitas")

                    if ver_mapa_apify:
                        import folium
                        from streamlit_folium import st_folium
                        m_ap = folium.Map(location=[lat_base, lon_base], zoom_start=12, tiles="OpenStreetMap")
                        folium.Marker([lat_base, lon_base], popup="⭐ Tu Base de Operaciones", icon=folium.Icon(color="purple", icon="star", prefix="fa")).add_to(m_ap)
                        for r in sin_em:
                            if r.get("lat") and r.get("lon"):
                                folium.Marker(
                                    [r["lat"], r["lon"]],
                                    popup=folium.Popup(f"<b>{r['nombre']}</b><br>{r['categoria']}<br>📞 {r['telefono']}<br><a href='{r['link_gps']}' target='_blank'>🧭 Ir</a>", max_width=250),
                                    tooltip=f"{r['nombre']} ({r['distancia_km']} km)",
                                    icon=folium.Icon(color="blue", icon="info-sign")
                                ).add_to(m_ap)
                        st_folium(m_ap, width=None, height=420, key="st_folium_apify_visitas")
                else:
                    st.caption("No se encontraron registros para visitas presenciales en esta búsqueda.")

        # ── MAPA INTERACTIVO FOLIUM: MODO 2 (NEGOCIOS ENCONTRADOS) ──
        st.divider()
        st.markdown("### 🗺️ Mapa de Calor y Base (Modo 2: Negocios Encontrados)")
        st.caption("Pines individuales por categoría con OpenStreetMap (gratuito, sin API key). Sin burbujas ni cuadrículas.")

        geo = ESTADOS_GEO.get(estado_busqueda, {"lat": 19.4326, "lon": -99.1332})
        lat_base, lon_base = geo["lat"], geo["lon"]
        if municipio_busqueda.strip():
            lat_mun, lon_mun, _ = geocodificar_municipio(municipio_busqueda, estado_busqueda)
            if lat_mun and lon_mun:
                lat_base, lon_base = lat_mun, lon_mun

        try:
            import folium
            from streamlit_folium import st_folium

            # OpenStreetMap: Gratuito, público y sin requerimiento de API key
            m = folium.Map(
                location=[lat_base, lon_base],
                zoom_start=12,
                tiles="OpenStreetMap"
            )

            # ⭐ Tu base de operaciones: estrella dorada
            folium.Marker(
                [lat_base, lon_base],
                popup=f"""
                <div style="font-family: Arial, sans-serif; padding: 4px;">
                    <div style="font-size: 13px; font-weight: bold; color: #D97706;">⭐ Tu Base de Operaciones</div>
                    <div style="font-size: 11px; margin-top: 2px;">{municipio_busqueda or estado_busqueda}</div>
                    <div style="font-size: 11px; color: #7C3AED; font-weight: bold; margin-top: 2px;">Radio: {radio_op} km</div>
                </div>
                """,
                tooltip="⭐ Tu Base de Operaciones",
                icon=folium.Icon(color="purple", icon_color="#FEF08A", icon="star", prefix="fa")
            ).add_to(m)

            # Clasificación de categorías para pines en Modo 2
            def clasificar_pin_modo2(categoria: str, nombre: str):
                txt = f"{categoria} {nombre}".lower()
                # 1. Hospitales/clínicas: rojo 🔴
                if any(k in txt for k in ["hospital", "clínic", "clinic", "médic", "medic", "salud", "sanatorio", "doctor", "farmacia", "laboratorio", "consultorio", "urgencias"]):
                    return {"color": "red", "hex": "#EF4444", "icono": "plus", "label": "Hospital / Clínica"}
                # 2. Reparto/logística: azul 🔵
                elif any(k in txt for k in ["reparto", "logístic", "logistic", "paqueter", "mensajer", "transporte", "flete", "mudanza", "envío", "envio", "delivery", "carga"]):
                    return {"color": "blue", "hex": "#3B82F6", "icono": "truck", "label": "Reparto / Logística"}
                # 3. Industria/flotillas: amarillo 🟡
                elif any(k in txt for k in ["industr", "flotilla", "fábrica", "fabrica", "manufact", "bodega", "almacén", "almacen", "construct", "acero", "perfil", "maquinaria", "distribuidora", "concreto", "ferreter", "tlapaler"]):
                    return {"color": "beige", "hex": "#EAB308", "icono": "cog", "label": "Industria / Flotillas"}
                # 4. Competencia automotriz: naranja 🟠
                elif any(k in txt for k in ["automot", "mecánic", "mecanic", "taller", "refacc", "llant", "agencia", "auto", "freno", "hojalat", "suspensi", "parabrisa", "vidrier", "vulcaniz", "moto"]):
                    return {"color": "orange", "hex": "#F97316", "icono": "wrench", "label": "Competencia Automotriz"}
                return {"color": "darkpurple", "hex": "#8B5CF6", "icono": "tag", "label": categoria or "Comercio"}

            # MODO 2: Un pin por cada negocio encontrado. Sin burbujas ni cuadrículas.
            registros = res.get("todos_los_registros", [])
            for reg in registros:
                lat = reg.get("lat_aprox")
                lon = reg.get("lon_aprox")
                nom = reg.get("nombre", "Negocio")
                cat = reg.get("categoria", "Comercio")
                tel = reg.get("telefono", "Sin teléfono")
                direccion = reg.get("direccion", f"{municipio_busqueda or estado_busqueda}, México")

                if lat and lon:
                    cfg = clasificar_pin_modo2(cat, nom)
                    link_gps = f"https://www.google.com/maps/dir/?api=1&destination={lat},{lon}"
                    clean_tel = tel.replace("'", "")

                    popup_html = f"""
                    <div style="font-family: Arial, sans-serif; min-width: 210px; max-width: 250px; padding: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <span style="font-size: 10px; font-weight: bold; color: {cfg['hex']}; background: #F3F4F6; padding: 2px 6px; border-radius: 4px;">
                                {cfg['label']}
                            </span>
                        </div>
                        <div style="font-weight: bold; font-size: 13px; color: #111827; margin-bottom: 3px;">
                            {nom}
                        </div>
                        <div style="font-size: 11px; color: #4B5563; margin-bottom: 6px;">
                            📍 {direccion}
                        </div>
                        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 4px 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 11px; font-family: monospace; font-weight: bold; color: #1F2937;">📞 {tel}</span>
                            <button onclick="navigator.clipboard.writeText('{clean_tel}'); this.innerText='✓ Copiado'; setTimeout(() => this.innerText='Copiar', 2000);" style="background: #4B5563; color: white; border: none; font-size: 10px; padding: 2px 6px; border-radius: 4px; cursor: pointer;">
                                Copiar
                            </button>
                        </div>
                        <a href="{link_gps}" target="_blank" style="display: block; background: #10B981; color: white; text-align: center; font-size: 11px; font-weight: bold; padding: 6px 10px; border-radius: 6px; text-decoration: none;">
                            🧭 Ir (Navegación GPS)
                        </a>
                    </div>
                    """

                    folium.Marker(
                        [lat, lon],
                        popup=folium.Popup(popup_html, max_width=270),
                        tooltip=f"{nom} ({cat})",
                        icon=folium.Icon(color=cfg["color"], icon=cfg["icono"], prefix="fa")
                    ).add_to(m)

            st_folium(m, width=None, height=500)

            # Leyenda de pines de Modo 2
            st.markdown("""
            <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; margin-top: 8px; color: #E9D5FF;">
                <span><b>Leyenda:</b></span>
                <span>🔴 Hospitales / clínicas</span>
                <span>🔵 Reparto / logística</span>
                <span>🟡 Industria / flotillas</span>
                <span>🟠 Competencia automotriz</span>
                <span>⭐ Base de operaciones</span>
            </div>
            """, unsafe_allow_html=True)

            # ── DIRECTORIO DE LEADS (COLUMNAS OFICIALES) ──
            st.divider()
            registros_leads = res.get("todos_los_registros", [])
            st.markdown(f"### 👥 Directorio de Leads ({len(registros_leads)} registros)")
            st.caption("Columnas obligatorias: **Nombre | Categoría | Teléfono | Dirección | Link GPS**")

            filas_leads = []
            sin_nombre_total = 0
            for reg in registros_leads:
                nom_raw = (reg.get("nombre") or reg.get("nombre_negocio") or "").strip()
                if not nom_raw or nom_raw.lower() in ["sin nombre", "n/a", "none"]:
                    nom_disp = "⚠️ Sin nombre"
                    sin_nombre_total += 1
                else:
                    nom_disp = nom_raw
                
                cat_disp = reg.get("categoria", "Comercio")
                tel_disp = reg.get("telefono", "Sin teléfono")
                dir_disp = reg.get("direccion", f"{municipio_busqueda or estado_busqueda}, México")
                
                lat_reg = reg.get("lat_aprox") or reg.get("lat")
                lon_reg = reg.get("lon_aprox") or reg.get("lon")
                if lat_reg and lon_reg:
                    link_gps = f"https://www.google.com/maps/dir/?api=1&destination={lat_reg},{lon_reg}"
                else:
                    dir_enc = urllib.parse.quote(dir_disp)
                    link_gps = f"https://www.google.com/maps/dir/?api=1&destination={dir_enc}"

                filas_leads.append({
                    "Nombre": nom_disp,
                    "Categoría": cat_disp,
                    "Teléfono": tel_disp,
                    "Dirección": dir_disp,
                    "Link GPS": link_gps
                })

            if sin_nombre_total > 0:
                st.error(f"⚠️ Se detectaron **{sin_nombre_total} registros sin nombre** en el scraper. Aparecen resaltados como '⚠️ Sin nombre' fila por fila.")

            df_leads_dir = pd.DataFrame(filas_leads)
            if not df_leads_dir.empty:
                st.dataframe(
                    df_leads_dir,
                    column_config={
                        "Nombre": st.column_config.TextColumn("Nombre"),
                        "Categoría": st.column_config.TextColumn("Categoría"),
                        "Teléfono": st.column_config.TextColumn("Teléfono"),
                        "Dirección": st.column_config.TextColumn("Dirección"),
                        "Link GPS": st.column_config.LinkColumn("Link GPS", display_text="🧭 Ir")
                    },
                    use_container_width=True
                )

                csv_leads = df_leads_dir.rename(columns={"Link GPS": "Link_GPS"}).to_csv(index=False).encode('utf-8')
                st.download_button(
                    "📥 Descargar Directorio de Leads (.csv)",
                    data=csv_leads,
                    file_name=f"directorio_leads_{municipio_busqueda or estado_busqueda}.csv",
                    mime="text/csv",
                    use_container_width=True
                )

            # Cuadrículas de escaneo disponibles como referencia
            with st.expander("📐 Ver Cuadrículas de Escaneo (Modo 1 - Referencia)"):
                m_grid = folium.Map(location=[lat_base, lon_base], zoom_start=11, tiles="OpenStreetMap")
                folium.Marker([lat_base, lon_base], popup="⭐ Base", icon=folium.Icon(color="purple", icon="star", prefix="fa")).add_to(m_grid)
                folium.Circle([lat_base, lon_base], radius=radio_op * 1000, color="#9333EA", fill=True, fill_opacity=0.08).add_to(m_grid)
                st_folium(m_grid, width=None, height=350, key="mapa_ref_cuadriculas")

        except Exception as e:
            st.info(f"💡 Mapa interactivo Folium con OpenStreetMap disponible. ({e})")
    else:
        st.info("👈 Configura tu zona territorial y haz clic en **'INICIAR ESCANEO DE CUADRÍCULA'** en la barra lateral.")
        st.markdown("""
        ### ¿Cómo funciona el escaneo de cuadrículas?
        1. **Supera el límite de 120 resultados**: Google Maps trunca las búsquedas a 120 negocios. LeadScrapper divide la zona en cuadrículas con solapamiento geográfico calibrado.
        2. **Rotación multi-término**: Escanea vidrierías, talleres, materiales, constructoras, servicios y comercios.
        3. **Categorías 100% auténticas**: Extrae las categorías exactas de Google Maps sin agruparlas arbitrariamente.
        """)

# ─────────────────────────────────────────────────────────
# TAB 2: MÓDULO DE INTELIGENCIA B2B & DENUE INEGI
# Funciona aunque no se haya ejecutado el escaneo primero
# ─────────────────────────────────────────────────────────
with tab_principal2:
    st.markdown("## 🧠 Reporte de Inteligencia de Mercado Territorial")
    st.caption("Evaluación de Oportunidad B2B y Análisis de Competencia con la API Oficial del DENUE del INEGI.")
    
    # Token config opcional
    with st.expander("🔑 Configuración de Token DENUE INEGI (Opcional)"):
        st.markdown("""
        El INEGI proporciona un token gratuito para acceder a su base de datos de más de 5 millones de establecimientos en México.
        Puedes tramitar tu token gratis en: [https://www.inegi.org.mx/app/api/denue/v1/consulta/](https://www.inegi.org.mx/app/api/denue/v1/consulta/)
        *(Si no introduces un token, la aplicación usará registros territoriales calibrados de alta precisión).*
        """)
        token_input = st.text_input(
            "Token de la API DENUE:",
            value=st.session_state.token_inegi,
            placeholder="Pega aquí tu token INEGI..."
        )
        if st.button("Guardar Token"):
            st.session_state.token_inegi = token_input.strip()
            st.success("¡Token guardado exitosamente!")

    # Geocodificación para la zona seleccionada
    est_selected = estado_busqueda if estado_busqueda != "-- Selecciona --" else "Ciudad de México"
    mun_selected = municipio_busqueda if municipio_busqueda.strip() else "Iztacalco"
    lat_zona, lon_zona, _ = geocodificar_municipio(mun_selected, est_selected)

    # MEJORA 1: Slider de cobertura DENUE (3, 5, 10, 15 km) con default 10 km
    col_rad1, col_rad2 = st.columns([2, 1])
    with col_rad1:
        radio_denue_km = st.select_slider(
            "🎯 Radio de búsqueda DENUE (km):",
            options=[3, 5, 10, 15],
            value=10,
            help="Selecciona el radio geodésico de cobertura para extraer prospectos del DENUE."
        )
    with col_rad2:
        st.caption(f"📍 Cobertura actual: **{radio_denue_km} km** a la redonda")

    # Generación de reporte de inteligencia
    with st.spinner(f"Consultando DENUE de INEGI para {mun_selected}, {est_selected} ({radio_denue_km} km)..."):
        rep = generar_reporte_inteligencia(
            estado=est_selected,
            municipio=mun_selected,
            lat=lat_zona,
            lon=lon_zona,
            token_inegi=st.session_state.token_inegi or None,
            radio_km=radio_denue_km
        )

    # ── MEJORA 3: COMPARATIVA DE ZONAS ──
    with st.expander("📊 Comparar con otra zona (Decisión Semanal de Prospección)", expanded=False):
        st.markdown("Compara dos municipios para decidir en qué territorio prospectar cada semana según el score comparativo.")
        col_c1, col_c2, col_c3 = st.columns([2, 2, 1])
        with col_c1:
            segundo_mun = st.text_input("Segundo Municipio a comparar:", value="Iztapalapa" if mun_selected.lower() != "iztapalapa" else "Benito Juárez")
        with col_c2:
            segundo_est = st.selectbox("Estado del segundo municipio:", options=list(ESTADOS_GEO.keys()), index=list(ESTADOS_GEO.keys()).index(est_selected) if est_selected in ESTADOS_GEO else 0)
        with col_c3:
            st.write("")
            st.write("")
            btn_comp = st.button("⚡ Comparar")

        if btn_comp or "comp_res" in st.session_state:
            lat2, lon2, _ = geocodificar_municipio(segundo_mun, segundo_est)
            with st.spinner(f"Calculando Score de Oportunidad para {segundo_mun}..."):
                rep2 = generar_reporte_inteligencia(segundo_est, segundo_mun, lat2, lon2, st.session_state.token_inegi or None, radio_km=radio_denue_km)
            
            recom1 = "🔥 Caliente" if rep['SCORE_OPORTUNIDAD'] >= 8 else "⚡ Buena" if rep['SCORE_OPORTUNIDAD'] >= 5 else "🟡 Media"
            recom2 = "🔥 Caliente" if rep2['SCORE_OPORTUNIDAD'] >= 8 else "⚡ Buena" if rep2['SCORE_OPORTUNIDAD'] >= 5 else "🟡 Media"

            df_comp = pd.DataFrame([
                {"Indicador": "Score total", mun_selected: f"{rep['SCORE_OPORTUNIDAD']}/10", segundo_mun: f"{rep2['SCORE_OPORTUNIDAD']}/10"},
                {"Indicador": "Hospitales", mun_selected: len(rep['PROSPECTOS_B2B']['hospitales']), segundo_mun: len(rep2['PROSPECTOS_B2B']['hospitales'])},
                {"Indicador": "Empresas reparto", mun_selected: len(rep['PROSPECTOS_B2B']['empresas_reparto']), segundo_mun: len(rep2['PROSPECTOS_B2B']['empresas_reparto'])},
                {"Indicador": "Flotillas", mun_selected: len(rep['PROSPECTOS_B2B']['empresas_flotilla']), segundo_mun: len(rep2['PROSPECTOS_B2B']['empresas_flotilla'])},
                {"Indicador": "Competencia autos", mun_selected: len(rep['COMPETENCIA']), segundo_mun: len(rep2['COMPETENCIA'])},
                {"Indicador": "Recomendación", mun_selected: recom1, segundo_mun: recom2}
            ])
            st.dataframe(df_comp, use_container_width=True)

            ganadora = mun_selected if rep['SCORE_OPORTUNIDAD'] >= rep2['SCORE_OPORTUNIDAD'] else segundo_mun
            st.success(f"🎯 **Recomendación Semanal:** Se recomienda trabajar prioritariamente en **{ganadora}** con un Score de {max(rep['SCORE_OPORTUNIDAD'], rep2['SCORE_OPORTUNIDAD'])}/10.")

    # 1. SCORE DE OPORTUNIDAD Y BADGE
    col_score, col_links = st.columns([1, 1])
    
    with col_score:
        score_val = rep["SCORE_OPORTUNIDAD"]
        st.markdown(f"""
        <div class="metric-card" style="text-align: center;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #C084FC;">SCORE DE OPORTUNIDAD TERRITORIAL</div>
            <div style="font-size: 3.5rem; font-weight: 900; color: white; margin: 0.2rem 0;">{score_val}/10</div>
            <div style="font-size: 0.95rem; font-weight: 800; color: {'#F97316' if score_val >= 8 else '#10B981' if score_val >= 5 else '#F59E0B'};">
                {rep['INTERPRETACION_SCORE']}
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("#### 📌 Desglose de Factores Evaluados:")
        for punto in rep.get("DESGLOSE_PUNTOS", []):
            st.markdown(f"• **{punto}**")
            
    with col_links:
        st.markdown("#### 🔗 Enlaces Georreferenciados Oficiales:")
        st.markdown(f"""
        - 🏥 **[Mapa Interactivo DENUE - Hospitales y Clínicas]({rep['LINKS_UTILES']['denue_hospitales']})**
        - 🚚 **[Mapa Interactivo DENUE - Transporte y Logística]({rep['LINKS_UTILES']['denue_transporte']})**
        - 🎓 **[Mapa Interactivo DENUE - Educación y Despachos]({rep['LINKS_UTILES'].get('denue_educacion', 'https://www.inegi.org.mx/app/mapa/denue/default.aspx?q=escuela')})**
        - 🍽️ **[Mapa Interactivo DENUE - Restaurantes y Plazas]({rep['LINKS_UTILES'].get('denue_restaurantes', 'https://www.inegi.org.mx/app/mapa/denue/default.aspx?q=restaurante')})**
        - 🏛️ **[Mapa Interactivo DENUE - Gobierno y Servicios]({rep['LINKS_UTILES'].get('denue_gobierno', 'https://www.inegi.org.mx/app/mapa/denue/default.aspx?q=alcaldia')})**
        - 📊 **[INEGI Espacio y Datos - Nivel Socioeconómico (NSE)]({rep['LINKS_UTILES']['inegi_nse']})**
        - 🚗 **[Google Maps - Agencias Automotrices Competidoras]({rep['LINKS_UTILES']['google_maps_competencia']})**
        """)
        
        st.info(f"📍 Zona geocodificada en: **Lat {lat_zona:.4f}, Lon {lon_zona:.4f}** (Radio de 5 km). Cobertura comercial: RAM utilitarios + Autos de pasajeros (Jeep, Peugeot, Dodge, Fiat).")

    st.divider()

    # 2. PROSPECTOS B2B
    st.markdown("### 👥 Directorio de Prospectos B2B en Radio de 5km (Flotillas & Pasajeros)")
    
    subtab1, subtab2, subtab3, subtab4, subtab5, subtab6, subtab7 = st.tabs([
        f"🏥 Hospitales ({len(rep['PROSPECTOS_B2B']['hospitales'])})",
        f"🚚 Reparto ({len(rep['PROSPECTOS_B2B']['empresas_reparto'])})",
        f"🏗️ Flotillas ({len(rep['PROSPECTOS_B2B']['empresas_flotilla'])})",
        f"🎓 Educación ({len(rep['PROSPECTOS_B2B']['educacion_profesionistas'])})",
        f"🍽️ Restaurantes ({len(rep['PROSPECTOS_B2B']['restaurantes_comercio'])})",
        f"🏛️ Gobierno ({len(rep['PROSPECTOS_B2B']['gobierno_servicios'])})",
        f"🚗 Competencia ({len(rep['COMPETENCIA'])})"
    ])
    
    with subtab1:
        for item in rep['PROSPECTOS_B2B']['hospitales']:
            gps_link = item.get('link_gps') or f"https://www.google.com/maps/dir/?api=1&destination={urllib.parse.quote_plus(item['direccion'])}"
            st.markdown(f"""
            <div class="intel-card">
                <b>🏥 {item['nombre']}</b> ({item['distancia_km']} km)<br>
                <span style="font-size:0.8rem;color:#C084FC;">Giro: {item['actividad']}</span><br>
                <span style="font-size:0.75rem;background:#3B1F6E;padding:2px 8px;border-radius:6px;color:#E9D5FF;">Enfoque: {item.get('enfoque_vehiculo', 'Médicos / Flotillas')}</span><br>
                <span style="font-size:0.85rem;color:#22C55E;">📞 {item['telefono']}</span> | 
                <span style="font-size:0.85rem;color:#E9D5FF;">📍 {item['direccion']}</span><br>
                <a href="{gps_link}" target="_blank" style="background:#9333EA;color:white;padding:3px 10px;border-radius:6px;text-decoration:none;font-size:0.75rem;font-weight:700;display:inline-block;margin-top:6px;">🧭 Ir</a>
            </div>
            """, unsafe_allow_html=True)
            
    with subtab2:
        for item in rep['PROSPECTOS_B2B']['empresas_reparto']:
            gps_link = item.get('link_gps') or f"https://www.google.com/maps/dir/?api=1&destination={urllib.parse.quote_plus(item['direccion'])}"
            st.markdown(f"""
            <div class="intel-card">
                <b>🚚 {item['nombre']}</b> ({item['distancia_km']} km)<br>
                <span style="font-size:0.8rem;color:#C084FC;">Giro: {item['actividad']}</span><br>
                <span style="font-size:0.75rem;background:#3B1F6E;padding:2px 8px;border-radius:6px;color:#E9D5FF;">Enfoque: {item.get('enfoque_vehiculo', 'Comercial / RAM')}</span><br>
                <span style="font-size:0.85rem;color:#22C55E;">📞 {item['telefono']}</span> | 
                <span style="font-size:0.85rem;color:#E9D5FF;">📍 {item['direccion']}</span><br>
                <a href="{gps_link}" target="_blank" style="background:#9333EA;color:white;padding:3px 10px;border-radius:6px;text-decoration:none;font-size:0.75rem;font-weight:700;display:inline-block;margin-top:6px;">🧭 Ir</a>
            </div>
            """, unsafe_allow_html=True)
            
    with subtab3:
        for item in rep['PROSPECTOS_B2B']['empresas_flotilla']:
            gps_link = item.get('link_gps') or f"https://www.google.com/maps/dir/?api=1&destination={urllib.parse.quote_plus(item['direccion'])}"
            st.markdown(f"""
            <div class="intel-card">
                <b>🏗️ {item['nombre']}</b> ({item['distancia_km']} km)<br>
                <span style="font-size:0.8rem;color:#C084FC;">Giro: {item['actividad']}</span><br>
                <span style="font-size:0.75rem;background:#3B1F6E;padding:2px 8px;border-radius:6px;color:#E9D5FF;">Enfoque: {item.get('enfoque_vehiculo', 'Heavy Duty & Pick-ups')}</span><br>
                <span style="font-size:0.85rem;color:#22C55E;">📞 {item['telefono']}</span> | 
                <span style="font-size:0.85rem;color:#E9D5FF;">📍 {item['direccion']}</span><br>
                <a href="{gps_link}" target="_blank" style="background:#9333EA;color:white;padding:3px 10px;border-radius:6px;text-decoration:none;font-size:0.75rem;font-weight:700;display:inline-block;margin-top:6px;">🧭 Ir</a>
            </div>
            """, unsafe_allow_html=True)

    with subtab4:
        for item in rep['PROSPECTOS_B2B']['educacion_profesionistas']:
            gps_link = item.get('link_gps') or f"https://www.google.com/maps/dir/?api=1&destination={urllib.parse.quote_plus(item['direccion'])}"
            st.markdown(f"""
            <div class="intel-card">
                <b>🎓 {item['nombre']}</b> ({item['distancia_km']} km)<br>
                <span style="font-size:0.8rem;color:#C084FC;">Giro: {item['actividad']}</span><br>
                <span style="font-size:0.75rem;background:#581C87;padding:2px 8px;border-radius:6px;color:#F3E8FF;">Enfoque: Autos Pasajeros (Jeep, Peugeot, Dodge, Fiat)</span><br>
                <span style="font-size:0.85rem;color:#22C55E;">📞 {item['telefono']}</span> | 
                <span style="font-size:0.85rem;color:#E9D5FF;">📍 {item['direccion']}</span><br>
                <a href="{gps_link}" target="_blank" style="background:#9333EA;color:white;padding:3px 10px;border-radius:6px;text-decoration:none;font-size:0.75rem;font-weight:700;display:inline-block;margin-top:6px;">🧭 Ir</a>
            </div>
            """, unsafe_allow_html=True)

    with subtab5:
        for item in rep['PROSPECTOS_B2B']['restaurantes_comercio']:
            gps_link = item.get('link_gps') or f"https://www.google.com/maps/dir/?api=1&destination={urllib.parse.quote_plus(item['direccion'])}"
            st.markdown(f"""
            <div class="intel-card">
                <b>🍽️ {item['nombre']}</b> ({item['distancia_km']} km)<br>
                <span style="font-size:0.8rem;color:#C084FC;">Giro: {item['actividad']}</span><br>
                <span style="font-size:0.75rem;background:#7C2D12;padding:2px 8px;border-radius:6px;color:#FED7AA;">Enfoque: Utilitarios & Carga Ligera (RAM 700 / Vans)</span><br>
                <span style="font-size:0.85rem;color:#22C55E;">📞 {item['telefono']}</span> | 
                <span style="font-size:0.85rem;color:#E9D5FF;">📍 {item['direccion']}</span><br>
                <a href="{gps_link}" target="_blank" style="background:#9333EA;color:white;padding:3px 10px;border-radius:6px;text-decoration:none;font-size:0.75rem;font-weight:700;display:inline-block;margin-top:6px;">🧭 Ir</a>
            </div>
            """, unsafe_allow_html=True)

    with subtab6:
        for item in rep['PROSPECTOS_B2B']['gobierno_servicios']:
            gps_link = item.get('link_gps') or f"https://www.google.com/maps/dir/?api=1&destination={urllib.parse.quote_plus(item['direccion'])}"
            st.markdown(f"""
            <div class="intel-card">
                <b>🏛️ {item['nombre']}</b> ({item['distancia_km']} km)<br>
                <span style="font-size:0.8rem;color:#C084FC;">Giro: {item['actividad']}</span><br>
                <span style="font-size:0.75rem;background:#134E4A;padding:2px 8px;border-radius:6px;color:#99F6E4;">Enfoque: RAM ProMaster / Patrullaje / Seguridad</span><br>
                <span style="font-size:0.85rem;color:#22C55E;">📞 {item['telefono']}</span> | 
                <span style="font-size:0.85rem;color:#E9D5FF;">📍 {item['direccion']}</span><br>
                <a href="{gps_link}" target="_blank" style="background:#9333EA;color:white;padding:3px 10px;border-radius:6px;text-decoration:none;font-size:0.75rem;font-weight:700;display:inline-block;margin-top:6px;">🧭 Ir</a>
            </div>
            """, unsafe_allow_html=True)

    with subtab7:
        for item in rep['COMPETENCIA']:
            gps_link = item.get('link_gps') or f"https://www.google.com/maps/dir/?api=1&destination={urllib.parse.quote_plus(item['nombre'] + ' ' + mun_selected + ' ' + est_selected)}"
            st.markdown(f"""
            <div class="intel-card">
                <b>🚗 {item['nombre']}</b> (Marca: {item['marca_estimada']}) - {item['distancia_km']} km<br>
                <a href="{gps_link}" target="_blank" style="background:#9333EA;color:white;padding:3px 10px;border-radius:6px;text-decoration:none;font-size:0.75rem;font-weight:700;display:inline-block;margin-top:6px;margin-right:8px;">🧭 Ir</a>
                <a href="{item['link_maps']}" target="_blank" style="color:#C084FC;text-decoration:underline;font-size:0.8rem;">Ver ficha en Google Maps ↗</a>
            </div>
            """, unsafe_allow_html=True)

st.markdown("---")
st.caption("LeadScrapper MX © 2026 - Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).")
