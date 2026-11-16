import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Lock,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { formatBRL, getAuthToken } from '../services/api';
import nobleLogo from '../assets/noble-logo.png';
import type { DeliveryType, Order, PaymentMethod, PaymentStatus } from '../types';

type CheckoutStep = 'delivery' | 'payment' | 'confirmation';

interface AddressErrors {
  fullName?: string;
  phone?: string;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

interface CardErrors {
  number?: string;
  holder?: string;
  expiry?: string;
  cvv?: string;
}

const STORE_PICKUP_ADDRESS =
  'Retirada na Loja - Av. Paulista, 1800, Conj. 42, Bela Vista - São Paulo / SP';

function formatCepInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCardNumberInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiryInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function passesLuhn(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let doubleNext = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (Number.isNaN(digit)) return false;
    if (doubleNext) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleNext = !doubleNext;
  }
  return sum % 10 === 0;
}

function detectCardBrand(digits: string): string {
  if (digits.startsWith('4')) return 'Visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) return 'Mastercard';
  if (/^(34|37)/.test(digits)) return 'Amex';
  if (/^(4011|4312|4389|4514|4576|5041|5066|5090|6277|6362|6363|650|6516|6550)/.test(digits)) {
    return 'Elo';
  }
  return 'Crédito';
}

function formatPaymentMethodLabel(method?: string): string {
  switch ((method || '').toLowerCase()) {
    case 'pix':
      return 'PIX Instantâneo';
    case 'cartao':
      return 'Cartão de Crédito';
    case 'boleto':
      return 'Boleto Bancário';
    case 'retirada_loja':
      return 'Pagamento na Retirada';
    default:
      return method || 'Não informado';
  }
}

function buildDeterministicQrGrid(seed: string): boolean[][] {
  const size = 11;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const paintFinder = (top: number, left: number) => {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        grid[top + r][left + c] = !(r === 1 && c === 1);
      }
    }
  };

  paintFinder(0, 0);
  paintFinder(0, size - 3);
  paintFinder(size - 3, 0);

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 4 && c < 4) || (r < 4 && c >= size - 4) || (r >= size - 4 && c < 4);
      if (inFinder) continue;
      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      grid[r][c] = (Math.abs(hash) % 10) < 5;
    }
  }
  return grid;
}

