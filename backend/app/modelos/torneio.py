from datetime import datetime


class Partida:
    def __init__(
        self,
        torneio_id=None,
        jogador1="",
        jogador2="",
        resultado="Pendente",
        id_partida=None,
    ):
        self.id_partida = id_partida
        self.torneio_id = torneio_id
        self.jogador1 = jogador1
        self.jogador2 = jogador2
        self.resultado = resultado

    def registrarResultado(self, resultado):
        self.resultado = resultado
        return self.resultado

    def consultarResultado(self):
        return {
            "id_partida": self.id_partida,
            "torneio_id": self.torneio_id,
            "jogador1": self.jogador1,
            "jogador2": self.jogador2,
            "resultado": self.resultado,
        }


class Inscricao:
    def __init__(
        self,
        torneio_id=None,
        cliente_id=None,
        cliente_nome="",
        id_inscricao=None,
        status="confirmada",
        data_inscricao=None,
        dataInscricao=None,
    ):
        self.id_inscricao = id_inscricao
        self.torneio_id = torneio_id or 0
        self.cliente_id = cliente_id
        self.cliente_nome = cliente_nome
        self.dataInscricao = dataInscricao or data_inscricao or datetime.now().strftime("%d/%m/%Y %H:%M")
        self.status = status

    @property
    def data_inscricao(self):
        return self.dataInscricao

    @data_inscricao.setter
    def data_inscricao(self, valor):
        self.dataInscricao = str(valor)

    def realizarInscricao(self):
        self.status = "confirmada"
        return True

    def cancelarInscricao(self):
        self.status = "cancelada"
        return True


class Torneio:
    def __init__(
        self,
        id_torneio=None,
        nome="",
        jogo="outros",
        jogo_nome="Geral",
        data="",
        horario="",
        limiteParticipantes=16,
        vagas_ocupadas=0,
        status="aberto",
        formato="Suíço",
        local="Noble Deck Arena",
        taxa_inscricao=0.0,
        premiacao="",
        is_premium=False,
        limite_participantes=None,
    ):
        self.id_torneio = id_torneio
        self.nome = nome
        self.jogo = jogo
        self.jogo_nome = jogo_nome
        self.data = data
        self.horario = horario
        self.limiteParticipantes = int(
            limiteParticipantes if limite_participantes is None else limite_participantes
        )
        self.vagas_ocupadas = int(vagas_ocupadas or 0)
        self.status = status
        self.formato = formato
        self.local = local
        self.taxa_inscricao = float(taxa_inscricao or 0.0)
        self.premiacao = premiacao
        self.is_premium = bool(is_premium)

        self.inscricoes = []
        self.partidas = []

    @property
    def limite_participantes(self):
        return self.limiteParticipantes

    @limite_participantes.setter
    def limite_participantes(self, valor):
        self.limiteParticipantes = int(valor)

    def cadastrar(self):
        self.status = "aberto"
        return self

    def inscreverParticipante(self, cliente=None):
        if not cliente:
            return None

        if len(self.consultarClassificacao()) >= self.limiteParticipantes:
            self.status = "lotado"
            return None

        cliente_id = getattr(cliente, "id_usuario", None)
        cliente_nome = getattr(cliente, "nome", "Participante")

        for insc in self.inscricoes:
            if cliente_id is not None and insc.cliente_id == cliente_id and insc.status == "confirmada":
                return None

        nova_inscricao = Inscricao(
            torneio_id=self.id_torneio or 0,
            cliente_id=cliente_id,
            cliente_nome=cliente_nome,
        )
        nova_inscricao.realizarInscricao()
        self.inscricoes.append(nova_inscricao)
        self.vagas_ocupadas = len(self.consultarClassificacao())

        if self.vagas_ocupadas >= self.limiteParticipantes:
            self.status = "lotado"

        return nova_inscricao

    def registrarResultado(self, partida=None, resultado=""):
        if partida and hasattr(partida, "registrarResultado"):
            return partida.registrarResultado(resultado)
        return resultado

    def consultarClassificacao(self):
        return [insc.cliente_nome for insc in self.inscricoes if insc.status == "confirmada"]
