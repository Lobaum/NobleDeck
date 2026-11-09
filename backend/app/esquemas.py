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


class UsuarioAtualizacaoPerfil(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tipo_usuario: str = Field(default="cliente", alias="tipoUsuario")
    cargo: str | None = None


class UsuarioAlterarSenha(BaseModel):
    nova_senha: str


class ProdutoRegistro(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nome: str
    descricao: str = ""
    categoria: str = "Geral"
    jogo: str = "outros"
    preco: float
    quantidade: int = Field(default=0, alias="estoque")
    estoque_minimo: int = 3
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
    estoque_minimo: int | None = None
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
    estoque_minimo: int = 3
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
    motivo: str = "Reposição de Estoque"
    responsavel: str = "Administrador"


class EstoqueSaida(BaseModel):
    produto_id: int
    quantidade: int
    motivo: str = "Baixa Operacional"
    responsavel: str = "Administrador"


class EstoqueMinimoAtualizacao(BaseModel):
    estoque_minimo: int


class MovimentacaoEstoqueResposta(BaseModel):
    id_movimentacao: int
    produto_id: int
    produto_nome: str
    tipo: str
    quantidade: int
    saldo_anterior: int
    saldo_posterior: int
    motivo: str = ""
    responsavel: str = "Sistema"
    data_hora: str


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
