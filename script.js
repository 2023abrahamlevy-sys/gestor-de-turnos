
const STORAGE_KEY = "mediturnos_appointments_v1";
const OPEN_HOUR = 8;
const CLOSE_HOUR = 18;
const SLOT_MINUTES = 30;

const form = document.getElementById("appointmentForm");
const patientName = document.getElementById("patientName");
const specialty = document.getElementById("specialty");
const appointmentDate = document.getElementById("appointmentDate");
const appointmentTime = document.getElementById("appointmentTime");
const notes = document.getElementById("notes");
const formMessage = document.getElementById("formMessage");
const appointmentList = document.getElementById("appointmentList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const filterDate = document.getElementById("filterDate");
const clearFilter = document.getElementById("clearFilter");

const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");
const editMessage = document.getElementById("editMessage");

let appointments = loadAppointments();

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString, options = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
}) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString("es-AR", options);
}

function loadAppointments() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const data = saved ? JSON.parse(saved) : [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error al cargar turnos:", error);
    return [];
  }
}

function saveAppointments() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    return true;
  } catch (error) {
    console.error("Error al guardar turnos:", error);
    showMessage(
      formMessage,
      "No se pudieron guardar los turnos en este navegador.",
      "error"
    );
    return false;
  }
}

function showMessage(element, message, type = "") {
  element.textContent = message;
  element.className = `message ${type}`;
}

function makeTimeSlots() {
  const slots = [];

  for (
    let minutes = OPEN_HOUR * 60;
    minutes < CLOSE_HOUR * 60;
    minutes += SLOT_MINUTES
  ) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mins = String(minutes % 60).padStart(2, "0");
    slots.push(`${hours}:${mins}`);
  }

  return slots;
}

const timeSlots = makeTimeSlots();

function isSlotTaken(date, time, exceptId = null) {
  return appointments.some(item =>
    item.date === date &&
    item.time === time &&
    item.id !== exceptId
  );
}

function fillTimeOptions(select, date, selectedTime = "", exceptId = null) {
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = date
    ? "Seleccioná un horario"
    : "Primero elegí una fecha";

  select.appendChild(placeholder);

  if (!date) {
    select.disabled = true;
    return;
  }

  const today = localDateString();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let availableCount = 0;

  timeSlots.forEach(time => {
    const [hour, minute] = time.split(":").map(Number);
    const isPastToday =
      date === today &&
      hour * 60 + minute <= currentMinutes;

    const taken = isSlotTaken(date, time, exceptId);

    if (!taken && !isPastToday) {
      availableCount++;
    }

    const option = document.createElement("option");
    option.value = time;
    option.textContent = `${time}${
      taken ? " — Ocupado" : isPastToday ? " — Pasado" : ""
    }`;
    option.disabled = taken || isPastToday;

    if (time === selectedTime && !option.disabled) {
      option.selected = true;
    }

    select.appendChild(option);
  });

  select.disabled = false;

  if (availableCount === 0) {
    placeholder.textContent = "No hay horarios disponibles";
    select.value = "";
  } else if (
    selectedTime &&
    !isSlotTaken(date, selectedTime, exceptId)
  ) {
    const selectedOption = [...select.options].find(
      option => option.value === selectedTime && !option.disabled
    );

    select.value = selectedOption ? selectedTime : "";
  }
}

function updateStats() {
  const today = localDateString();

  document.getElementById("totalCount").textContent =
    appointments.length;

  document.getElementById("todayCount").textContent =
    appointments.filter(item => item.date === today).length;

  document.getElementById("specialtyCount").textContent =
    new Set(appointments.map(item => item.specialty)).size;

  document.getElementById("agendaTotal").textContent =
    `${appointments.length} ${
      appointments.length === 1 ? "turno" : "turnos"
    }`;
}

function renderAppointments() {
  const query = searchInput.value.trim().toLocaleLowerCase("es");
  const dateFilter = filterDate.value;

  const visible = appointments
    .filter(item => {
      const matchesDate = !dateFilter || item.date === dateFilter;
      const matchesSearch =
        !query ||
        item.name.toLocaleLowerCase("es").includes(query) ||
        item.specialty.toLocaleLowerCase("es").includes(query);

      return matchesDate && matchesSearch;
    })
    .sort((a, b) =>
      a.date.localeCompare(b.date) ||
      a.time.localeCompare(b.time)
    );

  appointmentList.replaceChildren();
  emptyState.classList.toggle("hidden", visible.length > 0);

  if (visible.length === 0 && appointments.length > 0) {
    emptyState.querySelector("h3").textContent =
      "No se encontraron turnos";
    emptyState.querySelector("p").textContent =
      "Probá cambiar la búsqueda o el filtro de fecha.";
  } else if (appointments.length === 0) {
    emptyState.querySelector("h3").textContent =
      "Todavía no hay turnos";
    emptyState.querySelector("p").textContent =
      "Cuando guardes un turno, va a aparecer acá.";
  }

  visible.forEach(item => {
    const card = document.createElement("article");
    card.className = "appointment-card";

    const timeBox = document.createElement("div");
    timeBox.className = "time-box";

    const time = document.createElement("strong");
    time.textContent = item.time;

    const date = document.createElement("span");
    date.textContent = formatDate(item.date, {
      day: "2-digit",
      month: "short"
    });

    timeBox.append(time, date);

    const info = document.createElement("div");

    const name = document.createElement("p");
    name.className = "patient-name";
    name.textContent = item.name;

    const meta = document.createElement("p");
    meta.className = "appointment-meta";
    meta.textContent =
      `${item.specialty} · ${formatDate(item.date)}`;

    info.append(name, meta);

    if (item.notes) {
      const note = document.createElement("p");
      note.className = "appointment-notes";
      note.textContent = item.notes;
      info.appendChild(note);
    }

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "small-button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => openEdit(item.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "small-button delete";
    deleteButton.textContent = "Cancelar";
    deleteButton.addEventListener("click", () =>
      cancelAppointment(item.id)
    );

    actions.append(editButton, deleteButton);
    card.append(timeBox, info, actions);
    appointmentList.appendChild(card);
  });

  updateStats();
}

