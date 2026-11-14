from rest_framework import viewsets, filters, permissions
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from django.db.models import Avg, Max, Min, Count, Sum, F, FloatField
from django.db.models.functions import Power
from django.core.management import call_command
from .paginacion import PaginacionSismos

from .models import Sismo
from .serializers import SismoSerializer



class SismoViewSet(viewsets.ModelViewSet):
    queryset = Sismo.objects.all()
    serializer_class = SismoSerializer
    pagination_class = PaginacionSismos
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['lugar', 'region', 'id_sismo']
    ordering_fields = ['magnitud', 'fecha_hora', 'profundidad_km']
    ordering = ['-fecha_hora']
    

    def get_queryset(self):
        qs = super().get_queryset()
        region = self.request.query_params.get('region')
        rango = self.request.query_params.get('rango')
        mag_min = self.request.query_params.get('mag_min')

        if region:
            qs = qs.filter(region__icontains=region)
        if rango:
            qs = qs.filter(rango_profundidad=rango)
        if mag_min:
            qs = qs.filter(magnitud__gte=float(mag_min))
        return qs


class EstadisticasSismos(APIView):
    def get(self, request):
        qs = Sismo.objects.all()

        region = request.query_params.get('region')
        anio = request.query_params.get('anio')
        mag_min = request.query_params.get('mag_min')

        if region:
            qs = qs.filter(region__icontains=region)
        if anio:
            qs = qs.filter(fecha_hora__year=anio)
        if mag_min:
            qs = qs.filter(magnitud__gte=float(mag_min))

        globales = qs.aggregate(
            total=Count('id'),
            magnitud_promedio=Avg('magnitud'),
            magnitud_maxima=Max('magnitud'),
            magnitud_minima=Min('magnitud'),
            profundidad_promedio=Avg('profundidad_km'),
        )

        por_region_profundidad = (
            qs.values('region', 'rango_profundidad')
              .annotate(
                  conteo=Count('id'),
                  magnitud_promedio=Avg('magnitud'),
                  magnitud_maxima=Max('magnitud'),
              )
              .order_by('-conteo')[:20]
        )

        qs_con_mag = qs.filter(magnitud__isnull=False)
        calc_energia = qs_con_mag.annotate(
            joules=Power(10.0, 4.8 + (1.5 * F ('magnitud')), output_field=FloatField())
        ).aggregate(total_joules=Sum('joules'))

        total_joules = calc_energia.get('total_joules') or 0.0
        tnt_toneladas = total_joules / 4.18e9

        return Response({
            'globales' : globales,
            'por_region_profundidad' : list(por_region_profundidad),
            'energia' : {
                'total_joules' : total_joules,
                'tnt_toneladas' : tnt_toneladas,
                'tnt_megatones' : tnt_toneladas / 1e6,
            } 
        })

class ImportarDatosView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        try:
            call_command('cargar_sismos')
            total = Sismo.objects.count()
            return Response({
                'status': 'Sincronización masiva con USGS completada con éxito.',
                'total_en_db': total,
                'usuario': request.user.username
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)
        
class BorrarDatosView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request):
        confirmar = request.data.get('confirmar')
        if not confirmar:
            return Response(
                {'error': 'Para ejecutar el borrado debes enviar {"confirmar": true}.'},
                status=400
            )
        total_borrados, _ = Sismo.objects.all().delete()
        return Response({
            'status': f'Se han eliminado {total_borrados} sismos de la base de datos.',
            'total_en_db': 0,
            'usuario': request.user.username
        })