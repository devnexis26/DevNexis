
// Interações da DevNexis.

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

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

// Atualizar automaticamente o ano do rodapé.
const year = document.querySelector("#year");

if (year) {
  year.textContent = new Date().getFullYear();
}

// Formulário de pedido de orçamento.
const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const contactMethod = document.querySelector("#contact-method");
const phoneInput = document.querySelector("#phone");

const updatePhoneRequirement = () => {
  if (!contactMethod || !phoneInput) return;

  const requiresPhone = ["Telefone", "WhatsApp"].includes(contactMethod.value);

  phoneInput.required = requiresPhone;
  phoneInput.setAttribute("aria-required", String(requiresPhone));
};

if (contactMethod && phoneInput) {
  contactMethod.addEventListener("change", updatePhoneRequirement);
  updatePhoneRequirement();
}

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) return;

    const data = new FormData(contactForm);

    const name = String(data.get("name") || "").trim();
    const business = String(data.get("business") || "").trim();
    const email = String(data.get("email") || "").trim();
    const preferredContact = String(data.get("contactMethod") || "Email").trim();
    const phone = String(data.get("phone") || "").trim();
    const message = String(data.get("message") || "").trim();

    // Endereço que recebe os pedidos de orçamento.
    const recipient = "geral.devnexis@outlook.pt";

    const subject = `Pedido de orçamento — ${business || name}`;

    const body = [
      "NOVO PEDIDO DE ORÇAMENTO — DEVNEXIS",
      "",
      `Nome: ${name}`,
      `Empresa: ${business || "Não indicada"}`,
      `Email: ${email}`,
      `Método de contacto preferido: ${preferredContact}`,
      `Número de telemóvel: ${phone || "Não indicado"}`,
      "",
      "Descrição do projeto:",
      message,
      "",
      "---",
      "Pedido enviado através do site da DevNexis."
    ].join("\n");

    const gmailUrl =
      "https://mail.google.com/mail/?view=cm&fs=1" +
      `&to=${encodeURIComponent(recipient)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    if (formStatus) {
      formStatus.textContent =
        "A abrir o Gmail com o teu pedido. Confirma os dados e envia o email para concluir.";
    }

    const emailWindow = window.open(
      gmailUrl,
      "_blank",
      "noopener,noreferrer"
    );

    if (!emailWindow && formStatus) {
      formStatus.textContent =
        "O navegador bloqueou a abertura do Gmail. Permite as janelas de pop-up ou copia os dados do formulário e envia-os por email para geral.nexoradigital@hotmail.com.";
    }
  });
}
