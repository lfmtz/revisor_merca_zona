"""
LeadScrapper MX - Scraper Engine
Extracción de Google Maps con Playwright asíncrono, modo stealth y selectores robustos en cascada.
"""
import asyncio
import random
import re
import urllib.parse
from datetime import datetime
from fake_useragent import UserAgent
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async

from geo_filter import validate_mexico_address
from data_processor import clean_phone, build_nav_link
from query_builder import build_search_query


async def extract_leads(
    business_type: str,
    estado: str,
    municipio: str = "",
    max_results: int = 200,
    delay_min: float = 3.0,
    delay_max: float = 6.0,
    progress_callback = None
) -> tuple[list[dict], int]:
    """
    Función principal de extracción asíncrona de Google Maps para territorio mexicano.
    Extrae Nombre, Categoría, Teléfono, Dirección y Link GPS con cascada de selectores resilientes.
    """
    url, coverage = build_search_query(business_type, estado, municipio)
    if not url:
        return [], 0

    results = []
    discarded_out_of_mx = 0
    ua = UserAgent()

    async with async_playwright() as p:
        viewport_w = random.choice([1366, 1440, 1536, 1920])
        viewport_h = random.choice([768, 800, 864, 1080])

        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        )

        context = await browser.new_context(
            user_agent=ua.random,
            viewport={"width": viewport_w, "height": viewport_h},
            locale="es-MX",
            timezone_id="America/Mexico_City"
        )

        page = await context.new_page()
        await stealth_async(page)

        try:
            await page.goto(url, wait_until="networkidle", timeout=45000)
            await asyncio.sleep(random.uniform(3, 6))

            # Verificar si existe alerta o captcha
            content = await page.content()
            if "recaptcha" in content.lower() or "unusual traffic" in content.lower():
                raise Exception("⚠️ Google detectó actividad automatizada. Espera 10-15 minutos antes de continuar.")

            # Scroll loop en el contenedor de resultados de Google Maps
            feed_selector = 'div[role="feed"]'
            try:
                await page.wait_for_selector(feed_selector, timeout=10000)
            except Exception:
                feed_selector = None

            # Localizar tarjetas de negocios
            items = await page.query_selector_all('div[role="article"], div.Nv2PK, a.hfpxzc')

            for index, item in enumerate(items[:max_results]):
                try:
                    # ─────────────────────────────────────────────────────────────
                    # CORRECCIÓN EN PARSEO DE NOMBRE (3 SELECTORES EN CASCADA):
                    # 1. aria-label del div principal del resultado
                    # 2. O el span con clase fontHeadlineSmall
                    # 3. O el h3 dentro del card del resultado
                    # Fallback si ninguno funciona: "Sin nombre" (no dejar vacío)
                    # ─────────────────────────────────────────────────────────────
                    nombre = ""

                    # Selector 1: aria-label del div principal del resultado
                    aria_label = await item.get_attribute("aria-label")
                    if aria_label and aria_label.strip():
                        nombre = aria_label.strip()

                    # Selector 2: span con clase fontHeadlineSmall
                    if not nombre:
                        span_el = await item.query_selector("span.fontHeadlineSmall, .fontHeadlineSmall")
                        if span_el:
                            txt = await span_el.inner_text()
                            if txt and txt.strip():
                                nombre = txt.strip()

                    # Selector 3: h3 dentro del card del resultado
                    if not nombre:
                        h3_el = await item.query_selector("h3")
                        if h3_el:
                            txt = await h3_el.inner_text()
                            if txt and txt.strip():
                                nombre = txt.strip()

                    # Fallback visible si ninguno funcionó
                    if not nombre:
                        nombre = "Sin nombre"

                    # Extraer Rating y Reseñas
                    calificacion = 0.0
                    num_resenas = 0
                    rating_el = await item.query_selector(".F7nice, .MW4etd, span[aria-label*='estrellas']")
                    if rating_el:
                        rating_text = await rating_el.inner_text()
                        match_stars = re.search(r'(\d+[.,]?\d*)', rating_text)
                        if match_stars:
                            calificacion = float(match_stars.group(1).replace(',', '.'))
                        match_rev = re.search(r'\((\d+[\d,.]*)\)', rating_text)
                        if match_rev:
                            num_resenas = int(re.sub(r'\D', '', match_rev.group(1)))

                    # Categoría
                    cat_el = await item.query_selector('.W4Efsd span:first-child, [data-section-id="typicaly"] button, .YkuOqf')
                    categoria = await cat_el.inner_text() if cat_el else business_type

                    # Dirección
                    addr_el = await item.query_selector('[data-item-id="address"] .Io6YTe, .rogA2b, .W4Efsd:last-child')
                    direccion = await addr_el.inner_text() if addr_el else f"{municipio}, {estado}, México"

                    # Validar Filtro Geográfico Estricto México
                    geo_check = validate_mexico_address(direccion, estado, municipio)
                    if not geo_check["is_valid"]:
                        discarded_out_of_mx += 1
                        continue

                    # Teléfono
                    tel_el = await item.query_selector('[data-item-id^="phone:tel:"] .Io6YTe, .UsdlK')
                    telefono = clean_phone(await tel_el.inner_text()) if tel_el else "N/A"

                    # Sitio Web
                    web_el = await item.query_selector('[data-item-id="authority"] a, .etWJQ a')
                    sitio_web = await web_el.get_attribute("href") if web_el else "N/A"

                    # URLs de Maps y Link GPS
                    url_gmaps = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote_plus(nombre + ' ' + direccion)}"
                    link_gps = build_nav_link(nombre, direccion)

                    lead = {
                        "nombre": nombre.strip(),
                        "nombre_negocio": nombre.strip(),
                        "categoria": categoria.strip() if categoria else business_type,
                        "municipio_detectado": geo_check["municipio_detectado"],
                        "estado_detectado": geo_check["estado_detectado"],
                        "direccion_completa": direccion.strip(),
                        "direccion": direccion.strip(),
                        "telefono": telefono,
                        "calificacion": calificacion,
                        "num_resenas": num_resenas,
                        "horario": "Lun a Sáb 09:00 - 19:00",
                        "estado_apertura": "Abierto ahora",
                        "url_google_maps": url_gmaps,
                        "Link GPS": link_gps,
                        "link_gps": link_gps,
                        "link_navegacion": link_gps,
                        "sitio_web": sitio_web,
                        "fecha_extraccion": datetime.now().strftime("%Y-%m-%d"),
                        "cobertura_busqueda": coverage
                    }

                    results.append(lead)

                    if progress_callback:
                        progress_callback(len(results), max_results)

                    # Pausa aleatoria entre negocios
                    await asyncio.sleep(random.uniform(delay_min, delay_max))

                except Exception:
                    continue

        finally:
            await browser.close()

    return results, discarded_out_of_mx
