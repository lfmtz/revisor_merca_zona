// Función serverless de Vercel (Node, ESM): consulta la GA4 Data API (batchRunReports)
// con cuenta de servicio (JWT RS256 nativo con node:crypto, sin dependencias extra)
// y devuelve métricas agregadas por modelo de vehículo para cruzar con datos INEGI.
//
//   GET /api/ga?desde=YYYY-MM-DD&hasta=YYYY-MM-DD   (por defecto últimos 90 días)

import { createSign } from 'node:crypto';
import { claveValida } from './_auth.js';

const PROPIEDAD_MEDICION = 'G-XRDWZPQ4WT';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
const CACHE_CONTROL = 'private, max-age=21600';

const EVENTOS_VISTA = new Set([
  'click_car_card',
  'view_shared_car',
  'click_featured_car',
]);

// --- Tipos de salida (respetan exactamente el contrato acordado) ---

interface RangoFechas {
  desde: string;
  hasta: string;
}

interface TotalesGA {
  usuarios: number;
  sesiones: number;
  vistas_modelo: number;
  clics_whatsapp: number;
}

interface ModeloGA {
  modelo: string;
  marca: string;
  vistas: number;
  clics_whatsapp: number;
  usuarios: number;
  tiempo_interaccion_seg: number;
  por_edad: Record<string, number>;
  por_genero: Record<string, number>;
  por_hora: Record<string, number>;
  por_dia: Record<string, number>;
  por_dispositivo: Record<string, number>;
  por_region: Record<string, number>;
  por_ciudad: Record<string, number>;
  por_canal: Record<string, number>;
  por_campania: Record<string, number>;
  por_edad_vistas: Record<string, number>;
  por_genero_vistas: Record<string, number>;
  por_hora_vistas: Record<string, number>;
  por_dia_vistas: Record<string, number>;
  por_dispositivo_vistas: Record<string, number>;
  por_region_vistas: Record<string, number>;
  por_ciudad_vistas: Record<string, number>;
  por_canal_vistas: Record<string, number>;
  por_campania_vistas: Record<string, number>;
}

export interface RespuestaGA {
  rango: RangoFechas;
  propiedad: string;
  avisos: string[];
  totales: TotalesGA;
  modelos: ModeloGA[];
}

// --- Caché en memoria (6 horas para reportes, ~55 min para token OAuth2) ---

const reportCache = new Map<string, { exp: number; data: RespuestaGA }>();
let tokenCache: { token: string; exp: number } | null = null;

// --- Autenticación OAuth2 con Cuenta de Servicio (node:crypto RS256) ---

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function obtenerAccessToken(clientEmail: string, privateKeyRaw: string): Promise<string> {
  const ahora = Date.now();
  if (tokenCache && tokenCache.exp > ahora + 60_000) {
    return tokenCache.token;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  const iat = Math.floor(ahora / 1000);
  const exp = iat + 3600;

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp,
  }));

  const signingInput = `${header}.${claim}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = base64url(signer.sign(privateKey));
  const assertion = `${signingInput}.${signature}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!resp.ok) {
    const detalle = await resp.text().catch(() => '');
    throw new Error(`Error autenticando cuenta de servicio Google (${resp.status}): ${detalle.slice(0, 200)}`);
  }

  const json: any = await resp.json();
  if (!json.access_token) {
    throw new Error('Google OAuth2 no devolvió access_token.');
  }

  tokenCache = {
    token: json.access_token,
    exp: ahora + Number(json.expires_in || 3600) * 1000,
  };
  return tokenCache.token;
}

// --- Llamada a GA4 Data API (batchRunReports) ---

