# Auditoría GA4 — Stellantis (`G-XRDWZPQ4WT`)

- **Propiedad GA4:** `Stellantis` (ID numérico: `537958886`)
- **ID de medición:** `G-XRDWZPQ4WT` (Stream: `Visitas_stellantis`)
- **Periodo auditado:** Últimos 90 días (`2026-08-29` a `2026-11-27`)
- **Zona horaria configurada en GA4:** `America/Tijuana`
- **Moneda:** `MXN`

---

## a) Todos los `eventName` de los últimos 90 días

| `eventName` | Conteo (`eventCount`) | Usuarios (`totalUsers`) | Clasificación / Notas |
|---|---:|---:|---|
| `page_view` | 696 | 171 | Vista de página |
| `user_engagement` | 394 | 53 | Interacción GA4 |
| `session_start` | 377 | 171 | Inicio de sesión |
| `scroll` | 277 | 84 | Scroll 90% |
| `first_visit` | 167 | 167 | Primera visita |
| `view_car_details` | 165 | 44 | Detalle de vehículo |
| `view_popup_newsletter` | 110 | 68 | Popup newsletter |
| `view_shared_car` | 95 | 37 | **Vista** (enlace directo con `#auto-...`) |
| `view_popup_leasing` | 72 | 50 | Popup leasing |
| `click_car_card` | 68 | 16 | **Vista** (clic en tarjeta de modelo) |
| `dismiss_popup_newsletter` | 57 | 34 | Cierre popup newsletter |
| `dismiss_popup_leasing` | 43 | 31 | Cierre popup leasing |
| `click_marca_inicio` | 33 | 12 | Clic en marca en inicio |
| `open_ficha_interactiva` | 25 | 2 | Ficha interactiva |
| `play_video_modal` | 25 | 3 | Reproducción de video |
| `click` | 15 | 7 | Clic saliente automático |
| `click_whatsapp_leasing` | 9 | 8 | **Interés fuerte (`click_whatsapp_*`)** *(solo `brand_name`, sin `car_name`)* |
| `click_featured_car` | 7 | 4 | **Vista** (auto destacado en inicio) |
| `click_promo_destacada` | 5 | 4 | Clic en carrusel de promos destacadas |
| `click_whatsapp_cotizar` | 2 | 2 | **Interés fuerte (`click_whatsapp_*`)** |
| `play_car_video` | 2 | 1 | Video de auto |
| `click_whatsapp_cotizar_tabla` | 1 | 1 | **Interés fuerte (`click_whatsapp_*`)** |
| `form_start` | 1 | 1 | Inicio de formulario |
| `generate_lead` | 1 | 1 | Suscripción newsletter |

> **Nota:** `click_whatsapp_cotizar_related_demo` existe en el código HTML, pero registró **0** eventos en los últimos 90 días. Total de eventos `click_whatsapp_*`: **12**.

---

## b) Dimensiones personalizadas (`car_name` y `brand_name`)

- **Estado:** **SÍ están registradas** ambas como dimensiones personalizadas con ámbito **Evento (`EVENT`)**:
  - `car_name` → Nombre visible: **Nombre del auto** (`customEvent:car_name`, ID `15636783771`)
  - `brand_name` → Nombre visible: **Marca del auto** (`customEvent:brand_name`, ID `15637027232`)
- **Fecha desde la que tienen datos:** **`2026-09-02`** (GA4 reporta truncamiento de rango hasta `2026-09-01`, por lo que cubren prácticamente todo el periodo de 90 días).
- **Fallback:** Para fechas anteriores al `2026-09-02` o eventos que no envían `car_name` (ej. `click_whatsapp_leasing`), la atribución cae automáticamente a `sessionCampaignName` y `pagePath`.

---

## c) Google Signals y demográficos (`userAgeBracket` / `userGender`)

- **Google Signals:** **DESACTIVADO** (`state: GOOGLE_SIGNALS_DISABLED`).
- **Resultados de `userAgeBracket` y `userGender`:** Devuelven **0 filas** y GA4 marca **`subjectToThresholding: true`** en ambas consultas (incluso al consultarlos por separado sin cruzar con modelo).
- **Cómo activarlo a futuro (no es retroactivo):**
  1. En Google Analytics → **Administrar → Recogida y modificación de datos → Recogida de datos**.
  2. Activar **Recogida de datos de Google Signals**.
  3. *Nota:* Con un volumen de ~171 usuarios en 90 días, los desgloses por modelo pueden seguir sujetos a umbrales de privacidad de Google; en `/api/ga` se rellena `"desconocido"` y se reporta en `"avisos"`.

---

## d) Valores reales de `sessionCampaignName`, `sessionSource` y `pagePath` (90 días)

### `sessionCampaignName` (26 valores)

