import math
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UsuarioCadastro(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nome: str
    email: str
    senha: str
    telefone: str = ""
    cpf: str = ""
    cep: str = ""
    endereco: str = ""
    cargo: str | None = None
    tipoUsuario: str = Field(default="cliente", alias="tipo_usuario")
    permissoes: list[str] | None = None


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
    cpf: str | None = None
    cep: str | None = None
    endereco: str | None = None
    cargo: str | None = None
    permissoes: list[str] = []


class UsuarioAutenticadoResposta(UsuarioResposta):
    token: str


class UsuarioAtualizacaoDados(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nome: str
    email: str
    telefone: str | None = ""
    cpf: str | None = ""
    cep: str | None = ""
    endereco: str | None = ""


class UsuarioAtualizacaoPerfil(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tipo_usuario: str = Field(default="cliente", alias="tipoUsuario")
    cargo: str | None = None
    permissoes: list[str] | None = None


class UsuarioAlterarSenha(BaseModel):
    nova_senha: str
    senha_atual: str | None = None


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
    origem: str = "manual"

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, v: str) -> str:
        if not isinstance(v, str) or not v.strip():
            raise ValueError("O nome do produto não pode estar vazio.")
        return v.strip()

    @field_validator("preco")
    @classmethod
    def validar_preco(cls, v: float) -> float:
        if v is None or not math.isfinite(float(v)) or float(v) <= 0:
            raise ValueError("O preço do produto deve ser maior que zero.")
        return round(float(v), 2)

    @field_validator("quantidade")
    @classmethod
    def validar_quantidade(cls, v: int) -> int:
        if v is None or int(v) < 0:
            raise ValueError("A quantidade em estoque não pode ser negativa.")
        return int(v)

    @field_validator("estoque_minimo")
    @classmethod
    def validar_estoque_minimo(cls, v: int) -> int:
        if v is None or int(v) < 0:
            raise ValueError("O estoque mínimo não pode ser negativo.")
        return int(v)


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

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if not isinstance(v, str) or not v.strip():
            raise ValueError("O nome do produto não pode estar vazio.")
        return v.strip()

    @field_validator("preco")
    @classmethod
    def validar_preco(cls, v: float | None) -> float | None:
        if v is None:
            return None
        if not math.isfinite(float(v)) or float(v) <= 0:
            raise ValueError("O preço do produto deve ser maior que zero.")
        return round(float(v), 2)

    @field_validator("quantidade")
    @classmethod
    def validar_quantidade(cls, v: int | None) -> int | None:
        if v is None:
            return None
        if int(v) < 0:
            raise ValueError("A quantidade em estoque não pode ser negativa.")
        return int(v)

    @field_validator("estoque_minimo")
    @classmethod
    def validar_estoque_minimo(cls, v: int | None) -> int | None:
        if v is None:
            return None
        if int(v) < 0:
            raise ValueError("O estoque mínimo não pode ser negativo.")
        return int(v)


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

    @field_validator("estoque_minimo")
    @classmethod
    def validar_estoque_minimo(cls, v: int) -> int:
        if v is None or int(v) < 0:
            raise ValueError("O estoque mínimo não pode ser negativo.")
        return int(v)


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
    jogo_nome: str = ""
    imagem_url: str = ""


PedidoItemRegistro = ItemPedidoRegistro
PedidoItemResposta = ItemPedidoResposta


class PedidoRegistro(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cliente_id: int | None = None
    cliente_nome: str = ""
    cliente_email: str = ""
    cliente_telefone: str = ""
    endereco_entrega: str = ""
    tipo_entrega: str = "entrega"
    cep: str = ""
    metodo_pagamento: str = "pix"
    status_pagamento: str = "Aguardando"
    parcelas: int = 1
    observacoes: str = ""
    itens: list[ItemPedidoRegistro]


class PedidoStatusAlteracao(BaseModel):
    status: str
    codigo_rastreio: str | None = None
    status_pagamento: str | None = None


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
    cliente_telefone: str = ""
    endereco_entrega: str = ""
    tipo_entrega: str = "entrega"
    cep: str = ""
    metodo_pagamento: str = ""
    status_pagamento: str = "Aguardando"
    observacoes: str = ""
    codigo_rastreio: str = ""
    atualizado_em: str = ""
    itens: list[ItemPedidoResposta] = []
