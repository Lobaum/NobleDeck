class Produto:
    def __init__(
        self,
        id_produto=None,
        nome="",
        preco=0.0,
        quantidade=0,
        descricao="",
        categoria="Geral",
        jogo="outros",
        ativo=True,
        jogo_nome="Geral",
        subtitulo="",
        imagem_url="",
        raridade="Comum",
        is_novo=True,
        is_destaque=False,
        idioma="Português",
        ano=2024,
        estoque=None,
    ):
        self.id_produto = id_produto
        self.nome = nome
        self.preco = float(preco or 0.0)
        self.quantidade = int(estoque if estoque is not None else (quantidade or 0))
        self.estoque = self.quantidade
        self.descricao = descricao
        self.categoria = categoria
        self.jogo = jogo
        self.ativo = bool(ativo)

        self.jogo_nome = jogo_nome
        self.subtitulo = subtitulo
        self.imagem_url = imagem_url
        self.raridade = raridade
        self.is_novo = bool(is_novo)
        self.is_destaque = bool(is_destaque)
        self.idioma = idioma
        self.ano = int(ano or 2024)

    def atualizarEstoque(self, quantidade):
        if self.quantidade + quantidade < 0:
            return False
        self.quantidade += quantidade
        self.estoque = self.quantidade
        return True

    def atualizarPreco(self, novo_preco):
        if novo_preco is not None and novo_preco >= 0:
            self.preco = float(novo_preco)

    def inativar(self):
        self.ativo = False

    def ativar(self):
        self.ativo = True
