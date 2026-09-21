from fastapi import APIRouter, HTTPException
from app.banco import (
    listar_estoques,
    obter_estoque_por_produto_id,
    atualizar_estoque_banco,
    salvar_estoque,
    obter_produto_por_id,
)
from app.modelos.estoque import Estoque
from app.esquemas import EstoqueEntrada, EstoqueSaida, EstoqueResposta

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


@router.post("/entrada", response_model=EstoqueResposta)
def registrarEntrada(dados: EstoqueEntrada):
    estoque = obter_estoque_por_produto_id(dados.produto_id)
    if not estoque:
        produto = obter_produto_por_id(dados.produto_id)
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado.")
        estoque = Estoque(produto=produto, quantidade=0, estoqueMinimo=3)
        salvar_estoque(estoque)

    estoque.registrarEntrada(dados.quantidade)
    atualizar_estoque_banco(estoque)

    nome_produto = estoque.produto.nome if estoque.produto else ""
    return EstoqueResposta(
        id_estoque=estoque.id_estoque or 0,
        produto_id=estoque.produto_id or 0,
        quantidade=estoque.consultarQuantidade(),
        estoque_minimo=estoque.estoqueMinimo,
        produto_nome=nome_produto,
    )


@router.post("/saida", response_model=EstoqueResposta)
def registrarSaida(dados: EstoqueSaida):
    estoque = obter_estoque_por_produto_id(dados.produto_id)
    if not estoque:
        raise HTTPException(status_code=404, detail="Estoque para este produto não encontrado.")

    sucesso = estoque.registrarSaida(dados.quantidade)
    if not sucesso:
        raise HTTPException(status_code=400, detail="Quantidade indisponível em estoque.")

    atualizar_estoque_banco(estoque)

    nome_produto = estoque.produto.nome if estoque.produto else ""
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
