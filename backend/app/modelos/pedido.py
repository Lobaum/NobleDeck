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
        preco_unitario=None,
    ):
        self.id_item = id_item
        self.pedido_id = pedido_id
        self.produto = produto
        self.quantidade = int(quantidade or 1)

        if produto:
            self.produto_id = getattr(produto, "id_produto", produto_id)
            preco_padrao = getattr(produto, "preco", 0.0)
        else:
            self.produto_id = produto_id
            preco_padrao = 0.0

        preco = precoUnitario if precoUnitario != 0.0 else (preco_unitario if preco_unitario is not None else preco_padrao)
        self.precoUnitario = float(preco or 0.0)
        self.subtotal = 0.0
        self.calcularSubtotal()

    @property
    def preco_unitario(self):
        return self.precoUnitario

    @preco_unitario.setter
    def preco_unitario(self, valor):
        self.precoUnitario = float(valor)
        self.calcularSubtotal()

    def calcularSubtotal(self):
        self.subtotal = round(float(self.quantidade or 0) * float(self.precoUnitario or 0.0), 2)
        return self.subtotal


class Pedido:
    def __init__(
        self,
        id_pedido=None,
        cliente=None,
        numero=None,
        data=None,
        valorTotal=None,
        status="Pendente",
        cliente_id=None,
        cliente_nome="",
        cliente_email="",
        valor_total=None,
    ):
        self.id_pedido = id_pedido
        self.numero = numero or id_pedido
        self.data = data or datetime.now().strftime("%d/%m/%Y %H:%M")
        self.status = status
        self.valorTotal = float(valorTotal if valorTotal is not None else (valor_total or 0.0))

        self.cliente = cliente
        if cliente and hasattr(cliente, "id_usuario"):
            self.cliente_id = cliente.id_usuario
            self.cliente_nome = getattr(cliente, "nome", "")
            self.cliente_email = getattr(cliente, "email", "")
        else:
            self.cliente_id = cliente_id
            self.cliente_nome = cliente_nome
            self.cliente_email = cliente_email

        self.itens = []

    @property
    def valor_total(self):
        return self.valorTotal

    @valor_total.setter
    def valor_total(self, valor):
        self.valorTotal = float(valor)

    def adicionarProduto(self, produto, quantidade=1):
        if self.status != "Pendente":
            return None

        if quantidade <= 0:
            return None

        if hasattr(produto, "atualizar_estoque"):
            produto.atualizar_estoque(-quantidade)

        item = ItemPedido(
            produto=produto,
            quantidade=quantidade,
            pedido_id=self.id_pedido,
        )
        self.itens.append(item)
        self.calcularTotal()
        return item

    adicionar_item = adicionarProduto

    def calcularTotal(self):
        self.valorTotal = round(sum(item.calcularSubtotal() for item in self.itens), 2)
        return self.valorTotal

    def consultarPedido(self):
        return {
            "id_pedido": self.id_pedido,
            "numero": self.numero,
            "data": self.data,
            "status": self.status,
            "valor_total": self.valorTotal,
            "valorTotal": self.valorTotal,
            "cliente_id": self.cliente_id,
            "cliente_nome": self.cliente_nome,
            "cliente_email": self.cliente_email,
            "itens": [
                {
                    "id_item": item.id_item,
                    "produto_id": item.produto_id,
                    "produto_nome": item.produto.nome if item.produto else "",
                    "quantidade": item.quantidade,
                    "preco_unitario": item.precoUnitario,
                    "precoUnitario": item.precoUnitario,
                    "subtotal": item.subtotal,
                }
                for item in self.itens
            ],
        }

    def atualizarStatus(self, novo_status):
        self.status = novo_status
        return self.status

    def finalizar(self):
        if not self.itens:
            return False
        self.status = "Finalizado"
        self.calcularTotal()
        return True

    def exibir_carrinho(self):
        print("\n========== Carrinho ==========")
        if not self.itens:
            print("Carrinho vazio.")
            return

        for item in self.itens:
            nome_p = item.produto.nome if item.produto else f"Produto #{item.produto_id}"
            print(f"{nome_p} x{item.quantidade} - R$ {item.subtotal:.2f}")

        print("-------------------------------")
        print(f"Total: R$ {self.valorTotal:.2f}")