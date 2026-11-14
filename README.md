# Proyecto Final: Datos Abiertos (Django + React)

Aplicación web propia que procesa, analiza y expone un gran volumen de datos públicos abiertos, integrando una API en Django REST Framework y un panel interactivo en React.

---

## 📋 Requisitos del Proyecto

### 1. Backend (Django + DRF + PostgreSQL)
- **Modelo de Datos y Admin:** Modelo del dominio con tipos de campos apropiados, registrado en el `/admin/` de Django con columnas visibles, buscador y filtros laterales.
- **Ingestión en Volumen:** Rutina de carga masiva (`manage.py` o endpoint) con consumo de fuente pública, limpieza de nulos/formato e inserción en bloque (`bulk_create(..., ignore_conflicts=True)`). Debe contar con **mínimo más de mil registros reales**.
- **API REST Completa:** Endpoints `/api/` para listar, ver detalle, crear, editar y eliminar registros con serializadores y vistas DRF.
- **Búsqueda, Ordenamiento y Filtrado:** Búsqueda libre, ordenamiento ascendente/descendente y filtrado por categoría o rangos, resuelto en SQL con el ORM.
- **Paginación:** Manejo de listados paginados (`PageNumberPagination`) devolviendo conteo total.
- **Estadísticas y Agregaciones (Eje Central):** Endpoint analítico con `aggregate` y `annotate` (conteos, promedios, sumas, mínimos/máximos) agrupados por al menos **dos dimensiones** y reactivos a los filtros.
- **Autenticación por Token:** Endpoint de login (`/api/auth/token/`), usuarios reales de Django y protección con `IsAuthenticated` (rechazo 401 sin cabecera `Authorization: Token ...`).

### 2. Frontend (React + Vite)
- **Exploración Paginada:** Controles de búsqueda, ordenamiento y filtro por categoría conectados a la API.
- **Tablero de Estadísticas Dinámicas:** Recálculo en tiempo real según filtros seleccionados por el usuario.
- **Flujo de Autenticación:** Login con usuario/contraseña, almacenamiento de token y prueba visual de operación protegida (401 vs 200).

### 3. Despliegue en Producción
- Despliegue en **Render** con PostgreSQL persistente, **Gunicorn** y **WhiteNoise**.

---

## 🚀 Inicio Rápido Local

### Backend
```powershell
cd Backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Configurar Backend/.env basado en .env.example
python manage.py migrate
python manage.py runserver
```

### Frontend
```powershell
cd Frontend
npm install
npm run dev
```
Acceso Frontend: http://localhost:5173  
Acceso Backend: http://localhost:8000
