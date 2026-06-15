const API =
  "https://script.google.com/macros/s/AKfycbyCLSpeBpjxzfj5IWl6FO8G6jB_ypHkAdiGqwOLKbnNiTCiRTaH-nQ0twq-qbqQWaIF/exec";

let DATA_GLOBAL = null;

async function cargarDatosPublicos() {
  const res = await fetch(API + "?action=publicResults");
  const data = await res.json();
  if (!data.ok) return;
  DATA_GLOBAL = data;
  poblarEventos();
}

function poblarEventos() {
  const sel = document.getElementById("selectorEvento");
  sel.innerHTML = "<option value=''>Seleccionar competencia</option>";

  DATA_GLOBAL.eventos.forEach((ev) => {
    const opt = document.createElement("option");
    opt.value = ev.IDEvento;
    opt.textContent = ev.NombreEvento;
    sel.appendChild(opt);
  });

  sincronizarSelectPersonalizado("selectorEvento");
}

document
  .getElementById("selectorEvento")
  .addEventListener("change", function () {
    const idevento = this.value;
    const selJ = document.getElementById("selectorJuez");
    selJ.innerHTML = "";
    selJ.disabled = true;
    sincronizarSelectPersonalizado("selectorJuez");
    if (!idevento) return;

    const jueces = DATA_GLOBAL.jueces.filter((j) => j.IDEvento === idevento);

    selJ.innerHTML = "<option value=''>Seleccionar juez/pista</option>";

    jueces.forEach((j) => {
      const opt = document.createElement("option");
      opt.value = j.IDJuez;
      opt.textContent = `Pista ${j.IDPista} - ${j.NombreJuez}`;
      selJ.appendChild(opt);
    });

    selJ.disabled = false;
    sincronizarSelectPersonalizado("selectorJuez");
  });

function crearSelectPersonalizado(select) {
  if (!select || select.dataset.customReady === "1") return;

  const custom = document.createElement("div");
  custom.className = "custom-select";
  custom.dataset.selectTarget = select.id;
  custom.innerHTML = `
    <button class="custom-select__trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
      <span class="custom-select__value"></span>
      <span class="custom-select__chevron" aria-hidden="true"></span>
    </button>
    <div class="custom-select__panel" role="listbox">
      <input class="custom-select__search" type="search" placeholder="Buscar..." autocomplete="off" />
      <div class="custom-select__options"></div>
    </div>
  `;

  select.insertAdjacentElement("afterend", custom);
  select.dataset.customReady = "1";

  const trigger = custom.querySelector(".custom-select__trigger");
  const search = custom.querySelector(".custom-select__search");

  trigger.addEventListener("click", () => {
    if (select.disabled) return;
    const estaAbierto = custom.classList.contains("is-open");
    cerrarSelectsPersonalizados();
    if (!estaAbierto) abrirSelectPersonalizado(custom);
  });

  search.addEventListener("input", () =>
    renderizarOpcionesPersonalizadas(select),
  );
  search.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      cerrarSelectsPersonalizados();
      trigger.focus();
    }
  });

  select.addEventListener("change", () =>
    sincronizarSelectPersonalizado(select.id),
  );

  custom.addEventListener("click", (ev) => ev.stopPropagation());

  new MutationObserver(() => sincronizarSelectPersonalizado(select.id)).observe(
    select,
    {
      attributes: true,
      attributeFilter: ["disabled"],
      childList: true,
      subtree: true,
    },
  );

  sincronizarSelectPersonalizado(select.id);
}

function abrirSelectPersonalizado(custom) {
  custom.classList.add("is-open");
  const trigger = custom.querySelector(".custom-select__trigger");
  const search = custom.querySelector(".custom-select__search");

  trigger.setAttribute("aria-expanded", "true");
  renderizarOpcionesPersonalizadas(
    document.getElementById(custom.dataset.selectTarget),
  );

  if (!window.matchMedia("(pointer: coarse)").matches) {
    window.setTimeout(() => {
      search.focus({ preventScroll: true });
      search.select();
    }, 0);
  }
}

