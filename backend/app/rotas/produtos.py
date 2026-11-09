from fastapi import APIRouter, HTTPException, status
from app.banco import (
    salvar_produto,
    obter_produto_por_id,
    listar_produtos,
    atualizar_produto,
    salvar_estoque,
    excluir_produto,
    registrar_movimentacao_estoque,
)
from app.modelos.produto import Produto
from app.modelos.estoque import Estoque
from app.esquemas import ProdutoRegistro, ProdutoAlteracao, ProdutoResposta

router = APIRouter(prefix="/api/produtos", tags=["Produtos"])


@router.get("", response_model=list[ProdutoResposta])
def consultar(
    jogo: str | None = None,
    categoria: str | None = None,
    apenas_ativos: bool = True,
):
    return listar_produtos(jogo=jogo, categoria=categoria, apenas_ativos=apenas_ativos)


@router.get("/{id_produto}", response_model=ProdutoResposta)
def buscarPorId(id_produto: int):
    produto = obter_produto_por_id(id_produto)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    return produto


@router.post("", response_model=ProdutoResposta, status_code=status.HTTP_201_CREATED)
def cadastrar(dados: ProdutoRegistro):
    novo_produto = Produto(**dados.model_dump())
    salvar_produto(novo_produto)

    estoque = Estoque(
        produto=novo_produto,
        quantidade=novo_produto.quantidade,
        estoqueMinimo=novo_produto.estoque_minimo,
    )
    salvar_estoque(estoque)

    if novo_produto.quantidade > 0 and novo_produto.id_produto:
        registrar_movimentacao_estoque(
            produto_id=novo_produto.id_produto,
            produto_nome=novo_produto.nome,
            tipo="entrada",
            quantidade=novo_produto.quantidade,
            saldo_anterior=0,
            saldo_posterior=novo_produto.quantidade,
            motivo="Estoque Inicial no Cadastro",
            responsavel="Catálogo",
        )

    return novo_produto


@router.put("/{id_produto}", response_model=ProdutoResposta)
def alterar(id_produto: int, dados: ProdutoAlteracao):
    produto = obter_produto_por_id(id_produto)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    saldo_anterior = produto.quantidade
    dados_atualizacao = dados.model_dump(exclude_unset=True)
    for campo, valor in dados_atualizacao.items():
        if valor is not None:
            if campo in ("quantidade", "estoque"):
                produto.quantidade = int(valor)
                produto.estoque = int(valor)
            elif campo == "estoque_minimo":
                produto.estoque_minimo = max(0, int(valor))
            elif hasattr(produto, campo):
                setattr(produto, campo, valor)

    atualizar_produto(produto)

    if produto.quantidade != saldo_anterior:
        diff = produto.quantidade - saldo_anterior
        registrar_movimentacao_estoque(
            produto_id=id_produto,
            produto_nome=produto.nome,
            tipo="entrada" if diff > 0 else "saida",
            quantidade=abs(diff),
            saldo_anterior=saldo_anterior,
            saldo_posterior=produto.quantidade,
            motivo="Ajuste Direto de Inventário",
            responsavel="Gestão de Estoque",
        )

    return produto


@router.patch("/{id_produto}/inativar", response_model=ProdutoResposta)
def inativar(id_produto: int):
    produto = obter_produto_por_id(id_produto)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    produto.inativar()
    atualizar_produto(produto)
    return produto


@router.patch("/{id_produto}/ativar", response_model=ProdutoResposta)
def ativar(id_produto: int):
    produto = obter_produto_por_id(id_produto)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    produto.ativar()
    atualizar_produto(produto)
    return produto


@router.delete("/{id_produto}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(id_produto: int):
    produto = obter_produto_por_id(id_produto)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    if produto.ativo:
        raise HTTPException(
            status_code=400,
            detail="Apenas produtos inativos podem ser excluídos permanentemente. Inative o produto antes de excluí-lo.",
        )

    excluir_produto(id_produto)
    return None
