from fastapi import APIRouter, HTTPException, status
from app.banco import (
    salvar_torneio,
    obter_torneio_por_id,
    listar_torneios,
    salvar_inscricao,
    salvar_partida,
    obter_usuario_por_id,
)
from app.modelos.torneio import Torneio, Partida
from app.modelos.usuario import Cliente, Funcionario
from app.esquemas import (
    TorneioRegistro,
    TorneioResposta,
    TorneioInscricaoRegistro,
    TorneioPartidaRegistro,
)

router = APIRouter(prefix="/api/torneios", tags=["Torneios"])


def _formatar_torneio(torneio):
    inscritos_nomes = torneio.consultarClassificacao()
    return TorneioResposta(
        id_torneio=torneio.id_torneio or 0,
        nome=torneio.nome,
        jogo=torneio.jogo,
        jogo_nome=torneio.jogo_nome,
        data=torneio.data,
        horario=torneio.horario,
        limite_participantes=torneio.limiteParticipantes,
        vagas_ocupadas=len(inscritos_nomes),
        status="lotado" if len(inscritos_nomes) >= torneio.limiteParticipantes else torneio.status,
        formato=torneio.formato,
        local=torneio.local,
        taxa_inscricao=torneio.taxa_inscricao,
        premiacao=torneio.premiacao,
        is_premium=torneio.is_premium,
        inscritos=inscritos_nomes,
    )


@router.get("", response_model=list[TorneioResposta])
def listar_todos_torneios():
    torneios = listar_torneios()
    return [_formatar_torneio(torneio) for torneio in torneios]


@router.post("", response_model=TorneioResposta, status_code=status.HTTP_201_CREATED)
def criar_torneio(dados: TorneioRegistro):
    funcionario = Funcionario()
    novo_torneio = Torneio(**dados.model_dump())
    funcionario.cadastrarTorneio(novo_torneio)

    salvar_torneio(novo_torneio)
    return _formatar_torneio(novo_torneio)


@router.post("/{id_torneio}/inscricao", response_model=TorneioResposta)
def inscrever_no_torneio(id_torneio: int, dados: TorneioInscricaoRegistro):
    torneio = obter_torneio_por_id(id_torneio)
    if not torneio:
        raise HTTPException(status_code=404, detail="Torneio não encontrado.")

    cliente = None
    if dados.cliente_id:
        usuario = obter_usuario_por_id(dados.cliente_id)
        if isinstance(usuario, Cliente):
            cliente = usuario

    if not cliente:
        cliente = Cliente(id_usuario=dados.cliente_id or 999, nome=dados.cliente_nome)

    nova_inscricao = torneio.inscreverParticipante(cliente)
    if not nova_inscricao:
        raise HTTPException(
            status_code=400,
            detail="Não foi possível realizar inscrição. Torneio lotado ou cliente já inscrito.",
        )

    salvar_inscricao(torneio, nova_inscricao)
    return _formatar_torneio(torneio)


@router.post("/{id_torneio}/partidas")
def registrar_partida_torneio(id_torneio: int, dados: TorneioPartidaRegistro):
    torneio = obter_torneio_por_id(id_torneio)
    if not torneio:
        raise HTTPException(status_code=404, detail="Torneio não encontrado.")

    nova_partida = Partida(
        torneio_id=id_torneio,
        jogador1=dados.jogador1,
        jogador2=dados.jogador2,
        resultado=dados.resultado,
    )
    torneio.partidas.append(nova_partida)
    salvar_partida(nova_partida)
    return nova_partida.consultarResultado()


@router.get("/{id_torneio}/classificacao")
def consultar_classificacao_torneio(id_torneio: int):
    torneio = obter_torneio_por_id(id_torneio)
    if not torneio:
        raise HTTPException(status_code=404, detail="Torneio não encontrado.")
    return {
        "torneio": torneio.nome,
        "classificacao": torneio.consultarClassificacao(),
    }