function cerrarSelectsPersonalizados() {
  document.querySelectorAll(".custom-select.is-open").forEach((custom) => {
    custom.classList.remove("is-open");
    custom
      .querySelector(".custom-select__trigger")
      .setAttribute("aria-expanded", "false");
    custom.querySelector(".custom-select__search").value = "";
  });
}

function sincronizarSelectPersonalizado(id) {
  const select = document.getElementById(id);
  const custom = document.querySelector(
    `.custom-select[data-select-target="${id}"]`,
  );
  if (!select || !custom) return;

  const selectedOption = select.options[select.selectedIndex];
  const value = custom.querySelector(".custom-select__value");
  const trigger = custom.querySelector(".custom-select__trigger");

  value.textContent =
    selectedOption?.textContent ||
    (select.disabled ? "Sin opciones disponibles" : "Seleccionar");
  trigger.disabled = select.disabled;
  custom.classList.toggle("is-disabled", select.disabled);
  renderizarOpcionesPersonalizadas(select);
}

function renderizarOpcionesPersonalizadas(select) {
  const custom = document.querySelector(
    `.custom-select[data-select-target="${select.id}"]`,
  );
  if (!custom) return;

  const contenedor = custom.querySelector(".custom-select__options");
  const filtro = custom
    .querySelector(".custom-select__search")
    .value.trim()
    .toLowerCase();
  const opciones = Array.from(select.options).filter((opt) =>
    opt.textContent.toLowerCase().includes(filtro),
  );

  contenedor.innerHTML = "";

  if (!opciones.length) {
    const vacio = document.createElement("div");
    vacio.className = "custom-select__empty";
    vacio.textContent = "Sin resultados";
    contenedor.appendChild(vacio);
    return;
  }

  opciones.forEach((opt) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "custom-select__option";
    item.textContent = opt.textContent;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(opt.value === select.value));

    item.addEventListener("click", () => {
      select.value = opt.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      sincronizarSelectPersonalizado(select.id);
      cerrarSelectsPersonalizados();
    });

    contenedor.appendChild(item);
  });
}

function inicializarSelectsPersonalizados() {
  crearSelectPersonalizado(document.getElementById("selectorEvento"));
  crearSelectPersonalizado(document.getElementById("selectorJuez"));

  document.addEventListener("click", cerrarSelectsPersonalizados);
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") cerrarSelectsPersonalizados();
  });
}

