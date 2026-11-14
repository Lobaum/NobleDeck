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
    ):
        super().__init__(
            id_usuario=id_usuario,
            nome=nome,
            email=email,
            senha=senha,
            cargo=cargo or "Administrador Geral",
        )
        self.tipoUsuario = "administrador"