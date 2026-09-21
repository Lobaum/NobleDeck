from pydantic import BaseModel, ConfigDict, Field


class UsuarioCadastro(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nome: str
    email: str
    senha: str
    telefone: str = ""
    cargo: str | None = None
    tipoUsuario: str = Field(default="cliente", alias="tipo_usuario")


class UsuarioLogin(BaseModel):
    email: str
    senha: str


class UsuarioResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id_usuario: int
    nome: str
    email: str
    tipoUsuario: str = Field(default="cliente", alias="tipo_usuario")
    telefone: str | None = None
    cargo: str | None = None


class ProdutoRegistro(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nome: str
    descricao: str = ""
    categoria: str = "Geral"
    jogo: str = "outros"
    preco: float
    quantidade: int = Field(default=0, alias="estoque")
    jogo_nome: str = "Geral"
    subtitulo: str = ""
    imagem_url: str = ""
    raridade: str = "Comum"
    is_novo: bool = True
    is_destaque: bool = False
    idioma: str = "Português"
    ano: int = 2024


class ProdutoAlteracao(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nome: str | None = None
    descricao: str | None = None
    categoria: str | None = None
    jogo: str | None = None
    preco: float | None = None
    quantidade: int | None = Field(default=None, alias="estoque")
    ativo: bool | None = None
    jogo_nome: str | None = None
    subtitulo: str | None = None
    imagem_url: str | None = None
    raridade: str | None = None
    is_novo: bool | None = None
    is_destaque: bool | None = None
    idioma: str | None = None
    ano: int | None = None


class ProdutoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id_produto: int
    nome: str
    descricao: str = ""
    categoria: str = "Geral"
    jogo: str = "outros"
    preco: float
    quantidade: int
    ativo: bool = True
    jogo_nome: str = "Geral"
    subtitulo: str = ""
    imagem_url: str = ""
    raridade: str = "Comum"
    is_novo: bool = True
    is_destaque: bool = False
    idioma: str = "Português"
    ano: int = 2024


class EstoqueEntrada(BaseModel):
    produto_id: int
    quantidade: int


class EstoqueSaida(BaseModel):
    produto_id: int
    quantidade: int


class EstoqueResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id_estoque: int
    produto_id: int
    quantidade: int
    estoqueMinimo: int = Field(alias="estoque_minimo")
    produto_nome: str = ""


class ItemPedidoRegistro(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    produto_id: int
    quantidade: int
    precoUnitario: float | None = Field(default=None, alias="preco_unitario")


class ItemPedidoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id_item: int
    produto_id: int
    quantidade: int
    precoUnitario: float = Field(alias="preco_unitario")
    subtotal: float
    produto_nome: str = ""


PedidoItemRegistro = ItemPedidoRegistro
PedidoItemResposta = ItemPedidoResposta


class PedidoRegistro(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cliente_id: int | None = None
    cliente_nome: str
    cliente_email: str
    itens: list[ItemPedidoRegistro]


class PedidoStatusAlteracao(BaseModel):
    status: str


class PedidoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id_pedido: int
    numero: int | None = None
    data: str
    valorTotal: float = Field(alias="valor_total")
    status: str
    cliente_id: int | None = None
    cliente_nome: str
    cliente_email: str
    itens: list[ItemPedidoResposta] = []


class TorneioRegistro(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nome: str
    jogo: str
    data: str
    horario: str
    limiteParticipantes: int = Field(default=16, alias="limite_participantes")
    status: str = "aberto"
    jogo_nome: str = "Geral"
    formato: str = "Suíço"
    local: str = "Noble Deck Arena"
    taxa_inscricao: float = 0.0
    premiacao: str = ""
    is_premium: bool = False


class TorneioResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id_torneio: int
    nome: str
    jogo: str
    jogo_nome: str
    data: str
    horario: str
    limiteParticipantes: int = Field(alias="limite_participantes")
    vagas_ocupadas: int
    status: str
    formato: str
    local: str
    taxa_inscricao: float
    premiacao: str
    is_premium: bool
    inscritos: list[str] = []


class InscricaoRegistro(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cliente_id: int | None = None
    cliente_nome: str
    dataInscricao: str | None = Field(default=None, alias="data_inscricao")
    status: str = "confirmada"


class InscricaoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id_inscricao: int
    torneio_id: int
    cliente_id: int | None = None
    cliente_nome: str
    dataInscricao: str | None = Field(default=None, alias="data_inscricao")
    status: str


TorneioInscricaoRegistro = InscricaoRegistro
TorneioInscricaoResposta = InscricaoResposta


class PartidaRegistro(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    jogador1: str
    jogador2: str
    resultado: str = "Pendente"


class PartidaResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id_partida: int
    torneio_id: int
    jogador1: str
    jogador2: str
    resultado: str


TorneioPartidaRegistro = PartidaRegistro
TorneioPartidaResposta = PartidaResposta