function cargarResultados(tipo) {
  const idevento = document.getElementById("selectorEvento").value;
  const idjuez = document.getElementById("selectorJuez").value;
  const cont = document.getElementById("contenedorResultados");
  const info = document.getElementById("infoGeneral");

  cont.innerHTML = "";
  if (!idevento || !idjuez) return;

  const evento = DATA_GLOBAL.eventos.find((e) => e.IDEvento === idevento);

  info.innerHTML = `
    <h2>${evento?.NombreEvento || ""}</h2>
    <h3>${idjuez}</h3>
  `;

  if (tipo === "bis") {
    const resultadosBis = DATA_GLOBAL.resultadosBIS.filter(
      (r) =>
        r.IDEvento === idevento && r.IDJuez === idjuez && r.PuestoBIS !== "AUS",
    );

    if (!resultadosBis.length) {
      cont.innerHTML = "<p>No hay Finales BIS cargadas.</p>";
      return;
    }

    const gruposBis = {
      "BIS Cachorros Especiales": [],
      "BIS Cachorros": [],
      "BIS Jóvenes": [],
      "BIS Adultos": [],
      "BIS Campeones": [],
    };

    const resultadosBisLimpios = new Map();

    resultadosBis.forEach((r) => {
      const puesto = Number(r.PuestoBIS);
      const puestoValido =
        Number.isInteger(puesto) && puesto >= 1 && puesto <= 7;
      const clave = `${r.IDInscripcion}|${String(r.TipoBIS || "").trim()}`;

      if (puestoValido && !resultadosBisLimpios.has(clave)) {
        resultadosBisLimpios.set(clave, r);
      }
    });

    resultadosBisLimpios.forEach((r) => {
      switch (String(r.TipoBIS || "").trim()) {
        case "BIS CACHORROS ESPECIALES":
          gruposBis["BIS Cachorros Especiales"].push(r);
          break;

        case "BIS CACHORROS":
          gruposBis["BIS Cachorros"].push(r);
          break;

        case "BIS JOVENES":
          gruposBis["BIS Jóvenes"].push(r);
          break;

        case "BIS ADULTOS":
          gruposBis["BIS Adultos"].push(r);
          break;

        case "BIS CAMPEONES":
          gruposBis["BIS Campeones"].push(r);
          break;
      }
    });

    Object.entries(gruposBis).forEach(([titulo, lista]) => {
      if (!lista.length) return;

      lista.sort((a, b) => {
        return Number(a.PuestoBIS) - Number(b.PuestoBIS);
      });

      const bloque = document.createElement("div");
      bloque.className = "grupo-rol";

      bloque.innerHTML = `<h2>${titulo}</h2>`;

      lista.forEach((r) => {
        if (!r.PuestoBIS || Number(r.PuestoBIS) <= 0) return;

        const puesto = Number(r.PuestoBIS);

        let textoPuesto = `${puesto}° DE EXPOSICIÓN`;

        if (puesto === 1) textoPuesto = "🥇 MEJOR DE EXPOSICIÓN";
        if (puesto === 2) textoPuesto = "🥈 RESERVA DE EXPOSICIÓN";
        if (puesto === 3) textoPuesto = "🥉 3° DE EXPOSICIÓN";

        const fila = document.createElement("div");
        fila.className = "resultado-linea";

        fila.innerHTML = `
        <strong>${textoPuesto}</strong><br>



<div>
  Nº ${r.NumeroCatalogo} - ${r.NombreRaza} - ${r.IDSexo === "S01" ? "Macho" : "Hembra"}
</div>

<div style="margin-top:4px;">
  ${r.Observaciones || ""}
</div>



      `;

        bloque.appendChild(fila);
      });

      cont.appendChild(bloque);
    });

    return;
  }

  if (tipo !== "razas") return;

  const resultados = DATA_GLOBAL.resultadosRaza.filter(
    (r) => r.IDEvento === idevento && r.IDJuez === idjuez,
  );

  if (!resultados.length) {
    cont.innerHTML = "<p>No hay resultados cargados.</p>";
    return;
  }

  const sexoTexto = (sexo) => {
    if (sexo === "S01") return "Macho";
    if (sexo === "S02") return "Hembra";
    return "";
  };

  const renderCelda = (r) => {
    if (!r) return "&nbsp;";

    return `
      <div>
        <div style="font-weight:700;margin-bottom:6px;">
          ${String(r.RolesFinalRaza || "").replaceAll("_", " ")}
        </div>

        <div>
          Nº ${r.NumeroCatalogo || ""} - ${sexoTexto(r.IDSexo)}
        </div>

        <div style="margin-top:4px;">
          ${r.Observaciones || ""}
        </div>
      </div>
    `;
  };

  const porGrupo = {};

  resultados.forEach((r) => {
    if (!porGrupo[r.IDGrupo]) porGrupo[r.IDGrupo] = [];
    porGrupo[r.IDGrupo].push(r);
  });

  Object.keys(porGrupo)
    .sort()
    .forEach((grupo) => {
      const bloqueGrupo = document.createElement("div");
      bloqueGrupo.className = "grupo-rol";
      bloqueGrupo.innerHTML = `<h2>Grupo ${grupo}</h2>`;
      cont.appendChild(bloqueGrupo);

      const porRaza = {};

      porGrupo[grupo].forEach((r) => {
        if (!porRaza[r.NombreRaza]) porRaza[r.NombreRaza] = [];
        porRaza[r.NombreRaza].push(r);
      });

      Object.keys(porRaza)
        .sort()
        .forEach((raza) => {
          const bloqueRaza = document.createElement("div");
          bloqueRaza.style.marginBottom = "30px";
          bloqueRaza.innerHTML = `<h3>${raza}</h3>`;
          bloqueGrupo.appendChild(bloqueRaza);

          const registros = porRaza[raza];

          const buscar = (texto) =>
            registros.find((r) =>
              String(r.RolesFinalRaza || "").includes(texto),
            );

          const filas = [
            [
              buscar("MEJOR_CACHORRO_ESPECIAL_RAZA"),
              buscar("SEXO_OPUESTO_CACHORRO_ESPECIAL"),
            ],
            [buscar("MEJOR_CACHORRO_RAZA"), buscar("SEXO_OPUESTO_CACHORRO")],
            [
              registros.find((r) =>
                String(r.RolesFinalRaza || "").includes("MEJOR_JOVEN_RAZA"),
              ),
              registros.find((r) =>
                String(r.RolesFinalRaza || "").includes("SEXO_OPUESTO_JOVEN"),
              ),
            ],
            [
              registros.find((r) =>
                String(r.RolesFinalRaza || "").includes("MEJOR_DE_RAZA"),
              ),
              registros.find((r) =>
                String(r.RolesFinalRaza || "").includes("SEXO_OPUESTO_RAZA"),
              ),
            ],
            [buscar("MEJOR_VETERANO_RAZA"), buscar("SEXO_OPUESTO_VETERANO")],
          ];

          filas.forEach(([izq, der]) => {
            if (!izq && !der) return;

            const fila = document.createElement("div");

            fila.className = "resultado-linea";

            fila.style.display = "grid";
            fila.style.gridTemplateColumns = "1fr 1fr";
            fila.style.gap = "20px";
            fila.style.alignItems = "start";

            fila.innerHTML = `
              <div>
                ${renderCelda(izq)}
              </div>

              <div>
                ${renderCelda(der)}
              </div>
            `;

            bloqueRaza.appendChild(fila);
          });
        });
    });
}

