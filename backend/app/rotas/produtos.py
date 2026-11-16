from fastapi import APIRouter, Depends, HTTPException, status
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
from app.seguranca import (
    exigir_admin,
    exigir_permissao,
    obter_usuario_atual,
    usuario_tem_permissao,
)

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
def cadastrar(
    dados: ProdutoRegistro,
    usuario_atual=Depends(obter_usuario_atual),
):
    origem = (dados.origem or "manual").strip().lower()
    perm_necessaria = "catalogo_api" if origem == "catalogo_api" else "produtos"
    if not usuario_tem_permissao(usuario_atual, perm_necessaria):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Seu nível de acesso não permite importar itens do catálogo oficial."
                if perm_necessaria == "catalogo_api"
                else "Seu nível de acesso não permite cadastrar novos produtos."
            ),
        )

    dados_produto = dados.model_dump(exclude={"origem"})
    novo_produto = Produto(**dados_produto)
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
            motivo="Importação do Catálogo Oficial (API)" if origem == "catalogo_api" else "Estoque Inicial no Cadastro",
            responsavel=usuario_atual.nome,
        )

    return novo_produto


@router.put("/{id_produto}", response_model=ProdutoResposta)
def alterar(
    id_produto: int,
    dados: ProdutoAlteracao,
    usuario_atual=Depends(obter_usuario_atual),
):
    if getattr(usuario_atual, "tipoUsuario", "") not in ("funcionario", "administrador"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito à equipe autorizada da loja.",
        )

    produto = obter_produto_por_id(id_produto)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    saldo_anterior = produto.quantidade
    dados_atualizacao = dados.model_dump(exclude_unset=True)

    campos_estoque = {"quantidade", "estoque", "estoque_minimo"}
    alterando_catalogo = any(campo not in campos_estoque for campo in dados_atualizacao.keys())
    alterando_estoque = False
    if "quantidade" in dados_atualizacao and dados_atualizacao["quantidade"] is not None:
        alterando_estoque = int(dados_atualizacao["quantidade"]) != produto.quantidade
    if "estoque" in dados_atualizacao and dados_atualizacao["estoque"] is not None:
        alterando_estoque = alterando_estoque or int(dados_atualizacao["estoque"]) != produto.quantidade
    if "estoque_minimo" in dados_atualizacao and dados_atualizacao["estoque_minimo"] is not None:
        alterando_estoque = alterando_estoque or int(dados_atualizacao["estoque_minimo"]) != produto.estoque_minimo

    if alterando_catalogo and not usuario_tem_permissao(usuario_atual, "produtos"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seu nível de acesso não permite editar informações ou preços de produtos.",
        )

    if alterando_estoque and not usuario_tem_permissao(usuario_atual, "estoque"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seu nível de acesso não permite ajustar quantidades ou estoque mínimo.",
        )

    for campo, valor in dados_atualizacao.items():
        if valor is not None:
            if campo in ("quantidade", "estoque"):
                qtd = int(valor)
                if qtd < 0:
                    raise HTTPException(status_code=400, detail="A quantidade em estoque não pode ser negativa.")
                produto.quantidade = qtd
                produto.estoque = qtd
            elif campo == "estoque_minimo":
                est_min = int(valor)
                if est_min < 0:
                    raise HTTPException(status_code=400, detail="O estoque mínimo não pode ser negativo.")
                produto.estoque_minimo = est_min
            elif campo == "preco":
                if not produto.atualizarPreco(valor):
                    raise HTTPException(status_code=400, detail="O preço do produto deve ser maior que zero.")
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
            responsavel=usuario_atual.nome,
        )

    return produto


@router.patch("/{id_produto}/inativar", response_model=ProdutoResposta)
def inativar(
    id_produto: int,
    _usuario_atual=Depends(exigir_permissao("produtos")),
):
    produto = obter_produto_por_id(id_produto)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    produto.inativar()
    atualizar_produto(produto)
    return produto


@router.patch("/{id_produto}/ativar", response_model=ProdutoResposta)
def ativar(
    id_produto: int,
    _usuario_atual=Depends(exigir_permissao("produtos")),
):
    produto = obter_produto_por_id(id_produto)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    produto.ativar()
    atualizar_produto(produto)
    return produto


@router.delete("/{id_produto}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(
    id_produto: int,
    _usuario_atual=Depends(exigir_admin),
):
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