| Campaña | Sesiones | Usuarios | Eventos |
|---|---:|---:|---:|
| `(direct)` | 93 | 66 | 755 |
| `(not set)` | 80 | 23 | 512 |
| `MKT_EMPRESAS_CALLE` | 30 | 3 | 211 |
| `tarjeta_presentacion` | 27 | 19 | 147 |
| `EMAIL_LIST_BD_CTES_CARTERA` | 24 | 19 | 158 |
| `ESTADO_WHATSAPP` | 24 | 10 | 105 |
| `(referral)` | 15 | 4 | 138 |
| `TIKTOK_STELLANTIS` | 13 | 10 | 58 |
| `EMAIL_LIST_BD_STELLANTIS` | 9 | 2 | 95 |
| `WHATS_SEND_CARTERA` | 9 | 8 | 78 |
| `EMAIL_LIST_CTES_NO_VENDIDOS_VIEJOS` | 7 | 6 | 31 |
| `lead_fastback` | 6 | 4 | 43 |
| `EMAIL_LIST_BD_CTES_CARTERA_VIEJA_NO_VENDIDOS` | 5 | 3 | 52 |
| `lead_ram_4000` | 5 | 4 | 51 |
| `EMAIL_LIST_CARTERA_STELLANTIS` | 4 | 2 | 14 |
| `lead_demos` | 4 | 3 | 25 |
| `lead_ram_700` | 4 | 3 | 26 |
| `EMAIL_PROSPECCION_EMPRESAS` | 3 | 2 | 9 |
| `lead_attitude` | 3 | 1 | 16 |
| `lead_compass` | 3 | 2 | 38 |
| `lead_partner_maxi` | 2 | 1 | 13 |
| `lead_renegade` | 2 | 1 | 14 |
| `lead_jt_rubicon` | 1 | 1 | 18 |
| `lead_ram_1200` | 1 | 1 | 9 |
| `lead_ram_1200_chasis` | 1 | 1 | 27 |
| `promo_tiktok` | 1 | 1 | 4 |

### `sessionSource` (14 valores)

| Fuente | Sesiones | Usuarios | Eventos |
|---|---:|---:|---:|
| `(direct)` | 93 | 66 | 755 |
| `whatsapp` | 63 | 34 | 418 |
| `enlace_directo_cliente` | 62 | 5 | 424 |
| `email` | 54 | 31 | 367 |
| `presencial` | 30 | 3 | 211 |
| `web_autos` | 28 | 20 | 151 |
| `sms` | 15 | 13 | 118 |
| `tiktok` | 14 | 11 | 61 |
| `github.com` | 7 | 1 | 89 |
| `localhost:3000` | 5 | 1 | 34 |
| `facebook.com` | 2 | 2 | 12 |
| `(not set)` | 1 | 1 | 1 |
| `1612194172-atari-embeds.googleusercontent.com` | 1 | 1 | 3 |
| `facebook` | 1 | 1 | 3 |

### `pagePath` (24 valores)

| `pagePath` | Vistas | Usuarios | Eventos |
|---|---:|---:|---:|
| `/landing-stellantis/` | 217 | 72 | 772 |
| `/landing-stellantis/paginas_promo/promo-demos.html` | 110 | 19 | 428 |
| `/landing-stellantis/index.html` | 59 | 14 | 190 |
| `/view/stellantis-promos/promo_stellantis` | 54 | 29 | 177 |
| `/landing-stellantis/paginas_promo/promo-dodge.html` | 39 | 12 | 169 |
| `/landing-stellantis/paginas_promo/promo-leapmotor.html` | 38 | 8 | 179 |
| `/landing-stellantis/paginas_promo/promo-ram.html` | 36 | 14 | 188 |
| `/view/stellantis-promos/contacto_asesor` | 24 | 19 | 80 |
| `/landing-nissan/index.html` *(Nissan)* | 22 | 4 | 76 |
| `/landing-stellantis/paginas_promo/promo-fiat.html` | 21 | 9 | 81 |
| `/landing-stellantis/paginas_promo/promo-jeep.html` | 21 | 11 | 115 |
| `/landing-stellantis/paginas_promo/promo-peugeot.html` | 18 | 9 | 74 |
| `/landing-nissan/` *(Nissan)* | 15 | 15 | 55 |
| `/landing-nissan/paginas_promo/promo-sedanes.html` *(Nissan)* | 8 | 3 | 25 |
| `/landing-nissan/paginas_promo/promo-suvs.html` *(Nissan)* | 3 | 1 | 6 |
| `/paginas_promo/promo-dodge.html` | 2 | 1 | 15 |
| `/view/stellantis-promos/jeep-promo` | 2 | 1 | 2 |
| `/landing-nissan/paginas_promo/promo-demos.html` *(Nissan)* | 1 | 1 | 3 |
| `/landing-nissan/paginas_promo/promo-epower.html` *(Nissan)* | 1 | 1 | 4 |
| `/landing-nissan/paginas_promo/promo-pickups.html` *(Nissan)* | 1 | 1 | 3 |
| `/view/stellantis-promos/dodge` | 1 | 1 | 1 |
| `/view/stellantis-promos/jeep_promos` | 1 | 1 | 1 |
| `/view/stellantis-promos/promo_stellantis/ram` | 1 | 1 | 1 |
| `/view/stellantis-promos/ram_promos` | 1 | 1 | 2 |