const FECHA_HABILITACION_CATALOGOS = new Date(2026, 5, 14, 9, 0, 0);

let catalogosCountdownTimer = null;
let catalogosEstadoActual = {
  grupo: "",
  raza: "",
};

function cargarCatalogosPerrosInscriptos() {
  const cont = document.getElementById("contenedorResultados");
  const info = document.getElementById("infoGeneral");

  if (!cont || !info) return;

  detenerCountdownCatalogos();
  info.innerHTML = "";
  cont.innerHTML = "";

  if (new Date() < FECHA_HABILITACION_CATALOGOS) {
    renderCatalogosBloqueados();
    return;
  }

  renderCatalogosPerrosInscriptos();
}

function renderCatalogosBloqueados() {
  const cont = document.getElementById("contenedorResultados");
  if (!cont) return;

  cont.innerHTML = `
    <section class="catalogos-espera" aria-live="polite">
      <h2>📖 CATÁLOGOS DE PERROS INSCRIPTOS</h2>
      <p>Los catálogos estarán disponibles a partir de las</p>
      <strong>09:00 hs del domingo 14 de junio de 2026</strong>
      <div class="catalogos-espera__label">Tiempo restante</div>
      <div class="catalogos-countdown">
        <div>
          <span id="catalogosDias">00</span>
          <small>días</small>
        </div>
        <div>
          <span id="catalogosHoras">00</span>
          <small>horas</small>
        </div>
        <div>
          <span id="catalogosMinutos">00</span>
          <small>minutos</small>
        </div>
        <div>
          <span id="catalogosSegundos">00</span>
          <small>segundos</small>
        </div>
      </div>
    </section>
  `;

  actualizarCountdownCatalogos();
  catalogosCountdownTimer = window.setInterval(
    actualizarCountdownCatalogos,
    1000,
  );
}

