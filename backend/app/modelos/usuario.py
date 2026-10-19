class Usuario:
    def __init__(
        self,
        id_usuario=None,
        nome="",
        email="",
        senha="",
        tipoUsuario="usuario",
    ):
        self.id_usuario = id_usuario
        self.nome = nome
        self.email = email
        self.senha = senha
        self.tipoUsuario = tipoUsuario

    def fazerLogin(self, email="", senha=""):
        return self.email == email and self.senha == senha

    def alterarDados(self, nome=None, email=None, senha=None):
        if nome is not None and nome.strip():
            self.nome = nome
        if email is not None and email.strip():
            self.email = email
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
    ):
        super().__init__(
            id_usuario=id_usuario,
            nome=nome,
            email=email,
            senha=senha,
            tipoUsuario="cliente",
        )
        self.telefone = telefone
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
    ):
        super().__init__(
            id_usuario=id_usuario,
            nome=nome,
            email=email,
            senha=senha,
            tipoUsuario="funcionario",
        )
        self.cargo = cargo

    def atualizarCargo(self, novo_cargo):
        if novo_cargo and novo_cargo.strip():
            self.cargo = novo_cargo


class Administrador(Funcionario):
    def __init__(
        self,
        id_usuario=None,
        nome="",
        email="",
        senha="",
    ):
        super().__init__(
            id_usuario=id_usuario,
            nome=nome,
            email=email,
            senha=senha,
            cargo="Administrador Geral",
        )
        self.tipoUsuario = "administrador"