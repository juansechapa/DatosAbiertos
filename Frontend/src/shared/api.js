export const API_URL = import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : '/api'

export class FallaApi extends Error {
  constructor(tipo, mensaje, status = null) {
    super(mensaje)
    this.tipo = tipo
    this.status = status
  }
}

const PISTAS_HTTP = {
  400: 'HTTP 400 · Solicitud incorrecta o datos inválidos.',
  401: 'HTTP 401 · No autorizado: se requiere token válido.',
  403: 'HTTP 403 · Prohibido: no tienes permisos para esta acción.',
  404: 'HTTP 404 · Recurso no encontrado.',
  405: 'HTTP 405 · Método HTTP no permitido.',
  500: 'HTTP 500 · Error interno del servidor en Django.',
}

export async function peticion(ruta, opciones = {}) {
  const inicio = performance.now()
  const token = localStorage.getItem('auth_token')

  const cabeceras = {
    'Content-Type': 'application/json',
    ...(opciones.headers || {}),
  }

  if (token && !cabeceras.Authorization) {
    cabeceras.Authorization = `Token ${token}`
  }

  try {
    const respuesta = await fetch(ruta, {
      ...opciones,
      headers: cabeceras,
    })
    return { respuesta, ms: Math.round(performance.now() - inicio) }
  } catch {
    throw new FallaApi(
      'cors',
      'No hubo respuesta de Django. Verifica que el backend esté corriendo en el puerto 8000 y CORS esté configurado.',
    )
  }
}

export async function pedirOExplotar(ruta, opciones = {}) {
  const { respuesta, ms } = await peticion(ruta, opciones)
  if (!respuesta.ok) {
    let detalle = PISTAS_HTTP[respuesta.status] || `HTTP ${respuesta.status} · Error en la petición`
    try {
      const errJson = await respuesta.json()
      if (errJson.detail) detalle = errJson.detail
      else if (errJson.error) detalle = errJson.error
    } catch {
      // Ignorar si no es json
    }
    throw new FallaApi('http', detalle, respuesta.status)
  }

  let datos
  try {
    datos = await respuesta.json()
  } catch {
    throw new FallaApi('json', 'El servidor respondió con un formato que no es JSON.')
  }
  return { respuesta, ms, datos }
}