function refreshTimeOptions() {
  fillTimeOptions(appointmentTime, appointmentDate.value);
}

form.addEventListener("submit", event => {
  event.preventDefault();
  showMessage(formMessage, "");

  const name = patientName.value.trim();
  const date = appointmentDate.value;
  const time = appointmentTime.value;
  const selectedSpecialty = specialty.value;

  if (!name || !selectedSpecialty || !date || !time) {
    showMessage(
      formMessage,
      "Completá todos los campos obligatorios.",
      "error"
    );
    return;
  }

  if (date < localDateString()) {
    showMessage(
      formMessage,
      "No se pueden asignar turnos en fechas pasadas.",
      "error"
    );
    return;
  }

  if (!timeSlots.includes(time)) {
    showMessage(formMessage, "Elegí un horario válido.", "error");
    return;
  }

  if (isSlotTaken(date, time)) {
    showMessage(
      formMessage,
      "Ese horario ya está ocupado. Elegí otro.",
      "error"
    );
    refreshTimeOptions();
    return;
  }

  const appointment = {
    id: (crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`),
    name,
    specialty: selectedSpecialty,
    date,
    time,
    notes: notes.value.trim()
  };

  appointments.push(appointment);

  if (!saveAppointments()) {
    appointments = appointments.filter(
      item => item.id !== appointment.id
    );
    return;
  }

  form.reset();
  appointmentDate.min = localDateString();
  appointmentDate.value = date;

  refreshTimeOptions();
  searchInput.value = "";
  filterDate.value = "";

  renderAppointments();

  showMessage(
    formMessage,
    "¡Turno guardado correctamente!",
    "success"
  );
});

function cancelAppointment(id) {
  const item = appointments.find(a => a.id === id);
  if (!item) return;

  const confirmed = confirm(
    `¿Querés cancelar el turno de ${item.name} del ` +
    `${formatDate(item.date)} a las ${item.time}?`
  );

  if (!confirmed) return;

  const previous = appointments;
  appointments = appointments.filter(a => a.id !== id);

  if (!saveAppointments()) {
    appointments = previous;
    return;
  }

  renderAppointments();
  refreshTimeOptions();
}

function openEdit(id) {
  const item = appointments.find(a => a.id === id);
  if (!item) return;

  document.getElementById("editId").value = item.id;
  document.getElementById("editName").value = item.name;
  document.getElementById("editSpecialty").value = item.specialty;
  document.getElementById("editDate").min = localDateString();
  document.getElementById("editDate").value = item.date;
  document.getElementById("editNotes").value = item.notes || "";

  fillTimeOptions(
    document.getElementById("editTime"),
    item.date,
    item.time,
    item.id
  );

  showMessage(editMessage, "");
  editDialog.showModal();
}

document.getElementById("editDate").addEventListener("change", event => {
  fillTimeOptions(
    document.getElementById("editTime"),
    event.target.value,
    "",
    document.getElementById("editId").value
  );
});

editForm.addEventListener("submit", event => {
  event.preventDefault();

  const id = document.getElementById("editId").value;
  const item = appointments.find(a => a.id === id);
  if (!item) return;

  const updated = {
    ...item,
    name: document.getElementById("editName").value.trim(),
    specialty: document.getElementById("editSpecialty").value,
    date: document.getElementById("editDate").value,
    time: document.getElementById("editTime").value,
    notes: document.getElementById("editNotes").value.trim()
  };

  if (
    !updated.name ||
    !updated.specialty ||
    !updated.date ||
    !updated.time
  ) {
    showMessage(
      editMessage,
      "Completá todos los campos obligatorios.",
      "error"
    );
    return;
  }

  if (updated.date < localDateString()) {
    showMessage(
      editMessage,
      "No se pueden asignar turnos en fechas pasadas.",
      "error"
    );
    return;
  }

  if (isSlotTaken(updated.date, updated.time, id)) {
    showMessage(
      editMessage,
      "Ese horario ya está ocupado. Elegí otro.",
      "error"
    );
    fillTimeOptions(
      document.getElementById("editTime"),
      updated.date,
      "",
      id
    );
    return;
  }

  const previous = appointments;
  appointments = appointments.map(a => a.id === id ? updated : a);

  if (!saveAppointments()) {
    appointments = previous;
    return;
  }

  editDialog.close();
  renderAppointments();
  refreshTimeOptions();
});

document.getElementById("closeEdit").addEventListener("click", () => {
  editDialog.close();
});

searchInput.addEventListener("input", renderAppointments);
filterDate.addEventListener("change", renderAppointments);

clearFilter.addEventListener("click", () => {
  filterDate.value = "";
  searchInput.value = "";
  renderAppointments();
});

function initialize() {
  const today = localDateString();

  appointmentDate.min = today;
  appointmentDate.value = today;
  document.getElementById("editDate").min = today;

  document.getElementById("todayLabel").textContent =
    formatDate(today, {
      weekday: "short",
      day: "numeric",
      month: "short"
    });

  refreshTimeOptions();
  renderAppointments();
}

initialize();
