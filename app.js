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

  search.addEventListener("input", () => renderizarOpcionesPersonalizadas(select));
  search.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      cerrarSelectsPersonalizados();
      trigger.focus();
    }
  });

  select.addEventListener("change", () => sincronizarSelectPersonalizado(select.id));

  custom.addEventListener("click", (ev) => ev.stopPropagation());

  new MutationObserver(() => sincronizarSelectPersonalizado(select.id)).observe(select, {
    attributes: true,
    attributeFilter: ["disabled"],
    childList: true,
    subtree: true,
  });

  sincronizarSelectPersonalizado(select.id);
}

function abrirSelectPersonalizado(custom) {
  custom.classList.add("is-open");
  const trigger = custom.querySelector(".custom-select__trigger");
  const search = custom.querySelector(".custom-select__search");

  trigger.setAttribute("aria-expanded", "true");
  renderizarOpcionesPersonalizadas(document.getElementById(custom.dataset.selectTarget));

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
    custom.querySelector(".custom-select__trigger").setAttribute("aria-expanded", "false");
    custom.querySelector(".custom-select__search").value = "";
  });
}

function sincronizarSelectPersonalizado(id) {
  const select = document.getElementById(id);
  const custom = document.querySelector(`.custom-select[data-select-target="${id}"]`);
  if (!select || !custom) return;

  const selectedOption = select.options[select.selectedIndex];
  const value = custom.querySelector(".custom-select__value");
  const trigger = custom.querySelector(".custom-select__trigger");

  value.textContent = selectedOption?.textContent || (select.disabled ? "Sin opciones disponibles" : "Seleccionar");
  trigger.disabled = select.disabled;
  custom.classList.toggle("is-disabled", select.disabled);
  renderizarOpcionesPersonalizadas(select);
}

function renderizarOpcionesPersonalizadas(select) {
  const custom = document.querySelector(`.custom-select[data-select-target="${select.id}"]`);
  if (!custom) return;

  const contenedor = custom.querySelector(".custom-select__options");
  const filtro = custom.querySelector(".custom-select__search").value.trim().toLowerCase();
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
    };

    resultadosBis.forEach((r) => {
      const cat = String(r.IDCategoria || "");

      if (cat === "C00") {
        gruposBis["BIS Cachorros Especiales"].push(r);
      } else if (cat === "C01") {
        gruposBis["BIS Cachorros"].push(r);
      } else if (cat === "C02" || cat === "C03") {
        gruposBis["BIS Jóvenes"].push(r);
      } else {
        gruposBis["BIS Adultos"].push(r);
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
        const puesto = Number(r.PuestoBIS);

        let textoPuesto = `${puesto}° DE EXPOSICIÓN`;

        if (puesto === 1) textoPuesto = "🥇 MEJOR DE EXPOSICIÓN";
        if (puesto === 2) textoPuesto = "🥈 RESERVA DE EXPOSICIÓN";
        if (puesto === 3) textoPuesto = "🥉 3° DE EXPOSICIÓN";

        const fila = document.createElement("div");
        fila.className = "resultado-linea";

        fila.innerHTML = `
        <strong>${textoPuesto}</strong><br>
        Nº ${r.NumeroCatalogo}<br>
        ${r.Observaciones || ""}
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

document.addEventListener("DOMContentLoaded", () => {
  inicializarSelectsPersonalizados();
  cargarDatosPublicos();
});
