import { redirectWithUtm, initUtmTracking } from './utm-helper.js';
import { showTransition } from './transition-loader.js';

// Inicializa tracking de UTM
initUtmTracking();

document.addEventListener('DOMContentLoaded', () => {
  const payButton = document.getElementById('pay-button');
  payButton.addEventListener('click', handlePayment);
});

function handlePayment() {
  const payButton = document.getElementById('pay-button');
  payButton.disabled = true;
  payButton.innerHTML = '<span class="button-text">PROCESSANDO...</span>';

  setTimeout(() => {
    showTransition('upsell3ToTarifa', () => {
      redirectWithUtm('pagamento-tarifa.html');
    });
  }, 500);
}
