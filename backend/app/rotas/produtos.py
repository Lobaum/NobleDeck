from fastapi import APIRouter, HTTPException, status
from app.banco import salvar_produto, obter_produto_por_id, listar_produtos, atualizar_produto, salvar_estoque
from app.modelos.produto import Produto
from app.modelos.estoque import Estoque
from app.modelos.usuario import Cliente, Funcionario
from app.esquemas import ProdutoRegistro, ProdutoAlteracao, ProdutoResposta

router = APIRouter(prefix="/api/produtos", tags=["Produtos"])


@router.get("", response_model=list[ProdutoResposta])
def consultar(
    jogo: str | None = None,
    categoria: str | None = None,
    apenas_ativos: bool = True,
):
    produtos = listar_produtos(jogo=jogo, categoria=categoria, apenas_ativos=apenas_ativos)
    cliente_virtual = Cliente()
    return cliente_virtual.consultarProdutos(produtos) if apenas_ativos else produtos


@router.get("/{id_produto}", response_model=ProdutoResposta)
def buscarPorId(id_produto: int):
    produto = obter_produto_por_id(id_produto)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    return produto


@router.post("", response_model=ProdutoResposta, status_code=status.HTTP_201_CREATED)
def cadastrar(dados: ProdutoRegistro):
    funcionario = Funcionario()
    novo_produto = Produto(**dados.model_dump())
    funcionario.cadastrarProduto(novo_produto)

    salvar_produto(novo_produto)
    estoque = Estoque(
        produto=novo_produto,
        quantidade=novo_produto.quantidade,
        estoqueMinimo=3,
    )
    salvar_estoque(estoque)

    return novo_produto


@router.put("/{id_produto}", response_model=ProdutoResposta)
def alterar(id_produto: int, dados: ProdutoAlteracao):
    produto = obter_produto_por_id(id_produto)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    funcionario = Funcionario()
    dados_filtrados = {campo: valor for campo, valor in dados.model_dump().items() if valor is not None}
    funcionario.alterarProduto(produto, **dados_filtrados)

    atualizar_produto(produto)
    return produto


@router.patch("/{id_produto}/inativar", response_model=ProdutoResposta)
def inativar(id_produto: int):
    produto = obter_produto_por_id(id_produto)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    produto.inativar()
    atualizar_produto(produto)
    return produto
