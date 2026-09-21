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
        estoque=None,
        jogo_nome="Geral",
        subtitulo="",
        imagem_url="",
        raridade="Comum",
        is_novo=True,
        is_destaque=False,
        idioma="Português",
        ano=2024,
    ):
        self.id_produto = id_produto
        self.nome = nome
        self.preco = float(preco or 0.0)
        self.quantidade = int(estoque if estoque is not None else (quantidade or 0))
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

    @property
    def estoque(self):
        return self.quantidade

    @estoque.setter
    def estoque(self, valor):
        self.quantidade = int(valor)

    def cadastrar(self):
        self.ativo = True
        return self

    def alterar(self, **dados):
        for chave, valor in dados.items():
            if chave == "estoque" and valor is not None:
                self.quantidade = int(valor)
            elif hasattr(self, chave) and valor is not None:
                setattr(self, chave, valor)
        return self

    def consultar(self):
        return {
            "id_produto": self.id_produto,
            "nome": self.nome,
            "descricao": self.descricao,
            "categoria": self.categoria,
            "jogo": self.jogo,
            "preco": self.preco,
            "quantidade": self.quantidade,
            "estoque": self.quantidade,
            "ativo": self.ativo,
            "jogo_nome": self.jogo_nome,
            "subtitulo": self.subtitulo,
            "imagem_url": self.imagem_url,
            "raridade": self.raridade,
            "is_novo": self.is_novo,
            "is_destaque": self.is_destaque,
            "idioma": self.idioma,
            "ano": self.ano,
        }

    def inativar(self):
        self.ativo = False
        return self

    def atualizar_estoque(self, diferenca):
        if self.quantidade + diferenca < 0:
            return False
        self.quantidade += diferenca
        return True
