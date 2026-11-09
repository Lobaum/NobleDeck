from fastapi import APIRouter, HTTPException
from app.banco import (
    listar_estoques,
    obter_estoque_por_produto_id,
    atualizar_estoque_banco,
    salvar_estoque,
    obter_produto_por_id,
    atualizar_estoque_minimo,
    registrar_movimentacao_estoque,
    listar_movimentacoes_estoque,
)
from app.modelos.estoque import Estoque
from app.esquemas import (
    EstoqueEntrada,
    EstoqueSaida,
    EstoqueResposta,
    EstoqueMinimoAtualizacao,
    MovimentacaoEstoqueResposta,
)

router = APIRouter(prefix="/api/estoque", tags=["Estoque"])


@router.get("", response_model=list[EstoqueResposta])
def consultarQuantidade():
    estoques = listar_estoques()
    resultado = []
    for item_estoque in estoques:
        nome_produto = item_estoque.produto.nome if item_estoque.produto else ""
        resultado.append(
            EstoqueResposta(
                id_estoque=item_estoque.id_estoque or 0,
                produto_id=item_estoque.produto_id or 0,
                quantidade=item_estoque.consultarQuantidade(),
                estoque_minimo=item_estoque.estoqueMinimo,
                produto_nome=nome_produto,
            )
        )
    return resultado


@router.get("/movimentacoes", response_model=list[MovimentacaoEstoqueResposta])
def consultarMovimentacoes(limite: int = 100):
    return listar_movimentacoes_estoque(limite=limite)


@router.post("/entrada", response_model=EstoqueResposta)
def registrarEntrada(dados: EstoqueEntrada):
    if dados.quantidade <= 0:
        raise HTTPException(status_code=400, detail="A quantidade de entrada deve ser maior que zero.")

    estoque = obter_estoque_por_produto_id(dados.produto_id)
    if not estoque:
        produto = obter_produto_por_id(dados.produto_id)
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado.")
        estoque = Estoque(produto=produto, quantidade=produto.quantidade, estoqueMinimo=produto.estoque_minimo)
        salvar_estoque(estoque)

    saldo_anterior = estoque.consultarQuantidade()
    estoque.registrarEntrada(dados.quantidade)
    atualizar_estoque_banco(estoque)
    saldo_posterior = estoque.consultarQuantidade()

    nome_produto = estoque.produto.nome if estoque.produto else f"Produto #{dados.produto_id}"
    registrar_movimentacao_estoque(
        produto_id=dados.produto_id,
        produto_nome=nome_produto,
        tipo="entrada",
        quantidade=dados.quantidade,
        saldo_anterior=saldo_anterior,
        saldo_posterior=saldo_posterior,
        motivo=dados.motivo or "Reposição de Estoque",
        responsavel=dados.responsavel or "Administrador",
    )

    return EstoqueResposta(
        id_estoque=estoque.id_estoque or 0,
        produto_id=estoque.produto_id or 0,
        quantidade=saldo_posterior,
        estoque_minimo=estoque.estoqueMinimo,
        produto_nome=nome_produto,
    )


@router.post("/saida", response_model=EstoqueResposta)
def registrarSaida(dados: EstoqueSaida):
    if dados.quantidade <= 0:
        raise HTTPException(status_code=400, detail="A quantidade de saída deve ser maior que zero.")

    estoque = obter_estoque_por_produto_id(dados.produto_id)
    if not estoque:
        produto = obter_produto_por_id(dados.produto_id)
        if not produto:
            raise HTTPException(status_code=404, detail="Estoque para este produto não encontrado.")
        estoque = Estoque(produto=produto, quantidade=produto.quantidade, estoqueMinimo=produto.estoque_minimo)
        salvar_estoque(estoque)

    saldo_anterior = estoque.consultarQuantidade()
    sucesso = estoque.registrarSaida(dados.quantidade)
    if not sucesso:
        raise HTTPException(status_code=400, detail="Quantidade indisponível em estoque.")

    atualizar_estoque_banco(estoque)
    saldo_posterior = estoque.consultarQuantidade()

    nome_produto = estoque.produto.nome if estoque.produto else f"Produto #{dados.produto_id}"
    registrar_movimentacao_estoque(
        produto_id=dados.produto_id,
        produto_nome=nome_produto,
        tipo="saida",
        quantidade=dados.quantidade,
        saldo_anterior=saldo_anterior,
        saldo_posterior=saldo_posterior,
        motivo=dados.motivo or "Baixa Operacional",
        responsavel=dados.responsavel or "Administrador",
    )

    return EstoqueResposta(
        id_estoque=estoque.id_estoque or 0,
        produto_id=estoque.produto_id or 0,
        quantidade=saldo_posterior,
        estoque_minimo=estoque.estoqueMinimo,
        produto_nome=nome_produto,
    )


@router.put("/{produto_id}/minimo", response_model=EstoqueResposta)
def definirEstoqueMinimo(produto_id: int, dados: EstoqueMinimoAtualizacao):
    estoque = atualizar_estoque_minimo(produto_id, dados.estoque_minimo)
    if not estoque:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    nome_produto = estoque.produto.nome if estoque.produto else f"Produto #{produto_id}"
    return EstoqueResposta(
        id_estoque=estoque.id_estoque or 0,
        produto_id=estoque.produto_id or 0,
        quantidade=estoque.consultarQuantidade(),
        estoque_minimo=estoque.estoqueMinimo,
        produto_nome=nome_produto,
    )


@router.get("/falta", response_model=list[EstoqueResposta])
@router.get("/baixo", response_model=list[EstoqueResposta])
def verificarEstoqueBaixo():
    estoques = listar_estoques()
    em_falta = []
    for item_estoque in estoques:
        if item_estoque.verificarEstoqueBaixo():
            nome_produto = item_estoque.produto.nome if item_estoque.produto else ""
            em_falta.append(
                EstoqueResposta(
                    id_estoque=item_estoque.id_estoque or 0,
                    produto_id=item_estoque.produto_id or 0,
                    quantidade=item_estoque.consultarQuantidade(),
                    estoque_minimo=item_estoque.estoqueMinimo,
                    produto_nome=nome_produto,
                )
            )
    return em_falta
