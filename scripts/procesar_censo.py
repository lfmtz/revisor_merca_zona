"""
Procesa el Censo 2020 (INEGI) por AGEB urbana + Marco Geoestadístico 2020
→ JSON compacto con centroide (lat/lon) e indicadores por AGEB para la app.

Uso: python3 -I procesar_censo.py <dir_datos> <salida.json> <ent> [<ent> ...]
  <dir_datos> contiene, por entidad EE:
    - ageb_mza_urbana_EE_cpv2020_csv.zip   (Censo: conjunto_de_datos_ageb_urbana_EE_cpv2020.csv)
    - EE_*.zip del Marco Geoestadístico     (capa EEa.shp = AGEB urbanas)
"""
import csv, io, json, sys, zipfile, glob, os
import shapefile
from pyproj import CRS, Transformer

VARS = ['POBTOT', 'POBFEM', 'POBMAS', 'POB0_14', 'P_18A24', 'P_18YMAS', 'P_60YMAS', 'POB15_64',
        'GRAPROES', 'PEA', 'POCUPADA', 'PDER_SS', 'TVIVPARHAB', 'PROM_OCUP',
        'VPH_AUTOM', 'VPH_MOTO', 'VPH_PC', 'VPH_INTER', 'VPH_CEL', 'VPH_STVP', 'VPH_SPMVPI']


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None  # '*', 'N/D', vacío


def leer_censo(zpath):
    out = {}
    with zipfile.ZipFile(zpath) as z:
        nombre = next(n for n in z.namelist() if n.lower().endswith('.csv') and 'conjunto_de_datos' in n.lower())
        with z.open(nombre) as f:
            r = csv.DictReader(io.TextIOWrapper(f, encoding='utf-8-sig', errors='replace'))
            for row in r:
                if 'total ageb' not in (row.get('NOM_LOC') or '').lower():
                    continue
                cve = f"{row['ENTIDAD'].zfill(2)}{row['MUN'].zfill(3)}{row['LOC'].zfill(4)}{row['AGEB'].strip()}"
                d = {k: num(row.get(k)) for k in VARS}
                d['mun'] = row.get('NOM_MUN', '')
                out[cve] = d
    return out


def centroide(puntos):
    # Centroide por área (fórmula del polígono); si falla, promedio de vértices
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(puntos, puntos[1:] + puntos[:1]):
        f = x0 * y1 - x1 * y0
        a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f
    if abs(a) < 1e-9:
        xs, ys = zip(*puntos)
        return sum(xs) / len(xs), sum(ys) / len(ys)
    return cx / (3 * a), cy / (3 * a)


def leer_agebs(zpath, ent):
    with zipfile.ZipFile(zpath) as z:
        base = next(n[:-4] for n in z.namelist() if n.lower().endswith(f'/{ent}a.shp') or n.lower() == f'{ent}a.shp')
        shp = io.BytesIO(z.read(base + '.shp')); dbf = io.BytesIO(z.read(base + '.dbf'))
        shx = io.BytesIO(z.read(base + '.shx')); prj = z.read(base + '.prj').decode('latin-1')
    tr = Transformer.from_crs(CRS.from_wkt(prj), CRS.from_epsg(4326), always_xy=True)
    sf = shapefile.Reader(shp=shp, dbf=dbf, shx=shx, encoding='latin-1')
    campos = [f[0] for f in sf.fields[1:]]
    out = {}
    for sr in sf.iterShapeRecords():
        rec = dict(zip(campos, sr.record))
        pts = sr.shape.points
        parts = list(sr.shape.parts) + [len(pts)]
        anillo = max((pts[parts[i]:parts[i + 1]] for i in range(len(parts) - 1)), key=len)
        x, y = centroide(anillo)
        lon, lat = tr.transform(x, y)
        out[rec['CVEGEO']] = (round(lat, 5), round(lon, 5))
    return out


def pct(a, b):
    return round(100 * a / b, 1) if a is not None and b else None


def main():
    dir_datos, salida, ents = sys.argv[1], sys.argv[2], sys.argv[3:]
    registros = []
    for ent in ents:
        censo = leer_censo(glob.glob(os.path.join(dir_datos, f'ageb_mza_urbana_{ent}_*.zip'))[0])
        geo = leer_agebs(glob.glob(os.path.join(dir_datos, f'{ent}_*.zip'))[0], ent)
        unidos = 0
        for cve, d in censo.items():
            if cve not in geo or not d['POBTOT']:
                continue
            lat, lon = geo[cve]
            viv = d['TVIVPARHAB']
            p = d['POBTOT']
            p25_59 = None
            if None not in (d['P_18YMAS'], d['P_18A24'], d['P_60YMAS']):
                p25_59 = d['P_18YMAS'] - d['P_18A24'] - d['P_60YMAS']
            registros.append([
                cve, lat, lon, d['mun'], int(p),
                d['POB0_14'], d['P_18A24'], p25_59, d['P_60YMAS'],       # edades (personas)
                d['GRAPROES'],                                          # escolaridad promedio (años)
                d['POCUPADA'], d['PDER_SS'],                            # ocupados, con seguridad social
                int(viv) if viv else None, d['PROM_OCUP'],              # viviendas, ocupantes promedio
                pct(d['VPH_AUTOM'], viv), pct(d['VPH_MOTO'], viv),      # % viviendas con auto / moto
                pct(d['VPH_INTER'], viv), pct(d['VPH_PC'], viv),        # % internet / computadora
                pct(d['VPH_STVP'], viv), pct(d['VPH_SPMVPI'], viv),     # % TV de paga / streaming
            ])
            unidos += 1
        print(f'entidad {ent}: {len(censo)} AGEB en censo, {len(geo)} en mapa, {unidos} unidos')
    campos = ['cvegeo', 'lat', 'lon', 'mun', 'pob', 'p0_14', 'p18_24', 'p25_59', 'p60', 'esc',
              'ocupados', 'seg_social', 'viv', 'ocup_viv', 'auto', 'moto', 'internet', 'pc', 'tvpaga', 'streaming']
    with open(salida, 'w', encoding='utf-8') as f:
        json.dump({'fuente': 'INEGI, Censo de Población y Vivienda 2020 (AGEB urbana) + Marco Geoestadístico 2020',
                   'campos': campos, 'agebs': registros}, f, ensure_ascii=False, separators=(',', ':'))
    print('AGEBs:', len(registros), '→', salida, os.path.getsize(salida) // 1024, 'KB')


if __name__ == '__main__':
    main()
