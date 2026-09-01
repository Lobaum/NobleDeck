class Produto:
    def __init__(self, id_produto: int, nome: str, preco: float, estoque: int):
        self.id_produto = id_produto
        self.nome = nome
        self.preco = preco
        self.estoque = estoque

    def atualizar_estoque(self, quantidade: int):
        if self.estoque + quantidade < 0:
            print("Estoque esgotado!")
            return

        self.estoque += quantidade
