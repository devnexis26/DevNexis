
"use strict";

// Menu de navegação para telemóveis.
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector("#main-nav");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.textContent = isOpen ? "Fechar" : "Menu";
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.textContent = "Menu";
    });
  });
}

// Filtros da carta digital.
const filterButtons = document.querySelectorAll(".filter-btn");
const menuCards = document.querySelectorAll(".menu-card");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedCategory = button.dataset.filter;

    filterButtons.forEach((item) => {
      const isActive = item === button;

      item.classList.toggle("active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    menuCards.forEach((card) => {
      const shouldShow =
        selectedCategory === "todos" ||
        card.dataset.category === selectedCategory;

      card.hidden = !shouldShow;
    });
  });
});

// Ano automático no rodapé.
const yearElement = document.querySelector("#year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Impede a seleção de uma data passada.
const dateInput = document.querySelector("#date");

if (dateInput) {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);

  dateInput.min = localDate;
}

// Formulário demonstrativo: não envia nem guarda dados.
const reservationForm = document.querySelector("#reservation-form");
const formStatus = document.querySelector("#form-status");

if (reservationForm && formStatus) {
  reservationForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!reservationForm.reportValidity()) {
      return;
    }

    const formData = new FormData(reservationForm);
    const name = String(formData.get("name") || "").trim();
    const date = String(formData.get("date") || "");
    const time = String(formData.get("time") || "");
    const guests = String(formData.get("guests") || "");

    formStatus.textContent =
      `Simulação concluída, ${name}. O pedido para ${date}, às ${time}, ` +
      `para ${guests} pessoa(s), não foi enviado. Este site é apenas uma demonstração.`;

    formStatus.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  });
}
