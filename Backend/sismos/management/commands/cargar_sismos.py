import requests
from datetime import datetime, timezone
from django.core.management.base import BaseCommand
from sismos.models import Sismo

URL_USGS = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"


class Command(BaseCommand):
    help = 'Descarga sismos reales desde USGS e inserta masivamente con bulk_create'

    def handle(self, *args, **options):
        self.stdout.write("1. Descargando datos desde la API de USGS...")
        
        try:
            resp = requests.get(URL_USGS, timeout=60)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error al descargar datos: {e}"))
            return

        features = data.get('features', [])
        self.stdout.write(f"2. Se recibieron {len(features)} sismos. Procesando datos...")

        sismos_para_insertar = []

        for f in features:
            props = f.get('properties', {})
            geom = f.get('geometry', {})
            coords = geom.get('coordinates', [])

            id_sismo = f.get('id')
            if not id_sismo or not props.get('time'):
                continue

            mag = props.get('mag')
            magnitud = round(float(mag), 2) if mag is not None else None

            longitud = float(coords[0]) if len(coords) > 0 and coords[0] is not None else None
            latitud = float(coords[1]) if len(coords) > 1 and coords[1] is not None else None
            profundidad_km = float(coords[2]) if len(coords) > 2 and coords[2] is not None else 0.0

            if profundidad_km < 70:
                rango_profundidad = 'Superficial'
            elif profundidad_km <= 300:
                rango_profundidad = 'Intermedio'
            else:
                rango_profundidad = 'Profundo'

            lugar = props.get('place') or 'Ubicacion no especificada'
            region = lugar.split(',')[-1].strip() if ',' in lugar else lugar.strip()

            fecha_hora = datetime.fromtimestamp(props['time'] / 1000.0, tz=timezone.utc)
            actualizado = (
                datetime.fromtimestamp(props['updated'] / 1000.0, tz=timezone.utc)
                if props.get('updated') else None
            )

            tsunami = bool(props.get('tsunami', 0))

            sismos_para_insertar.append(
                Sismo(
                    id_sismo=id_sismo,
                    magnitud=magnitud,
                    profundidad_km=profundidad_km,
                    lugar=lugar[:255],
                    region=region[:150],
                    rango_profundidad=rango_profundidad,
                    fecha_hora=fecha_hora,
                    actualizado=actualizado,
                    latitud=latitud,
                    longitud=longitud,
                    tsunami=tsunami,
                )
            )

        self.stdout.write(f"3. Guardando {len(sismos_para_insertar)} sismos en PostgreSQL...")

        Sismo.objects.bulk_create(
            sismos_para_insertar,
            batch_size=1000,
            ignore_conflicts=True
        )

        total_db = Sismo.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f"¡Insercion masiva completada con exito!\n"
            f" Total de registros en la base de datos: {total_db}"
        ))