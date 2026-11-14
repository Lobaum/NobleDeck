from fastapi import APIRouter, Depends, HTTPException, status
from app.banco import (
    salvar_usuario,
    obter_usuario_por_email,
    obter_usuario_por_id,
    listar_usuarios,
    atualizar_usuario_perfil,
    atualizar_senha_usuario,
    excluir_usuario,
)
from app.modelos.usuario import Cliente, Funcionario, Administrador
from app.esquemas import (
    UsuarioCadastro,
    UsuarioLogin,
    UsuarioResposta,
    UsuarioAutenticadoResposta,
    UsuarioAtualizacaoPerfil,
    UsuarioAlterarSenha,
)
from app.seguranca import (
    criar_token_acesso,
    exigir_admin,
    gerar_hash_senha,
    obter_usuario_atual,
    obter_usuario_opcional,
    precisa_rehash_senha,
    verificar_senha,
)

router = APIRouter(prefix="/api/auth", tags=["Autenticação e Usuários"])

_TIPOS_USUARIO_VALIDOS = {"cliente", "funcionario", "administrador"}


def _validar_email(email: str) -> str:
    email_limpo = (email or "").strip().lower()
    partes = email_limpo.split("@")
    if (
        len(partes) != 2
        or not partes[0]
        or " " in email_limpo
        or "." not in partes[1]
        or partes[1].startswith(".")
        or partes[1].endswith(".")
    ):
        raise HTTPException(status_code=400, detail="Informe um endereço de e-mail válido.")
    return email_limpo


def _resposta_autenticada(usuario, token: str) -> UsuarioAutenticadoResposta:
    return UsuarioAutenticadoResposta(
        id_usuario=usuario.id_usuario,
        nome=usuario.nome,
        email=usuario.email,
        tipoUsuario=usuario.tipoUsuario,
        telefone=getattr(usuario, "telefone", None),
        cargo=getattr(usuario, "cargo", None),
        token=token,
    )


@router.post("/cadastro", response_model=UsuarioAutenticadoResposta, status_code=status.HTTP_201_CREATED)
def cadastrar_usuario(
    dados: UsuarioCadastro,
    usuario_atual=Depends(obter_usuario_opcional),
):
    nome_limpo = (dados.nome or "").strip()
    if not nome_limpo:
        raise HTTPException(status_code=400, detail="Informe o nome do usuário.")

    email_limpo = _validar_email(dados.email)

    if not dados.senha or len(dados.senha.strip()) < 8:
        raise HTTPException(status_code=400, detail="A senha deve possuir pelo menos 8 caracteres.")

    existente = obter_usuario_por_email(email_limpo)
    if existente:
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado no sistema!")

    tipo_solicitado = (dados.tipoUsuario or "cliente").strip().lower()
    if usuario_atual is not None and getattr(usuario_atual, "tipoUsuario", "") == "administrador":
        if tipo_solicitado not in _TIPOS_USUARIO_VALIDOS:
            raise HTTPException(
                status_code=400,
                detail="Tipo de usuário inválido. Use cliente, funcionario ou administrador.",
            )
        tipo = tipo_solicitado
    elif usuario_atual is not None and tipo_solicitado in ("funcionario", "administrador"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem criar contas de equipe ou administrador.",
        )
    else:
        tipo = "cliente"

    senha_hash = gerar_hash_senha(dados.senha)
    cargo_limpo = (dados.cargo or "").strip()

    if tipo == "funcionario":
        novo_usuario = Funcionario(
            nome=nome_limpo,
            email=email_limpo,
            senha=senha_hash,
            cargo=cargo_limpo or "Atendente de Loja",
        )
    elif tipo == "administrador":
        novo_usuario = Administrador(
            nome=nome_limpo,
            email=email_limpo,
            senha=senha_hash,
            cargo=cargo_limpo or "Administrador Geral",
        )
    else:
        novo_usuario = Cliente(
            nome=nome_limpo,
            email=email_limpo,
            senha=senha_hash,
            telefone=(dados.telefone or "").strip(),
        )

    salvar_usuario(novo_usuario)
    token = criar_token_acesso(novo_usuario)
    return _resposta_autenticada(novo_usuario, token)


@router.post("/login", response_model=UsuarioAutenticadoResposta)
def login(dados: UsuarioLogin):
    email_limpo = (dados.email or "").strip().lower()
    usuario = obter_usuario_por_email(email_limpo)
    if not usuario or not verificar_senha(dados.senha, usuario.senha):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")

    if precisa_rehash_senha(usuario.senha):
        novo_hash = gerar_hash_senha(dados.senha)
        usuario_migrado = atualizar_senha_usuario(usuario.id_usuario, novo_hash)
        if usuario_migrado:
            usuario = usuario_migrado

    token = criar_token_acesso(usuario)
    return _resposta_autenticada(usuario, token)


@router.get("/usuarios", response_model=list[UsuarioResposta], tags=["Usuários"])
def listar_todos_usuarios(_usuario_atual=Depends(exigir_admin)):
    return listar_usuarios()


@router.put("/usuarios/{id_usuario}/perfil", response_model=UsuarioResposta, tags=["Usuários"])
def atualizar_perfil(
    id_usuario: int,
    dados: UsuarioAtualizacaoPerfil,
    usuario_atual=Depends(exigir_admin),
):
    tipo_norm = (dados.tipo_usuario or "").strip().lower()
    if tipo_norm not in _TIPOS_USUARIO_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail="Tipo de usuário inválido. Use cliente, funcionario ou administrador.",
        )

    if usuario_atual.id_usuario == id_usuario and tipo_norm != "administrador":
        raise HTTPException(
            status_code=400,
            detail="Você não pode rebaixar o próprio perfil de administrador.",
        )

    atualizado = atualizar_usuario_perfil(id_usuario, tipo_norm, dados.cargo)
    if not atualizado:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return atualizado


@router.put("/usuarios/{id_usuario}/senha", response_model=UsuarioResposta, tags=["Usuários"])
def alterar_senha(
    id_usuario: int,
    dados: UsuarioAlterarSenha,
    usuario_atual=Depends(obter_usuario_atual),
):
    eh_proprio = usuario_atual.id_usuario == id_usuario
    eh_admin = getattr(usuario_atual, "tipoUsuario", "") == "administrador"
    if not eh_proprio and not eh_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para alterar a senha deste usuário.",
        )

    alvo = obter_usuario_por_id(id_usuario)
    if not alvo:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if eh_proprio:
        if not dados.senha_atual:
            raise HTTPException(status_code=400, detail="Informe a senha atual para confirmar a alteração.")
        if not verificar_senha(dados.senha_atual, alvo.senha):
            raise HTTPException(status_code=400, detail="Senha atual incorreta.")

    if not dados.nova_senha or len(dados.nova_senha.strip()) < 8:
        raise HTTPException(status_code=400, detail="A senha deve possuir pelo menos 8 caracteres.")

    atualizado = atualizar_senha_usuario(id_usuario, gerar_hash_senha(dados.nova_senha))
    if not atualizado:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return atualizado


@router.delete("/usuarios/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT, tags=["Usuários"])
def remover_usuario(
    id_usuario: int,
    usuario_atual=Depends(exigir_admin),
):
    if usuario_atual.id_usuario == id_usuario:
        raise HTTPException(
            status_code=400,
            detail="Você não pode excluir a própria conta de administrador.",
        )

    existente = obter_usuario_por_id(id_usuario)
    if not existente:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    excluir_usuario(id_usuario)
    return None
