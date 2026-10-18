/* ==========================================================================
LÓGICA DEL SISTEMA DE GESTIÓN DE TURNOS MÉDICOS
========================================================================== */

// --- Estado Global ---
let turnosAgendados = [];

// --- Configuración de Horarios del Consultorio ---
const HORARIO_INICIO = 8;  // 08:00 hs
const HORARIO_FIN = 18;    // 18:00 hs
const INTERVALO_MINUTOS = 30;

// --- Inicialización al Cargar el DOM ---
document.addEventListener('DOMContentLoaded', () => {
establecerFechaMinima();
cargarTurnosLocalStorage();
generarHorariosDisponibles();
renderizarTurnos();
actualizarAnioActual();
});

// --- Configura la fecha mínima en el calendario (Hoy en adelante) ---
function establecerFechaMinima() {
const selectorFecha = document.getElementById('fecha-turno');
const hoy = new Date();
const aaaa = hoy.getFullYear();
const mm = String(hoy.getMonth() + 1).padStart(2, '0');
const dd = String(hoy.getDate()).padStart(2, '0');

const fechaMinima = `${aaaa}-${mm}-${dd}`;
selectorFecha.min = fechaMinima;
selectorFecha.value = fechaMinima;


}

// --- Genera las opciones de horarios cada 30 minutos ---
function generarHorariosDisponibles() {
const selectorHorario = document.getElementById('horario-turno');
const valorSeleccionado = selectorHorario.value;

selectorHorario.innerHTML = '<option value="">Seleccionar horario</option>';

const fechaSeleccionada = document.getElementById('fecha-turno').value;

for (let hora = HORARIO_INICIO; hora < HORARIO_FIN; hora++) {
    for (let min = 0; min < 60; min += INTERVALO_MINUTOS) {
        const horaFormateada = String(hora).padStart(2, '0');
        const minFormateado = String(min).padStart(2, '0');
        const horaTexto = `${horaFormateada}:${minFormateado}`;

        const estaOcupado = verificarHorarioOcupado(fechaSeleccionada, horaTexto);

        const opcion = document.createElement('option');
        opcion.value = horaTexto;

        if (estaOcupado) {
            opcion.textContent = `${horaTexto} ❌ (OCUPADO)`;
            opcion.disabled = true;
            opcion.style.color = '#ef4444';
        } else {
            opcion.textContent = `${horaTexto} hs`;
        }

        selectorHorario.appendChild(opcion);
    }
}

// Mantener la selección si sigue disponible
if (valorSeleccionado && !verificarHorarioOcupado(fechaSeleccionada, valorSeleccionado)) {
    selectorHorario.value = valorSeleccionado;
}


}

// --- Comprueba si un horario ya está reservado en la fecha seleccionada ---
function verificarHorarioOcupado(fecha, hora) {
if (!fecha || !hora) return false;
return turnosAgendados.some(t => t.fecha === fecha && t.horario === hora);
}

// --- Reacciona al cambio de fecha o especialidad para actualizar alertas ---
function actualizarEstadoHorarios() {
generarHorariosDisponibles();

const fecha = document.getElementById('fecha-turno').value;
const hora = document.getElementById('horario-turno').value;
const alertaConflicto = document.getElementById('alerta-conflicto');
const btnCargar = document.getElementById('btn-cargar');

if (hora && verificarHorarioOcupado(fecha, hora)) {
    alertaConflicto.classList.remove('oculta');
    btnCargar.disabled = true;
} else {
    alertaConflicto.classList.add('oculta');
    btnCargar.disabled = false;
}


}

