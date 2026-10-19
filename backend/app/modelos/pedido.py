from datetime import datetime


class ItemPedido:
    def __init__(
        self,
        produto=None,
        quantidade=1,
        precoUnitario=0.0,
        id_item=None,
        pedido_id=None,
        produto_id=None,
    ):
        self.id_item = id_item
        self.pedido_id = pedido_id
        self.produto = produto
        self.produto_id = getattr(produto, "id_produto", produto_id) if produto else produto_id
        self.quantidade = int(quantidade or 1)

        if precoUnitario and float(precoUnitario) > 0:
            self.precoUnitario = float(precoUnitario)
        elif produto and hasattr(produto, "preco"):
            self.precoUnitario = float(produto.preco)
        else:
            self.precoUnitario = 0.0

        self.subtotal = self.calcularSubtotal()

    def calcularSubtotal(self):
        self.subtotal = round(self.quantidade * self.precoUnitario, 2)
        return self.subtotal


class Pedido:
    def __init__(
        self,
        id_pedido=None,
        cliente=None,
        numero=None,
        data=None,
        valorTotal=0.0,
        status="Pendente",
        cliente_id=None,
        cliente_nome="",
        cliente_email="",
    ):
        self.id_pedido = id_pedido
        self.numero = numero or id_pedido
        self.data = data or datetime.now().strftime("%d/%m/%Y %H:%M")
        self.status = status
        self.valorTotal = float(valorTotal or 0.0)

        self.cliente = cliente
        if cliente:
            self.cliente_id = getattr(cliente, "id_usuario", cliente_id)
            self.cliente_nome = getattr(cliente, "nome", cliente_nome)
            self.cliente_email = getattr(cliente, "email", cliente_email)
        else:
            self.cliente_id = cliente_id
            self.cliente_nome = cliente_nome
            self.cliente_email = cliente_email

        self.itens = []

    def adicionarItem(self, produto, quantidade=1):
        if self.status != "Pendente" or quantidade <= 0:
            return None

        item = ItemPedido(
            produto=produto,
            quantidade=quantidade,
            pedido_id=self.id_pedido,
        )
        self.itens.append(item)
        self.calcularTotal()
        return item

    def removerItem(self, produto_id):
        self.itens = [item for item in self.itens if item.produto_id != produto_id]
        self.calcularTotal()

    def calcularTotal(self):
        self.valorTotal = round(sum(item.calcularSubtotal() for item in self.itens), 2)
        return self.valorTotal

    def atualizarStatus(self, novo_status):
        self.status = novo_status
        return self.status

    def finalizar(self):
        if not self.itens:
            return False
        self.status = "Finalizado"
        self.calcularTotal()
        return True