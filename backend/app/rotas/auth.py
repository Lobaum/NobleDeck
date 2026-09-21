from fastapi import APIRouter, HTTPException, status
from app.banco import salvar_usuario, obter_usuario_por_email, listar_usuarios
from app.modelos.usuario import Cliente, Funcionario, Administrador
from app.esquemas import UsuarioCadastro, UsuarioLogin, UsuarioResposta

router = APIRouter(prefix="/api/auth", tags=["Autenticação e Usuários"])


@router.post("/cadastro", response_model=UsuarioResposta, status_code=status.HTTP_201_CREATED)
def cadastrar_usuario(dados: UsuarioCadastro):
    existente = obter_usuario_por_email(dados.email)
    if existente:
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado no sistema!")

    tipo = dados.tipoUsuario or getattr(dados, "tipo_usuario", "cliente") or "cliente"
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

    if isinstance(novo_usuario, Cliente):
        novo_usuario.cadastrar()

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
    admin = Administrador()
    todos = listar_usuarios()
    return admin.gerenciarUsuarios(todos)
