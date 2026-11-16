PERMISSOES_EQUIPE_VALIDAS = ("pedidos", "estoque", "produtos", "catalogo_api")


def normalizar_permissoes(permissoes) -> list[str]:
    if not isinstance(permissoes, (list, tuple, set)):
        return []
    informadas = {str(item).strip().lower() for item in permissoes if isinstance(item, str)}
    return [perm for perm in PERMISSOES_EQUIPE_VALIDAS if perm in informadas]


class Usuario:
    def __init__(
        self,
        id_usuario=None,
        nome="",
        email="",
        senha="",
        tipoUsuario="usuario",
        permissoes=None,
        telefone="",
        cpf="",
        cep="",
        endereco="",
    ):
        self.id_usuario = id_usuario
        self.nome = nome
        self.email = email
        self.senha = senha
        self.tipoUsuario = tipoUsuario
        self.permissoes = normalizar_permissoes(permissoes) if permissoes is not None else []
        self.telefone = telefone or ""
        self.cpf = cpf or ""
        self.cep = cep or ""
        self.endereco = endereco or ""

    def temPermissao(self, permissao: str) -> bool:
        if self.tipoUsuario == "administrador":
            return True
        if self.tipoUsuario == "funcionario":
            return permissao in (self.permissoes or [])
        return False

    def fazerLogin(self, email="", senha=""):
        if not email or not senha or not self.email or not self.senha:
            return False
        if self.email.strip().lower() != email.strip().lower():
            return False
        from app.seguranca import verificar_senha

        return verificar_senha(senha, self.senha)

    def alterarDados(self, nome=None, email=None, senha=None):
        if nome is not None and nome.strip():
            self.nome = nome.strip()
        if email is not None and email.strip():
            self.email = email.strip().lower()
        if senha is not None and senha.strip():
            self.senha = senha


class Cliente(Usuario):
    def __init__(
        self,
        id_usuario=None,
        nome="",
        email="",
        senha="",
        telefone="",
        cpf="",
        cep="",
        endereco="",
    ):
        super().__init__(
            id_usuario=id_usuario,
            nome=nome,
            email=email,
            senha=senha,
            tipoUsuario="cliente",
            telefone=telefone,
            cpf=cpf,
            cep=cep,
            endereco=endereco,
        )
        self.pedidos = []

    def adicionarPedido(self, pedido):
        if pedido:
            self.pedidos.append(pedido)
        return pedido

    def consultarPedidos(self):
        return self.pedidos

    def atualizarTelefone(self, telefone=""):
        self.telefone = telefone


class Funcionario(Usuario):
    def __init__(
        self,
        id_usuario=None,
        nome="",
        email="",
        senha="",
        cargo="Atendente de Loja",
        permissoes=None,
        telefone="",
        cpf="",
        cep="",
        endereco="",
    ):
        permissoes_resolvidas = (
            list(PERMISSOES_EQUIPE_VALIDAS)
            if permissoes is None
            else normalizar_permissoes(permissoes)
        )
        super().__init__(
            id_usuario=id_usuario,
            nome=nome,
            email=email,
            senha=senha,
            tipoUsuario="funcionario",
            permissoes=permissoes_resolvidas,
            telefone=telefone,
            cpf=cpf,
            cep=cep,
            endereco=endereco,
        )
        self.cargo = cargo or "Atendente de Loja"

    def atualizarCargo(self, novo_cargo):
        if novo_cargo and novo_cargo.strip():
            self.cargo = novo_cargo.strip()


class Administrador(Funcionario):
    def __init__(
        self,
        id_usuario=None,
        nome="",
        email="",
        senha="",
        cargo="Administrador Geral",
        telefone="",
        cpf="",
        cep="",
        endereco="",
    ):
        super().__init__(
            id_usuario=id_usuario,
            nome=nome,
            email=email,
            senha=senha,
            cargo=cargo or "Administrador Geral",
            permissoes=list(PERMISSOES_EQUIPE_VALIDAS),
            telefone=telefone,
            cpf=cpf,
            cep=cep,
            endereco=endereco,
        )
        self.tipoUsuario = "administrador"