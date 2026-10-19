from fastapi import APIRouter, HTTPException, status
from app.banco import (
    salvar_usuario,
    obter_usuario_por_email,
    listar_usuarios,
    atualizar_usuario_perfil,
    atualizar_senha_usuario,
)
from app.modelos.usuario import Cliente, Funcionario, Administrador
from app.esquemas import (
    UsuarioCadastro,
    UsuarioLogin,
    UsuarioResposta,
    UsuarioAtualizacaoPerfil,
    UsuarioAlterarSenha,
)

router = APIRouter(prefix="/api/auth", tags=["Autenticação e Usuários"])


@router.post("/cadastro", response_model=UsuarioResposta, status_code=status.HTTP_201_CREATED)
def cadastrar_usuario(dados: UsuarioCadastro):
    existente = obter_usuario_por_email(dados.email)
    if existente:
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado no sistema!")

    tipo = dados.tipoUsuario or "cliente"
    if tipo == "funcionario":
        novo_usuario = Funcionario(
            nome=dados.nome,
            email=dados.email,
            senha=dados.senha,
            cargo=dados.cargo or "Atendente de Loja",
        )
    elif tipo == "administrador":
        novo_usuario = Administrador(
            nome=dados.nome,
            email=dados.email,
            senha=dados.senha,
        )
    else:
        novo_usuario = Cliente(
            nome=dados.nome,
            email=dados.email,
            senha=dados.senha,
            telefone=dados.telefone or "",
        )

    salvar_usuario(novo_usuario)
    return novo_usuario


@router.post("/login", response_model=UsuarioResposta)
def login(dados: UsuarioLogin):
    usuario = obter_usuario_por_email(dados.email)
    if not usuario or not usuario.fazerLogin(dados.email, dados.senha):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")
    return usuario


@router.get("/usuarios", response_model=list[UsuarioResposta], tags=["Usuários"])
def listar_todos_usuarios():
    return listar_usuarios()


@router.put("/usuarios/{id_usuario}/perfil", response_model=UsuarioResposta, tags=["Usuários"])
def atualizar_perfil(id_usuario: int, dados: UsuarioAtualizacaoPerfil):
    atualizado = atualizar_usuario_perfil(id_usuario, dados.tipo_usuario, dados.cargo)
    if not atualizado:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return atualizado


@router.put("/usuarios/{id_usuario}/senha", response_model=UsuarioResposta, tags=["Usuários"])
def alterar_senha(id_usuario: int, dados: UsuarioAlterarSenha):
    if not dados.nova_senha or len(dados.nova_senha.strip()) < 4:
        raise HTTPException(status_code=400, detail="A senha deve possuir pelo menos 4 caracteres.")
    atualizado = atualizar_senha_usuario(id_usuario, dados.nova_senha.strip())
    if not atualizado:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return atualizado
