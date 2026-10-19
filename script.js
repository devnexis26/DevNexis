const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Abrir menu' : 'Fechar menu');
    navigation.classList.toggle('is-open', !isOpen);
  });

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Abrir menu');
      navigation.classList.remove('is-open');
    });
  });
}

document.querySelectorAll('[data-service]').forEach((link) => {
  link.addEventListener('click', () => {
    const serviceField = document.querySelector('#service');
    if (serviceField) serviceField.value = link.dataset.service;
  });
});

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const form = document.querySelector('#quote-form');
const formNote = document.querySelector('#form-note');

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const preferred = data.get('preferred');
    const preferredContact = preferred === 'Email' ? data.get('email') : data.get('phone');
    if (!preferredContact) {
      const field = preferred === 'Email' ? document.querySelector('#email') : document.querySelector('#phone');
      field.setCustomValidity(`Indique o seu ${preferred === 'Email' ? 'email' : 'telemóvel'} para podermos contactar por ${preferred.toLowerCase()}.`);
      field.reportValidity();
      field.addEventListener('input', () => field.setCustomValidity(''), { once: true });
      return;
    }

    const subject = `Pedido de orçamento DevNexis${data.get('service') ? ` — ${data.get('service')}` : ''}`;
    const body = [
      `Nome: ${data.get('name')}`,
      `Empresa: ${data.get('company') || 'Não indicada'}`,
      `Método de contacto preferido: ${preferred}`,
      `Telemóvel: ${data.get('phone') || 'Não indicado'}`,
      `Email: ${data.get('email') || 'Não indicado'}`,
      `Serviço: ${data.get('service') || 'A definir'}`,
      `Projeto: ${data.get('message') || 'Sem detalhes adicionais'}`
    ].join('\n');

    if (formNote) formNote.textContent = 'A abrir o seu programa de email com a mensagem preparada. O pedido só será enviado quando indicar um endereço de destino e carregar em enviar.';
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}