function actualizarCountdownCatalogos() {
  const ahora = new Date();
  const restante = FECHA_HABILITACION_CATALOGOS.getTime() - ahora.getTime();

  if (restante <= 0) {
    detenerCountdownCatalogos();
    renderCatalogosPerrosInscriptos();
    return;
  }

  const totalSegundos = Math.floor(restante / 1000);
  const dias = Math.floor(totalSegundos / 86400);
  const horas = Math.floor((totalSegundos % 86400) / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  setTextoCatalogos("catalogosDias", dias);
  setTextoCatalogos("catalogosHoras", horas);
  setTextoCatalogos("catalogosMinutos", minutos);
  setTextoCatalogos("catalogosSegundos", segundos);
}

function setTextoCatalogos(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(valor).padStart(2, "0");
}

function detenerCountdownCatalogos() {
  if (!catalogosCountdownTimer) return;
  window.clearInterval(catalogosCountdownTimer);
  catalogosCountdownTimer = null;
}

function renderCatalogosPerrosInscriptos() {
  const cont = document.getElementById("contenedorResultados");
  const info = document.getElementById("infoGeneral");

  if (!cont || !info) return;

  const perros = obtenerDatosCatalogosPerros();

  info.innerHTML = `
    <h2>📖 CATÁLOGOS DE PERROS INSCRIPTOS</h2>
    <h3>${perros.length ? `${perros.length} perros inscriptos` : ""}</h3>
  `;

  if (!perros.length) {
    cont.innerHTML = `
      <section class="catalogos-vacio">
        <h3>Catálogo no disponible</h3>
        <p>
          El endpoint público todavía no devuelve la información necesaria para
          mostrar el catálogo de perros inscriptos.
        </p>
      </section>
    `;
    return;
  }

  const grupos = obtenerValoresUnicosCatalogos(perros, "grupo");
  const razas = obtenerValoresUnicosCatalogos(perros, "raza");

  cont.innerHTML = `
    <section class="catalogos-panel">
      <div class="catalogos-filtros">
        <label>
          Todos los grupos
          <select id="catalogosFiltroGrupo">
            <option value="">Todos los grupos</option>
            ${grupos
              .map(
                (grupo) =>
                  `<option value="${escapeHtmlCatalogos(grupo)}">${escapeHtmlCatalogos(grupo)}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label>
          Todas las razas
          <select id="catalogosFiltroRaza">
            <option value="">Todas las razas</option>
            ${razas
              .map(
                (raza) =>
                  `<option value="${escapeHtmlCatalogos(raza)}">${escapeHtmlCatalogos(raza)}</option>`,
              )
              .join("")}
          </select>
        </label>
      </div>
      <div id="catalogosListado"></div>
    </section>
  `;

  document
    .getElementById("catalogosFiltroGrupo")
    ?.addEventListener("change", (ev) => {
      catalogosEstadoActual.grupo = ev.target.value;
      renderCatalogosListado(perros);
    });

  document
    .getElementById("catalogosFiltroRaza")
    ?.addEventListener("change", (ev) => {
      catalogosEstadoActual.raza = ev.target.value;
      renderCatalogosListado(perros);
    });

  renderCatalogosListado(perros);
}

function renderCatalogosListado(perros) {
  const listado = document.getElementById("catalogosListado");
  if (!listado) return;

  const filtrados = perros.filter((perro) => {
    const coincideGrupo =
      !catalogosEstadoActual.grupo ||
      perro.grupo === catalogosEstadoActual.grupo;
    const coincideRaza =
      !catalogosEstadoActual.raza || perro.raza === catalogosEstadoActual.raza;
    return coincideGrupo && coincideRaza;
  });

  if (!filtrados.length) {
    listado.innerHTML = `<p class="catalogos-sin-resultados">No hay perros para los filtros seleccionados.</p>`;
    return;
  }

  listado.innerHTML = `
    <div class="catalogos-tabla">
      <div class="catalogos-tabla__head">
        <span>N° Catálogo</span>
        <span>Grupo</span>
        <span>Raza</span>
        <span>Categoría</span>
        <span>Sexo</span>
        <span>Observaciones</span>
      </div>
      ${filtrados
        .map(
          (perro) => `
            <article class="catalogos-tabla__row">
              <div data-label="N° Catálogo">${escapeHtmlCatalogos(perro.numero)}</div>
              <div data-label="Grupo">${escapeHtmlCatalogos(perro.grupo)}</div>
              <div data-label="Raza">${escapeHtmlCatalogos(perro.raza)}</div>
              <div data-label="Categoría">${escapeHtmlCatalogos(perro.categoria)}</div>
              <div data-label="Sexo">${escapeHtmlCatalogos(perro.sexo)}</div>
              <div data-label="Observaciones">${escapeHtmlCatalogos(perro.observaciones)}</div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function obtenerDatosCatalogosPerros() {
  if (!DATA_GLOBAL) return [];

  const origen =
    DATA_GLOBAL.Catalogo_Perros_Inscriptos ||
    DATA_GLOBAL.catalogoPerrosInscriptos ||
    DATA_GLOBAL.catalogosPerrosInscriptos ||
    DATA_GLOBAL.perrosInscriptos ||
    DATA_GLOBAL.catalogo ||
    DATA_GLOBAL.perros ||
    [];

  if (!Array.isArray(origen)) {
    return [];
  }

  const ideventoSeleccionado =
    document.getElementById("selectorEvento")?.value || "";

  return origen
    .filter((perro) => {
      if (!ideventoSeleccionado) return true;

      return (
        String(perro.IDEvento || "").trim() ===
        String(ideventoSeleccionado).trim()
      );
    })
    .map((perro) => ({
      IDEvento: perro.IDEvento || "",

      numero: valorCatalogo(perro, [
        "NumeroCatalogo",
        "NroCatalogo",
        "Numero",
        "Catalogo",
        "numeroCatalogo",
      ]),

      grupo: valorCatalogo(perro, ["Grupo", "IDGrupo", "NombreGrupo", "grupo"]),

      raza: valorCatalogo(perro, ["Raza", "NombreRaza", "raza"]),

      categoria: valorCatalogo(perro, [
        "NombreCategoria",
        "Categoria",
        "IDCategoria",
        "categoria",
      ]),

      sexo: textoSexoCatalogos(
        valorCatalogo(perro, ["Sexo", "IDSexo", "sexo"]),
      ),

      observaciones: valorCatalogo(perro, [
        "Observaciones",
        "Observacion",
        "observaciones",
      ]),
    }))
    .filter((perro) => perro.numero || perro.grupo || perro.raza);
}

function normalizarPerroCatalogo(perro) {
  return {
    IDEvento: valorCatalogo(perro, ["IDEvento", "Evento", "evento"]),

    numero: valorCatalogo(perro, [
      "NumeroCatalogo",
      "NroCatalogo",
      "Numero",
      "Catalogo",
      "numeroCatalogo",
    ]),

    grupo: valorCatalogo(perro, ["Grupo", "IDGrupo", "NombreGrupo", "grupo"]),

    raza: valorCatalogo(perro, ["Raza", "NombreRaza", "raza"]),

    categoria: valorCatalogo(perro, [
      "Categoria",
      "NombreCategoria",
      "IDCategoria",
      "categoria",
    ]),

    sexo: textoSexoCatalogos(valorCatalogo(perro, ["Sexo", "IDSexo", "sexo"])),

    observaciones: valorCatalogo(perro, [
      "Observaciones",
      "Observacion",
      "observaciones",
    ]),
  };
}

function valorCatalogo(obj, claves) {
  for (const clave of claves) {
    if (obj && obj[clave] !== undefined && obj[clave] !== null) {
      return String(obj[clave]).trim();
    }
  }
  return "";
}

function textoSexoCatalogos(valor) {
  if (valor === "S01") return "Macho";
  if (valor === "S02") return "Hembra";
  return valor || "";
}

function obtenerValoresUnicosCatalogos(perros, clave) {
  return Array.from(
    new Set(perros.map((perro) => perro[clave]).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

function escapeHtmlCatalogos(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  inicializarSelectsPersonalizados();
  cargarDatosPublicos();
});
