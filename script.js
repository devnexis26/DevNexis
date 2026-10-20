// >>> Coloca aqui o email que vai receber os pedidos de orçamento <<<
const EMAIL_DESTINO = 'geral.devnexis@outlook.pt';

const burger = document.querySelector('.burger');
const menu = document.querySelector('#menu');

function setMenu(open) {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  menu.classList.toggle('open', open);
}
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

document.querySelectorAll('[data-service]').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelector('#service').value = link.dataset.service;
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();

const form = document.querySelector('#quote-form');
const note = document.querySelector('#form-note');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(form);
  const name = (d.get('name') || '').trim();
  const email = (d.get('email') || '').trim();
  const phone = (d.get('phone') || '').trim();

  if (!name) { note.textContent = 'Indique o seu nome.'; form.elements.name.focus(); return; }
  if (!email && !phone) { note.textContent = 'Indique um email ou um telemóvel para o podermos contactar.'; form.elements.email.focus(); return; }

  const subject = `Pedido de orçamento${d.get('service') ? ' — ' + d.get('service') : ''}`;
  const body = [
    `Nome: ${name}`,
    `Email: ${email || 'Não indicado'}`,
    `Telemóvel: ${phone || 'Não indicado'}`,
    `Serviço: ${d.get('service') || 'A decidir'}`,
    `Mensagem: ${(d.get('message') || '').trim() || 'Sem detalhes adicionais'}`
  ].join('\n');

  note.textContent = 'A abrir o seu programa de email. Carregue em enviar para concluir o pedido.';
  window.location.href = `mailto:${EMAIL_DESTINO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
