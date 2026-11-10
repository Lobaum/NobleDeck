import sqlite3
from datetime import datetime
from pathlib import Path
from contextlib import contextmanager
from app.modelos.usuario import Usuario, Cliente, Funcionario, Administrador
from app.modelos.produto import Produto
from app.modelos.estoque import Estoque
from app.modelos.pedido import Pedido, ItemPedido

DB_PATH = Path(__file__).resolve().parent.parent / "nobledeck.db"

def obter_conexao_direta():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def obter_conexao():
    conn = obter_conexao_direta()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def inicializar_banco():
    with obter_conexao() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                senha TEXT NOT NULL,
                tipo_usuario TEXT NOT NULL DEFAULT 'cliente',
                telefone TEXT DEFAULT '',
                cargo TEXT DEFAULT ''
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS produtos (
                id_produto INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                descricao TEXT DEFAULT '',
                categoria TEXT DEFAULT 'Geral',
                jogo TEXT DEFAULT 'outros',
                preco REAL NOT NULL DEFAULT 0.0,
                quantidade INTEGER NOT NULL DEFAULT 0,
                ativo INTEGER NOT NULL DEFAULT 1,
                jogo_nome TEXT DEFAULT 'Geral',
                subtitulo TEXT DEFAULT '',
                imagem_url TEXT DEFAULT '',
                raridade TEXT DEFAULT 'Comum',
                is_novo INTEGER DEFAULT 1,
                is_destaque INTEGER DEFAULT 0,
                idioma TEXT DEFAULT 'Português',
                ano INTEGER DEFAULT 2024
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS estoques (
                id_estoque INTEGER PRIMARY KEY AUTOINCREMENT,
                produto_id INTEGER NOT NULL UNIQUE,
                quantidade INTEGER NOT NULL DEFAULT 0,
                estoque_minimo INTEGER NOT NULL DEFAULT 3,
                FOREIGN KEY (produto_id) REFERENCES produtos (id_produto) ON DELETE CASCADE
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pedidos (
                id_pedido INTEGER PRIMARY KEY AUTOINCREMENT,
                numero INTEGER UNIQUE,
                data TEXT NOT NULL,
                valor_total REAL NOT NULL DEFAULT 0.0,
                status TEXT NOT NULL DEFAULT 'Pendente',
                cliente_id INTEGER,
                cliente_nome TEXT DEFAULT '',
                cliente_email TEXT DEFAULT '',
                FOREIGN KEY (cliente_id) REFERENCES usuarios (id_usuario)
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS itens_pedido (
                id_item INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER NOT NULL,
                produto_id INTEGER NOT NULL,
                quantidade INTEGER NOT NULL DEFAULT 1,
                preco_unitario REAL NOT NULL DEFAULT 0.0,
                subtotal REAL NOT NULL DEFAULT 0.0,
                FOREIGN KEY (pedido_id) REFERENCES pedidos (id_pedido) ON DELETE CASCADE,
                FOREIGN KEY (produto_id) REFERENCES produtos (id_produto)
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
                id_movimentacao INTEGER PRIMARY KEY AUTOINCREMENT,
                produto_id INTEGER NOT NULL,
                produto_nome TEXT NOT NULL,
                tipo TEXT NOT NULL,
                quantidade INTEGER NOT NULL,
                saldo_anterior INTEGER NOT NULL,
                saldo_posterior INTEGER NOT NULL,
                motivo TEXT DEFAULT '',
                responsavel TEXT DEFAULT 'Sistema',
                data_hora TEXT NOT NULL
            );
        """)

        cursor.execute("""
            INSERT OR IGNORE INTO estoques (produto_id, quantidade, estoque_minimo)
            SELECT id_produto, quantidade, 3 FROM produtos;
        """)



def atualizar_usuario_perfil(id_usuario, tipo_usuario, cargo=None):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE usuarios SET tipo_usuario = ?, cargo = COALESCE(?, cargo) WHERE id_usuario = ?",
            (tipo_usuario, cargo, id_usuario),
        )
        cursor.execute("SELECT * FROM usuarios WHERE id_usuario = ?", (id_usuario,))
        row = cursor.fetchone()
        if row:
            return instanciar_usuario_da_linha(row)
    return None


def atualizar_senha_usuario(id_usuario, nova_senha):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE usuarios SET senha = ? WHERE id_usuario = ?",
            (nova_senha, id_usuario),
        )
        cursor.execute("SELECT * FROM usuarios WHERE id_usuario = ?", (id_usuario,))
        row = cursor.fetchone()
        if row:
            return instanciar_usuario_da_linha(row)
    return None


def instanciar_usuario_da_linha(row):
    tipo = row["tipo_usuario"]
    if tipo == "administrador":
        return Administrador(
            id_usuario=row["id_usuario"],
            nome=row["nome"],
            email=row["email"],
            senha=row["senha"],
        )
    elif tipo == "funcionario":
        return Funcionario(
            id_usuario=row["id_usuario"],
            nome=row["nome"],
            email=row["email"],
            senha=row["senha"],
            cargo=row["cargo"] or "Atendente de Loja",
        )
    else:
        return Cliente(
            id_usuario=row["id_usuario"],
            nome=row["nome"],
            email=row["email"],
            senha=row["senha"],
            telefone=row["telefone"] or "",
        )


def salvar_usuario(usuario):
    telefone = getattr(usuario, "telefone", "")
    cargo = getattr(usuario, "cargo", "")
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO usuarios (nome, email, senha, tipo_usuario, telefone, cargo)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (usuario.nome, usuario.email, usuario.senha, usuario.tipoUsuario, telefone, cargo),
        )
        usuario.id_usuario = cursor.lastrowid
    return usuario


def obter_usuario_por_email(email):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM usuarios WHERE email = ?", (email,))
        row = cursor.fetchone()
        if row:
            return instanciar_usuario_da_linha(row)
    return None


def obter_usuario_por_id(id_usuario):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM usuarios WHERE id_usuario = ?", (id_usuario,))
        row = cursor.fetchone()
        if row:
            return instanciar_usuario_da_linha(row)
    return None


def listar_usuarios():
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM usuarios ORDER BY id_usuario ASC")
        return [instanciar_usuario_da_linha(row) for row in cursor.fetchall()]


def excluir_usuario(id_usuario: int) -> bool:
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM usuarios WHERE id_usuario = ?", (id_usuario,))
        return cursor.rowcount > 0


def instanciar_produto_da_linha(row):
    chaves = row.keys()
    est_min = row["estoque_minimo"] if "estoque_minimo" in chaves and row["estoque_minimo"] is not None else 3
    return Produto(
        id_produto=row["id_produto"],
        nome=row["nome"],
        descricao=row["descricao"] or "",
        categoria=row["categoria"] or "Geral",
        jogo=row["jogo"] or "outros",
        preco=round(float(row["preco"]), 2),
        quantidade=int(row["quantidade"]),
        estoque_minimo=int(est_min),
        ativo=bool(row["ativo"]),
        jogo_nome=row["jogo_nome"] or "Geral",
        subtitulo=row["subtitulo"] or "",
        imagem_url=row["imagem_url"] or "",
        raridade=row["raridade"] or "Comum",
        is_novo=bool(row["is_novo"]),
        is_destaque=bool(row["is_destaque"]),
        idioma=row["idioma"] or "Português",
        ano=int(row["ano"] or 2024),
    )


def salvar_produto(produto):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO produtos (
                nome, descricao, categoria, jogo, preco, quantidade, ativo,
                jogo_nome, subtitulo, imagem_url, raridade, is_novo, is_destaque, idioma, ano
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                produto.nome,
                produto.descricao,
                produto.categoria,
                produto.jogo,
                round(float(produto.preco), 2),
                produto.quantidade,
                1 if produto.ativo else 0,
                produto.jogo_nome,
                produto.subtitulo,
                produto.imagem_url,
                produto.raridade,
                1 if produto.is_novo else 0,
                1 if produto.is_destaque else 0,
                produto.idioma,
                produto.ano,
            ),
        )
        produto.id_produto = cursor.lastrowid
    return produto


def atualizar_produto(produto):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE produtos SET
                nome = ?, descricao = ?, categoria = ?, jogo = ?, preco = ?,
                quantidade = ?, ativo = ?, jogo_nome = ?, subtitulo = ?,
                imagem_url = ?, raridade = ?, is_novo = ?, is_destaque = ?,
                idioma = ?, ano = ?
            WHERE id_produto = ?
            """,
            (
                produto.nome,
                produto.descricao,
                produto.categoria,
                produto.jogo,
                round(float(produto.preco), 2),
                produto.quantidade,
                1 if produto.ativo else 0,
                produto.jogo_nome,
                produto.subtitulo,
                produto.imagem_url,
                produto.raridade,
                1 if produto.is_novo else 0,
                1 if produto.is_destaque else 0,
                produto.idioma,
                produto.ano,
                produto.id_produto,
            ),
        )
        est_min = getattr(produto, "estoque_minimo", 3)
        cursor.execute(
            """
            INSERT INTO estoques (produto_id, quantidade, estoque_minimo)
            VALUES (?, ?, ?)
            ON CONFLICT(produto_id) DO UPDATE SET
                quantidade = excluded.quantidade,
                estoque_minimo = excluded.estoque_minimo
            """,
            (produto.id_produto, produto.quantidade, est_min),
        )
    return produto


def obter_produto_por_id(id_produto):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT p.*, COALESCE(e.estoque_minimo, 3) AS estoque_minimo
            FROM produtos p
            LEFT JOIN estoques e ON e.produto_id = p.id_produto
            WHERE p.id_produto = ?
            """,
            (id_produto,),
        )
        row = cursor.fetchone()
        if row:
            return instanciar_produto_da_linha(row)
    return None


def excluir_produto(id_produto: int) -> bool:
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM estoques WHERE produto_id = ?", (id_produto,))
        cursor.execute("DELETE FROM produtos WHERE id_produto = ?", (id_produto,))
        return cursor.rowcount > 0


def listar_produtos(jogo=None, categoria=None, apenas_ativos=True):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        sql = """
            SELECT p.*, COALESCE(e.estoque_minimo, 3) AS estoque_minimo
            FROM produtos p
            LEFT JOIN estoques e ON e.produto_id = p.id_produto
            WHERE 1=1
        """
        params = []
        if apenas_ativos:
            sql += " AND p.ativo = 1"
        if jogo and jogo != "all":
            sql += " AND p.jogo = ?"
            params.append(jogo)
        if categoria:
            sql += " AND p.categoria = ?"
            params.append(categoria)
        sql += " ORDER BY p.id_produto ASC"

        cursor.execute(sql, params)
        return [instanciar_produto_da_linha(row) for row in cursor.fetchall()]

def instanciar_estoque_da_linha(row, produto=None):
    return Estoque(
        id_estoque=row["id_estoque"],
        produto=produto,
        produto_id=row["produto_id"],
        quantidade=row["quantidade"],
        estoqueMinimo=row["estoque_minimo"],
    )


def salvar_estoque(estoque):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO estoques (produto_id, quantidade, estoque_minimo)
            VALUES (?, ?, ?)
            ON CONFLICT(produto_id) DO UPDATE SET
                quantidade = excluded.quantidade,
                estoque_minimo = excluded.estoque_minimo
            """,
            (estoque.produto_id, estoque.quantidade, estoque.estoqueMinimo),
        )
        estoque.id_estoque = cursor.lastrowid
    return estoque


def atualizar_estoque_banco(estoque):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE estoques SET quantidade = ?, estoque_minimo = ? WHERE produto_id = ?",
            (estoque.quantidade, estoque.estoqueMinimo, estoque.produto_id),
        )
        cursor.execute(
            "UPDATE produtos SET quantidade = ? WHERE id_produto = ?",
            (estoque.quantidade, estoque.produto_id),
        )
    return estoque


