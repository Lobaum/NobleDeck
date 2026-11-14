import random
from fastapi import APIRouter, Depends, HTTPException, status
from app.banco import (
    salvar_pedido,
    obter_pedido_por_id,
    listar_pedidos,
    atualizar_status_pedido,
    obter_produto_por_id,
)
from app.modelos.pedido import Pedido
from app.esquemas import PedidoRegistro, PedidoResposta, PedidoStatusAlteracao, PedidoItemResposta
from app.seguranca import exigir_equipe, obter_usuario_atual

router = APIRouter(prefix="/api/pedidos", tags=["Pedidos"])

_STATUS_PEDIDO_VALIDOS = {"Pendente", "Processando", "Enviado", "Finalizado", "Cancelado"}


def _formatar_pedido(pedido):
    itens_resposta = []
    for item in pedido.itens:
        nome_produto = getattr(item, "produto_nome", "") or (item.produto.nome if item.produto else "")
        jogo_nome = getattr(item, "jogo_nome", "") or (item.produto.jogo_nome if item.produto else "")
        imagem_url = getattr(item, "imagem_url", "") or (item.produto.imagem_url if item.produto else "")
        itens_resposta.append(
            PedidoItemResposta(
                id_item=item.id_item or 0,
                produto_id=item.produto_id or 0,
                quantidade=item.quantidade,
                preco_unitario=item.precoUnitario,
                subtotal=item.subtotal,
                produto_nome=nome_produto,
                jogo_nome=jogo_nome,
                imagem_url=imagem_url,
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
        cliente_telefone=getattr(pedido, "cliente_telefone", "") or "",
        endereco_entrega=getattr(pedido, "endereco_entrega", "") or "",
        codigo_rastreio=getattr(pedido, "codigo_rastreio", "") or "",
        atualizado_em=getattr(pedido, "atualizado_em", "") or "",
        itens=itens_resposta,
    )


@router.get("", response_model=list[PedidoResposta])
def listar_todos_pedidos(
    cliente_id: int | None = None,
    usuario_atual=Depends(obter_usuario_atual),
):
    eh_equipe = getattr(usuario_atual, "tipoUsuario", "") in ("funcionario", "administrador")
    if eh_equipe:
        pedidos = listar_pedidos(cliente_id=cliente_id)
    else:
        if cliente_id is not None and cliente_id != usuario_atual.id_usuario:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para visualizar pedidos de outro cliente.",
            )
        pedidos = listar_pedidos(cliente_id=usuario_atual.id_usuario)
    return [_formatar_pedido(p) for p in pedidos if p]


@router.post("", response_model=PedidoResposta, status_code=status.HTTP_201_CREATED)
def criar_pedido(
    dados: PedidoRegistro,
    usuario_atual=Depends(obter_usuario_atual),
):
    if not dados.itens:
        raise HTTPException(status_code=400, detail="O pedido deve conter ao menos um item.")

    quantidades_por_produto: dict[int, int] = {}
    for item_requisicao in dados.itens:
        if item_requisicao.quantidade <= 0:
            raise HTTPException(
                status_code=400,
                detail="A quantidade de cada item do pedido deve ser maior que zero.",
            )
        quantidades_por_produto[item_requisicao.produto_id] = (
            quantidades_por_produto.get(item_requisicao.produto_id, 0) + item_requisicao.quantidade
        )

    produtos_por_id = {}
    for produto_id, qtd_total in quantidades_por_produto.items():
        produto = obter_produto_por_id(produto_id)
        if not produto or not produto.ativo:
            raise HTTPException(
                status_code=404,
                detail=f"Produto ID {produto_id} não encontrado ou inativo.",
            )
        if produto.preco <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"O produto '{produto.nome}' não possui preço válido para compra.",
            )
        if produto.quantidade < qtd_total:
            raise HTTPException(
                status_code=400,
                detail=f"Estoque insuficiente para o produto '{produto.nome}'. Disponível: {produto.quantidade}",
            )
        produtos_por_id[produto_id] = produto

    numero_gerado = random.randint(1000, 999999)
    telefone = (dados.cliente_telefone or getattr(usuario_atual, "telefone", "") or "").strip()
    endereco = (dados.endereco_entrega or "").strip()

    novo_pedido = Pedido(
        numero=numero_gerado,
        cliente_id=usuario_atual.id_usuario,
        cliente_nome=usuario_atual.nome,
        cliente_email=usuario_atual.email,
        cliente_telefone=telefone,
        endereco_entrega=endereco,
        status="Pendente",
    )

    for item_requisicao in dados.itens:
        produto = produtos_por_id[item_requisicao.produto_id]
        novo_pedido.adicionarItem(produto, item_requisicao.quantidade)

    novo_pedido.calcularTotal()

    try:
        salvar_pedido(novo_pedido)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    return _formatar_pedido(novo_pedido)


@router.patch("/{id_pedido}/status", response_model=PedidoResposta)
def atualizar_status_pedido_rota(
    id_pedido: int,
    dados: PedidoStatusAlteracao,
    usuario_atual=Depends(exigir_equipe),
):
    if dados.status not in _STATUS_PEDIDO_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail="Status inválido. Valores permitidos: Pendente, Processando, Enviado, Finalizado ou Cancelado.",
        )

    pedido = obter_pedido_por_id(id_pedido)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    if pedido.status == "Cancelado" and dados.status != "Cancelado":
        raise HTTPException(status_code=400, detail="Pedidos cancelados não podem ser reabertos.")

    if pedido.status == "Finalizado" and dados.status not in ("Finalizado", "Cancelado"):
        raise HTTPException(
            status_code=400,
            detail="Pedidos finalizados só podem ser alterados para Finalizado ou Cancelado.",
        )

    pedido_atualizado = atualizar_status_pedido(
        id_pedido,
        dados.status,
        codigo_rastreio=dados.codigo_rastreio,
        responsavel=usuario_atual.nome,
    )
    if not pedido_atualizado:
        raise HTTPException(status_code=500, detail="Erro ao atualizar o pedido no banco de dados.")

    return _formatar_pedido(pedido_atualizado)
