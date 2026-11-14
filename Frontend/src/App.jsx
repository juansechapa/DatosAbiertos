import React, { useEffect, useState } from 'react';

function App() {
  const [sismos, setSismos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [estadisticas, setEstadisticas] = useState(null);
  const [token, setToken] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Listado paginado con búsqueda
  useEffect(() => {
    const params = new URLSearchParams({ page, search: busqueda });
    fetch(`/api/sismos/?${params}`)
      .then(res => res.json())
      .then(data => {
        setSismos(data.results);
        setTotal(data.count);
      });
  }, [page, busqueda]);

  // Estadísticas dinámicas
  const cargarEstadisticas = (filtros = {}) => {
    const params = new URLSearchParams(filtros);
    fetch(`/api/estadisticas/?${params}`)
      .then(res => res.json())
      .then(setEstadisticas);
  };

  // Login y operación protegida
  const login = async () => {
    const res = await fetch('/api/api-token-auth/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'tu_password' })
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.token);
    }
  };

  const operacionProtegida = async () => {
    const res = await fetch('/api/ingesta-protegida/', {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}` }
    });
    if (res.status === 401) setMensaje('Rechazado: token inválido o ausente');
    else if (res.ok) setMensaje('Operación autorizada correctamente');
  };

  return (
    <div>
      <h1>Sismos USGS</h1>
      <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar lugar..." />
      <p>Total de registros: {total}</p>
      <ul>
        {sismos.map(s => (
          <li key={s.usgs_id}>{s.lugar} — M{s.magnitud} — {s.tiempo}</li>
        ))}
      </ul>
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>Anterior</button>
      <button onClick={() => setPage(p => p + 1)}>Siguiente</button>

      <h2>Estadísticas</h2>
      <button onClick={() => cargarEstadisticas()}>Ver globales</button>
      <button onClick={() => cargarEstadisticas({ tipo: 'earthquake', anio: 2025 })}>
        Filtrar terremotos 2025
      </button>
      {estadisticas && (
        <pre>{JSON.stringify(estadisticas, null, 2)}</pre>
      )}

      <h2>Autenticación</h2>
      <button onClick={login}>Iniciar sesión</button>
      <button onClick={operacionProtegida}>Probar operación protegida</button>
      <p>{mensaje}</p>
    </div>
  );
}

export default App;