import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Trophy, Calendar, MapPin, Users, Award, CheckCircle } from 'lucide-react';

export const TournamentModal: React.FC = () => {
  const {
    selectedTournamentForModal,
    setSelectedTournamentForModal,
    registerInTournament,
    currentUser,
  } = useApp();

  if (!selectedTournamentForModal) return null;

  const t = selectedTournamentForModal;
  const isAlreadyRegistered = currentUser.torneiosInscritos.includes(t.id);
  const isFull = t.vagasOcupadas >= t.vagasTotais;

  const handleRegister = () => {
    registerInTournament(t.id);
    setSelectedTournamentForModal(null);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={() => setSelectedTournamentForModal(null)}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--modal-backdrop)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 25px 50px var(--shadow-color), 0 0 40px var(--glow-color)',
          padding: '32px',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setSelectedTournamentForModal(null)}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--color-on-surface-variant)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <span className="badge badge-purple">{t.jogoNome}</span>
          {t.isPremium && <span className="badge badge-yellow">★ Torneio Premium</span>}
        </div>

        <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-headline)', marginBottom: '8px' }}>
          {t.titulo}
        </h2>
        <p
          style={{
            color: 'var(--color-primary)',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '24px',
          }}
        >
          Formato: {t.formato}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            padding: '20px',
            backgroundColor: 'var(--color-surface-container-low)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={18} color="var(--color-primary)" />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', display: 'block' }}>
                Data e Horário
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {t.data} • {t.horario}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={18} color="var(--color-secondary)" />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', display: 'block' }}>
                Local da Partida
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{t.local}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={18} color="var(--color-tertiary)" />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', display: 'block' }}>
                Vagas Disponíveis
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {t.vagasOcupadas} / {t.vagasTotais}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={18} color="var(--color-accent-yellow)" />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-outline)', display: 'block' }}>
                Taxa de Inscrição
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-accent-yellow)',
                }}
              >
                R$ {t.taxaInscricao.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              color: 'var(--color-outline)',
              marginBottom: '8px',
            }}
          >
            Premiação Garantida
          </h4>
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--card-border)',
              backgroundColor: 'var(--badge-purple-bg)',
              color: 'var(--badge-purple-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Trophy size={24} color="var(--color-secondary)" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{t.premiacao}</span>
          </div>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h4
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              color: 'var(--color-outline)',
              marginBottom: '8px',
            }}
          >
            Participantes Inscritos ({t.inscritos.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {t.inscritos.map((nome, idx) => (
              <span
                key={idx}
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--color-on-surface)',
                }}
              >
                {nome}
              </span>
            ))}
          </div>
        </div>

        {isAlreadyRegistered ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px',
              backgroundColor: 'var(--badge-purple-bg)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--badge-purple-text)',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            <CheckCircle size={18} />
            <span>Você já está inscrito neste torneio!</span>
          </div>
        ) : (
          <button
            onClick={handleRegister}
            disabled={isFull}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '14px',
              opacity: isFull ? 0.4 : 1,
              cursor: isFull ? 'not-allowed' : 'pointer',
            }}
          >
            {isFull ? 'Vagas Esgotadas' : 'Confirmar Inscrição no Torneio'}
          </button>
        )}
      </div>
    </div>
  );
};