> **Hallazgo:** La propiedad `G-XRDWZPQ4WT` comparte medición entre `landing-stellantis`, `landing-nissan` (`Sentra 2026`, `Versa 2026`, etc.) y Google Sites (`/view/stellantis-promos/...`). En `api/ga.ts` se conservan ambos con su campo `"marca"` diferenciado (`"nissan"` vs marcas Stellantis).

---

## e) Tabla de Mapeo: Modelo ← (`car_name` | `utm_campaign` | `pagePath`)

Orden de prioridad implementado en `api/ga.ts` (funciona aunque `car_name` no esté disponible):
1. `customEvent:car_name` (normalizando espacios y saltos de línea embebidos de las tablas de demos)
2. `sessionCampaignName` (`lead_*` y campañas dedicadas)
3. `pagePath` (fallback por página; en GA4 el `#ancla` no se guarda en `pagePath`)
4. `customEvent:brand_name` (para eventos de marca sin modelo específico, como `click_whatsapp_leasing`)

| Modelo canónico | Marca | `car_name` (GA4 real + HTML / demos) | `utm_campaign` | `pagePath` (y ancla en HTML) |
|---|---|---|---|---|
| **RAM 700** | `ram` | `RAM 700`, `700 BIGHORN*`, `700 TRADESMAN*` | `lead_ram_700` | `/landing-stellantis/paginas_promo/promo-ram.html` (`#auto-ram-700`) |
| **RAM 700 Laramie** | `ram` | `RAM 700 Laramie`, `Ram 700 Laramie`, `RAM 700 LARAMIE CREW CAB TURBO CVT`, `700 LARAMIE*` | `lead_ram_700` | `/landing-stellantis/paginas_promo/promo-ram.html` (`#auto-ram-1795061361645`) |
| **RAM 1200 Crew Cab** | `ram` | `Ram 1200 Crew Cab`, `RAM 1200`, `Ram 1200 Redillas`, `Ram 1200 caja`, `1200 TRADESMAN RC` | `lead_ram_1200` | `/landing-stellantis/paginas_promo/promo-ram.html` (`#auto-ram-1200`) |
| **RAM 1200 Chasis** | `ram` | `RAM 1200 Chasis` | `lead_ram_1200_chasis` | `/landing-stellantis/paginas_promo/promo-ram.html` (`#auto-ram-1200-chasis`) |
| **RAM 1500** | `ram` | `Ram 1500 I6 Turbo 4X4`, `RAM 1500`, `RAM 1500 TUNGSTEN`, `1500 TUNGSTEN` | — | `/landing-stellantis/paginas_promo/promo-demos.html` (`#auto-demos-1788308764719`) |
| **RAM 4000** | `ram` | `RAM 4000`, `Ram 4000`, `4000 CHASIS CABINA*` | `lead_ram_4000` | `/landing-stellantis/paginas_promo/promo-ram.html` (`#auto-ram-4000`) |
| **RAM Promaster** | `ram` | `Promaster`, `Rapid` | `lead_promaster` | `/landing-stellantis/paginas_promo/promo-ram.html` (`#auto-ram-promaster`) |
| **ATTITUDE SXT** | `dodge` | `Dodge Attitude SXT`, `Dodge Attitude`, `DODGE ATTITUDE SXT/GT/SPORT`, `ATTITUDE GT` | `lead_attitude` | `/landing-stellantis/paginas_promo/promo-dodge.html` (`#auto-dodge-attitude`) |
| **Dodge Charger** | `dodge` | `Dodge Charger` | `lead_charger` | `/landing-stellantis/paginas_promo/promo-dodge.html` (`#auto-dodge-1787102237711`) |
| **Dodge Durango** | `dodge` | `Dodge Durango` | `lead_durango` | `/landing-stellantis/paginas_promo/promo-dodge.html` (`#auto-dodge-1787109067140`) |
| **Fiat Pulse** | `fiat` | `Fiat PULSE`, `FIAT PULSE DRIVE*` | `lead_pulse` | `/landing-stellantis/paginas_promo/promo-fiat.html` (`#auto-fiat-pulse`) |
| **Fiat Fastback** | `fiat` | `Fiat Fastback`, `FIAT FASTBACK IMPETUS` | `lead_fastback` | `/landing-stellantis/paginas_promo/promo-fiat.html` (`#auto-fiat-fastback`) |
| **Fiat Abarth** | `fiat` | `Fiat Abarth`, `FIAT PULSE ABARTH` | `lead_abarth` | `/landing-stellantis/paginas_promo/promo-fiat.html` (`#auto-fiat-abarth`) |
| **Jeep Renegade** | `jeep` | `Jeep Renegade`, `JEEP RENEGADE`, `JEEP RENEGADE LATITUDE` | `lead_renegade` | `/landing-stellantis/paginas_promo/promo-jeep.html` (`#auto-jeep-renegade`) |
| **Jeep Compass** | `jeep` | `Jeep Compass`, `JEEP COMPASS`, `JEEP COMPASS LIMITED` | `lead_compass` | `/landing-stellantis/paginas_promo/promo-jeep.html` (`#auto-jeep-compass`) |
| **Jeep Grand Cherokee** | `jeep` | `Grand Cherokee Altitude 4x2`, `JEEP GRAND CHEROKEE`, `Jeep Grand Cherokee L`, `JEEP GRAND CHEROKEE*` | `lead_grand_cherokee` | `/landing-stellantis/paginas_promo/promo-jeep.html` (`#auto-jeep-grand-cherokee`) |
| **Jeep Wrangler** | `jeep` | `Rubicon Unlimited`, `Jeep wrangler Sahara`, `JEEP WRANGLER*` | `lead_rubicon` | `/landing-stellantis/paginas_promo/promo-jeep.html` (`#auto-jeep-rubicon`) |
| **Jeep JT** | `jeep` | `JT Rubicon`, `Jeep JT`, `JEEP JT`, `JEEP JT 4X4*` | `lead_jt_rubicon` | `/landing-stellantis/paginas_promo/promo-jeep.html` (`#auto-jeep-jt`) |
| **Jeep Commander** | `jeep` | `JEEP COMMANDER 4X2` | — | `/landing-stellantis/paginas_promo/promo-demos.html` |
| **Leapmotor B10** | `leapmotor` | `B10` | `lead_b10`, `EMAIL_LIST_CTES_LEAPMOTOR`, `SMS_CTES_LEAPMOTOR`, `WHATS_CTES_LEAPMOTOR` | `/landing-stellantis/paginas_promo/promo-leapmotor.html` (`#auto-leapmotor-1788121201596`) |
| **Peugeot 2008** | `peugeot` | `Peugeot 2008`, `PEUGEOT 2008*`, `NUEVA 2008 GT` | `lead_2008` | `/landing-stellantis/paginas_promo/promo-peugeot.html` (`#auto-peugeot-2008`) |
| **Peugeot 3008** | `peugeot` | `Peugeot 3008`, `PEUGEOT 3008*` | `lead_3008` | `/landing-stellantis/paginas_promo/promo-peugeot.html` (`#auto-peugeot-3008`) |
| **Peugeot 5008** | `peugeot` | `Peugeot 5008`, `PEUGEOT NUEVA 5008 GT`, `NUEVA 5008 GT` | — | `/landing-stellantis/paginas_promo/promo-peugeot.html` (`#auto-peugeot-1791488094945`) |
| **Peugeot Rifter** | `peugeot` | `Rifter` | `lead_rifter` | `/landing-stellantis/paginas_promo/promo-peugeot.html` (`#auto-peugeot-rifter`) |
| **Peugeot Expert** | `peugeot` | `Expert Furgon`, `FURGON L2H2 HDI`, `PEUGEOT FURGON*` | `lead_expert` | `/landing-stellantis/paginas_promo/promo-peugeot.html` (`#auto-peugeot-expert`) |
| **Peugeot Partner Maxi** | `peugeot` | `Partner maxi`, `Partner 2027`, `PARTNER MAXI PACK GAS`, `PEUGEOT PARTNER*` | `lead_partner_maxi` | `/landing-stellantis/paginas_promo/promo-peugeot.html` (`#auto-peugeot-partner-maxi`) |
| **Peugeot Manager** | `peugeot` | `Manager`, `Manager 2026`, `MANAGER FURGON L2H2 HDI`, `PEUGEOT MANAGER*` | `lead_manager` | `/landing-stellantis/paginas_promo/promo-peugeot.html` (`#auto-peugeot-manager`) |
| **Modelos Nissan** *(ej. Sentra 2026, Versa 2026)* | `nissan` | `Sentra 2026`, `Versa 2026`, etc. | `CARTERA_NISSAN_*`, `WHATS_CARTERA_NISSAN` | `/landing-nissan/*` |
