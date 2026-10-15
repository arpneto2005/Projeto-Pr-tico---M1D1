/* Utilitários compartilhados por todas as páginas */
const API_BASE_URL = `http://${location.hostname || "127.0.0.1"}:5000`;
const PAGES = [
  ["index.html", "Início"],
  ["chat.html", "Chat"],
  ["pedidos.html", "Pedidos"],
  ["faq.html", "FAQ"],
  ["classificador.html", "Classificador"],
  ["analista.html", "Analista"],
  ["admin-kb.html", "Base de conhecimento"],
  ["metricas.html", "Métricas"],
  ["usuarios.html", "Usuários"]
];
const PAGE_ROLES = {
  "chat.html": ["customer"],
  "pedidos.html": ["customer"],
  "analista.html": ["attendant", "admin"],
  "admin-kb.html": ["admin"],
  "metricas.html": ["admin"],
  "usuarios.html": ["admin"]
};

function esc(s) {
  const htmlEntities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(s ?? "").replace(/[&<>"']/g, character => htmlEntities[character]);
}

function store(key, value) {
  try {
    if (value === undefined) {
      return sessionStorage.getItem(key);
    }

    sessionStorage.setItem(key, value);
  } catch (error) {
    return null;
  }
}

async function api(path, { method = "GET", body } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    // A resposta pode não conter JSON.
  }

  if (!response.ok) {
    const error = new Error(
      (data && data.erro) || `Erro ${response.status}`
    );
    error.status = response.status;
    error.data = data;

    if (response.status === 401 && !path.startsWith("/auth/")) {
      location.href = "auth.html";
    }

    throw error;
  }

  return data;
}

function toast(message, success) {
  const element = document.createElement("div");
  element.className = "toast" + (success ? " ok" : "");
  element.textContent = message;
  document.body.appendChild(element);
  setTimeout(() => element.remove(), 3500);
}

function erroApi(error) {
  const message =
    error.status === 401
      ? "Faça login para continuar."
      : error.message;

  toast(message);
}

async function renderNav() {
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const element = document.getElementById("nav");
  if (!element) {
    return;
  }

  let usuario = null;
  try {
    usuario = (await api("/auth/me")).usuario;
  } catch (error) {
    console.error("Não foi possível verificar a sessão do usuário.", error);
  }

  const roles = PAGE_ROLES[currentPage];
  if (roles && !usuario) {
    location.href = "auth.html";
    return;
  }
  if (roles && !roles.includes(usuario.role)) {
    location.href = "index.html";
    return;
  }

  document.querySelectorAll("[data-roles]").forEach(element => {
    const allowedRoles = element.dataset.roles.split(/\s+/);
    element.hidden = !usuario || !allowedRoles.includes(usuario.role);
  });

  const links = PAGES.filter(([href]) => {
    const allowedRoles = PAGE_ROLES[href];
    return !allowedRoles || (usuario && allowedRoles.includes(usuario.role));
  })
    .map(
      ([href, name]) =>
        `<a href="${href}" class="${href === currentPage ? "on" : ""}">${name}</a>`
    )
    .join("");
  const conta = usuario
    ? `<span class="small">${esc(usuario.username)} · ${esc(usuario.role)}</span><button id="sair">Sair</button>`
    : '<a href="auth.html">Entrar / Cadastrar</a>';

  element.innerHTML = `<header class="nav"><span class="logo">Moda Viva · Suporte</span>${links}${conta}</header>`;

  const logoutButton = document.getElementById("sair");
  if (logoutButton) {
    logoutButton.onclick = async () => {
      try {
        await api("/auth/logout", { method: "POST" });
        store("sid", "");
        location.href = "auth.html";
      } catch (error) {
        erroApi(error);
      }
    };
  }
}

function fmtData(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return isNaN(date) ? value : date.toLocaleString("pt-BR");
}

function pct(value) {
  return value == null ? "—" : Math.round(value * 100) + "%";
}

document.addEventListener("DOMContentLoaded", renderNav);
