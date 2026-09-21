import random
from fastapi import APIRouter, HTTPException, status
from app.banco import salvar_pedido, obter_pedido_por_id, listar_pedidos, atualizar_status_pedido, obter_produto_por_id
from app.modelos.pedido import Pedido
from app.modelos.usuario import Funcionario
from app.esquemas import PedidoRegistro, PedidoResposta, PedidoStatusAlteracao, PedidoItemResposta

router = APIRouter(prefix="/api/pedidos", tags=["Pedidos"])


def _formatar_pedido(pedido):
    itens_resposta = []
    for item in pedido.itens:
        nome_produto = item.produto.nome if item.produto else ""
        itens_resposta.append(
            PedidoItemResposta(
                id_item=item.id_item or 0,
                produto_id=item.produto_id or 0,
                quantidade=item.quantidade,
                preco_unitario=item.precoUnitario,
                subtotal=item.subtotal,
                produto_nome=nome_produto,
            )
        )
    return PedidoResposta(
        id_pedido=pedido.id_pedido or 0,
        numero=pedido.numero or pedido.id_pedido,
        data=pedido.data,
        valor_total=pedido.valorTotal,
        status=pedido.status,
        cliente_id=pedido.cliente_id,
        cliente_nome=pedido.cliente_nome,
        cliente_email=pedido.cliente_email,
        itens=itens_resposta,
    )


@router.get("", response_model=list[PedidoResposta])
def listar_todos_pedidos(cliente_id: int | None = None):
    pedidos = listar_pedidos(cliente_id=cliente_id)
    return [_formatar_pedido(pedido_cadastrado) for pedido_cadastrado in pedidos]


@router.post("", response_model=PedidoResposta, status_code=status.HTTP_201_CREATED)
def criar_pedido(dados: PedidoRegistro):
    if not dados.itens:
        raise HTTPException(status_code=400, detail="O pedido deve conter ao menos um item.")
    produtos_por_id = {}
    for item_requisicao in dados.itens:
        produto = obter_produto_por_id(item_requisicao.produto_id)
        if not produto or not produto.ativo:
            raise HTTPException(status_code=404, detail=f"Produto ID {item_requisicao.produto_id} não encontrado ou inativo.")
        if produto.quantidade < item_requisicao.quantidade:
            raise HTTPException(
                status_code=400,
                detail=f"Estoque insuficiente para o produto '{produto.nome}'. Disponível: {produto.quantidade}",
            )
        produtos_por_id[item_requisicao.produto_id] = produto

    numero_gerado = random.randint(1000, 9999)
    novo_pedido = Pedido(
        numero=numero_gerado,
        cliente_id=dados.cliente_id,
        cliente_nome=dados.cliente_nome,
        cliente_email=dados.cliente_email,
        status="Pendente",
    )

    for item_requisicao in dados.itens:
        produto = produtos_por_id[item_requisicao.produto_id]
        novo_pedido.adicionarProduto(produto, item_requisicao.quantidade)

    novo_pedido.finalizar()
    salvar_pedido(novo_pedido)

    return _formatar_pedido(novo_pedido)


@router.patch("/{id_pedido}/status", response_model=PedidoResposta)
def atualizar_status_pedido_rota(id_pedido: int, dados: PedidoStatusAlteracao):
    pedido = obter_pedido_por_id(id_pedido)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    if pedido.status == "Finalizado" and dados.status not in ["Finalizado", "Cancelado"]:
        raise HTTPException(status_code=400, detail="Pedidos finalizados só podem ser alterados para Cancelado.")

    funcionario = Funcionario()
    funcionario.atualizarPedido(pedido, dados.status)

    pedido_atualizado = atualizar_status_pedido(id_pedido, dados.status)
    if not pedido_atualizado:
        raise HTTPException(status_code=500, detail="Erro ao atualizar o pedido no banco de dados.")

    return _formatar_pedido(pedido_atualizado)
