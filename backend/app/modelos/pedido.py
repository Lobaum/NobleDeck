from app.modelos.produto import Produto


class ItemPedido:
    def __init__(self, produto: Produto, quantidade: int):
        if quantidade <= 0:
            print("A quantidade deve ser maior que zero.")

        self.produto = produto
        self.quantidade = quantidade
        self.subtotal = produto.preco * quantidade


class Pedido:
    def __init__(self, id_pedido: int, cliente):
        self.id_pedido = id_pedido
        self.cliente = cliente
        self.itens = []
        self.valor_total = 0.0
        self.status = "Pendente"

    def adicionar_item(self, produto: Produto, quantidade: int):
        if self.status != "Pendente":
            print("Não é possível adicionar produtos a um pedido finalizado.")

        if quantidade <= 0:
            print("Adicione ao menos 1 item.")

        produto.atualizar_estoque(-quantidade)

        item = ItemPedido(produto, quantidade)
        self.itens.append(item)
        self.valor_total += item.subtotal

    def finalizar(self):
        if not self.itens:
            print("Não é possível finalizar um pedido vazio.")

        self.status = "Finalizado"
        self.cliente.pedidos.append(self)

    def exibir_carrinho(self):
        print("\n========== Carrinho ==========")

        if not self.itens:
            print("Carrinho vazio.")
            return

        for item in self.itens:
            print(
                f"{item.produto.nome} "
                f"x{item.quantidade} "
                f"- R$ {item.subtotal:.2f}"
            )

        print("-------------------------------")
        print(f"Total: R$ {self.valor_total:.2f}")