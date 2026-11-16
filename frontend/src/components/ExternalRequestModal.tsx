import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, PackagePlus, Send, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { formatBRL } from '../services/api';
import nobleLogo from '../assets/noble-logo.png';

export const ExternalRequestModal: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const {
    externalRequestProduct,
    setExternalRequestProduct,
    currentUser,
    showToast,
  } = useApp();

  const [requesterName, setRequesterName] = useState(currentUser.nome || '');
  const [requesterEmail, setRequesterEmail] = useState(currentUser.email || '');
  const [requesterPhone, setRequesterPhone] = useState(currentUser.telefone || '');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!externalRequestProduct) return;
    setRequesterName(currentUser.nome || '');
    setRequesterEmail(currentUser.email || '');
    setRequesterPhone(currentUser.telefone || '');
    setQuantity(1);
    setNotes('');
    setSubmittedProtocol(null);
    setErrorMsg('');

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [externalRequestProduct, currentUser.nome, currentUser.email, currentUser.telefone]);

  if (!externalRequestProduct) return null;

  const product = externalRequestProduct;
  const referenceCode = product.externalCard?.codigoCarta || product.subtitulo || product.jogoNome;

  const handleClose = () => {
    setExternalRequestProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = requesterName.trim();
    const cleanEmail = requesterEmail.trim();

    if (cleanName.length < 2) {
      setErrorMsg('Informe seu nome para registrarmos a encomenda.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Informe um e-mail válido para retorno da equipe.');
      return;
    }

    setErrorMsg('');
    const protocol = `ENC-${Math.floor(10000 + Math.random() * 90000)}`;
    setSubmittedProtocol(protocol);
    showToast(`Solicitação ${protocol} registrada para "${product.nome}"!`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="external-request-title"
    >
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--modal-backdrop)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      />

      <div
        className="system-modal-card"
        style={{
          maxWidth: '560px',
          zIndex: 10,
          padding: '28px',
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fechar solicitação de encomenda"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            border: '1px solid var(--card-border)',
            backgroundColor: 'var(--color-surface-container-high)',
            color: 'var(--color-on-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        {submittedProtocol ? (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                margin: '0 auto 16px',
                backgroundColor: 'rgba(255, 196, 0, 0.18)',
                border: '2px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isLight ? '#8F4A00' : '#FFC400',
              }}
            >
              <CheckCircle2 size={30} />
            </div>
            <h3 style={{ fontSize: '22px', marginBottom: '8px', fontFamily: 'var(--font-headline)' }}>
              Solicitação Enviada ({submittedProtocol})
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-on-surface-variant)',
                lineHeight: 1.6,
                marginBottom: '20px',
              }}
            >
              Recebemos seu interesse em <strong>{quantity}x {product.nome}</strong>. Cartas do
              acervo externo passam por cotação e importação antes de entrar no carrinho da loja.
              Nossa equipe responderá para <strong>{requesterEmail}</strong>.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href={`mailto:contato@nobledeck.com.br?subject=${encodeURIComponent(
                  `Encomenda ${submittedProtocol}: ${product.nome}`
                )}&body=${encodeURIComponent(
                  `Olá equipe Noble Deck,\n\nGostaria de confirmar a cotação/importação:\nProtocolo: ${submittedProtocol}\nCarta: ${product.nome} (${referenceCode})\nQuantidade: ${quantity}\nCliente: ${requesterName} (${requesterEmail}${requesterPhone ? `, ${requesterPhone}` : ''})\nObservações: ${notes || 'Nenhuma'}`
                )}`}
                className="btn-outline"
                style={{ textDecoration: 'none' }}
              >
                <Mail size={15} />
                <span>Abrir por E-mail</span>
              </a>
              <button type="button" onClick={handleClose} className="btn-primary">
                Voltar ao Catálogo
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '20px', paddingRight: '28px' }}>
              <div
                style={{
                  width: '62px',
                  height: '86px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid var(--card-border)',
                  backgroundColor: 'var(--color-surface-container-low)',
                  flexShrink: 0,
                  padding: '4px',
                }}
              >
                <img
                  src={product.imagemUrl || nobleLogo}
                  alt={product.nome}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = nobleLogo;
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isLight ? '#8F4A00' : 'var(--color-primary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Solicitação de Encomenda
                </span>
                <h2
                  id="external-request-title"
                  style={{
                    fontSize: '20px',
                    fontFamily: 'var(--font-headline)',
                    marginTop: '4px',
                    lineHeight: 1.2,
                  }}
                >
                  {product.nome}
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
                  {referenceCode} | Referência estimada:{' '}
                  <strong>
                    {product.preco > 0 ? `R$ ${formatBRL(product.preco)}` : 'Sob consulta'}
                  </strong>
                </p>
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: isLight ? 'rgba(255, 196, 0, 0.12)' : 'rgba(255, 196, 0, 0.08)',
                border: '1px solid rgba(255, 196, 0, 0.3)',
                fontSize: '12.5px',
                lineHeight: 1.5,
                color: 'var(--color-on-surface-variant)',
                marginBottom: '18px',
              }}
            >
              Este card pertence ao acervo externo de consulta e ainda não está catalogado no estoque
              físico da loja, portanto não é adicionado ao carrinho direto. Solicite aqui a importação.
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="system-form-grid">
                <div>
                  <label
                    htmlFor="ext-req-name"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}
                  >
                    Seu Nome *
                  </label>
                  <input
                    id="ext-req-name"
                    type="text"
                    className="system-input"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Ex: Ana Beatriz"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="ext-req-email"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}
                  >
                    Seu E-mail *
                  </label>
                  <input
                    id="ext-req-email"
                    type="email"
                    className="system-input"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="system-form-grid">
                <div>
                  <label
                    htmlFor="ext-req-phone"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}
                  >
                    Telefone / WhatsApp
                  </label>
                  <input
                    id="ext-req-phone"
                    type="tel"
                    className="system-input"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ext-req-qty"
                    style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}
                  >
                    Quantidade Desejada *
                  </label>
                  <input
                    id="ext-req-qty"
                    type="number"
                    min={1}
                    max={20}
                    className="system-input"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ext-req-notes"
                  style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}
                >
                  Observações (edição, idioma ou condição desejada)
                </label>
                <input
                  id="ext-req-notes"
                  type="text"
                  className="system-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Near Mint em português ou inglês"
                />
              </div>

              {errorMsg && (
                <p style={{ fontSize: '12.5px', color: 'var(--color-error)', fontWeight: 600 }}>
                  {errorMsg}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={handleClose} className="btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <PackagePlus size={15} />
                  <span>Solicitar Encomenda</span>
                  <Send size={14} />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ExternalRequestModal;
