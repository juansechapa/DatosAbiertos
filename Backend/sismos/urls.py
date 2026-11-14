from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from .views import SismoViewSet, EstadisticasSismos, ImportarDatosView, BorrarDatosView

router = DefaultRouter()
router.register(r'sismos', SismoViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('estadisticas/', EstadisticasSismos.as_view(), name='estadisticas'),
    path('auth/token/', obtain_auth_token, name='api_token_auth'),
    path('api-token-auth/', obtain_auth_token),
    path('importar-datos/', ImportarDatosView.as_view(), name='importar_datos'),
    path('borrar-datos/', BorrarDatosView.as_view(), name='borrar_datos'),
    path('operacion-protegida/', ImportarDatosView.as_view()),

    re_path(r'^(?!api/|admin/|static/).*$', TemplateView.as_view(template_name='index.html')),
]