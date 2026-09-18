import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle } from 'lucide-react';
import type { GameId, ProductCategory, UserRole } from '../types';
import defaultProductImg from '../assets/products/pokemon-destinos-brilhantes.png';

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    switchRole,
    orders,
    tournaments,
    products,
    updateProductStock,
    addProduct,
    createTournament,
    updateOrderStatus,
    setCurrentTab,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'new-product' | 'new-tournament'>('orders');

  const [newProdName, setNewProdName] = useState('');
  const [newProdSubtitle, setNewProdSubtitle] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('49.90');
  const [newProdStock, setNewProdStock] = useState('10');
  const [newProdGame, setNewProdGame] = useState<GameId>('pokemon');
  const [newProdCategory, setNewProdCategory] = useState<ProductCategory>('Booster Pack');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImage, setNewProdImage] = useState(defaultProductImg);

  const [newTourTitle, setNewTourTitle] = useState('');
  const [newTourGame, setNewTourGame] = useState<GameId>('magic');
  const [newTourFormat, setNewTourFormat] = useState('Standard Suíço');
  const [newTourDate, setNewTourDate] = useState('Sáb, 15 Dez');
  const [newTourTime, setNewTourTime] = useState('14:00');
  const [newTourLocal, setNewTourLocal] = useState('Noble Deck Arena - Sala Principal');
  const [newTourSlots, setNewTourSlots] = useState('32');
  const [newTourFee, setNewTourFee] = useState('50.00');
  const [newTourPrize, setNewTourPrize] = useState('R$ 1.000 em créditos na loja + Troféu');

  const isStaffOrAdmin = currentUser.role === 'funcionario' || currentUser.role === 'admin';

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const gameNames: Record<GameId, string> = {
      pokemon: 'Pokémon TCG',
      magic: 'Magic: The Gathering',
      yugioh: 'Yu-Gi-Oh!',
      onepiece: 'One Piece',
      outros: 'Acessórios',
    };

    addProduct({
      nome: newProdName,
      subtitulo: newProdSubtitle || `${newProdCategory} • ${gameNames[newProdGame]}`,
      preco: parseFloat(newProdPrice) || 0,
      estoque: parseInt(newProdStock) || 0,
      jogo: newProdGame,
      jogoNome: gameNames[newProdGame],
      categoria: newProdCategory,
      descricao: newProdDesc || 'Produto oficial licenciado da loja Noble Deck.',
      imagemUrl: newProdImage,
      isNovo: true,
      isDestaque: false,
    });

    setNewProdName('');
    setNewProdSubtitle('');
    setNewProdDesc('');
    setActiveTab('inventory');
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    const gameNames: Record<GameId, string> = {
      pokemon: 'Pokémon TCG',
      magic: 'Magic: The Gathering',
      yugioh: 'Yu-Gi-Oh!',
      onepiece: 'One Piece',
      outros: 'Geral',
    };

    createTournament({
      titulo: newTourTitle,
      jogo: newTourGame,
      jogoNome: gameNames[newTourGame],
      formato: newTourFormat,
      data: newTourDate,
      horario: newTourTime,
      local: newTourLocal,
      vagasTotais: parseInt(newTourSlots) || 16,
      taxaInscricao: parseFloat(newTourFee) || 0,
      premiacao: newTourPrize,
      isPremium: true,
    });

    setNewTourTitle('');
    setCurrentTab('tournaments');
  };

  const myTournaments = tournaments.filter((t) =>
    currentUser.torneiosInscritos.includes(t.id)
  );

  return (
    <div style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div className="app-container">
        {/* Cabeçalho */}
        <div
          className="glass-panel"
          style={{
            padding: '28px',
            borderRadius: 'var(--radius-xl)',
            marginBottom: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor:
                    currentUser.role === 'admin'
                      ? '#FFBEFB'
                      : currentUser.role === 'funcionario'
                      ? '#FFF4BF'
                      : '#8C56D4',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-primary)',
                  textTransform: 'uppercase',
                }}
              >
                Perfil Ativo: {currentUser.role}
              </span>
            </div>

            <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-headline)' }}>
              Olá, {currentUser.nome}
            </h1>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', marginTop: '4px' }}>
              {currentUser.email} • {currentUser.cargo || 'Membro Colecionador'}
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface-container-low)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--nav-border)',
            }}
          >
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-outline)',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              Alternar Modo de Visualização:
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['cliente', 'funcionario', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    backgroundColor:
                      currentUser.role === r ? 'var(--color-primary-container)' : 'transparent',
                    color: currentUser.role === r ? '#ffffff' : 'var(--color-on-surface-variant)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Abas */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '32px',
            borderBottom: '1px solid var(--nav-border)',
            paddingBottom: '12px',
          }}
        >
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor:
                activeTab === 'orders' ? 'rgba(140, 86, 212, 0.25)' : 'transparent',
              color: activeTab === 'orders' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {isStaffOrAdmin ? 'Todos os Pedidos' : 'Meus Pedidos'} ({orders.length})
          </button>

          {isStaffOrAdmin && (
            <>
              <button
                onClick={() => setActiveTab('inventory')}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor:
                    activeTab === 'inventory' ? 'rgba(140, 86, 212, 0.25)' : 'transparent',
                  color: activeTab === 'inventory' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Gerenciar Estoque ({products.length})
              </button>

              <button
                onClick={() => setActiveTab('new-product')}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor:
                    activeTab === 'new-product' ? 'rgba(140, 86, 212, 0.25)' : 'transparent',
                  color: activeTab === 'new-product' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                + Novo Produto
              </button>

              <button
                onClick={() => setActiveTab('new-tournament')}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor:
                    activeTab === 'new-tournament' ? 'rgba(140, 86, 212, 0.25)' : 'transparent',
                  color: activeTab === 'new-tournament' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                + Cadastrar Torneio
              </button>
            </>
          )}
        </div>

        {/* Pedidos */}
        {activeTab === 'orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {orders.length === 0 ? (
              <div
                style={{
                  padding: '40px',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-surface-container)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <p style={{ color: 'var(--color-on-surface-variant)' }}>
                  Nenhum pedido realizado ainda.
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id_pedido}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      borderBottom: '1px solid var(--card-border)',
                      paddingBottom: '12px',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '16px',
                          fontWeight: 700,
                          color: 'var(--color-headline)',
                          marginRight: '12px',
                        }}
                      >
                        Pedido #{order.id_pedido}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                        {order.data} • Cliente: {order.cliente_nome}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor:
                            order.status === 'Finalizado'
                              ? 'rgba(76, 175, 80, 0.2)'
                              : order.status === 'Processando'
                              ? 'rgba(255, 244, 191, 0.2)'
                              : 'rgba(140, 86, 212, 0.2)',
                          color:
                            order.status === 'Finalizado'
                              ? '#81c784'
                              : order.status === 'Processando'
                              ? 'var(--color-accent-yellow)'
                              : 'var(--color-primary)',
                          border: '1px solid var(--card-border)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {order.status}
                      </span>

                      {isStaffOrAdmin && (
                        <select
                          value={order.status}
                          onChange={(e) =>
                            updateOrderStatus(order.id_pedido, e.target.value as any)
                          }
                          style={{
                            backgroundColor: 'var(--color-surface-container-high)',
                            color: 'var(--color-on-surface)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Processando">Processando</option>
                          <option value="Finalizado">Finalizado</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {order.itens.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                            {item.quantidade}x
                          </span>
                          <span>{item.produto.nome}</span>
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-outline)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            ({item.produto.jogoNome})
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                          R$ {item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'baseline',
                      gap: '12px',
                      borderTop: '1px dashed var(--card-border)',
                      paddingTop: '12px',
                    }}
                  >
                    <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px' }}>
                      Valor Total:
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '20px',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                      }}
                    >
                      R$ {order.valor_total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}

            {!isStaffOrAdmin && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>
                  Torneios que você está participando
                </h3>
                {myTournaments.length === 0 ? (
                  <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px' }}>
                    Você ainda não se inscreveu em nenhum torneio.{' '}
                    <button
                      onClick={() => setCurrentTab('tournaments')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Ver calendário
                    </button>
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {myTournaments.map((t) => (
                      <div
                        key={t.id}
                        className="glass-panel"
                        style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}
                      >
                        <span className="badge badge-purple" style={{ marginBottom: '8px' }}>
                          {t.jogoNome}
                        </span>
                        <h4 style={{ fontSize: '16px', marginBottom: '6px' }}>{t.titulo}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                          {t.data} às {t.horario} • {t.local}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Estoque */}
        {isStaffOrAdmin && activeTab === 'inventory' && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px',
              }}
            >
              {products.map((p) => {
                const isLowStock = p.estoque <= 4;
                return (
                  <div
                    key={p.id}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: isLowStock ? '1px solid rgba(255, 180, 171, 0.4)' : undefined,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className="badge badge-muted" style={{ marginBottom: '8px' }}>
                          {p.jogoNome}
                        </span>
                        {isLowStock && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'var(--color-error)',
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            <AlertTriangle size={12} /> Estoque Baixo!
                          </span>
                        )}
                      </div>

                      <h4 style={{ fontSize: '17px', marginBottom: '4px' }}>{p.nome}</h4>
                      <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700 }}>
                        R$ {p.preco.toFixed(2)}
                      </p>
                    </div>

                    <div
                      style={{
                        marginTop: '16px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--card-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--color-outline)', display: 'block' }}>
                          Disponível
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '18px',
                            fontWeight: 700,
                            color: p.estoque > 0 ? 'var(--color-headline)' : 'var(--color-error)',
                          }}
                        >
                          {p.estoque} unidades
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => updateProductStock(p.id, -1)}
                          disabled={p.estoque <= 0}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--color-surface-container-high)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-on-surface)',
                            cursor: p.estoque <= 0 ? 'not-allowed' : 'pointer',
                            fontFamily: 'var(--font-mono)',
                          }}
                          title="Registrar saída (-1)"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => updateProductStock(p.id, 5)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'rgba(140, 86, 212, 0.25)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--color-primary)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)',
                          }}
                          title="Registrar entrada (+5)"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Novo Produto */}
        {isStaffOrAdmin && activeTab === 'new-product' && (
          <div
            className="glass-panel"
            style={{
              maxWidth: '680px',
              padding: '32px',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Cadastrar Novo Produto</h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-on-surface-variant)',
                marginBottom: '24px',
              }}
            >
              Insira as informações do item para inclusão imediata no estoque e catálogo.
            </p>

            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  Nome do Produto
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Booster Box Élite - Escarlate e Violeta"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-on-surface)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Card Game
                  </label>
                  <select
                    value={newProdGame}
                    onChange={(e) => setNewProdGame(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-on-surface)',
                    }}
                  >
                    <option value="pokemon">Pokémon TCG</option>
                    <option value="magic">Magic: The Gathering</option>
                    <option value="yugioh">Yu-Gi-Oh!</option>
                    <option value="onepiece">One Piece</option>
                    <option value="outros">Acessórios / Geral</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Categoria
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-on-surface)',
                    }}
                  >
                    <option value="Booster Box">Booster Box</option>
                    <option value="Deck Commander">Deck Commander</option>
                    <option value="Booster Pack">Booster Pack</option>
                    <option value="Starter Deck">Starter Deck</option>
                    <option value="Carta Avulsa">Carta Avulsa</option>
                    <option value="Acessórios">Acessórios</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Preço (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-on-surface)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Quantidade em Estoque
                  </label>
                  <input
                    type="number"
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-on-surface)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  URL da Imagem do Produto
                </label>
                <input
                  type="url"
                  required
                  value={newProdImage}
                  onChange={(e) => setNewProdImage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-on-surface)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  Descrição Completa
                </label>
                <textarea
                  rows={3}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Detalhes, conteúdo da caixa e conservação..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-on-surface)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '16px', marginTop: '8px' }}>
                Cadastrar e Publicar Produto
              </button>
            </form>
          </div>
        )}

        {/* Novo Torneio */}
        {isStaffOrAdmin && activeTab === 'new-tournament' && (
          <div
            className="glass-panel"
            style={{
              maxWidth: '680px',
              padding: '32px',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Cadastrar Novo Torneio</h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--color-on-surface-variant)',
                marginBottom: '24px',
              }}
            >
              Defina as regras, jogo, premiação e número de vagas para os jogadores.
            </p>

            <form onSubmit={handleCreateTournament} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  Título do Torneio
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torneio de Lançamento Regional"
                  value={newTourTitle}
                  onChange={(e) => setNewTourTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-on-surface)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Jogo
                  </label>
                  <select
                    value={newTourGame}
                    onChange={(e) => setNewTourGame(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-on-surface)',
                    }}
                  >
                    <option value="magic">Magic: The Gathering</option>
                    <option value="pokemon">Pokémon TCG</option>
                    <option value="yugioh">Yu-Gi-Oh!</option>
                    <option value="onepiece">One Piece</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Formato
                  </label>
                  <input
                    type="text"
                    required
                    value={newTourFormat}
                    onChange={(e) => setNewTourFormat(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-on-surface)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Data (Ex: Sáb, 15 Dez)
                  </label>
                  <input
                    type="text"
                    required
                    value={newTourDate}
                    onChange={(e) => setNewTourDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-on-surface)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Horário (Ex: 14:00)
                  </label>
                  <input
                    type="text"
                    required
                    value={newTourTime}
                    onChange={(e) => setNewTourTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-on-surface)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  Local da Partida (Ex: Noble Deck Arena - Mesa Central)
                </label>
                <input
                  type="text"
                  required
                  value={newTourLocal}
                  onChange={(e) => setNewTourLocal(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-on-surface)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Limite de Vagas
                  </label>
                  <input
                    type="number"
                    required
                    value={newTourSlots}
                    onChange={(e) => setNewTourSlots(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-on-surface)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                    Taxa de Inscrição (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newTourFee}
                    onChange={(e) => setNewTourFee(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-on-surface)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  Premiação Oferecida
                </label>
                <input
                  type="text"
                  required
                  value={newTourPrize}
                  onChange={(e) => setNewTourPrize(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-on-surface)',
                  }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '16px', marginTop: '8px' }}>
                Publicar Torneio no Calendário
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