async function batchRunReports(
  propertyId: string,
  accessToken: string,
  requests: any[],
): Promise<any[]> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:batchRunReports`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!resp.ok) {
    const detalle = await resp.text().catch(() => '');
    throw new Error(`GA4 Data API respondió ${resp.status}: ${detalle.slice(0, 300)}`);
  }

  const json: any = await resp.json();
  return Array.isArray(json.reports) ? json.reports : [];
}

// --- Tabla de mapeo Modelo ← (car_name | utm_campaign | pagePath) ---

interface ModeloCanonico {
  modelo: string;
  marca: string;
}

const MAPA_CAMPANIA: Record<string, ModeloCanonico> = {
  lead_ram_700: { modelo: 'RAM 700', marca: 'ram' },
  lead_ram_1200: { modelo: 'RAM 1200 Crew Cab', marca: 'ram' },
  lead_ram_1200_chasis: { modelo: 'RAM 1200 Chasis', marca: 'ram' },
  lead_ram_4000: { modelo: 'RAM 4000', marca: 'ram' },
  lead_promaster: { modelo: 'RAM Promaster', marca: 'ram' },
  lead_attitude: { modelo: 'ATTITUDE SXT', marca: 'dodge' },
  lead_charger: { modelo: 'Dodge Charger', marca: 'dodge' },
  lead_durango: { modelo: 'Dodge Durango', marca: 'dodge' },
  lead_pulse: { modelo: 'Fiat Pulse', marca: 'fiat' },
  lead_fastback: { modelo: 'Fiat Fastback', marca: 'fiat' },
  lead_abarth: { modelo: 'Fiat Abarth', marca: 'fiat' },
  lead_renegade: { modelo: 'Jeep Renegade', marca: 'jeep' },
  lead_compass: { modelo: 'Jeep Compass', marca: 'jeep' },
  lead_grand_cherokee: { modelo: 'Jeep Grand Cherokee', marca: 'jeep' },
  lead_rubicon: { modelo: 'Jeep Wrangler', marca: 'jeep' },
  lead_jt_rubicon: { modelo: 'Jeep JT', marca: 'jeep' },
  lead_b10: { modelo: 'Leapmotor B10', marca: 'leapmotor' },
  email_list_ctes_leapmotor: { modelo: 'Leapmotor B10', marca: 'leapmotor' },
  sms_ctes_leapmotor: { modelo: 'Leapmotor B10', marca: 'leapmotor' },
  whats_ctes_leapmotor: { modelo: 'Leapmotor B10', marca: 'leapmotor' },
  lead_2008: { modelo: 'Peugeot 2008', marca: 'peugeot' },
  lead_3008: { modelo: 'Peugeot 3008', marca: 'peugeot' },
  lead_rifter: { modelo: 'Peugeot Rifter', marca: 'peugeot' },
  lead_expert: { modelo: 'Peugeot Expert', marca: 'peugeot' },
  lead_partner_maxi: { modelo: 'Peugeot Partner Maxi', marca: 'peugeot' },
  lead_manager: { modelo: 'Peugeot Manager', marca: 'peugeot' },
};

function limpiarTexto(s: string | undefined): string {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function esVacioGA(s: string): boolean {
  const v = s.toLowerCase();
  return !v || v === '(not set)' || v === '(other)' || v === '(direct)' || v === '(none)';
}

function mapearCarName(carNameRaw: string, brandRaw?: string): ModeloCanonico | null {
  const clean = limpiarTexto(carNameRaw);
  if (esVacioGA(clean)) return null;
  const u = clean.toUpperCase();

  // RAM
  if (u.includes('700') && u.includes('LARAMIE')) return { modelo: 'RAM 700 Laramie', marca: 'ram' };
  if (u === 'RAM 700' || u.startsWith('700 ') || u.startsWith('RAM 700')) return { modelo: 'RAM 700', marca: 'ram' };
  if (u.includes('1200') && u.includes('CHASIS')) return { modelo: 'RAM 1200 Chasis', marca: 'ram' };
  if (u.includes('1200')) return { modelo: 'RAM 1200 Crew Cab', marca: 'ram' };
  if (u.includes('1500')) return { modelo: 'RAM 1500', marca: 'ram' };
  if (u.includes('4000')) return { modelo: 'RAM 4000', marca: 'ram' };
  if (u.includes('PROMASTER') || u === 'RAPID') return { modelo: 'RAM Promaster', marca: 'ram' };

  // Dodge
  if (u.includes('ATTITUDE')) return { modelo: 'ATTITUDE SXT', marca: 'dodge' };
  if (u.includes('CHARGER')) return { modelo: 'Dodge Charger', marca: 'dodge' };
  if (u.includes('DURANGO')) return { modelo: 'Dodge Durango', marca: 'dodge' };

  // Fiat
  if (u.includes('ABARTH')) return { modelo: 'Fiat Abarth', marca: 'fiat' };
  if (u.includes('PULSE')) return { modelo: 'Fiat Pulse', marca: 'fiat' };
  if (u.includes('FASTBACK')) return { modelo: 'Fiat Fastback', marca: 'fiat' };

  // Jeep
  if (u.includes('RENEGADE')) return { modelo: 'Jeep Renegade', marca: 'jeep' };
  if (u.includes('COMPASS')) return { modelo: 'Jeep Compass', marca: 'jeep' };
  if (u.includes('GRAND CHEROKEE')) return { modelo: 'Jeep Grand Cherokee', marca: 'jeep' };
  if (u.includes('WRANGLER') || u.includes('SAHARA') || (u.includes('RUBICON') && !u.includes('JT'))) {
    return { modelo: 'Jeep Wrangler', marca: 'jeep' };
  }
  if (u.includes('JT')) return { modelo: 'Jeep JT', marca: 'jeep' };
  if (u.includes('COMMANDER')) return { modelo: 'Jeep Commander', marca: 'jeep' };

  // Leapmotor
  if (u === 'B10' || u.includes('LEAPMOTOR')) return { modelo: 'Leapmotor B10', marca: 'leapmotor' };

  // Peugeot
  if (u.includes('2008')) return { modelo: 'Peugeot 2008', marca: 'peugeot' };
  if (u.includes('3008')) return { modelo: 'Peugeot 3008', marca: 'peugeot' };
  if (u.includes('5008')) return { modelo: 'Peugeot 5008', marca: 'peugeot' };
  if (u.includes('RIFTER')) return { modelo: 'Peugeot Rifter', marca: 'peugeot' };
  if (u.includes('MANAGER')) return { modelo: 'Peugeot Manager', marca: 'peugeot' };
  if (u.includes('PARTNER')) return { modelo: 'Peugeot Partner Maxi', marca: 'peugeot' };
  if (u.includes('EXPERT') || u.includes('FURGON')) return { modelo: 'Peugeot Expert', marca: 'peugeot' };

  // Nissan (comparten G-XRDWZPQ4WT y el cliente navega ambos sitios)
  if (u.includes('SENTRA') || u.includes('VERSA') || u.includes('MARCH') || u.includes('KICKS') || u.includes('X-TRAIL') || u.includes('FRONTIER') || u.includes('NP300') || u.includes('MAGNITE') || u.includes('ALTIMA') || u.includes('PATHFINDER')) {
    return { modelo: clean, marca: 'nissan' };
  }

  const bClean = limpiarTexto(brandRaw).toLowerCase();
  const marca = !esVacioGA(bClean) && bClean !== 'demos' ? bClean : 'otros';
  return { modelo: clean, marca };
}

function mapearPagePath(pathRaw: string): ModeloCanonico | null {
  const p = limpiarTexto(pathRaw).toLowerCase();
  if (!p) return null;
  if (p.includes('promo-leapmotor')) return { modelo: 'Leapmotor B10', marca: 'leapmotor' };
  if (p.includes('promo-ram') || p.endsWith('/ram') || p.includes('ram_promos')) return { modelo: 'RAM (página general)', marca: 'ram' };
  if (p.includes('promo-dodge') || p.endsWith('/dodge')) return { modelo: 'Dodge (página general)', marca: 'dodge' };
  if (p.includes('promo-fiat')) return { modelo: 'Fiat (página general)', marca: 'fiat' };
  if (p.includes('promo-jeep') || p.includes('jeep-promo') || p.includes('jeep_promos')) return { modelo: 'Jeep (página general)', marca: 'jeep' };
  if (p.includes('promo-peugeot')) return { modelo: 'Peugeot (página general)', marca: 'peugeot' };
  if (p.includes('promo-demos')) {
    return p.includes('landing-nissan')
      ? { modelo: 'Nissan Demos (página general)', marca: 'nissan' }
      : { modelo: 'Stellantis Demos (página general)', marca: 'stellantis' };
  }
  if (p.includes('landing-nissan')) return { modelo: 'Nissan (página general)', marca: 'nissan' };
  return null;
}

function resolverModelo(
  carName?: string,
  brandName?: string,
  campaign?: string,
  pagePath?: string,
): ModeloCanonico | null {
  // 1) car_name (dimensión personalizada)
  if (carName) {
    const m = mapearCarName(carName, brandName);
    if (m) return m;
  }
  // 2) utm_campaign (funciona aunque car_name no esté registrado)
  if (campaign) {
    const campKey = limpiarTexto(campaign).toLowerCase();
    if (MAPA_CAMPANIA[campKey]) return MAPA_CAMPANIA[campKey];
  }
  // 3) pagePath (fallback por página)
  if (pagePath) {
    const m = mapearPagePath(pagePath);
    if (m) return m;
  }
  // 4) brand_name sin modelo específico (ej. click_whatsapp_leasing)
  if (brandName) {
    const b = limpiarTexto(brandName).toLowerCase();
    if (!esVacioGA(b)) {
      const label = b === 'demos' ? 'Stellantis Demos (general)' : `${b.toUpperCase()} (general)`;
      return { modelo: label, marca: b === 'demos' ? 'stellantis' : b };
    }
  }
  return null;
}

// --- Inicialización de bloques "por_*" y normalizadores ---

function crearPorEdad(): Record<string, number> {
  return { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0, desconocido: 0 };
}

function crearPorGenero(): Record<string, number> {
  return { male: 0, female: 0, desconocido: 0 };
}

function crearPorHora(): Record<string, number> {
  const h: Record<string, number> = {};
  for (let i = 0; i < 24; i++) h[String(i)] = 0;
  return h;
}

function crearPorDia(): Record<string, number> {
  return { lun: 0, mar: 0, mie: 0, jue: 0, vie: 0, sab: 0, dom: 0 };
}

function crearPorDispositivo(): Record<string, number> {
  return { mobile: 0, desktop: 0, tablet: 0 };
}

function crearPorRegion(): Record<string, number> {
  return { 'Ciudad de México': 0, 'Estado de México': 0, otros: 0 };
}

function crearPorCanal(): Record<string, number> {
  return { whatsapp: 0, sms: 0, email: 0, directo: 0, otros: 0 };
}

function crearModeloVacio(modelo: string, marca: string): ModeloGA {
  return {
    modelo,
    marca,
    vistas: 0,
    clics_whatsapp: 0,
    usuarios: 0,
    tiempo_interaccion_seg: 0,
    por_edad: crearPorEdad(),
    por_genero: crearPorGenero(),
    por_hora: crearPorHora(),
    por_dia: crearPorDia(),
    por_dispositivo: crearPorDispositivo(),
    por_region: crearPorRegion(),
    por_ciudad: {},
    por_canal: crearPorCanal(),
    por_campania: {},
    por_edad_vistas: crearPorEdad(),
    por_genero_vistas: crearPorGenero(),
    por_hora_vistas: crearPorHora(),
    por_dia_vistas: crearPorDia(),
    por_dispositivo_vistas: crearPorDispositivo(),
    por_region_vistas: crearPorRegion(),
    por_ciudad_vistas: {},
    por_canal_vistas: crearPorCanal(),
    por_campania_vistas: {},
  };
}

function normEdad(v: string): string {
  const s = limpiarTexto(v);
  if (s === '18-24' || s === '25-34' || s === '35-44' || s === '45-54' || s === '55-64' || s === '65+') return s;
  return 'desconocido';
}

function normGenero(v: string): string {
  const s = limpiarTexto(v).toLowerCase();
  if (s === 'male' || s === 'female') return s;
  return 'desconocido';
}

function normHora(v: string): string {
  const n = Number.parseInt(limpiarTexto(v), 10);
  return Number.isFinite(n) && n >= 0 && n <= 23 ? String(n) : '0';
}

const DIAS_GA: Record<string, string> = {
  '0': 'dom', '1': 'lun', '2': 'mar', '3': 'mie', '4': 'jue', '5': 'vie', '6': 'sab',
};

function normDia(v: string): string {
  return DIAS_GA[limpiarTexto(v)] || 'lun';
}

function normDispositivo(v: string): string {
  const s = limpiarTexto(v).toLowerCase();
  if (s === 'mobile' || s === 'desktop' || s === 'tablet') return s;
  return 'mobile';
}

function normRegion(v: string): string {
  const s = limpiarTexto(v).toLowerCase();
  if (s === 'mexico city' || s === 'ciudad de méxico' || s === 'ciudad de mexico' || s === 'distrito federal') {
    return 'Ciudad de México';
  }
  if (s === 'state of mexico' || s === 'estado de méxico' || s === 'estado de mexico' || s === 'méxico' || s === 'mexico') {
    return 'Estado de México';
  }
  return 'otros';
}

function normCiudad(v: string): string {
  const s = limpiarTexto(v);
  if (esVacioGA(s)) return 'desconocido';
  if (s.toLowerCase() === 'mexico city') return 'Ciudad de México';
  if (s.toLowerCase() === 'nezahualcoyotl' || s.toLowerCase() === 'ciudad nezahualcoyotl') return 'Nezahualcóyotl';
  return s;
}

function normCanal(v: string): string {
  const s = limpiarTexto(v).toLowerCase();
  if (s.includes('whatsapp') || s === 'wa') return 'whatsapp';
  if (s === 'sms') return 'sms';
  if (s.includes('email') || s === 'mail') return 'email';
  if (s === '(direct)' || s === 'direct' || s === 'directo') return 'directo';
  return 'otros';
}

function esWhatsapp(eventName: string): boolean {
  return eventName.startsWith('click_whatsapp_');
}

function esVista(eventName: string): boolean {
  return EVENTOS_VISTA.has(eventName);
}

// --- Fechas ---

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatearFechaISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calcularRango(desdeQ?: string, hastaQ?: string): RangoFechas | null {
  const hoy = new Date();
  const hastaDef = formatearFechaISO(hoy);
  const hace90 = new Date(hoy.getTime() - 89 * 24 * 60 * 60 * 1000);
  const desdeDef = formatearFechaISO(hace90);

  const desde = desdeQ ? String(desdeQ).trim() : desdeDef;
  const hasta = hastaQ ? String(hastaQ).trim() : hastaDef;

  if (!FECHA_RE.test(desde) || !FECHA_RE.test(hasta) || desde > hasta) {
    return null;
  }
  return { desde, hasta };
}

// --- Construcción de reportes separados ---

function filtroEventosModelo() {
  return {
    orGroup: {
      expressions: [
        { filter: { fieldName: 'eventName', stringFilter: { matchType: 'BEGINS_WITH', value: 'click_whatsapp_' } } },
        { filter: { fieldName: 'eventName', inListFilter: { values: Array.from(EVENTOS_VISTA) } } },
      ],
    },
  };
}

export async function consultarGA4(rango: RangoFechas): Promise<RespuestaGA> {
  const propertyId = (process.env.GA_PROPERTY_ID || '').trim();
  const clientEmail = (process.env.GA_CLIENT_EMAIL || '').trim();
  const privateKey = (process.env.GA_PRIVATE_KEY || '').trim();

  if (!propertyId || !clientEmail || !privateKey) {
    throw new Error('Faltan variables de entorno de GA4 en Vercel (GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY).');
  }

  const accessToken = await obtenerAccessToken(clientEmail, privateKey);
  const dateRanges = [{ startDate: rango.desde, endDate: rango.hasta }];
  const eventFilter = filtroEventosModelo();

  const avisosSet = new Set<string>();
  let usarCarName = true;

  const construirLotes = (conCarName: boolean) => {
    const dimBase = conCarName
      ? [
          { name: 'eventName' },
          { name: 'customEvent:car_name' },
          { name: 'customEvent:brand_name' },
          { name: 'sessionCampaignName' },
          { name: 'pagePath' },
        ]
      : [
          { name: 'eventName' },
          { name: 'sessionCampaignName' },
          { name: 'pagePath' },
        ];

    const dimModeloDemo = conCarName
      ? [{ name: 'eventName' }, { name: 'customEvent:car_name' }]
      : [{ name: 'eventName' }, { name: 'sessionCampaignName' }, { name: 'pagePath' }];

    const dimModeloCorte = conCarName
      ? [{ name: 'eventName' }, { name: 'customEvent:car_name' }, { name: 'sessionCampaignName' }, { name: 'pagePath' }]
      : [{ name: 'eventName' }, { name: 'sessionCampaignName' }, { name: 'pagePath' }];

    const lote1 = [
      // 0: Totales globales
      {
        dateRanges,
        metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
      },
      // 1: Base por modelo
      {
        dateRanges,
        dimensions: dimBase,
        metrics: [
          { name: 'eventCount' },
          { name: 'totalUsers' },
          { name: 'userEngagementDuration' },
        ],
        dimensionFilter: eventFilter,
        limit: '10000',
      },
      // 2: modelo x edad (reporte separado, mínimo de dimensiones para evitar umbrales)
      {
        dateRanges,
        dimensions: [...dimModeloDemo, { name: 'userAgeBracket' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: eventFilter,
        limit: '10000',
      },
      // 3: modelo x género (reporte separado, mínimo de dimensiones para evitar umbrales)
      {
        dateRanges,
        dimensions: [...dimModeloDemo, { name: 'userGender' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: eventFilter,
        limit: '10000',
      },
      // 4: modelo x hora (reporte separado)
      {
        dateRanges,
        dimensions: [...dimModeloCorte, { name: 'hour' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: eventFilter,
        limit: '10000',
      },
    ];

    const lote2 = [
      // 0: modelo x día (reporte separado)
      {
        dateRanges,
        dimensions: [...dimModeloCorte, { name: 'dayOfWeek' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: eventFilter,
        limit: '10000',
      },
      // 1: modelo x dispositivo (reporte separado)
      {
        dateRanges,
        dimensions: [...dimModeloCorte, { name: 'deviceCategory' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: eventFilter,
        limit: '10000',
      },
      // 2: modelo x región (reporte separado)
      {
        dateRanges,
        dimensions: [...dimModeloCorte, { name: 'region' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: eventFilter,
        limit: '10000',
      },
      // 3: modelo x ciudad (reporte separado)
      {
        dateRanges,
        dimensions: [...dimModeloCorte, { name: 'city' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: eventFilter,
        limit: '10000',
      },
      // 4: modelo x canal (reporte separado)
      {
        dateRanges,
        dimensions: [...dimModeloCorte, { name: 'sessionSource' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: eventFilter,
        limit: '10000',
      },
    ];

    const lote3 = [
      // 0: modelo x campaña (reporte separado)
      {
        dateRanges,
        dimensions: dimModeloCorte,
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: eventFilter,
        limit: '10000',
      },
    ];

    return { lote1, lote2, lote3 };
  };

  let rep1: any[];
  let rep2: any[];
  let rep3: any[];

  try {
    const lotes = construirLotes(true);
    // Ejecutar lotes secuencialmente (máx. 5 reportes concurrentes; cuota GA4 = 10)
    rep1 = await batchRunReports(propertyId, accessToken, lotes.lote1);
    rep2 = await batchRunReports(propertyId, accessToken, lotes.lote2);
    rep3 = await batchRunReports(propertyId, accessToken, lotes.lote3);
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.includes('customEvent:car_name') || msg.includes('customEvent:brand_name')) {
      usarCarName = false;
      avisosSet.add('La dimensión personalizada car_name no está registrada en GA4; se usó atribución por campaña UTM y página.');
      const lotes = construirLotes(false);
      rep1 = await batchRunReports(propertyId, accessToken, lotes.lote1);
      rep2 = await batchRunReports(propertyId, accessToken, lotes.lote2);
      rep3 = await batchRunReports(propertyId, accessToken, lotes.lote3);
    } else {
      throw err;
    }
  }

  const [rTotales, rBase, rEdad, rGenero, rHora] = rep1;
  const [rDia, rDispositivo, rRegion, rCiudad, rCanal] = rep2;
  const [rCampania] = rep3;

  // Detectar avisos de umbrales de privacidad y truncamiento de fechas
  if (rEdad?.metadata?.subjectToThresholding || !rEdad?.rows?.length) {
    avisosSet.add('Datos de edad (userAgeBracket) ocultos por umbrales de privacidad o Google Signals desactivado; se asignaron a "desconocido".');
  }
  if (rGenero?.metadata?.subjectToThresholding || !rGenero?.rows?.length) {
    avisosSet.add('Datos de género (userGender) ocultos por umbrales de privacidad o Google Signals desactivado; se asignaron a "desconocido".');
  }
  if (rBase?.metadata?.dataTruncationReasons?.length) {
    avisosSet.add('car_name y brand_name registran datos a partir del 2026-09-02; fechas previas usan fallback por campaña UTM / página.');
  }

  // Totales globales
  const totRow = rTotales?.rows?.[0]?.metricValues || [];
  const totales: TotalesGA = {
    usuarios: Number(totRow[0]?.value || 0),
    sesiones: Number(totRow[1]?.value || 0),
    vistas_modelo: 0,
    clics_whatsapp: 0,
  };

  const modelosMap = new Map<string, ModeloGA>();
  let tieneNissan = false;

  function obtenerOCrearModelo(canon: ModeloCanonico): ModeloGA {
    const key = `${canon.marca}::${canon.modelo}`;
    let m = modelosMap.get(key);
    if (!m) {
      m = crearModeloVacio(canon.modelo, canon.marca);
      modelosMap.set(key, m);
    }
    if (canon.marca === 'nissan') tieneNissan = true;
    return m;
  }

  // 1) Procesar reporte base por modelo
  for (const row of rBase?.rows || []) {
    const d = (row.dimensionValues || []).map((x: any) => String(x?.value || ''));
    const mv = (row.metricValues || []).map((x: any) => Number(x?.value || 0));

    const eventName = d[0];
    const carName = usarCarName ? d[1] : undefined;
    const brandName = usarCarName ? d[2] : undefined;
    const campaign = usarCarName ? d[3] : d[1];
    const pagePath = usarCarName ? d[4] : d[2];

    const count = mv[0] || 0;
    const users = mv[1] || 0;
    const engagementSec = Math.round(mv[2] || 0);

    const canon = resolverModelo(carName, brandName, campaign, pagePath);
    if (!canon) continue;

    const m = obtenerOCrearModelo(canon);
    m.usuarios += users;
    m.tiempo_interaccion_seg += engagementSec;

    if (esWhatsapp(eventName)) {
      m.clics_whatsapp += count;
      totales.clics_whatsapp += count;
    } else if (esVista(eventName)) {
      m.vistas += count;
      totales.vistas_modelo += count;
    }
  }

  // Helper para procesar cada corte separado
  function aplicarCorte(
    report: any,
    campoWhatsapp: keyof ModeloGA,
    campoVistas: keyof ModeloGA,
    normalizar: (val: string) => string | null,
    opciones: { esDemo?: boolean; esCampania?: boolean } = {},
  ) {
    const { esDemo = false, esCampania = false } = opciones;
    for (const row of report?.rows || []) {
      const d = (row.dimensionValues || []).map((x: any) => String(x?.value || ''));
      const count = Number(row.metricValues?.[0]?.value || 0);
      if (!count) continue;

      const eventName = d[0];
      let canon: ModeloCanonico | null;
      let dimVal: string;

      if (usarCarName && esDemo) {
        canon = resolverModelo(d[1]);
        dimVal = d[2];
      } else if (usarCarName) {
        const carName = d[1];
        const campaign = d[2];
        const pagePath = d[3];
        canon = resolverModelo(carName, undefined, campaign, pagePath);
        dimVal = esCampania ? campaign : d[4];
      } else {
        const campaign = d[1];
        const pagePath = d[2];
        canon = resolverModelo(undefined, undefined, campaign, pagePath);
        dimVal = esCampania ? campaign : d[3];
      }

      if (!canon) continue;
      const bucket = normalizar(dimVal);
      if (bucket === null) continue;

      const m = obtenerOCrearModelo(canon);
      if (esWhatsapp(eventName)) {
        const dict = m[campoWhatsapp] as Record<string, number>;
        dict[bucket] = (dict[bucket] || 0) + count;
      } else if (esVista(eventName)) {
        const dict = m[campoVistas] as Record<string, number>;
        dict[bucket] = (dict[bucket] || 0) + count;
      }
    }
  }

  aplicarCorte(rEdad, 'por_edad', 'por_edad_vistas', normEdad, { esDemo: true });
  aplicarCorte(rGenero, 'por_genero', 'por_genero_vistas', normGenero, { esDemo: true });
  aplicarCorte(rHora, 'por_hora', 'por_hora_vistas', normHora);
  aplicarCorte(rDia, 'por_dia', 'por_dia_vistas', normDia);
  aplicarCorte(rDispositivo, 'por_dispositivo', 'por_dispositivo_vistas', normDispositivo);
  aplicarCorte(rRegion, 'por_region', 'por_region_vistas', normRegion);
  aplicarCorte(rCiudad, 'por_ciudad', 'por_ciudad_vistas', normCiudad);
  aplicarCorte(rCanal, 'por_canal', 'por_canal_vistas', normCanal);
  aplicarCorte(
    rCampania,
    'por_campania',
    'por_campania_vistas',
    (v) => {
      const clean = limpiarTexto(v);
      return esVacioGA(clean) || clean === '(referral)' ? null : clean;
    },
    { esCampania: true },
  );

  // Si edad/género quedaron en 0 por umbrales de privacidad, asignar la diferencia a "desconocido"
  const sumaValores = (obj: Record<string, number>) => Object.values(obj).reduce((a, b) => a + b, 0);

  for (const m of modelosMap.values()) {
    const diffEdadW = m.clics_whatsapp - sumaValores(m.por_edad);
    if (diffEdadW > 0) m.por_edad.desconocido += diffEdadW;
    const diffEdadV = m.vistas - sumaValores(m.por_edad_vistas);
    if (diffEdadV > 0) m.por_edad_vistas.desconocido += diffEdadV;

    const diffGenW = m.clics_whatsapp - sumaValores(m.por_genero);
    if (diffGenW > 0) m.por_genero.desconocido += diffGenW;
    const diffGenV = m.vistas - sumaValores(m.por_genero_vistas);
    if (diffGenV > 0) m.por_genero_vistas.desconocido += diffGenV;
  }

  if (tieneNissan) {
    avisosSet.add('La propiedad G-XRDWZPQ4WT recibe tráfico de Stellantis y Nissan; los modelos Nissan se incluyen con marca "nissan".');
  }
  avisosSet.add('La zona horaria configurada en GA4 es America/Tijuana; "por_hora" refleja esa zona horaria.');

  const modelos = Array.from(modelosMap.values()).sort(
    (a, b) => (b.clics_whatsapp - a.clics_whatsapp) || (b.vistas - a.vistas) || a.modelo.localeCompare(b.modelo),
  );

  return {
    rango,
    propiedad: PROPIEDAD_MEDICION,
    avisos: Array.from(avisosSet),
    totales,
    modelos,
  };
}

// --- Handler serverless de Vercel ---

export default async function handler(req: any, res: any) {
  const acceso = claveValida(req);
  if (!acceso.ok) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(acceso.status).json({ error: acceso.error, requiereClave: acceso.requiereClave });
  }

  const rango = calcularRango(req.query?.desde, req.query?.hasta);
  if (!rango) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'Parámetros inválidos. Usa ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD con desde <= hasta.' });
  }

  const cacheKey = `${rango.desde}_${rango.hasta}`;
  const cached = reportCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    res.setHeader('Cache-Control', CACHE_CONTROL);
    res.setHeader('X-GA-Cache', 'HIT');
    return res.status(200).json(cached.data);
  }

  try {
    const data = await consultarGA4(rango);
    reportCache.set(cacheKey, { exp: Date.now() + CACHE_TTL_MS, data });
    res.setHeader('Cache-Control', CACHE_CONTROL);
    res.setHeader('X-GA-Cache', 'MISS');
    return res.status(200).json(data);
  } catch (e: any) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: e?.message || 'No se pudo consultar Google Analytics.' });
  }
}
