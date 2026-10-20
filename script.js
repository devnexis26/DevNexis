const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-nav');

document.documentElement.classList.add('has-js');
const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -35px 0px' });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

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
      const field = preferred === 'Email'
        ? document.querySelector('#email')
        : document.querySelector('#phone');

      field.setCustomValidity(
        `Indique o seu ${preferred === 'Email' ? 'email' : 'telemóvel'} para podermos contactar por ${preferred.toLowerCase()}.`
      );
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

    if (formNote) {
      formNote.textContent = 'A abrir o Gmail com o pedido preparado. Para concluir, reveja a mensagem e carregue em Enviar.';
    }

    const gmailCompose = new URL('https://mail.google.com/mail/');
    gmailCompose.searchParams.set('view', 'cm');
    gmailCompose.searchParams.set('fs', '1');
    gmailCompose.searchParams.set('to', 'geral.devnexis@outlook.pt');
    gmailCompose.searchParams.set('su', subject);
    gmailCompose.searchParams.set('body', body);

    const composeWindow = window.open(gmailCompose.toString(), '_blank');

    if (composeWindow) {
      composeWindow.opener = null;
    } else {
      window.location.assign(gmailCompose.toString());
    }
  });
}