def obter_estoque_por_produto_id(produto_id):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM estoques WHERE produto_id = ?", (produto_id,))
        row = cursor.fetchone()
        if row:
            produto = obter_produto_por_id(produto_id)
            return instanciar_estoque_da_linha(row, produto)
    return None


def listar_estoques():
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM estoques ORDER BY id_estoque ASC")
        linhas = cursor.fetchall()
        resultado = []
        for linha in linhas:
            produto = obter_produto_por_id(linha["produto_id"])
            if produto:
                resultado.append(instanciar_estoque_da_linha(linha, produto))
        return resultado


def atualizar_estoque_minimo(produto_id: int, novo_minimo: int):
    produto = obter_produto_por_id(produto_id)
    if not produto:
        return None
    minimo = max(0, int(novo_minimo))
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO estoques (produto_id, quantidade, estoque_minimo)
            VALUES (?, ?, ?)
            ON CONFLICT(produto_id) DO UPDATE SET
                estoque_minimo = excluded.estoque_minimo
            """,
            (produto_id, produto.quantidade, minimo),
        )
    return obter_estoque_por_produto_id(produto_id)


def registrar_movimentacao_estoque(
    produto_id: int,
    produto_nome: str,
    tipo: str,
    quantidade: int,
    saldo_anterior: int,
    saldo_posterior: int,
    motivo: str = "",
    responsavel: str = "Sistema",
):
    agora = datetime.now().strftime("%d/%m/%Y %H:%M")
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO movimentacoes_estoque (
                produto_id, produto_nome, tipo, quantidade,
                saldo_anterior, saldo_posterior, motivo, responsavel, data_hora
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                produto_id,
                produto_nome,
                tipo,
                int(quantidade),
                int(saldo_anterior),
                int(saldo_posterior),
                motivo or "",
                responsavel or "Sistema",
                agora,
            ),
        )
        return {
            "id_movimentacao": cursor.lastrowid,
            "produto_id": produto_id,
            "produto_nome": produto_nome,
            "tipo": tipo,
            "quantidade": int(quantidade),
            "saldo_anterior": int(saldo_anterior),
            "saldo_posterior": int(saldo_posterior),
            "motivo": motivo or "",
            "responsavel": responsavel or "Sistema",
            "data_hora": agora,
        }


def listar_movimentacoes_estoque(limite: int = 100):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM movimentacoes_estoque ORDER BY id_movimentacao DESC LIMIT ?",
            (limite,),
        )
        return [dict(row) for row in cursor.fetchall()]

def salvar_pedido(pedido):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO pedidos (numero, data, valor_total, status, cliente_id, cliente_nome, cliente_email)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                pedido.numero,
                pedido.data,
                pedido.valorTotal,
                pedido.status,
                pedido.cliente_id,
                pedido.cliente_nome,
                pedido.cliente_email,
            ),
        )
        pedido.id_pedido = cursor.lastrowid

        for item in pedido.itens:
            cursor.execute(
                """
                INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    pedido.id_pedido,
                    item.produto_id,
                    item.quantidade,
                    item.precoUnitario,
                    item.subtotal,
                ),
            )
            item.id_item = cursor.lastrowid
            item.pedido_id = pedido.id_pedido

            cursor.execute(
                "UPDATE produtos SET quantidade = quantidade - ? WHERE id_produto = ?",
                (item.quantidade, item.produto_id),
            )
            cursor.execute(
                "UPDATE estoques SET quantidade = quantidade - ? WHERE produto_id = ?",
                (item.quantidade, item.produto_id),
            )

    return pedido


