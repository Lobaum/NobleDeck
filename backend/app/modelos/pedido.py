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
        produto_nome="",
        jogo_nome="",
        imagem_url="",
    ):
        self.id_item = id_item
        self.pedido_id = pedido_id
        self.produto = produto
        self.produto_id = getattr(produto, "id_produto", produto_id) if produto else produto_id
        self.quantidade = int(quantidade or 1)
        self.produto_nome = produto_nome or (getattr(produto, "nome", "") if produto else "")
        self.jogo_nome = jogo_nome or (getattr(produto, "jogo_nome", "") if produto else "")
        self.imagem_url = imagem_url or (getattr(produto, "imagem_url", "") if produto else "")

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
    STATUS_VALIDOS = {"Pendente", "Processando", "Enviado", "Finalizado", "Cancelado"}

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
        cliente_telefone="",
        endereco_entrega="",
        tipo_entrega="entrega",
        cep="",
        metodo_pagamento="",
        status_pagamento="Aguardando",
        observacoes="",
        codigo_rastreio="",
        atualizado_em="",
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
            self.cliente_telefone = cliente_telefone or getattr(cliente, "telefone", "")
        else:
            self.cliente_id = cliente_id
            self.cliente_nome = cliente_nome
            self.cliente_email = cliente_email
            self.cliente_telefone = cliente_telefone or ""

        self.endereco_entrega = endereco_entrega or ""
        self.tipo_entrega = tipo_entrega or "entrega"
        self.cep = cep or ""
        self.metodo_pagamento = metodo_pagamento or ""
        self.status_pagamento = status_pagamento or "Aguardando"
        self.observacoes = observacoes or ""
        self.codigo_rastreio = codigo_rastreio or ""
        self.atualizado_em = atualizado_em or ""
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

    def transicionarPara(self, novo_status):
        if novo_status not in self.STATUS_VALIDOS:
            raise ValueError(
                "Status inválido. Valores permitidos: Pendente, Processando, Enviado, Finalizado ou Cancelado."
            )

        if self.status == "Cancelado" and novo_status != "Cancelado":
            raise ValueError("Pedidos cancelados não podem ser reabertos.")

        if self.status == "Finalizado" and novo_status not in ("Finalizado", "Cancelado"):
            raise ValueError(
                "Pedidos finalizados só podem ser alterados para Finalizado ou Cancelado."
            )

        if novo_status == "Finalizado":
            if not self.finalizar():
                raise ValueError("O pedido precisa conter ao menos um item para ser finalizado.")
            return self.status

        if novo_status == "Cancelado":
            self.cancelar(apenas_se_pendente=False)
            return self.status

        self.status = novo_status
        return self.status

    def atualizarStatus(self, novo_status):
        return self.transicionarPara(novo_status)

    def cancelar(self, apenas_se_pendente=False):
        if self.status == "Cancelado":
            raise ValueError("Este pedido já está cancelado.")
        if apenas_se_pendente and self.status != "Pendente":
            raise ValueError("Apenas pedidos com status 'Pendente' podem ser cancelados pelo titular.")

        self.status = "Cancelado"
        self.status_pagamento = "Estornado" if self.status_pagamento == "Aprovado" else "Cancelado"
        return True

    def finalizar(self):
        if not self.itens:
            return False
        self.status = "Finalizado"
        self.calcularTotal()
        return True