import { generatePixPayment } from './pix-preloader.js';
import { redirectWithUtm, initUtmTracking } from './utm-helper.js';

// Inicializa tracking de UTM
initUtmTracking();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let paymentCheckInterval = null;
let timerInterval = null;
let timeLeft = 600;

document.addEventListener('DOMContentLoaded', () => {
  const copyButton = document.getElementById('copy-button');
  copyButton.addEventListener('click', copyPixCode);

  createPixPayment();
  startTimer();
});

async function createPixPayment() {
  try {
    const data = await generatePixPayment('tarifa', 3493);

    if (data.success && data.qrcode && data.transactionId) {
      displayPixQRCode(data.qrcode, data.transactionId);
      startPaymentCheck(data.transactionId);
    } else {
      throw new Error(data.error || 'Erro ao gerar PIX');
    }

  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao gerar pagamento. Tente novamente.');
    redirectWithUtm('pagamento-upsell3.html');
  }
}

function displayPixQRCode(qrcodeText, transactionId) {
  const qrcodeContainer = document.getElementById('pix-qrcode');
  const pixCodeInput = document.getElementById('pix-code-input');

  qrcodeContainer.innerHTML = '';

  setTimeout(() => {
    try {
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrcodeContainer, {
          text: qrcodeText,
          width: 250,
          height: 250,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        console.log('QR Code gerado com sucesso');
      } else {
        console.error('Biblioteca QRCode não está disponível');
        qrcodeContainer.innerHTML = '<div style="background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center;"><p style="color: #dc2626; font-size: 14px; margin: 0;">QR Code indisponível. Use o código Pix abaixo.</p></div>';
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      qrcodeContainer.innerHTML = '<div style="background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center;"><p style="color: #dc2626; font-size: 14px; margin: 0;">Erro ao gerar QR Code. Use o código Pix abaixo.</p></div>';
    }
  }, 100);

  pixCodeInput.value = qrcodeText;
}

function startPaymentCheck(transactionId) {
  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
  }

  console.log(`[Pagamento Tarifa] Iniciando verificação de pagamento para transação: ${transactionId}`);

  let attempts = 0;
  const maxAttempts = 120;

  paymentCheckInterval = setInterval(async () => {
    attempts++;

    if (attempts >= maxAttempts) {
      console.log(`[Pagamento Tarifa] Máximo de tentativas (${maxAttempts}) atingido`);
      clearInterval(paymentCheckInterval);
      return;
    }

    try {
      const apiUrl = `${SUPABASE_URL}/functions/v1/check-payment`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionId }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar pagamento');
      }

      const data = await response.json();
      console.log(`[Pagamento Tarifa] Tentativa ${attempts}/${maxAttempts} - Status: ${data.status}`);

      if (data.status === 'paid' || data.status === 'approved') {
        console.log(`[Pagamento Tarifa] Pagamento confirmado! Redirecionando...`);
        clearInterval(paymentCheckInterval);
        redirectWithUtm('pagamento-upsell4.html');
      }

    } catch (error) {
      console.error(`[Pagamento Tarifa] Erro ao verificar pagamento (tentativa ${attempts}):`, error);
    }
  }, 3000);
}

window.addEventListener('beforeunload', () => {
  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
  }
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('[Pagamento Tarifa] Página em background - polling continua');
  } else {
    console.log('[Pagamento Tarifa] Página voltou ao foco');
  }
});

function copyPixCode() {
  const pixCodeInput = document.getElementById('pix-code-input');
  const copyButton = document.getElementById('copy-button');

  pixCodeInput.select();
  document.execCommand('copy');

  copyButton.classList.add('copied');

  setTimeout(() => {
    copyButton.classList.remove('copied');
  }, 2000);
}

function startTimer() {
  const timerElement = document.getElementById('timer');
  const timerWarning = document.querySelector('.timer-warning');

  if (!timerElement) return;

  timerInterval = setInterval(() => {
    timeLeft--;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      clearInterval(paymentCheckInterval);
      timerElement.textContent = 'EXPIRADO';
      timerWarning.classList.add('expired');

      setTimeout(() => {
        alert('O tempo para pagamento expirou. Gerando novo código...');
        window.location.reload();
      }, 1000);
    }
  }, 1000);
}
