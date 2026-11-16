import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Home,
  Package,
  RotateCcw,
  ShoppingBag,
  Store,
  Truck,
  User,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { AccountProfilePanel } from '../components/AccountProfilePanel';
import { formatBRL } from '../services/api';
import type { Order } from '../types';

type CustomerTab = 'orders' | 'account';
type CustomerOrderFilter = 'all' | 'active' | 'Finalizado' | 'Cancelado';

interface CustomerTones {
  successText: string;
  successBg: string;
  successBorder: string;
  dangerText: string;
  dangerBg: string;
  dangerBorder: string;
  warningText: string;
  warningBg: string;
  warningBorder: string;
  infoText: string;
  infoBg: string;
  infoBorder: string;
  pendingText: string;
  pendingBg: string;
  pendingBorder: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
}

const getCustomerTones = (isLight: boolean): CustomerTones =>
  isLight
    ? {
      successText: '#166534',
      successBg: 'rgba(22, 163, 74, 0.10)',
      successBorder: 'rgba(22, 163, 74, 0.34)',
      dangerText: '#b91c1c',
      dangerBg: 'rgba(220, 38, 38, 0.09)',
      dangerBorder: 'rgba(220, 38, 38, 0.32)',
      warningText: '#92400e',
      warningBg: 'rgba(217, 119, 6, 0.11)',
      warningBorder: 'rgba(217, 119, 6, 0.36)',
      infoText: '#0369a1',
      infoBg: 'rgba(2, 132, 199, 0.10)',
      infoBorder: 'rgba(2, 132, 199, 0.32)',
      pendingText: '#9a3412',
      pendingBg: 'rgba(234, 88, 12, 0.10)',
      pendingBorder: 'rgba(234, 88, 12, 0.32)',
      accentText: '#7A4B00',
      accentBg: 'rgba(255, 196, 0, 0.22)',
      accentBorder: 'rgba(212, 128, 0, 0.45)',
    }
    : {
      successText: '#4ade80',
      successBg: 'rgba(34, 197, 94, 0.14)',
      successBorder: 'rgba(74, 222, 128, 0.32)',
      dangerText: '#f87171',
      dangerBg: 'rgba(239, 68, 68, 0.14)',
      dangerBorder: 'rgba(248, 113, 113, 0.32)',
      warningText: '#fbbf24',
      warningBg: 'rgba(245, 158, 11, 0.14)',
      warningBorder: 'rgba(251, 191, 36, 0.32)',
      infoText: '#38bdf8',
      infoBg: 'rgba(14, 165, 233, 0.14)',
      infoBorder: 'rgba(56, 189, 248, 0.32)',
      pendingText: '#fb923c',
      pendingBg: 'rgba(249, 115, 22, 0.14)',
      pendingBorder: 'rgba(251, 146, 60, 0.32)',
      accentText: '#FFC400',
      accentBg: 'rgba(255, 196, 0, 0.14)',
      accentBorder: 'rgba(255, 196, 0, 0.36)',
    };

const getOrderStatusStyle = (status: Order['status'], tones: CustomerTones, isLight: boolean) => {
  switch (status) {
    case 'Finalizado':
      return {
        bg: tones.successBg,
        border: tones.successBorder,
        text: tones.successText,
        dot: isLight ? '#16a34a' : '#22c55e',
      };
    case 'Processando':
      return {
        bg: tones.warningBg,
        border: tones.warningBorder,
        text: tones.warningText,
        dot: isLight ? '#d97706' : '#f59e0b',
      };
    case 'Enviado':
      return {
        bg: tones.infoBg,
        border: tones.infoBorder,
        text: tones.infoText,
        dot: isLight ? '#0284c7' : '#38bdf8',
      };
    case 'Cancelado':
      return {
        bg: tones.dangerBg,
        border: tones.dangerBorder,
        text: tones.dangerText,
        dot: isLight ? '#dc2626' : '#ef4444',
      };
    default:
      return {
        bg: tones.pendingBg,
        border: tones.pendingBorder,
        text: tones.pendingText,
        dot: isLight ? '#ea580c' : '#fb923c',
      };
  }
};

