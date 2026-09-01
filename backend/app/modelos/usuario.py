class Usuario:
    def __init__(self, id_usuario: int, nome: str, email: str, senha: str):
        self.id_usuario = id_usuario
        self.nome = nome
        self.email = email
        self.senha = senha


class Cliente(Usuario):
    def __init__(self, id_usuario: int, nome: str, email: str, senha: str):
        super().__init__(id_usuario, nome, email, senha)
        self.pedidos = []


class Funcionario(Usuario):
    def __init__(
        self,
        id_usuario: int,
        nome: str,
        email: str,
        senha: str,
        cargo: str
    ):
        super().__init__(id_usuario, nome, email, senha)
        self.cargo = cargo