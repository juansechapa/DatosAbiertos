import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { API_URL, peticion, pedirOExplotar } from '../shared/api'
import './App.css'

export default function App() {
  const [seccion, setSeccion] = useState('exploracion')

  const [token, setToken] = useState(localStorage.getItem('auth_token') || '')
  const [usuario, setUsuario] = useState(localStorage.getItem('auth_user') || '')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [mensajeAuth, setMensajeAuth] = useState(null)
  const [resultadoProtegido, setResultadoProtegido] = useState(null)

  const [sismos, setSismos] = useState([])
  const [cargandoSismos, setCargandoSismos] = useState(false)
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [rangoProfundidad, setRangoProfundidad] = useState('')
  const [orden, setOrden] = useState('-fecha_hora')
  const [sismoDetalle, setSismoDetalle] = useState(null)

  const [estadisticas, setEstadisticas] = useState(null)
  const [cargandoStats, setCargandoStats] = useState(false)
  const [filtroRegionStats, setFiltroRegionStats] = useState('')
  const [filtroMagMinStats, setFiltroMagMinStats] = useState('')

  const [apiConectada, setApiConectada] = useState(null)

  const [magSimulador, setMagSimulador] = useState(5.0)

  useEffect(() => {
    peticion(`${API_URL}/`).then(() => setApiConectada(true)).catch(() => setApiConectada(false))
  }, [])

  useEffect(() => {
    if (seccion !== 'exploracion') return
    setCargandoSismos(true)
    const params = new URLSearchParams({ page: pagina })
    if (busqueda) params.append('search', busqueda)
    if (rangoProfundidad) params.append('rango', rangoProfundidad)
    if (orden) params.append('ordering', orden)
    pedirOExplotar(`${API_URL}/sismos/?${params}`)
      .then(({ datos }) => { setSismos(datos.results || []); setTotalRegistros(datos.count || 0) })
      .catch((err) => console.error(err))
      .finally(() => setCargandoSismos(false))
  }, [pagina, busqueda, rangoProfundidad, orden, seccion])

  useEffect(() => {
    if (seccion !== 'estadisticas') return
    setCargandoStats(true)
    const params = new URLSearchParams()
    if (filtroRegionStats) params.append('region', filtroRegionStats)
    if (filtroMagMinStats) params.append('mag_min', filtroMagMinStats)
    pedirOExplotar(`${API_URL}/estadisticas/?${params}`)
      .then(({ datos }) => setEstadisticas(datos))
      .catch((err) => console.error(err))
      .finally(() => setCargandoStats(false))
  }, [seccion, filtroRegionStats, filtroMagMinStats])

  function handleLogin(e) {
    e.preventDefault()
    setMensajeAuth({ tipo: 'info', texto: 'Iniciando sesion...' })
    fetch(`${API_URL}/auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.non_field_errors?.[0] || 'Credenciales inválidas')
        }
        return res.json()
      })
      .then((data) => {
        setToken(data.token)
        setUsuario(loginForm.username)
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', loginForm.username)
        setMensajeAuth({ tipo: 'exito', texto: '¡Sesion iniciada con exito! Token recibido.' })
        setLoginForm({ username: '', password: '' })
      })
      .catch((err) => setMensajeAuth({ tipo: 'error', texto: err.message }))
  }

  function handleLogout() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setToken(''); setUsuario('')
    setMensajeAuth({ tipo: 'info', texto: 'Sesión cerrada.' })
  }

  

  const totalPaginas = Math.ceil(totalRegistros / 20) || 1

  const datosGrafica = (estadisticas?.por_region_profundidad || [])
    .slice(0, 10)
    .map((item) => ({
      nombre: item.region?.length > 12 ? `${item.region.slice(0, 12)}...` : item.region || 'S/N',
      regionCompleta: item.region,
      sismos: item.conteo,
      magPromedio: item.magnitud_promedio ? parseFloat(item.magnitud_promedio.toFixed(2)) : 0,
    }))

  async function ejecutarImportacion() {
    setResultadoProtegido({ cargando: true, accion: 'importar' })
    try {
      const { datos, respuesta } = await pedirOExplotar(`${API_URL}/importar-datos/`, {
        method: 'POST',
      })
      setResultadoProtegido({
        status: respuesta.status,
        exito: true,
        mensaje: `${datos.status} (Total en DB: ${datos.total_en_db.toLocaleString()})`,
      })
    } catch (err) {
      setResultadoProtegido({
        status: err.status || 401,
        exito: false,
        mensaje: err.message,
      })
    }
  }

  async function ejecutarBorrado() {
    if (!window.confirm('¿Seguro que deseas eliminar TODOS los sismos de la base de datos?')) {
      return
    }

    setResultadoProtegido({ cargando: true, accion: 'borrar' })
    try {
      const { datos, respuesta } = await pedirOExplotar(`${API_URL}/borrar-datos/`, {
        method: 'POST',
        body: JSON.stringify({ confirmar: true }),
      })
      setResultadoProtegido({
        status: respuesta.status,
        exito: true,
        mensaje: datos.status,
      })
      setTotalRegistros(0)
      setSismos([])
    } catch (err) {
      setResultadoProtegido({
        status: err.status || 401,
        exito: false,
        mensaje: err.message,
      })
    }
  }

  // Cálculo interactivo de Gutenberg-Richter
function calcularEnergiaSimulador(mag) {
  const joules = Math.pow(10, 4.8 + 1.5 * mag)
  const tntToneladas = joules / 4.184e9
  let comparativa = 'Explosión de cantera / vibración local menor'
  if (mag >= 8.5) comparativa = 'Cataclismo continental masivo (similar a Valdivia o Sumatra)'
  else if (mag >= 7.5) comparativa = 'Terremoto mayor altamente destructivo (cientos de miles de ton. TNT)'
  else if (mag >= 6.0) comparativa = 'Equivalente a bombas atómicas tipo Hiroshima (~15.000 ton. TNT)'
  else if (mag >= 5.0) comparativa = 'Terremoto moderado perceptible en edificios e infraestructuras'
  else if (mag >= 4.0) comparativa = 'Sismo leve sentido por personas en reposo'

  return { joules, tntToneladas, comparativa }
}
  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="marca">
          <p className="brand-kicker">SismologIa Mundial</p>
          <h1>AnAlisis SIsmico</h1>
          <p className="masthead-note">
            Django + PostgreSQL + React
            {apiConectada !== null && (
              <span className={`api-status ${apiConectada ? 'online' : 'offline'}`}>
                <span className="dot" />
                {apiConectada ? 'API en línea' : 'API desconectada'}
              </span>
            )}
          </p>
        </div>
        <div className="masthead-controls">
          {token ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--texto-suave)' }}>
                👤 <strong style={{ color: 'var(--texto)' }}>{usuario || 'Autenticado'}</strong>
              </span>
              <button className="boton boton-secundario" onClick={handleLogout}>Cerrar sesión</button>
            </div>
          ) : (
            <button className="boton boton-primario" onClick={() => setSeccion('auth')}>🔐 Iniciar sesión</button>
          )}
        </div>
      </header>

      <nav className="tabs">
        <button className={`tab ${seccion === 'exploracion' ? 'activo' : ''}`} onClick={() => setSeccion('exploracion')}>📋 Exploración Paginada</button>
        <button className={`tab ${seccion === 'estadisticas' ? 'activo' : ''}`} onClick={() => setSeccion('estadisticas')}>📊 Tablero Analítico</button>
        <button className={`tab ${seccion === 'auth' ? 'activo' : ''}`} onClick={() => setSeccion('auth')}>🔐 Autenticación</button>
      </nav>

      <main>
        {seccion === 'exploracion' && (
          <section className="mission-workspace">
            <div className="panel-header">
              <div>
                <h2>Exploración de Eventos Sísmicos</h2>
                <p className="subtitulo">Filtra, busca y navega entre los eventos registrados</p>
              </div>
              <span className="total-badge">🌐 {totalRegistros.toLocaleString()} sismos</span>
            </div>

            <div className="controles">
              <input
                type="search"
                className="input-busqueda"
                placeholder="Buscar por lugar o región..."
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
              />
              <select className="select" value={rangoProfundidad} onChange={(e) => { setRangoProfundidad(e.target.value); setPagina(1) }}>
                <option value="">Todas las profundidades</option>
                <option value="Superficial">Superficial (&lt; 70 km)</option>
                <option value="Intermedio">Intermedio (70 - 300 km)</option>
                <option value="Profundo">Profundo (&gt; 300 km)</option>
              </select>
              <select className="select" value={orden} onChange={(e) => setOrden(e.target.value)}>
                <option value="-fecha_hora">Más recientes</option>
                <option value="fecha_hora">Más antiguos</option>
                <option value="-magnitud">Mayor magnitud</option>
                <option value="magnitud">Menor magnitud</option>
                <option value="-profundidad_km">Mayor profundidad</option>
              </select>
            </div>

            {cargandoSismos ? (
              <div className="estado-vacio"><span className="spinner" /> Cargando sismos...</div>
            ) : sismos.length === 0 ? (
              <div className="estado-vacio">No se encontraron sismos con los filtros actuales.</div>
            ) : (
              <div className="tabla-wrapper">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Magnitud</th>
                      <th>Lugar / Región</th>
                      <th>Profundidad</th>
                      <th>Categoría</th>
                      <th>Fecha y Hora (UTC)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sismos.map((s) => (
                      <tr key={s.id_sismo}>
                        <td>
                          <span className={`mag-badge ${s.magnitud >= 5 ? 'mag-alta' : s.magnitud >= 3 ? 'mag-media' : 'mag-baja'}`}>
                            {s.magnitud !== null ? s.magnitud.toFixed(1) : 'S/N'}
                          </span>
                        </td>
                        <td className="lugar-cell">
                          <strong>{s.region}</strong>
                          <small>{s.lugar}</small>
                        </td>
                        <td>{s.profundidad_km.toFixed(1)} km</td>
                        <td>{s.rango_profundidad}</td>
                        <td>{new Date(s.fecha_hora).toLocaleString()}</td>
                        <td>
                          <button className="boton boton-secundario" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => setSismoDetalle(s)}>
                            Ver detalle →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="paginacion">
              <span>Página <strong style={{ color: 'var(--texto)' }}>{pagina}</strong> de <strong style={{ color: 'var(--texto)' }}>{totalPaginas}</strong></span>
              <div className="paginacion-botones">
                <button className="boton" disabled={pagina <= 1 || cargandoSismos} onClick={() => setPagina((p) => Math.max(1, p - 1))}>← Anterior</button>
                <button className="boton" disabled={pagina >= totalPaginas || cargandoSismos} onClick={() => setPagina((p) => p + 1)}>Siguiente →</button>
              </div>
            </div>
          </section>
        )}

                {seccion === 'estadisticas' && (
          <section className="mission-workspace">
            <div className="panel-header">
              <div>
                <h2>Tablero Analítico (ORM)</h2>
                <p className="subtitulo">Métricas recalculadas en vivo directamente en PostgreSQL</p>
              </div>
            </div>

            {/* 1. FILTROS */}
            <div className="filtros-box">
              <div>
                <label>Filtrar por Región</label>
                <input
                  type="text"
                  className="input-texto"
                  placeholder="Ej: Puerto Rico, Chile, Japan..."
                  value={filtroRegionStats}
                  onChange={(e) => setFiltroRegionStats(e.target.value)}
                />
              </div>
              <div>
                <label>Magnitud mínima</label>
                <select
                  className="select"
                  value={filtroMagMinStats}
                  onChange={(e) => setFiltroMagMinStats(e.target.value)}
                >
                  <option value="">Todas las magnitudes</option>
                  <option value="3.0">≥ 3.0 Mag</option>
                  <option value="4.0">≥ 4.0 Mag</option>
                  <option value="5.0">≥ 5.0 Mag</option>
                  <option value="6.0">≥ 6.0 Mag</option>
                </select>
              </div>
              {(filtroRegionStats || filtroMagMinStats) && (
                <div style={{ alignSelf: 'flex-end' }}>
                  <button className="boton" onClick={() => { setFiltroRegionStats(''); setFiltroMagMinStats('') }}>
                    ✕ Limpiar filtros
                  </button>
                </div>
              )}
            </div>

            {/* 2. ESTADO DE CARGA */}
            {cargandoStats || !estadisticas ? (
              <div className="estado-vacio"><span className="spinner" /> Recalculando agregaciones...</div>
            ) : (
              <>
                {/* 3. TARJETAS GLOBALES */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">📊 Total Segmento</div>
                    <div className="stat-value">{estadisticas.globales.total.toLocaleString()}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">📈 Magnitud Promedio</div>
                    <div className="stat-value">
                      {estadisticas.globales.magnitud_promedio ? estadisticas.globales.magnitud_promedio.toFixed(2) : '0.00'}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">⚡ Magnitud Máxima</div>
                    <div className="stat-value">
                      {estadisticas.globales.magnitud_maxima ? estadisticas.globales.magnitud_maxima.toFixed(1) : '0.0'}
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">📏 Profundidad Media</div>
                    <div className="stat-value">
                      {estadisticas.globales.profundidad_promedio ? estadisticas.globales.profundidad_promedio.toFixed(1) : '0.0'}
                      <small>km</small>
                    </div>
                  </div>
                </div>

                {/* 4. HERRAMIENTA CIENTÍFICA (AQUÍ DEBE IR: DESPUÉS DE LAS 4 TARJETAS) */}
                <div style={{ background: 'var(--superficie-suave)', border: '1px solid var(--borde)', borderRadius: '8px', padding: '20px', margin: '24px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ margin: 0 }}>⚡ Calculadora de Energía Sísmica Liberada (Gutenberg-Richter)</h3>
                    <span style={{ fontSize: '0.8rem', background: 'var(--azul-claro)', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      log₁₀(E) = 4.8 + 1.5·M
                    </span>
                  </div>
                  
                  <p style={{ fontSize: '0.9rem', color: 'var(--texto-suave)', margin: '8px 0 16px' }}>
                    Energía total acumulada y calculada en PostgreSQL para el segmento de sismos seleccionado:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ background: 'var(--superficie)', padding: '12px', borderRadius: '6px', border: '1px solid var(--borde)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--texto-suave)' }}>Energía Sísmica Total</span>
                      <p style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '4px 0 0', color: 'var(--azul)' }}>
                        {estadisticas?.energia?.total_joules ? estadisticas.energia.total_joules.toExponential(2) : '0'} J
                      </p>
                    </div>
                    <div style={{ background: 'var(--superficie)', padding: '12px', borderRadius: '6px', border: '1px solid var(--borde)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--texto-suave)' }}>Equivalencia en TNT</span>
                      <p style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '4px 0 0', color: '#92400e' }}>
                        {estadisticas?.energia?.tnt_toneladas ? Math.round(estadisticas.energia.tnt_toneladas).toLocaleString() : '0'} Toneladas
                      </p>
                    </div>
                  </div>

                  <div style={{ background: 'var(--superficie)', padding: '16px', borderRadius: '6px', border: '1px dashed var(--borde-fuerte)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong>Simulador Interactivo de Magnitud:</strong>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--rojo)' }}>
                        Mag {magSimulador.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2.0"
                      max="9.0"
                      step="0.1"
                      value={magSimulador}
                      onChange={(e) => setMagSimulador(parseFloat(e.target.value))}
                      style={{ width: '100%', marginBottom: '12px' }}
                    />
                    {(() => {
                      const calc = calcularEnergiaSimulador(magSimulador)
                      return (
                        <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div><strong>Energía irradiada:</strong> {calc.joules.toExponential(2)} Joules (~{Math.round(calc.tntToneladas).toLocaleString()} toneladas de TNT)</div>
                          <div style={{ color: 'var(--texto-suave)' }}><strong>Impacto físico equivalente:</strong> {calc.comparativa}</div>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* 5. GRÁFICA DE RECHARTS */}
                <div className="chart-panel">
                  <h3>Top Regiones con Mayor Actividad Sísmica</h3>
                  {datosGrafica.length === 0 ? (
                    <div className="estado-vacio">No hay datos suficientes para graficar.</div>
                  ) : (
                    <div style={{ width: '100%', height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={datosGrafica} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#283354" />
                          <XAxis dataKey="nombre" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{ background: '#131b2e', border: '1px solid #283354', borderRadius: '8px', color: '#e8edf7' }}
                            formatter={(value) => [`${value} sismos`, '']}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.regionCompleta || label}
                          />
                          <Bar dataKey="sismos" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* 6. TABLA DETALLADA POR 2 DIMENSIONES */}
                <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Detalle Agrupado por Región y Rango de Profundidad</h3>
                <div className="tabla-wrapper">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Región Geográfica</th>
                        <th>Rango de Profundidad</th>
                        <th>Nº Sismos</th>
                        <th>Mag. Promedio</th>
                        <th>Mag. Máxima</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadisticas.por_region_profundidad.map((item, idx) => (
                        <tr key={idx}>
                          <td><strong>{item.region || 'Desconocida'}</strong></td>
                          <td>{item.rango_profundidad}</td>
                          <td>{item.conteo.toLocaleString()}</td>
                          <td>{item.magnitud_promedio ? item.magnitud_promedio.toFixed(2) : 'N/A'}</td>
                          <td style={{ color: 'var(--rojo)', fontWeight: 600 }}>
                            {item.magnitud_maxima ? item.magnitud_maxima.toFixed(1) : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}
        {seccion === 'auth' && (
          <section className="mission-workspace" style={{ padding: '24px', maxWidth: '650px' }}>
            <h2>Autenticación y Gestión de Datos</h2>
            <p style={{ color: 'var(--texto-suave)', marginBottom: '16px' }}>
              Inicia sesión con un usuario de Django para recibir el Token de acceso y desbloquear las operaciones protegidas.
            </p>
            {!token ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Usuario de Django</label>
                  <input
                    type="text"
                    required
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--borde)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Contraseña</label>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--borde)' }}
                  />
                </div>
                <button className="boton boton-primario" type="submit" style={{ marginTop: '8px' }}>
                  Iniciar Sesión
                </button>
              </form>
            ) : (
              <div style={{ padding: '16px', background: 'var(--azul-claro)', borderRadius: '6px', marginBottom: '24px' }}>
                <p style={{ margin: 0 }}>
                  Sesión activa como: <strong>{usuario}</strong>
                </p>
                
              </div>
            )}
            {mensajeAuth && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  background: mensajeAuth.tipo === 'error' ? '#fde8e8' : '#eaf5ea',
                  color: mensajeAuth.tipo === 'error' ? 'var(--rojo)' : 'var(--verde)',
                }}
              >
                {mensajeAuth.texto}
              </div>
            )}
            <hr style={{ borderColor: 'var(--borde)', margin: '24px 0' }} />
            <h3>Operaciones Protegidas (Requieren Token)</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--texto-suave)', marginBottom: '16px' }}>
              Si intentas ejecutar estas acciones sin haber iniciado sesión, el servidor responderá <strong>401 Unauthorized</strong>.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="boton boton-primario"
                type="button"
                onClick={ejecutarImportacion}
                disabled={resultadoProtegido?.cargando}
              >
                {resultadoProtegido?.cargando && resultadoProtegido.accion === 'importar'
                  ? 'Sincronizando con USGS...'
                  : 'Importar / Sincronizar Sismos'}
              </button>
              <button
                className="boton"
                type="button"
                style={{ background: 'var(--rojo)', color: 'white', borderColor: 'var(--rojo)' }}
                onClick={ejecutarBorrado}
                disabled={resultadoProtegido?.cargando}
              >
                {resultadoProtegido?.cargando && resultadoProtegido.accion === 'borrar'
                  ? 'Eliminando registros...'
                  : 'Borrar Todos los Sismos'}
              </button>
            </div>
            {resultadoProtegido && !resultadoProtegido.cargando && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  borderRadius: '4px',
                  background: resultadoProtegido.exito ? '#eaf5ea' : '#fde8e8',
                  color: resultadoProtegido.exito ? 'var(--verde)' : 'var(--rojo)',
                }}
              >
                <strong>Status {resultadoProtegido.status}:</strong> {resultadoProtegido.mensaje}
              </div>
            )}
          </section>
        )}
      </main>

      {sismoDetalle && (
        <div className="modal-overlay" onClick={() => setSismoDetalle(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle del Evento Sísmico</h3>
              <button className="boton boton-secundario" onClick={() => setSismoDetalle(null)}>✕</button>
            </div>

            <p className="modal-lugar">{sismoDetalle.lugar}</p>

            <div className="detalle-grid">
              <div><strong>ID USGS</strong><code>{sismoDetalle.id_sismo}</code></div>
              <div><strong>Magnitud</strong><span style={{ color: 'var(--rojo)', fontWeight: 700, fontSize: '16px' }}>{sismoDetalle.magnitud}</span></div>
              <div><strong>Profundidad</strong>{sismoDetalle.profundidad_km} km</div>
              <div><strong>Rango</strong>{sismoDetalle.rango_profundidad}</div>
              <div><strong>Latitud</strong>{sismoDetalle.latitud ?? 'N/D'}</div>
              <div><strong>Longitud</strong>{sismoDetalle.longitud ?? 'N/D'}</div>
              <div><strong>Alerta Tsunami</strong>{sismoDetalle.tsunami ? '🌊 Sí' : 'No'}</div>
              <div><strong>Fecha UTC</strong>{new Date(sismoDetalle.fecha_hora).toUTCString()}</div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <a href={`https://earthquake.usgs.gov/earthquakes/eventpage/${sismoDetalle.id_sismo}`} target="_blank" rel="noreferrer" style={{ color: 'var(--azul)', fontSize: '13px' }}>
                Ver reporte oficial en USGS ↗
              </a>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        API Django <span>·</span> React <span>·</span> PostgreSQL
      </footer>
    </div>
  )
}