const formatPaymentLabel = (method?: string) => {
  if (!method) return 'Não informado';
  const normalized = method.toLowerCase();
  if (normalized === 'pix') return 'PIX';
  if (normalized === 'cartao' || normalized === 'cartao_credito' || normalized === 'credito') return 'Cartão';
  if (normalized === 'cartao_debito' || normalized === 'debito') return 'Cartão de Débito';
  if (normalized === 'boleto') return 'Boleto';
  if (normalized === 'retirada_loja' || normalized === 'na_retirada' || normalized === 'balcao') {
    return 'Pagamento na Retirada';
  }
  return method;
};

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    orders,
    setCurrentTab,
    setIsAuthModalOpen,
    cancelOwnOrder,
    showToastConfirm,
  } = useApp();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const tones = useMemo(() => getCustomerTones(isLight), [isLight]);

  const [activeCustomerTab, setActiveCustomerTab] = useState<CustomerTab>('orders');
  const [orderFilter, setOrderFilter] = useState<CustomerOrderFilter>('all');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Separação estrita de telas: Equipe vai para Central Operacional e Admin para Painel Admin
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'admin') {
      setCurrentTab('admin');
    } else if (currentUser.role === 'funcionario') {
      setCurrentTab('staff');
    }
  }, [currentUser, setCurrentTab]);

  const myOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter((o) => o.cliente_id === currentUser.id);
  }, [orders, currentUser]);

  const orderSummary = useMemo(() => {
    const active = myOrders.filter((o) =>
      o.status === 'Pendente' || o.status === 'Processando' || o.status === 'Enviado',
    ).length;
    const finished = myOrders.filter((o) => o.status === 'Finalizado').length;
    const cancelled = myOrders.filter((o) => o.status === 'Cancelado').length;
    return { total: myOrders.length, active, finished, cancelled };
  }, [myOrders]);

  const visibleOrders = useMemo(() => {
    if (orderFilter === 'all') return myOrders;
    if (orderFilter === 'active') {
      return myOrders.filter(
        (o) => o.status === 'Pendente' || o.status === 'Processando' || o.status === 'Enviado',
      );
    }
    return myOrders.filter((o) => o.status === orderFilter);
  }, [myOrders, orderFilter]);

  if (!currentUser || !currentUser.email || currentUser.id <= 0) {
    return (
      <div className="container admin-animate-fade" style={{ paddingTop: '48px', paddingBottom: '88px' }}>
        <div className="access-denied-card">
          <div className="access-denied-glow-bg" />
          <div className="access-denied-icon-box">
            <User size={30} />
          </div>
          <span className="access-denied-pill">
            <span className="access-denied-status-dot" />
            Área da Conta
          </span>
          <h2>Entre na sua conta NobleDeck</h2>
          <p>Faça login na sua conta para acompanhar seus pedidos e dados de entrega.</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" onClick={() => setIsAuthModalOpen(true)} className="btn-primary">
              Entrar na Minha Conta
            </button>
            <button type="button" onClick={() => setCurrentTab('home')} className="btn-outline">
              <Home size={16} /> Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role === 'admin' || currentUser.role === 'funcionario') {
    return null;
  }

  const firstName = currentUser.nome.split(' ')[0] || currentUser.nome;

  return (
    <div className="container workstation-canvas customer-account-root admin-animate-fade">
      {/* Cabeçalho da Conta do Cliente */}
      <section className="staff-command-header">
        <div className="staff-command-top">
          <div className="staff-identity-col">
            <div className="staff-role-strip">
              <span className="staff-role-pill">
                <UserCheck size={13} />
                Conta do Cliente
              </span>
              <span className="staff-cargo-tag">Histórico & Pedidos</span>
            </div>

            <h1 className="staff-page-title">Minha Conta, {firstName}</h1>

            <p className="staff-identity-meta">
              <span>{currentUser.nome}</span>
              <span aria-hidden="true">•</span>
              <span>{currentUser.email}</span>
            </p>
          </div>

          <div className="staff-actions-cluster">
            <button
              type="button"
              onClick={() => setCurrentTab('products')}
              className="btn-primary staff-primary-btn"
            >
              <ShoppingBag size={15} />
              <span>Explorar Catálogo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCustomerTab('account')}
              className="btn-outline staff-secondary-btn"
            >
              <User size={14} />
              <span>Meus Dados & Senha</span>
            </button>
          </div>
        </div>
      </section>

      {/* Indicadores do Cliente */}
      <section className="customer-kpi-grid" aria-label="Resumo dos meus pedidos">
        <div className="staff-kpi-card" style={{ cursor: 'default' }}>
          <div className="staff-kpi-head">
            <span className="staff-kpi-label">Total de Pedidos</span>
            <span className="staff-kpi-icon" style={{ backgroundColor: tones.accentBg, color: tones.accentText }}>
              <Package size={16} />
            </span>
          </div>
          <div className="staff-kpi-value">{orderSummary.total}</div>
          <div className="staff-kpi-foot">
            <span>Pedidos registrados na sua conta</span>
          </div>
        </div>

        <div className={`staff-kpi-card ${orderSummary.active > 0 ? 'is-attention' : ''}`} style={{ cursor: 'default' }}>
          <div className="staff-kpi-head">
            <span className="staff-kpi-label">Em Andamento</span>
            <span className="staff-kpi-icon" style={{ backgroundColor: tones.infoBg, color: tones.infoText }}>
              <Clock size={16} />
            </span>
          </div>
          <div className="staff-kpi-value">{orderSummary.active}</div>
          <div className="staff-kpi-foot">
            <span>Aguardando preparo ou entrega</span>
          </div>
        </div>

        <div className="staff-kpi-card" style={{ cursor: 'default' }}>
          <div className="staff-kpi-head">
            <span className="staff-kpi-label">Finalizados</span>
            <span className="staff-kpi-icon" style={{ backgroundColor: tones.successBg, color: tones.successText }}>
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="staff-kpi-value">{orderSummary.finished}</div>
          <div className="staff-kpi-foot">
            <span>Entregas e retiradas concluídas</span>
          </div>
        </div>
      </section>

      {/* Abas da Conta do Cliente */}
      <div role="tablist" aria-label="Seções da conta" className="staff-tablist">
        <button
          id="customer-tab-orders"
          type="button"
          role="tab"
          aria-selected={activeCustomerTab === 'orders'}
          aria-controls="customer-panel-orders"
          onClick={() => setActiveCustomerTab('orders')}
          className={`staff-tab-btn ${activeCustomerTab === 'orders' ? 'is-active' : ''}`}
        >
          <ShoppingBag size={15} />
          <span>Meus Pedidos</span>
          {myOrders.length > 0 && (
            <span className="staff-tab-count">{myOrders.length}</span>
          )}
        </button>

        <button
          id="customer-tab-account"
          type="button"
          role="tab"
          aria-selected={activeCustomerTab === 'account'}
          aria-controls="customer-panel-account"
          onClick={() => setActiveCustomerTab('account')}
          className={`staff-tab-btn ${activeCustomerTab === 'account' ? 'is-active' : ''}`}
        >
          <User size={15} />
          <span>Minha Conta</span>
        </button>
      </div>

      {/* Lista de Pedidos do Cliente */}
      {activeCustomerTab === 'orders' && (
      <section
        id="customer-panel-orders"
        role="tabpanel"
        aria-labelledby="customer-tab-orders"
        className="staff-panel-box"
      >
        <div className="staff-section-header">
          <div>
            <h2>Meus Pedidos ({visibleOrders.length})</h2>
            <p>Acompanhe o status de preparo, código de rastreio e detalhes de cada compra.</p>
          </div>

          <div className="staff-filter-pills">
            {(
              [
                { id: 'all' as CustomerOrderFilter, label: `Todos (${orderSummary.total})` },
                { id: 'active' as CustomerOrderFilter, label: `Em Andamento (${orderSummary.active})` },
                { id: 'Finalizado' as CustomerOrderFilter, label: `Finalizados (${orderSummary.finished})` },
                { id: 'Cancelado' as CustomerOrderFilter, label: `Cancelados (${orderSummary.cancelled})` },
              ] as const
            ).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setOrderFilter(chip.id)}
                className={`staff-chip ${orderFilter === chip.id ? 'is-active' : ''}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {visibleOrders.length === 0 ? (
          <div className="staff-empty-state">
            <ShoppingBag size={36} style={{ opacity: 0.5 }} />
            <h3>Nenhum pedido encontrado neste filtro</h3>
            <p>
              {myOrders.length === 0
                ? 'Você ainda não realizou compras na loja. Explore o catálogo para montar seu próximo deck.'
                : 'Altere o filtro acima para visualizar outros pedidos da sua conta.'}
            </p>
            {myOrders.length === 0 && (
              <button type="button" onClick={() => setCurrentTab('products')} className="btn-primary">
                Ir para Produtos
              </button>
            )}
          </div>
        ) : (
          <div className="staff-orders-list">
            {visibleOrders.map((order) => {
              const statusStyle = getOrderStatusStyle(order.status, tones, isLight);
              const isPickup = order.tipo_entrega === 'retirada';
              const orderNum = order.numero ?? order.id_pedido;
              const isCancelling = cancellingId === order.id_pedido;

              return (
                <article
                  key={order.id_pedido}
                  className="staff-order-card"
                  style={{ borderLeftColor: statusStyle.dot }}
                >
                  <div className="staff-order-head">
                    <div className="staff-order-meta">
                      <div className="staff-order-title-row">
                        <span className="staff-order-id">Pedido #{orderNum}</span>
                        <span
                          className="staff-status-pill"
                          style={{
                            backgroundColor: statusStyle.bg,
                            borderColor: statusStyle.border,
                            color: statusStyle.text,
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: statusStyle.dot,
                            }}
                          />
                          {order.status}
                        </span>

                        <span
                          className="staff-delivery-pill"
                          style={{
                            backgroundColor: isPickup ? tones.accentBg : tones.infoBg,
                            borderColor: isPickup ? tones.accentBorder : tones.infoBorder,
                            color: isPickup ? tones.accentText : tones.infoText,
                          }}
                        >
                          {isPickup ? <Store size={12} /> : <Truck size={12} />}
                          <span>{isPickup ? 'Retirada na Loja' : 'Entrega'}</span>
                        </span>

                        {order.metodo_pagamento && (
                          <span
                            className="staff-delivery-pill"
                            style={{
                              backgroundColor:
                                order.status_pagamento === 'Aprovado'
                                  ? tones.successBg
                                  : order.status_pagamento === 'Estornado' || order.status_pagamento === 'Cancelado'
                                    ? tones.dangerBg
                                    : tones.warningBg,
                              borderColor:
                                order.status_pagamento === 'Aprovado'
                                  ? tones.successBorder
                                  : order.status_pagamento === 'Estornado' || order.status_pagamento === 'Cancelado'
                                    ? tones.dangerBorder
                                    : tones.warningBorder,
                              color:
                                order.status_pagamento === 'Aprovado'
                                  ? tones.successText
                                  : order.status_pagamento === 'Estornado' || order.status_pagamento === 'Cancelado'
                                    ? tones.dangerText
                                    : tones.warningText,
                            }}
                          >
                            <CreditCard size={12} />
                            <span>
                              {formatPaymentLabel(order.metodo_pagamento)}
                              {order.status_pagamento ? ` • ${order.status_pagamento}` : ''}
                            </span>
                          </span>
                        )}

                        {order.codigo_rastreio && (
                          <span
                            className="staff-delivery-pill"
                            style={{
                              backgroundColor: tones.infoBg,
                              borderColor: tones.infoBorder,
                              color: tones.infoText,
                            }}
                          >
                            Rastreio: {order.codigo_rastreio}
                          </span>
                        )}
                      </div>

                      <div className="staff-order-customer">
                        <span className="font-mono">{order.data}</span>
                        <span>•</span>
                        <span>{order.itens.length} item(ns)</span>
                      </div>

                      {order.endereco_entrega && (
                        <div className="staff-order-address">
                          <strong>{isPickup ? 'Local de retirada:' : 'Endereço de entrega:'}</strong>{' '}
                          {order.endereco_entrega}
                          {order.cep && !isPickup ? ` (CEP ${order.cep})` : ''}
                        </div>
                      )}

                      {order.observacoes && (
                        <div
                          className="staff-order-notes"
                          style={{
                            backgroundColor: tones.warningBg,
                            borderColor: tones.warningBorder,
                            color: tones.warningText,
                          }}
                        >
                          <strong>Observações:</strong> {order.observacoes}
                        </div>
                      )}
                    </div>

                    <div className="staff-order-controls">
                      <div className="staff-order-total-block">
                        <span className="staff-order-total-label">Total</span>
                        <span className="staff-order-total-value" style={{ color: tones.accentText }}>
                          R$ {formatBRL(order.valor_total)}
                        </span>
                      </div>

                      {order.status === 'Pendente' && (
                        <button
                          type="button"
                          disabled={isCancelling}
                          onClick={() => {
                            showToastConfirm({
                              message: `Deseja cancelar o Pedido #${orderNum}? Os itens retornarão ao estoque automaticamente.`,
                              confirmText: 'Sim, Cancelar Pedido',
                              cancelText: 'Manter Pedido',
                              onConfirm: () => {
                                setCancellingId(order.id_pedido);
                                void cancelOwnOrder(order.id_pedido).finally(() => {
                                  setCancellingId(null);
                                });
                              },
                            });
                          }}
                          className="btn-outline"
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            borderColor: tones.dangerBorder,
                            color: tones.dangerText,
                          }}
                        >
                          {isCancelling ? <RotateCcw size={13} /> : <XCircle size={13} />}
                          <span>{isCancelling ? 'Cancelando...' : 'Cancelar Pedido'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Itens do Pedido */}
                  <div className="staff-order-items-box">
                    {order.itens.map((item, idx) => (
                      <div key={`${order.id_pedido}-${item.produto.id}-${idx}`} className="staff-order-item-row">
                        <div className="staff-order-item-left">
                          <span className="staff-order-qty" style={{ color: tones.accentText }}>
                            {item.quantidade}x
                          </span>
                          <span className="staff-order-item-name">{item.produto.nome}</span>
                          <span className="badge badge-muted" style={{ fontSize: '10px', padding: '2px 6px' }}>
                            {item.produto.jogoNome || 'Geral'}
                          </span>
                        </div>
                        <div className="staff-order-item-right">
                          <strong>R$ {formatBRL(item.subtotal)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      )}

      {/* Aba Minha Conta (Dados Pessoais & Senha) */}
      {activeCustomerTab === 'account' && (
        <section
          id="customer-panel-account"
          role="tabpanel"
          aria-labelledby="customer-tab-account"
          className="admin-animate-fade"
        >
          <AccountProfilePanel
            showPersonalOrders={false}
            onBrowseCatalog={() => setCurrentTab('products')}
          />
        </section>
      )}
    </div>
  );
};
