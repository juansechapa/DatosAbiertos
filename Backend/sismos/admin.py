from django.contrib import admin
from .models import Sismo

@admin.register(Sismo)
class SismoAdmin(admin.ModelAdmin):
    list_display = ('id_sismo', 'magnitud', 'lugar', 'region', 'fecha_hora', 'profundidad_km', 'rango_profundidad', 'tsunami')
    search_fields = ('id_sismo', 'lugar', 'region')
    list_filter = ('rango_profundidad', 'region', 'tsunami')
    date_hierarchy = 'fecha_hora'