export const CheckoutPage: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const {
    cart,
    cartTotal,
    cartItemsCount,
    updateCartQuantity,
    removeFromCart,
    createOrder,
    currentUser,
    setCurrentTab,
    setIsAuthModalOpen,
    setAuthModalMode,
    showToast,
  } = useApp();

  const [step, setStep] = useState<CheckoutStep>('delivery');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Etapa 1: Identificação e Endereço
  const [fullName, setFullName] = useState(currentUser.nome || '');
  const [phone, setPhone] = useState(formatPhoneInput(currentUser.telefone || ''));
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('entrega');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [notes, setNotes] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<string>('');
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});

  // Etapa 2: Pagamento
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState((currentUser.nome || '').toUpperCase());
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);
  const [cardErrors, setCardErrors] = useState<CardErrors>({});

  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numberInputRef = useRef<HTMLInputElement>(null);
  const lastFetchedCepRef = useRef<string>('');

  const accentText = isLight ? '#8F4A00' : '#FFC400';
  const isLoggedIn = Boolean(currentUser.email && currentUser.id > 0 && getAuthToken());

  useEffect(() => {
    if (currentUser.nome && !fullName) {
      setFullName(currentUser.nome);
    }
    if (currentUser.nome && !cardHolder) {
      setCardHolder(currentUser.nome.toUpperCase());
    }
    if (currentUser.telefone && !phone) {
      setPhone(formatPhoneInput(currentUser.telefone));
    }
    if (currentUser.cep && !cep) {
      setCep(formatCepInput(currentUser.cep));
    }
    if (currentUser.endereco && !street) {
      setStreet(currentUser.endereco);
    }
  }, [
    currentUser.nome,
    currentUser.telefone,
    currentUser.cep,
    currentUser.endereco,
    fullName,
    cardHolder,
    phone,
    cep,
    street,
  ]);

  useEffect(() => {
    if (deliveryType === 'entrega' && paymentMethod === 'retirada_loja') {
      setPaymentMethod('pix');
    }
  }, [deliveryType, paymentMethod]);

  const formattedDestination = useMemo(() => {
    if (deliveryType === 'retirada') {
      return STORE_PICKUP_ADDRESS;
    }
    const cleanStreet = street.trim();
    const cleanNumber = streetNumber.trim();
    const cleanComplement = complement.trim();
    const cleanNeighborhood = neighborhood.trim();
    const cleanCity = city.trim();
    const cleanUf = uf.trim().toUpperCase();
    const cleanCep = formatCepInput(cep);
    if (!cleanStreet || !cleanNumber || !cleanCity) return '';

    const streetLine = cleanComplement
      ? `${cleanStreet}, ${cleanNumber} (${cleanComplement})`
      : `${cleanStreet}, ${cleanNumber}`;
    return `${streetLine} - ${cleanNeighborhood || 'Centro'}, ${cleanCity}/${cleanUf || 'SP'} - CEP ${cleanCep}`;
  }, [deliveryType, street, streetNumber, complement, neighborhood, city, uf, cep]);

  const pixCopyCode = useMemo(() => {
    const cleanTotal = cartTotal.toFixed(2);
    const cepDigits = cep.replace(/\D/g, '') || '01310200';
    return `00020126580014BR.GOV.BCB.PIX0136contato@nobledeck.com.br5204000053039865406${cleanTotal.padStart(
      6,
      '0'
    )}5802BR5910NOBLE DECK6009SAO PAULO62150511ND${cepDigits}6304A8F1`;
  }, [cartTotal, cep]);

  const boletoCode = useMemo(() => {
    const cents = Math.round(cartTotal * 100)
      .toString()
      .padStart(10, '0');
    return `23793.38128 60008.120004 95000.063307 1 9942${cents}`;
  }, [cartTotal]);

  const qrMatrix = useMemo(
    () => buildDeterministicQrGrid(`${pixCopyCode}-${cartItemsCount}`),
    [pixCopyCode, cartItemsCount]
  );

  const lookupCep = async (rawCep: string, focusNumber = true) => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8 || isFetchingCep) return;
    if (lastFetchedCepRef.current === digits && street.trim()) return;

    lastFetchedCepRef.current = digits;
    setIsFetchingCep(true);
    setCepFeedback('');

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) throw new Error('Falha ao consultar CEP');
      const data = await res.json();
      if (data?.erro) {
        setCepFeedback('CEP não encontrado. Preencha o endereço manualmente.');
        return;
      }

      if (data.logradouro) setStreet(String(data.logradouro));
      if (data.bairro) setNeighborhood(String(data.bairro));
      if (data.localidade) setCity(String(data.localidade));
      if (data.uf) setUf(String(data.uf).toUpperCase());

      setAddressErrors((prev) => ({
        ...prev,
        cep: undefined,
        street: data.logradouro ? undefined : prev.street,
        neighborhood: data.bairro ? undefined : prev.neighborhood,
        city: data.localidade ? undefined : prev.city,
        state: data.uf ? undefined : prev.state,
      }));
      setCepFeedback('CEP localizado! Confira e preencha o número.');
      if (focusNumber) {
        setTimeout(() => numberInputRef.current?.focus(), 60);
      }
    } catch {
      setCepFeedback('Consulta automática indisponível no momento. Preencha manualmente.');
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleCepChange = (val: string) => {
    const formatted = formatCepInput(val);
    setCep(formatted);
    setAddressErrors((prev) => ({ ...prev, cep: undefined }));
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) {
      void lookupCep(digits, true);
    }
  };

  const validateDeliveryStep = (): boolean => {
    const errors: AddressErrors = {};
    if (fullName.trim().length < 2) {
      errors.fullName = 'Informe seu nome completo.';
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.phone = 'Informe um telefone/WhatsApp válido com DDD.';
    }

    if (deliveryType === 'entrega') {
      const cepDigits = cep.replace(/\D/g, '');
      if (cepDigits.length !== 8) {
        errors.cep = 'Informe um CEP válido com 8 dígitos.';
      }
      if (street.trim().length < 3) {
        errors.street = 'Informe o nome da rua ou avenida.';
      }
      if (streetNumber.trim().length < 1) {
        errors.number = 'Informe o número (ou "S/N").';
      }
      if (neighborhood.trim().length < 2) {
        errors.neighborhood = 'Informe o bairro.';
      }
      if (city.trim().length < 2) {
        errors.city = 'Informe a cidade.';
      }
      if (!/^[A-Za-z]{2}$/.test(uf.trim())) {
        errors.state = 'UF com 2 letras (ex: SP).';
      }
    }

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePaymentStep = (): boolean => {
    setSubmitError('');

    if (paymentMethod === 'pix') {
      if (!pixConfirmed) {
        setSubmitError('Marque a confirmação de pagamento PIX após copiar o código acima.');
        return false;
      }
      return true;
    }

    if (paymentMethod === 'cartao') {
      const digits = cardNumber.replace(/\D/g, '');
      const errors: CardErrors = {};

      if (!passesLuhn(digits)) {
        errors.number = 'Número do cartão inválido (verifique os dígitos).';
      }
      if (cardHolder.trim().length < 3) {
        errors.holder = 'Informe o nome impresso no cartão.';
      }

      const expMatch = /^(\d{2})\/(\d{2})$/.exec(cardExpiry.trim());
      if (!expMatch) {
        errors.expiry = 'Use o formato MM/AA.';
      } else {
        const month = Number(expMatch[1]);
        const year = 2000 + Number(expMatch[2]);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        if (month < 1 || month > 12) {
          errors.expiry = 'Mês inválido.';
        } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
          errors.expiry = 'Cartão com validade expirada.';
        }
      }

      const cvvDigits = cardCvv.replace(/\D/g, '');
      if (cvvDigits.length < 3 || cvvDigits.length > 4) {
        errors.cvv = 'CVV deve ter 3 ou 4 dígitos.';
      }

      setCardErrors(errors);
      return Object.keys(errors).length === 0;
    }

    return true;
  };

  const handleGoToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDeliveryStep()) {
      showToast('Preencha os campos obrigatórios de contato e endereço.');
      return;
    }
    setStep('payment');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFillTestCard = () => {
    setCardNumber('4532 1188 9944 0014');
    setCardHolder((fullName || currentUser.nome || 'COLECIONADOR NOBLE').toUpperCase());
    setCardExpiry('11/30');
    setCardCvv('742');
    setCardErrors({});
    setSubmitError('');
  };

  const handleCopyText = async (content: string, type: 'pix' | 'boleto') => {
    try {
      await navigator.clipboard.writeText(content);
      if (type === 'pix') {
        setCopiedPix(true);
        setTimeout(() => setCopiedPix(false), 2400);
        showToast('Código PIX copiado para a área de transferência.');
      } else {
        setCopiedBoleto(true);
        setTimeout(() => setCopiedBoleto(false), 2400);
        showToast('Linha digitável do boleto copiada.');
      }
    } catch {
      showToast('Não foi possível copiar automaticamente. Selecione o código manualmente.');
    }
  };

  const handleFinishOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateDeliveryStep()) {
      setStep('delivery');
      showToast('Revise seu endereço de entrega antes de finalizar.');
      return;
    }
    if (!validatePaymentStep()) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      let paymentStatus: PaymentStatus = 'Aguardando';
      if (paymentMethod === 'pix' || paymentMethod === 'cartao') {
        paymentStatus = 'Aprovado';
      } else if (paymentMethod === 'retirada_loja') {
        paymentStatus = 'Na Retirada';
      }

      const created = await createOrder({
        tipo_entrega: deliveryType,
        cep: deliveryType === 'retirada' ? '01310-200' : formatCepInput(cep),
        endereco_entrega: formattedDestination || STORE_PICKUP_ADDRESS,
        cliente_telefone: phone.trim(),
        metodo_pagamento: paymentMethod,
        status_pagamento: paymentStatus,
        parcelas: paymentMethod === 'cartao' ? installments : 1,
        observacoes: notes.trim() || undefined,
      });

      if (created) {
        setCompletedOrder(created);
        setStep('confirmation');
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        setSubmitError('Não foi possível registrar o pedido. Confira os itens no resumo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardDigits = cardNumber.replace(/\D/g, '');
  const detectedBrand = detectCardBrand(cardDigits);

  // Estado 1: Usuário não logado
  if (!isLoggedIn && step !== 'confirmation') {
    return (
      <div className="checkout-page-root">
        <div className="landing-band-wide" style={{ maxWidth: '720px' }}>
          <div className="checkout-panel-card" style={{ textAlign: 'center', padding: '44px 28px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                margin: '0 auto 18px',
                backgroundColor: isLight ? 'rgba(255, 196, 0, 0.18)' : 'rgba(255, 196, 0, 0.14)',
                border: '2px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accentText,
              }}
            >
              <Lock size={28} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: '28px', marginBottom: '10px' }}>
              Entre para concluir seu checkout
            </h1>
            <p
              style={{
                fontSize: '15px',
                color: 'var(--color-on-surface-variant)',
                lineHeight: 1.6,
                maxWidth: '46ch',
                margin: '0 auto 24px',
              }}
            >
              Precisamos vincular seu endereço de entrega, comprovante de pagamento e código de
              rastreio à sua conta Noble Deck.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="landing-btn-print"
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
              >
                <span>Fazer Login</span>
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="landing-btn-print-secondary"
                onClick={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
              >
                Criar Minha Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Estado 2: Carrinho vazio antes de finalizar
  if (cart.length === 0 && !completedOrder) {
    return (
      <div className="checkout-page-root">
        <div className="landing-band-wide" style={{ maxWidth: '720px' }}>
          <div className="checkout-panel-card" style={{ textAlign: 'center', padding: '48px 28px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                margin: '0 auto 18px',
                backgroundColor: 'var(--color-surface-container-low)',
                border: '1.5px solid var(--card-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-outline)',
              }}
            >
              <ShoppingBag size={30} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: '28px', marginBottom: '10px' }}>
              Seu carrinho está vazio
            </h1>
            <p
              style={{
                fontSize: '15px',
                color: 'var(--color-on-surface-variant)',
                lineHeight: 1.6,
                maxWidth: '44ch',
                margin: '0 auto 24px',
              }}
            >
              Adicione cartas catalogadas ou caixas seladas da loja para prosseguir com endereço e
              pagamento no checkout.
            </p>
            <button
              type="button"
              className="landing-btn-print"
              onClick={() => setCurrentTab('products')}
            >
              <span>Explorar Catálogo</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-root">
      <div className="landing-band-wide" style={{ maxWidth: '1480px' }}>
        {/* Cabeçalho e barra de etapas */}
        <div className="checkout-topbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {step !== 'confirmation' && (
              <button
                type="button"
                onClick={() => setCurrentTab('products')}
                className="checkout-back-link"
              >
                <ArrowLeft size={15} />
                <span>Voltar para a loja</span>
              </button>
            )}
            <h1 className="checkout-page-title">
              {step === 'confirmation' ? 'Pedido Confirmado' : 'Checkout'}
            </h1>
          </div>

          <ol className="checkout-stepper" aria-label="Etapas do checkout">
            <li
              className={`checkout-step-pill ${step === 'delivery'
                  ? 'is-current'
                  : 'is-done'
                }`}
            >
              <button
                type="button"
                disabled={step === 'confirmation'}
                onClick={() => step === 'payment' && setStep('delivery')}
                className="checkout-step-btn"
              >
                <span className="checkout-step-num">1</span>
                <span>Entrega & CEP</span>
              </button>
            </li>
            <li
              className={`checkout-step-pill ${step === 'payment'
                  ? 'is-current'
                  : step === 'confirmation'
                    ? 'is-done'
                    : ''
                }`}
            >
              <button
                type="button"
                disabled={step === 'delivery' || step === 'confirmation'}
                onClick={() => setStep('payment')}
                className="checkout-step-btn"
              >
                <span className="checkout-step-num">2</span>
                <span>Pagamento</span>
              </button>
            </li>
            <li className={`checkout-step-pill ${step === 'confirmation' ? 'is-current is-done' : ''}`}>
              <span className="checkout-step-btn" aria-current={step === 'confirmation' ? 'step' : undefined}>
                <span className="checkout-step-num">3</span>
                <span>Comprovante</span>
              </span>
            </li>
          </ol>
        </div>

        {/* Tela 3: Comprovante Especial do Pedido Finalizado */}
        {step === 'confirmation' && completedOrder ? (
          <div className="checkout-panel-card" style={{ maxWidth: '920px', margin: '0 auto', padding: '36px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '18px', borderBottom: '1.5px solid var(--card-border)', paddingBottom: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 196, 0, 0.2)',
                    border: '2px solid var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: accentText,
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={30} />
                </div>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: accentText, textTransform: 'uppercase' }}>
                    Compra Registrada no Sistema
                  </span>
                  <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: '28px', marginTop: '2px' }}>
                    Pedido #{completedOrder.numero || completedOrder.id_pedido}
                  </h2>
                  <p style={{ fontSize: '13.5px', color: 'var(--color-on-surface-variant)' }}>
                    Emitido em {completedOrder.data} para {completedOrder.cliente_nome}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span className="badge badge-primary">Pedido: {completedOrder.status}</span>
                <span className="badge badge-yellow">
                  Pagamento: {completedOrder.status_pagamento || 'Registrado'}
                </span>
              </div>
            </div>

            <div className="checkout-receipt-grid">
              <div className="checkout-receipt-box">
                <div className="checkout-receipt-label">
                  <MapPin size={15} />
                  <span>Destino Logístico ({completedOrder.tipo_entrega === 'retirada' ? 'Retirada em Loja' : 'Envio'})</span>
                </div>
                <p style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--color-headline)', fontWeight: 600 }}>
                  {completedOrder.endereco_entrega}
                </p>
                {completedOrder.cep && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                    CEP: {completedOrder.cep}
                  </span>
                )}
              </div>

              <div className="checkout-receipt-box">
                <div className="checkout-receipt-label">
                  <CreditCard size={15} />
                  <span>Método & Situação Financeira</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--color-headline)', fontWeight: 700 }}>
                  {formatPaymentMethodLabel(completedOrder.metodo_pagamento)}
                </p>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: accentText, fontWeight: 700 }}>
                  Status financeiro: {completedOrder.status_pagamento || 'Confirmado'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '24px', borderTop: '1px solid var(--card-border)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '12px' }}>
                Itens do Pedido
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {completedOrder.itens.map((item, idx) => (
                  <div
                    key={`${item.produto.id}-${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-surface-container-low)',
                      border: '1px solid var(--card-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <img
                        src={item.produto.imagemUrl || nobleLogo}
                        alt={item.produto.nome}
                        style={{ width: '40px', height: '52px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: '14px' }}>{item.produto.nome}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                          {item.quantidade}x R$ {formatBRL(item.produto.preco)}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: accentText }}>
                      R$ {formatBRL(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: '18px',
                  paddingTop: '14px',
                  borderTop: '1.5px dashed var(--card-border)',
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: 700 }}>Total do Pedido</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 800, color: accentText }}>
                  R$ {formatBRL(completedOrder.valor_total)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="landing-btn-print"
                onClick={() => {
                  setCompletedOrder(null);
                  setCurrentTab(currentUser.role === 'admin' ? 'admin' : 'dashboard');
                }}
              >
                <span>Acompanhar Meus Pedidos</span>
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="landing-btn-print-secondary"
                onClick={() => {
                  setCompletedOrder(null);
                  setCurrentTab('products');
                }}
              >
                Continuar Comprando
              </button>
            </div>
          </div>
        ) : (
          /* Layout Principal do Checkout (2 colunas assimétricas) */
          <div className="checkout-layout-grid">
            <div className="checkout-main-col">
              {step === 'delivery' ? (
                <form onSubmit={handleGoToPayment} className="checkout-panel-card" noValidate>
                  <div className="checkout-section-header">
                    <h2>1. Identificação e Destino de Entrega</h2>
                    <p>
                      Informe um telefone para contato e escolha envio com CEP completo ou retirada
                      presencial.
                    </p>
                  </div>

                  {/* Dados de contato */}
                  <div className="checkout-field-row-2">
                    <div className="checkout-field-group">
                      <label htmlFor="chk-fullname" className="checkout-label">
                        Nome completo do destinatário *
                      </label>
                      <input
                        id="chk-fullname"
                        type="text"
                        className="system-input"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          setAddressErrors((prev) => ({ ...prev, fullName: undefined }));
                        }}
                        placeholder="Nome de quem receberá as cartas"
                      />
                      {addressErrors.fullName && (
                        <span className="checkout-error-text">{addressErrors.fullName}</span>
                      )}
                    </div>

                    <div className="checkout-field-group">
                      <label htmlFor="chk-phone" className="checkout-label">
                        Telefone / WhatsApp *
                      </label>
                      <input
                        id="chk-phone"
                        type="tel"
                        className="system-input"
                        value={phone}
                        onChange={(e) => {
                          setPhone(formatPhoneInput(e.target.value));
                          setAddressErrors((prev) => ({ ...prev, phone: undefined }));
                        }}
                        placeholder="(11) 99999-9999"
                      />
                      {addressErrors.phone && (
                        <span className="checkout-error-text">{addressErrors.phone}</span>
                      )}
                    </div>
                  </div>

                  <div className="checkout-user-verified">
                    <span>Conta autenticada:</span>
                    <strong>{currentUser.email}</strong>
                  </div>

                  {/* Modalidade de Recebimento */}
                  <div className="checkout-delivery-modes" role="radiogroup" aria-label="Tipo de entrega">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={deliveryType === 'entrega'}
                      onClick={() => setDeliveryType('entrega')}
                      className={`checkout-mode-card ${deliveryType === 'entrega' ? 'is-selected' : ''}`}
                    >
                      <div className="checkout-mode-head">
                        <Truck size={19} />
                        <strong>Envio Protegido para Endereço</strong>
                      </div>
                      <p>Cards em sleeve + toploader com embalagem rígida para todo o Brasil.</p>
                      <span className="checkout-mode-tag">Frete Grátis</span>
                    </button>

                    <button
                      type="button"
                      role="radio"
                      aria-checked={deliveryType === 'retirada'}
                      onClick={() => {
                        setDeliveryType('retirada');
                        setAddressErrors({});
                      }}
                      className={`checkout-mode-card ${deliveryType === 'retirada' ? 'is-selected' : ''}`}
                    >
                      <div className="checkout-mode-head">
                        <Store size={19} />
                        <strong>Retirar na Loja Física</strong>
                      </div>
                      <p>Av. Paulista, 1800, Conj. 42, Bela Vista - São Paulo / SP.</p>
                      <span className="checkout-mode-tag">Pronto para retirada</span>
                    </button>
                  </div>

                  {deliveryType === 'entrega' ? (
                    <div className="checkout-address-form">
                      <div className="checkout-cep-row">
                        <div className="checkout-field-group" style={{ flex: 1 }}>
                          <label htmlFor="chk-cep" className="checkout-label">
                            CEP *
                          </label>
                          <input
                            id="chk-cep"
                            type="text"
                            inputMode="numeric"
                            className="system-input"
                            value={cep}
                            onChange={(e) => handleCepChange(e.target.value)}
                            placeholder="00000-000"
                            maxLength={9}
                          />
                          {addressErrors.cep && (
                            <span className="checkout-error-text">{addressErrors.cep}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void lookupCep(cep, true)}
                          disabled={isFetchingCep || cep.replace(/\D/g, '').length !== 8}
                          className="btn-outline"
                          style={{ height: '42px', alignSelf: 'flex-end', whiteSpace: 'nowrap' }}
                        >
                          <Search size={14} />
                          <span>{isFetchingCep ? 'Consultando...' : 'Buscar CEP'}</span>
                        </button>
                      </div>

                      {cepFeedback && (
                        <p style={{ fontSize: '12px', color: accentText, fontWeight: 600, margin: '-4px 0 4px' }}>
                          {cepFeedback}
                        </p>
                      )}

                      <div className="checkout-street-grid">
                        <div className="checkout-field-group">
                          <label htmlFor="chk-street" className="checkout-label">
                            Logradouro / Rua *
                          </label>
                          <input
                            id="chk-street"
                            type="text"
                            className="system-input"
                            value={street}
                            onChange={(e) => {
                              setStreet(e.target.value);
                              setAddressErrors((prev) => ({ ...prev, street: undefined }));
                            }}
                            placeholder="Ex: Avenida Paulista"
                          />
                          {addressErrors.street && (
                            <span className="checkout-error-text">{addressErrors.street}</span>
                          )}
                        </div>

                        <div className="checkout-field-group">
                          <label htmlFor="chk-number" className="checkout-label">
                            Número *
                          </label>
                          <input
                            ref={numberInputRef}
                            id="chk-number"
                            type="text"
                            className="system-input"
                            value={streetNumber}
                            onChange={(e) => {
                              setStreetNumber(e.target.value);
                              setAddressErrors((prev) => ({ ...prev, number: undefined }));
                            }}
                            placeholder="1800"
                          />
                          {addressErrors.number && (
                            <span className="checkout-error-text">{addressErrors.number}</span>
                          )}
                        </div>
                      </div>

                      <div className="checkout-field-row-2">
                        <div className="checkout-field-group">
                          <label htmlFor="chk-complement" className="checkout-label">
                            Complemento
                          </label>
                          <input
                            id="chk-complement"
                            type="text"
                            className="system-input"
                            value={complement}
                            onChange={(e) => setComplement(e.target.value)}
                            placeholder="Apto, bloco, sala (opcional)"
                          />
                        </div>

                        <div className="checkout-field-group">
                          <label htmlFor="chk-neighborhood" className="checkout-label">
                            Bairro *
                          </label>
                          <input
                            id="chk-neighborhood"
                            type="text"
                            className="system-input"
                            value={neighborhood}
                            onChange={(e) => {
                              setNeighborhood(e.target.value);
                              setAddressErrors((prev) => ({ ...prev, neighborhood: undefined }));
                            }}
                            placeholder="Ex: Bela Vista"
                          />
                          {addressErrors.neighborhood && (
                            <span className="checkout-error-text">{addressErrors.neighborhood}</span>
                          )}
                        </div>
                      </div>

                      <div className="checkout-city-grid">
                        <div className="checkout-field-group">
                          <label htmlFor="chk-city" className="checkout-label">
                            Cidade *
                          </label>
                          <input
                            id="chk-city"
                            type="text"
                            className="system-input"
                            value={city}
                            onChange={(e) => {
                              setCity(e.target.value);
                              setAddressErrors((prev) => ({ ...prev, city: undefined }));
                            }}
                            placeholder="São Paulo"
                          />
                          {addressErrors.city && (
                            <span className="checkout-error-text">{addressErrors.city}</span>
                          )}
                        </div>

                        <div className="checkout-field-group">
                          <label htmlFor="chk-uf" className="checkout-label">
                            UF *
                          </label>
                          <input
                            id="chk-uf"
                            type="text"
                            maxLength={2}
                            className="system-input"
                            value={uf}
                            onChange={(e) => {
                              setUf(e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2));
                              setAddressErrors((prev) => ({ ...prev, state: undefined }));
                            }}
                            placeholder="SP"
                            style={{ textTransform: 'uppercase' }}
                          />
                          {addressErrors.state && (
                            <span className="checkout-error-text">{addressErrors.state}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="checkout-pickup-banner">
                      <Clock size={18} />
                      <div>
                        <strong>Retirada em Balcão - Arena Paulista</strong>
                        <p>
                          Terça a Sábado: 11h às 22h | Domingos: 10h às 19h. Apresente o número do
                          pedido e documento com foto.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="checkout-field-group" style={{ marginTop: '14px' }}>
                    <label htmlFor="chk-notes" className="checkout-label">
                      Observações para separação ou entrega (opcional)
                    </label>
                    <input
                      id="chk-notes"
                      type="text"
                      className="system-input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Deixar na portaria / conferir sleeve dupla"
                    />
                  </div>

                  {formattedDestination && (
                    <div className="checkout-destination-preview">
                      <MapPin size={15} />
                      <span>
                        <strong>Destino do pedido:</strong> {formattedDestination}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button type="submit" className="landing-btn-print">
                      <span>Continuar para Pagamento</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleFinishOrder} className="checkout-panel-card" noValidate>
                  {/* Barra compacta do endereço já validado */}
                  <div className="checkout-address-chip">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <MapPin size={16} style={{ color: accentText, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>
                          {deliveryType === 'retirada' ? 'Retirada Presencial' : 'Entregar em'}
                        </span>
                        <strong style={{ fontSize: '13.5px', display: 'block', wordBreak: 'break-word' }}>
                          {formattedDestination || STORE_PICKUP_ADDRESS}
                        </strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('delivery')}
                      className="btn-outline"
                      style={{ padding: '7px 14px', fontSize: '11.5px', flexShrink: 0 }}
                    >
                      Alterar
                    </button>
                  </div>

                  <div className="checkout-section-header" style={{ marginTop: '22px' }}>
                    <h2>2. Forma e Confirmação de Pagamento</h2>
                    <p>Escolha como deseja pagar para registrar o status financeiro do pedido.</p>
                  </div>

                  {/* Abas dos métodos de pagamento */}
                  <div className="checkout-pay-tabs" role="tablist" aria-label="Métodos de pagamento">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={paymentMethod === 'pix'}
                      onClick={() => {
                        setPaymentMethod('pix');
                        setSubmitError('');
                      }}
                      className={`checkout-pay-tab ${paymentMethod === 'pix' ? 'is-selected' : ''}`}
                    >
                      <QrCode size={17} />
                      <span>PIX Instantâneo</span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={paymentMethod === 'cartao'}
                      onClick={() => {
                        setPaymentMethod('cartao');
                        setSubmitError('');
                      }}
                      className={`checkout-pay-tab ${paymentMethod === 'cartao' ? 'is-selected' : ''}`}
                    >
                      <CreditCard size={17} />
                      <span>Cartão de Crédito</span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={paymentMethod === 'boleto'}
                      onClick={() => {
                        setPaymentMethod('boleto');
                        setSubmitError('');
                      }}
                      className={`checkout-pay-tab ${paymentMethod === 'boleto' ? 'is-selected' : ''}`}
                    >
                      <FileText size={17} />
                      <span>Boleto Bancário</span>
                    </button>

                    {deliveryType === 'retirada' && (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={paymentMethod === 'retirada_loja'}
                        onClick={() => {
                          setPaymentMethod('retirada_loja');
                          setSubmitError('');
                        }}
                        className={`checkout-pay-tab ${paymentMethod === 'retirada_loja' ? 'is-selected' : ''}`}
                      >
                        <Store size={17} />
                        <span>Pagar na Loja</span>
                      </button>
                    )}
                  </div>

                  {/* Painel PIX */}
                  {paymentMethod === 'pix' && (
                    <div className="checkout-pay-panel">
                      <div className="checkout-pix-grid">
                        <div className="checkout-qr-frame" aria-label="Código QR PIX de pagamento">
                          <svg viewBox="0 0 110 110" width="144" height="144" role="img" aria-label="QR Code PIX">
                            <rect width="110" height="110" fill="#FFFFFF" rx="6" />
                            {qrMatrix.map((row, rIdx) =>
                              row.map((filled, cIdx) =>
                                filled ? (
                                  <rect
                                    key={`${rIdx}-${cIdx}`}
                                    x={11 + cIdx * 8}
                                    y={11 + rIdx * 8}
                                    width="8"
                                    height="8"
                                    rx="1"
                                    fill="#0B0B0B"
                                  />
                                ) : null
                              )
                            )}
                          </svg>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                          <div>
                            <strong style={{ fontSize: '16px', display: 'block', marginBottom: '4px' }}>
                              Pague R$ {formatBRL(cartTotal)} via PIX
                            </strong>
                            <p style={{ fontSize: '13.5px', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                              Escaneie o QR Code ou copie o código PIX Copia e Cola abaixo e confirme a
                              transferência para aprovação imediata do pedido.
                            </p>
                          </div>

                          <div className="checkout-copy-box">
                            <code className="checkout-copy-code">{pixCopyCode}</code>
                            <button
                              type="button"
                              onClick={() => void handleCopyText(pixCopyCode, 'pix')}
                              className="btn-outline"
                              style={{ padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                            >
                              {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                              <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
                            </button>
                          </div>

                          <label className="checkout-confirm-check">
                            <input
                              type="checkbox"
                              checked={pixConfirmed}
                              onChange={(e) => {
                                setPixConfirmed(e.target.checked);
                                setSubmitError('');
                              }}
                            />
                            <span>
                              Confirmo que realizei a transferência PIX de R$ {formatBRL(cartTotal)}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Painel Cartão de Crédito */}
                  {paymentMethod === 'cartao' && (
                    <div className="checkout-pay-panel">
                      <div className="checkout-card-split">
                        <div className="checkout-card-preview" aria-hidden="true">
                          <div className="checkout-card-preview-top">
                            <span className="checkout-card-chip" />
                            <span className="checkout-card-brand">{detectedBrand}</span>
                          </div>
                          <div className="checkout-card-preview-num">
                            {cardNumber || '•••• •••• •••• ••••'}
                          </div>
                          <div className="checkout-card-preview-bottom">
                            <div>
                              <span>TITULAR</span>
                              <strong>{(cardHolder || 'NOME NO CARTÃO').slice(0, 24)}</strong>
                            </div>
                            <div>
                              <span>VALIDADE</span>
                              <strong>{cardExpiry || 'MM/AA'}</strong>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                              Ambiente demonstrativo de checkout (sem cobrança real)
                            </span>
                            <button
                              type="button"
                              onClick={handleFillTestCard}
                              className="checkout-test-card-btn"
                            >
                              Preencher cartão de teste
                            </button>
                          </div>

                          <div className="checkout-field-group">
                            <label htmlFor="chk-card-num" className="checkout-label">
                              Número do Cartão *
                            </label>
                            <input
                              id="chk-card-num"
                              type="text"
                              inputMode="numeric"
                              className="system-input"
                              value={cardNumber}
                              onChange={(e) => {
                                setCardNumber(formatCardNumberInput(e.target.value));
                                setCardErrors((prev) => ({ ...prev, number: undefined }));
                              }}
                              placeholder="0000 0000 0000 0000"
                              maxLength={19}
                            />
                            {cardErrors.number && (
                              <span className="checkout-error-text">{cardErrors.number}</span>
                            )}
                          </div>

                          <div className="checkout-field-group">
                            <label htmlFor="chk-card-holder" className="checkout-label">
                              Nome Impresso no Cartão *
                            </label>
                            <input
                              id="chk-card-holder"
                              type="text"
                              className="system-input"
                              value={cardHolder}
                              onChange={(e) => {
                                setCardHolder(e.target.value.toUpperCase());
                                setCardErrors((prev) => ({ ...prev, holder: undefined }));
                              }}
                              placeholder="COMO IMPRESSO NO CARTÃO"
                            />
                            {cardErrors.holder && (
                              <span className="checkout-error-text">{cardErrors.holder}</span>
                            )}
                          </div>

                          <div className="checkout-card-row3">
                            <div className="checkout-field-group">
                              <label htmlFor="chk-card-exp" className="checkout-label">
                                Validade *
                              </label>
                              <input
                                id="chk-card-exp"
                                type="text"
                                inputMode="numeric"
                                className="system-input"
                                value={cardExpiry}
                                onChange={(e) => {
                                  setCardExpiry(formatExpiryInput(e.target.value));
                                  setCardErrors((prev) => ({ ...prev, expiry: undefined }));
                                }}
                                placeholder="MM/AA"
                                maxLength={5}
                              />
                              {cardErrors.expiry && (
                                <span className="checkout-error-text">{cardErrors.expiry}</span>
                              )}
                            </div>

                            <div className="checkout-field-group">
                              <label htmlFor="chk-card-cvv" className="checkout-label">
                                CVV *
                              </label>
                              <input
                                id="chk-card-cvv"
                                type="password"
                                inputMode="numeric"
                                className="system-input"
                                value={cardCvv}
                                onChange={(e) => {
                                  setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4));
                                  setCardErrors((prev) => ({ ...prev, cvv: undefined }));
                                }}
                                placeholder="123"
                                maxLength={4}
                              />
                              {cardErrors.cvv && (
                                <span className="checkout-error-text">{cardErrors.cvv}</span>
                              )}
                            </div>

                            <div className="checkout-field-group">
                              <label htmlFor="chk-installments" className="checkout-label">
                                Parcelas
                              </label>
                              <select
                                id="chk-installments"
                                className="system-input"
                                value={installments}
                                onChange={(e) => setInstallments(Number(e.target.value) || 1)}
                              >
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                  <option key={n} value={n}>
                                    {n}x de R$ {formatBRL(cartTotal / n)} sem juros
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Painel Boleto */}
                  {paymentMethod === 'boleto' && (
                    <div className="checkout-pay-panel">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <strong style={{ fontSize: '16px' }}>
                          Boleto Bancário (compensação em até 2 dias úteis)
                        </strong>
                        <p style={{ fontSize: '13.5px', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
                          Os itens serão reservados imediatamente no estoque com status financeiro
                          <strong> Aguardando</strong> até a compensação bancária.
                        </p>
                        <div className="checkout-copy-box">
                          <code className="checkout-copy-code">{boletoCode}</code>
                          <button
                            type="button"
                            onClick={() => void handleCopyText(boletoCode, 'boleto')}
                            className="btn-outline"
                            style={{ padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                          >
                            {copiedBoleto ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedBoleto ? 'Copiado!' : 'Copiar Linha'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Painel Pagamento na Loja */}
                  {paymentMethod === 'retirada_loja' && deliveryType === 'retirada' && (
                    <div className="checkout-pay-panel">
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <Store size={20} style={{ color: accentText, marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <strong style={{ fontSize: '16px', display: 'block', marginBottom: '4px' }}>
                            Acerto Direto no Balcão (Av. Paulista, 1800)
                          </strong>
                          <p style={{ fontSize: '13.5px', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
                            Seu pedido ficará reservado no estoque com status{' '}
                            <strong>Na Retirada</strong>. Você confere as cartas presencialmente e
                            paga no balcão em PIX, cartão ou dinheiro.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {submitError && (
                    <div className="checkout-alert-error" role="alert">
                      <AlertCircle size={16} />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="checkout-payment-footer">
                    <button
                      type="button"
                      onClick={() => setStep('delivery')}
                      className="landing-btn-print-secondary"
                      disabled={isSubmitting}
                    >
                      <ArrowLeft size={15} />
                      <span>Voltar para Entrega</span>
                    </button>

                    <button
                      type="submit"
                      className="landing-btn-print"
                      disabled={isSubmitting}
                      style={{ opacity: isSubmitting ? 0.65 : 1 }}
                    >
                      <Lock size={15} />
                      <span>
                        {isSubmitting
                          ? 'Processando Pedido...'
                          : paymentMethod === 'boleto'
                            ? 'Emitir Pedido com Boleto'
                            : paymentMethod === 'retirada_loja'
                              ? 'Reservar para Retirada'
                              : 'Confirmar Pagamento e Finalizar'}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Coluna Direita Sticky: Resumo vivo do pedido */}
            <aside className="checkout-summary-col" aria-label="Resumo do pedido">
              <div className="checkout-panel-card checkout-summary-sticky">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                  <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-headline)' }}>
                    Resumo do Pedido
                  </h2>
                  <span className="badge badge-purple">
                    {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                <div className="checkout-summary-items">
                  {cart.map((item) => (
                    <div key={item.produto.id} className="checkout-summary-item">
                      <img
                        src={item.produto.imagemUrl || nobleLogo}
                        alt={item.produto.nome}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = nobleLogo;
                        }}
                        className="checkout-summary-thumb"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong className="checkout-summary-name">{item.produto.nome}</strong>
                        <span className="checkout-summary-meta">
                          {item.produto.jogoNome} | R$ {formatBRL(item.produto.preco)} un.
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', gap: '8px' }}>
                          <div className="checkout-qty-stepper">
                            <button
                              type="button"
                              aria-label={`Diminuir quantidade de ${item.produto.nome}`}
                              disabled={isSubmitting}
                              onClick={() => updateCartQuantity(item.produto.id, item.quantidade - 1)}
                            >
                              <Minus size={12} />
                            </button>
                            <span>{item.quantidade}</span>
                            <button
                              type="button"
                              aria-label={`Aumentar quantidade de ${item.produto.nome}`}
                              disabled={isSubmitting || item.quantidade >= item.produto.estoque}
                              onClick={() => updateCartQuantity(item.produto.id, item.quantidade + 1)}
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: accentText }}>
                              R$ {formatBRL(item.subtotal)}
                            </span>
                            <button
                              type="button"
                              aria-label={`Remover ${item.produto.nome}`}
                              disabled={isSubmitting}
                              onClick={() => removeFromCart(item.produto.id)}
                              className="checkout-remove-btn"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="checkout-totals-block">
                  <div className="checkout-total-row">
                    <span>Subtotal</span>
                    <span>R$ {formatBRL(cartTotal)}</span>
                  </div>
                  <div className="checkout-total-row">
                    <span>{deliveryType === 'retirada' ? 'Retirada em loja' : 'Embalagem e envio'}</span>
                    <span style={{ color: accentText, fontWeight: 700 }}>Grátis</span>
                  </div>
                  <div className="checkout-total-row is-grand">
                    <span>Total a pagar</span>
                    <span style={{ color: accentText }}>R$ {formatBRL(cartTotal)}</span>
                  </div>
                </div>

                <div className="checkout-protection-note">
                  <PackageCheck size={16} style={{ color: accentText, flexShrink: 0 }} />
                  <span>
                    Todas as cartas são enviadas em sleeves protetores + toploader rígido ou
                    conferidas presencialmente na loja.
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