def obter_pedido_por_id(id_pedido):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pedidos WHERE id_pedido = ?", (id_pedido,))
        row = cursor.fetchone()
        if not row:
            return None

        pedido = Pedido(
            id_pedido=row["id_pedido"],
            numero=row["numero"],
            data=row["data"],
            valorTotal=float(row["valor_total"]),
            status=row["status"],
            cliente_id=row["cliente_id"],
            cliente_nome=row["cliente_nome"] or "",
            cliente_email=row["cliente_email"] or "",
        )

        cursor.execute("SELECT * FROM itens_pedido WHERE pedido_id = ?", (id_pedido,))
        for linha_item in cursor.fetchall():
            produto = obter_produto_por_id(linha_item["produto_id"])
            item = ItemPedido(
                id_item=linha_item["id_item"],
                pedido_id=linha_item["pedido_id"],
                produto_id=linha_item["produto_id"],
                produto=produto,
                quantidade=linha_item["quantidade"],
                precoUnitario=linha_item["preco_unitario"],
            )
            pedido.itens.append(item)

        return pedido


def listar_pedidos(cliente_id=None):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        if cliente_id:
            cursor.execute("SELECT id_pedido FROM pedidos WHERE cliente_id = ? ORDER BY id_pedido DESC", (cliente_id,))
        else:
            cursor.execute("SELECT id_pedido FROM pedidos ORDER BY id_pedido DESC")
        ids = [row["id_pedido"] for row in cursor.fetchall()]

    return [obter_pedido_por_id(id_do_pedido) for id_do_pedido in ids if id_do_pedido is not None]


def atualizar_status_pedido(id_pedido, novo_status):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE pedidos SET status = ? WHERE id_pedido = ?", (novo_status, id_pedido))
    return obter_pedido_por_id(id_pedido)