// --- Procesa el formulario para registrar un turno ---
function procesarFormulario(evento) {
evento.preventDefault();

const nombre = document.getElementById('nombre-paciente').value.trim();
const fecha = document.getElementById('fecha-turno').value;
const horario = document.getElementById('horario-turno').value;
const especialidad = document.getElementById('especialidad').value;

// Validación extra de seguridad por solapamiento
if (verificarHorarioOcupado(fecha, horario)) {
    mostrarNotificacion('⚠️ El horario seleccionado ya está ocupado.');
    return;
}

const nuevoTurno = {
    id: Date.now().toString(),
    nombre,
    fecha,
    horario,
    especialidad
};

turnosAgendados.push(nuevoTurno);
guardarTurnosLocalStorage();

// Reiniciar formulario
document.getElementById('nombre-paciente').value = '';
document.getElementById('especialidad').value = '';
document.getElementById('horario-turno').value = '';

actualizarEstadoHorarios();
renderizarTurnos();
mostrarNotificacion('✅ Turno agendado con éxito');


}

// --- Renderiza el panel derecho con el listado de turnos ---
function renderizarTurnos() {
const contenedor = document.getElementById('contenedor-turnos');
const contador = document.getElementById('contador-turnos');

contador.textContent = `${turnosAgendados.length} Turnos`;

if (turnosAgendados.length === 0) {
    contenedor.innerHTML = `
        <div class="estado-vacio">
            <div class="icono-vacio">📅</div>
            <p>No hay turnos registrados en la agenda.</p>
        </div>
    `;
    return;
}

// Ordenar turnos cronológicamente (Fecha y Hora)
const turnosOrdenados = [...turnosAgendados].sort((a, b) => {
    const fechaA = new Date(`${a.fecha}T${a.horario}`);
    const fechaB = new Date(`${b.fecha}T${b.horario}`);
    return fechaA - fechaB;
});

contenedor.innerHTML = turnosOrdenados.map(turno => {
    const fechaFormateada = formatearFecha(turno.fecha);
    
    return `
        <article class="tarjeta-turno">
            <div class="info-paciente">
                <h3>${escaparHTML(turno.nombre)}</h3>
                <p><span>🩺</span> ${escaparHTML(turno.especialidad)}</p>
                <p><span>📅</span> ${fechaFormateada}</p>
            </div>
            <div class="detalles-horario">
                <span class="hora-badge">🕒 ${turno.horario} hs</span>
                <button 
                    class="btn-eliminar" 
                    onclick="eliminarTurno('${turno.id}')"
                    title="Eliminar este turno"
                >
                    🗑️ Eliminar
                </button>
            </div>
        </article>
    `;
}).join('');


}

// --- Elimina un turno agendado por su ID ---
function eliminarTurno(id) {
turnosAgendados = turnosAgendados.filter(t => t.id !== id);
guardarTurnosLocalStorage();
actualizarEstadoHorarios();
renderizarTurnos();
mostrarNotificacion('🗑️ Turno eliminado correctamente.');
}

// --- Persistencia en localStorage ---
function guardarTurnosLocalStorage() {
localStorage.setItem('mediturnos_datos', JSON.stringify(turnosAgendados));
}

function cargarTurnosLocalStorage() {
const datosGuardados = localStorage.getItem('mediturnos_datos');
if (datosGuardados) {
try {
turnosAgendados = JSON.parse(datosGuardados);
} catch (e) {
turnosAgendados = [];
}
}
}

// --- Utilidades ---
function formatearFecha(fechaStr) {
const partes = fechaStr.split('-');
if (partes.length !== 3) return fechaStr;
return ${partes[2]}/${partes[1]}/${partes[0]};
}

function escaparHTML(texto) {
const div = document.createElement('div');
div.textContent = texto;
return div.innerHTML;
}

function mostrarNotificacion(mensaje) {
const notif = document.getElementById('notificacion');
const msg = document.getElementById('notificacion-mensaje');

msg.textContent = mensaje;
notif.classList.remove('oculta');

setTimeout(() => {
    ocultarNotificacion();
}, 3500);


}

function ocultarNotificacion() {
const notif = document.getElementById('notificacion');
notif.classList.add('oculta');
}

function actualizarAnioActual() {
const anioSpan = document.getElementById('anio-actual');
if (anioSpan) {
anioSpan.textContent = new Date().getFullYear();
}
}
