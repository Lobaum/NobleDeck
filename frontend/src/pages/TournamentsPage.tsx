import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, Calendar, Award, MapPin, CheckCircle } from 'lucide-react';
import type { GameId } from '../types';

export const TournamentsPage: React.FC = () => {
  const { tournaments, setSelectedTournamentForModal, currentUser, registerInTournament } =
    useApp();

  const [selectedGame, setSelectedGame] = useState<GameId | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'mine'>('all');

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchGame = selectedGame === 'all' || t.jogo === selectedGame;
      if (filterStatus === 'open') {
        return matchGame && t.vagasOcupadas < t.vagasTotais;
      }
      if (filterStatus === 'mine') {
        return matchGame && currentUser.torneiosInscritos.includes(t.id);
      }
      return matchGame;
    });
  }, [tournaments, selectedGame, filterStatus, currentUser]);

  return (
    <div style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div className="app-container">
        {/* Cabeçalho */}
        <div style={{ marginBottom: '36px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            Campeonatos Oficiais
          </span>
          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontFamily: 'var(--font-headline)',
              marginBottom: '12px',
            }}
          >
            Calendário de Torneios & Ligas
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '16px', maxWidth: '650px' }}>
            Participe dos eventos competitivos e casuais da Noble Deck. Concorra a premiações
            em dinheiro, boosters selados e cartas promocionais exclusivas.
          </p>
        </div>

        {/* Filtros */}
        <div
          className="glass-panel"
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '36px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(
              [
                { id: 'all', label: 'Todos os Jogos' },
                { id: 'magic', label: 'Magic' },
                { id: 'pokemon', label: 'Pokémon' },
                { id: 'yugioh', label: 'Yu-Gi-Oh!' },
                { id: 'onepiece', label: 'One Piece' },
              ] as { id: GameId | 'all'; label: string }[]
            ).map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGame(g.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  border:
                    selectedGame === g.id
                      ? '1px solid var(--color-primary)'
                      : '1px solid var(--nav-border)',
                  backgroundColor:
                    selectedGame === g.id
                      ? 'var(--badge-purple-bg)'
                      : 'var(--color-surface)',
                  color:
                    selectedGame === g.id
                      ? 'var(--badge-purple-text)'
                      : 'var(--color-on-surface-variant)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setFilterStatus('all')}
              style={{
                background: 'none',
                border: 'none',
                color: filterStatus === 'all' ? 'var(--color-primary)' : 'var(--color-outline)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '6px 10px',
                textDecoration: filterStatus === 'all' ? 'underline' : 'none',
              }}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('open')}
              style={{
                background: 'none',
                border: 'none',
                color: filterStatus === 'open' ? 'var(--color-primary)' : 'var(--color-outline)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '6px 10px',
                textDecoration: filterStatus === 'open' ? 'underline' : 'none',
              }}
            >
              Com Vagas
            </button>
            <button
              onClick={() => setFilterStatus('mine')}
              style={{
                background: 'none',
                border: 'none',
                color: filterStatus === 'mine' ? 'var(--color-primary)' : 'var(--color-outline)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '6px 10px',
                textDecoration: filterStatus === 'mine' ? 'underline' : 'none',
              }}
            >
              Minhas Inscrições ({currentUser.torneiosInscritos.length})
            </button>
          </div>
        </div>

        {/* Torneios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredTournaments.length === 0 ? (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                backgroundColor: 'var(--color-surface-container)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <p style={{ fontSize: '18px', color: 'var(--color-on-surface-variant)', marginBottom: '16px' }}>
                Nenhum torneio encontrado com os filtros ativos.
              </p>
              <button
                onClick={() => {
                  setSelectedGame('all');
                  setFilterStatus('all');
                }}
                className="btn-primary"
              >
                Resetar Filtros
              </button>
            </div>
          ) : (
            filteredTournaments.map((t) => {
              const isFull = t.vagasOcupadas >= t.vagasTotais;
              const isRegistered = currentUser.torneiosInscritos.includes(t.id);

              return (
                <div
                  key={t.id}
                  className="glass-panel glass-panel-hover"
                  style={{
                    padding: '28px',
                    borderRadius: 'var(--radius-xl)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {t.isPremium && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: 'var(--color-accent-yellow)',
                        color: '#151219',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '4px 14px',
                        borderBottomLeftRadius: 'var(--radius-sm)',
                      }}
                    >
                      ★ Torneio Premium
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span className="badge badge-purple">{t.jogoNome}</span>
                      <span className="badge badge-muted">Formato: {t.formato}</span>
                    </div>

                    <h3
                      style={{
                        fontSize: '22px',
                        fontFamily: 'var(--font-headline)',
                        marginBottom: '8px',
                      }}
                    >
                      {t.titulo}
                    </h3>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '20px',
                        color: 'var(--color-on-surface-variant)',
                        fontSize: '13px',
                        marginTop: '12px',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={15} color="var(--color-primary)" />
                        {t.data} • {t.horario}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={15} color="var(--color-secondary)" />
                        {t.local}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Award size={15} color="var(--color-accent-yellow)" />
                        Taxa: R$ {t.taxaInscricao.toFixed(2)}
                      </span>
                    </div>

                    <p
                      style={{
                        marginTop: '12px',
                        fontSize: '13px',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Trophy size={15} />
                      <strong style={{ color: 'var(--color-headline)' }}>Premiação:</strong> {t.premiacao}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '12px',
                      minWidth: '180px',
                    }}
                  >
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: 'var(--color-outline)',
                          textTransform: 'uppercase',
                          display: 'block',
                          marginBottom: '4px',
                        }}
                      >
                        Capacidade da Mesa
                      </span>
                      {isFull ? (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '22px',
                              fontWeight: 700,
                              color: 'var(--color-error)',
                            }}
                          >
                            Lotação
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                            Máxima
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '24px',
                              fontWeight: 700,
                              color: 'var(--color-primary)',
                            }}
                          >
                            {t.vagasOcupadas}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                            / {t.vagasTotais} inscritos
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => setSelectedTournamentForModal(t)}
                        className="btn-outline"
                        style={{ padding: '10px 18px' }}
                      >
                        Detalhes
                      </button>

                      {isRegistered ? (
                        <button
                          disabled
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 18px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--badge-purple-bg)',
                            border: '1px solid var(--color-primary)',
                            color: 'var(--badge-purple-text)',
                            fontSize: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          <CheckCircle size={14} />
                          Inscrito
                        </button>
                      ) : (
                        <button
                          onClick={() => registerInTournament(t.id)}
                          disabled={isFull}
                          className="btn-primary"
                          style={{
                            padding: '10px 20px',
                            opacity: isFull ? 0.4 : 1,
                            cursor: isFull ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isFull ? 'Lotado' : 'Inscrever-se'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
