from app.modelos.usuario import Cliente
from app.modelos.produto import Produto
from app.modelos.pedido import Pedido

clientes = []
produtos = []
print("========== Cadastros ==========")

nome = input("Nome: ")
email = input("Email: ")
senha = input("Senha: ")

cliente = Cliente(1, nome, email, senha)

clientes.append(cliente)

print("\nCadastro realizado com sucesso!")

cliente_logado = None

while cliente_logado is None:
    print("\n========== Login ==========")
    email_login = input("Email: ")
    senha_login = input("Senha: ")

    for cliente in clientes:
        if cliente.email == email_login and cliente.senha == senha_login:
            cliente_logado = cliente
            break

    if cliente_logado is None:
        print("\nEmail ou senha incorretos. Tente novamente.")

print(f"\nBem-vindo, {cliente_logado.nome}!")

produto1 = Produto(1, "Booster Pokémon", 29.90, 10)
produto2 = Produto(2, "Deck Pokémon", 149.90, 5)
produto3 = Produto(3, "Booster Magic", 34.90, 8)

produtos.append(produto1)
produtos.append(produto2)
produtos.append(produto3)

pedido = Pedido(1, cliente_logado)


print("\n========== Produtos ==========")

for produto in produtos:
    print(
        f"{produto.id_produto} - "
        f"{produto.nome} - "
        f"R$ {produto.preco:.2f} - "
        f"Estoque: {produto.estoque}"
    )

id_produto = int(input("\nDigite o id do produto: "))
quantidade = int(input("Digite a quantidade: "))

for produto in produtos:
    if produto.id_produto == id_produto:
        pedido.adicionar_item(produto, quantidade)
        print("\nProduto adicionado ao carrinho!")

pedido.exibir_carrinho()

resposta = input("\nDeseja finalizar o pedido? (s/n): ")

if resposta == "s":
    pedido.finalizar()

    print("\n========== Pedido ==========")
    print(f"Pedido: {pedido.id_pedido}")
    print(f"Cliente: {cliente_logado.nome}")
    print(f"Total: R$ {pedido.valor_total:.2f}")
    print(f"Status: {pedido.status}")
    print("============================")
    print("Pedido finalizado com sucesso!")