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

    def cadastrar(self):
        return True

    def consultarProdutos(self, lista_produtos=None):
        if lista_produtos is None:
            return []
        return [p for p in lista_produtos if getattr(p, "ativo", True)]

    def realizarPedido(self, pedido):
        if pedido:
            self.pedidos.append(pedido)
        return pedido

    def consultarPedidos(self):
        return self.pedidos

    def inscreverTorneio(self, torneio):
        if torneio and hasattr(torneio, "inscreverParticipante"):
            resultado = torneio.inscreverParticipante(self)
            return resultado is not None
        return False


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

    def cadastrarProduto(self, produto):
        if produto and hasattr(produto, "cadastrar"):
            produto.cadastrar()
            return True
        return True

    def alterarProduto(self, produto, **dados):
        if produto and hasattr(produto, "alterar"):
            produto.alterar(**dados)
            return produto
        return None

    def consultarEstoque(self, estoque):
        if estoque and hasattr(estoque, "consultarQuantidade"):
            return estoque.consultarQuantidade()
        return 0

    def atualizarPedido(self, pedido, novo_status="Pendente"):
        if pedido and hasattr(pedido, "atualizarStatus"):
            return pedido.atualizarStatus(novo_status)
        return novo_status

    def cadastrarTorneio(self, torneio):
        if torneio and hasattr(torneio, "cadastrar"):
            torneio.cadastrar()
            return True
        return True

    def registrarResultado(self, partida, resultado=""):
        if partida and hasattr(partida, "registrarResultado"):
            return partida.registrarResultado(resultado)
        return resultado


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

    def gerenciarUsuarios(self, lista_usuarios=None):
        return lista_usuarios or []

    def gerenciarFuncionarios(self, lista_funcionarios=None):
        return lista_funcionarios or []

    def gerenciarProdutos(self, lista_produtos=None):
        return lista_produtos or []

    def gerenciarEstoque(self, lista_estoque=None):
        return lista_estoque or []

    def gerenciarTorneios(self, lista_torneios=None):
        return lista_torneios or []