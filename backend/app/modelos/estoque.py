class Estoque:
    def __init__(
        self,
        produto=None,
        quantidade=0,
        estoqueMinimo=5,
        id_estoque=None,
        produto_id=None,
        estoque_minimo=None,
    ):
        self.id_estoque = id_estoque
        self.quantidade = int(quantidade or 0)
        self.estoqueMinimo = int(estoqueMinimo if estoque_minimo is None else estoque_minimo)

        self.produto = produto
        self.produto_id = getattr(produto, "id_produto", produto_id)

    @property
    def estoque_minimo(self):
        return self.estoqueMinimo

    @estoque_minimo.setter
    def estoque_minimo(self, valor):
        self.estoqueMinimo = int(valor)

    def registrarEntrada(self, quantidade=1):
        if quantidade > 0:
            self.quantidade += quantidade
            if self.produto:
                self.produto.quantidade = self.quantidade
        return self.quantidade

    def registrarSaida(self, quantidade=1):
        if 0 < quantidade <= self.quantidade:
            self.quantidade -= quantidade
            if self.produto:
                self.produto.quantidade = self.quantidade
            return True
        return False

    def consultarQuantidade(self):
        return int(self.quantidade)

    def verificarEstoqueBaixo(self):
        return bool(self.quantidade <= self.estoqueMinimo)

