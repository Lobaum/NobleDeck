class Estoque:
    def __init__(
        self,
        produto=None,
        quantidade=0,
        estoqueMinimo=5,
        id_estoque=None,
        produto_id=None,
    ):
        self.id_estoque = id_estoque
        self.quantidade = int(quantidade or 0)
        self.estoqueMinimo = int(estoqueMinimo or 5)
        self.produto = produto
        self.produto_id = getattr(produto, "id_produto", produto_id) if produto else produto_id

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
        return self.quantidade

    def verificarEstoqueBaixo(self):
        return self.quantidade <= self.estoqueMinimo
