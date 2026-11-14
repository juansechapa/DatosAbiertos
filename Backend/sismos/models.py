from django.db import models

class Sismo(models.Model):

    id_sismo = models.CharField(max_length=50, unique=True, db_index=True)
    magnitud = models.FloatField(null=True, blank=True, db_index=True)
    profundidad_km = models.FloatField()
    lugar = models.CharField(max_length=255)
    region = models.CharField(max_length=150, db_index=True, blank=True)
    rango_profundidad = models.CharField(max_length=20, db_index=True, blank=True)
    fecha_hora = models.DateTimeField(db_index=True)
    actualizado = models.DateTimeField(null=True, blank=True)
    latitud = models.FloatField(null=True, blank=True)
    longitud = models.FloatField(null=True, blank=True)
    tsunami = models.BooleanField(default=False)

    class Meta:
        ordering = ['-fecha_hora']
        indexes = [
            models.Index(fields=['region', 'rango_profundidad']),
            models.Index(fields=['-fecha_hora']),
        ]

    def __str__(self):
        return f"{self.id_sismo} - Mag {self.magnitud} ({self.lugar})"