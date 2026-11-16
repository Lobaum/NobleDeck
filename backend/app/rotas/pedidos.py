import re
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
from app.seguranca import exigir_permissao, obter_usuario_atual, usuario_tem_permissao

router = APIRouter(prefix="/api/pedidos", tags=["Pedidos"])

_STATUS_PEDIDO_VALIDOS = {"Pendente", "Processando", "Enviado", "Finalizado", "Cancelado"}
_TIPOS_ENTREGA_VALIDOS = {"entrega", "retirada"}
_METODOS_PAGAMENTO_VALIDOS = {"pix", "cartao", "boleto", "retirada_loja"}
_STATUS_PAGAMENTO_VALIDOS = {"Aguardando", "Aprovado", "Na Retirada", "Estornado", "Cancelado"}
_ENDERECO_RETIRADA_LOJA = "Retirada na Loja - Av. Paulista, 1800, Conj. 42, Bela Vista - São Paulo/SP"


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
        tipo_entrega=getattr(pedido, "tipo_entrega", "entrega") or "entrega",
        cep=getattr(pedido, "cep", "") or "",
        metodo_pagamento=getattr(pedido, "metodo_pagamento", "") or "",
        status_pagamento=getattr(pedido, "status_pagamento", "Aguardando") or "Aguardando",
        observacoes=getattr(pedido, "observacoes", "") or "",
        codigo_rastreio=getattr(pedido, "codigo_rastreio", "") or "",
        atualizado_em=getattr(pedido, "atualizado_em", "") or "",
        itens=itens_resposta,
    )


@router.get("", response_model=list[PedidoResposta])
def listar_todos_pedidos(
    cliente_id: int | None = None,
    usuario_atual=Depends(obter_usuario_atual),
):
    pode_gerir_pedidos = usuario_tem_permissao(usuario_atual, "pedidos")
    if pode_gerir_pedidos:
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

    tipo_entrega = (dados.tipo_entrega or "entrega").strip().lower()
    if tipo_entrega not in _TIPOS_ENTREGA_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail="Tipo de entrega inválido. Use 'entrega' ou 'retirada'.",
        )

    metodo_pagamento = (dados.metodo_pagamento or "pix").strip().lower()
    if metodo_pagamento not in _METODOS_PAGAMENTO_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail="Método de pagamento inválido. Use 'pix', 'cartao', 'boleto' ou 'retirada_loja'.",
        )

    if metodo_pagamento == "retirada_loja" and tipo_entrega != "retirada":
        raise HTTPException(
            status_code=400,
            detail="Pagamento na retirada só está disponível para retirada presencial na loja.",
        )

    cep_limpo = re.sub(r"\D", "", dados.cep or "")
    endereco = (dados.endereco_entrega or "").strip()

    if tipo_entrega == "entrega":
        if len(cep_limpo) != 8:
            raise HTTPException(
                status_code=400,
                detail="Informe um CEP válido com 8 dígitos para entrega.",
            )
        if len(endereco) < 10:
            raise HTTPException(
                status_code=400,
                detail="Informe o endereço completo de entrega (rua, número, bairro e cidade/UF).",
            )
        cep_formatado = f"{cep_limpo[:5]}-{cep_limpo[5:]}"
    else:
        cep_formatado = "01310-200"
        if not endereco:
            endereco = _ENDERECO_RETIRADA_LOJA

    quantidades_por_produto: dict[int, int] = {}
    for item_requisicao in dados.itens:
        if item_requisicao.produto_id <= 0:
            raise HTTPException(
                status_code=400,
                detail="Cartas externas não catalogadas precisam ser importadas à loja antes da compra.",
            )
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

    if metodo_pagamento == "retirada_loja":
        status_pagamento = "Na Retirada"
        status_inicial = "Pendente"
    elif metodo_pagamento == "boleto":
        status_pagamento = "Aguardando"
        status_inicial = "Pendente"
    elif (dados.status_pagamento or "").strip() == "Aprovado":
        status_pagamento = "Aprovado"
        status_inicial = "Processando"
    else:
        status_pagamento = "Aguardando"
        status_inicial = "Pendente"

    telefone = (dados.cliente_telefone or getattr(usuario_atual, "telefone", "") or "").strip()
    observacoes = (dados.observacoes or "").strip()

    novo_pedido = Pedido(
        numero=None,
        cliente_id=usuario_atual.id_usuario,
        cliente_nome=usuario_atual.nome,
        cliente_email=usuario_atual.email,
        cliente_telefone=telefone,
        endereco_entrega=endereco,
        tipo_entrega=tipo_entrega,
        cep=cep_formatado,
        metodo_pagamento=metodo_pagamento,
        status_pagamento=status_pagamento,
        observacoes=observacoes,
        status="Pendente",
    )

    for item_requisicao in dados.itens:
        produto = produtos_por_id[item_requisicao.produto_id]
        novo_pedido.adicionarItem(produto, item_requisicao.quantidade)

    if not novo_pedido.itens:
        raise HTTPException(status_code=400, detail="Não foi possível vincular os itens ao pedido.")

    novo_pedido.calcularTotal()
    if status_inicial != "Pendente":
        try:
            novo_pedido.transicionarPara(status_inicial)
        except ValueError as err:
            raise HTTPException(status_code=400, detail=str(err))

    try:
        salvar_pedido(novo_pedido)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    return _formatar_pedido(novo_pedido)


@router.post("/{id_pedido}/cancelar", response_model=PedidoResposta)
def cancelar_proprio_pedido_rota(
    id_pedido: int,
    usuario_atual=Depends(obter_usuario_atual),
):
    pedido = obter_pedido_por_id(id_pedido)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    if pedido.cliente_id != usuario_atual.id_usuario:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para cancelar pedidos de outro titular.",
        )

    try:
        pedido.cancelar(apenas_se_pendente=True)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    pedido_atualizado = atualizar_status_pedido(
        id_pedido,
        pedido.status,
        responsavel=usuario_atual.nome,
        status_pagamento=pedido.status_pagamento,
    )
    if not pedido_atualizado:
        raise HTTPException(status_code=500, detail="Erro ao cancelar o pedido no banco de dados.")

    return _formatar_pedido(pedido_atualizado)


@router.patch("/{id_pedido}/status", response_model=PedidoResposta)
def atualizar_status_pedido_rota(
    id_pedido: int,
    dados: PedidoStatusAlteracao,
    usuario_atual=Depends(exigir_permissao("pedidos")),
):
    if dados.status_pagamento is not None and dados.status_pagamento not in _STATUS_PAGAMENTO_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail="Status de pagamento inválido.",
        )

    pedido = obter_pedido_por_id(id_pedido)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    try:
        pedido.transicionarPara(dados.status)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    pedido_atualizado = atualizar_status_pedido(
        id_pedido,
        pedido.status,
        codigo_rastreio=dados.codigo_rastreio,
        responsavel=usuario_atual.nome,
        status_pagamento=dados.status_pagamento,
    )
    if not pedido_atualizado:
        raise HTTPException(status_code=500, detail="Erro ao atualizar o pedido no banco de dados.")

    return _formatar_pedido(pedido_atualizado)
