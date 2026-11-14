import random
import secrets
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
    conn = sqlite3.connect(str(DB_PATH), timeout=10.0, check_same_thread=False)
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
                cliente_telefone TEXT DEFAULT '',
                endereco_entrega TEXT DEFAULT '',
                codigo_rastreio TEXT DEFAULT '',
                atualizado_em TEXT DEFAULT '',
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
                produto_nome TEXT DEFAULT '',
                jogo_nome TEXT DEFAULT '',
                imagem_url TEXT DEFAULT '',
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
            CREATE TABLE IF NOT EXISTS _config (
                chave TEXT PRIMARY KEY,
                valor TEXT NOT NULL
            );
        """)

        migracoes = [
            "ALTER TABLE pedidos ADD COLUMN cliente_telefone TEXT DEFAULT ''",
            "ALTER TABLE pedidos ADD COLUMN endereco_entrega TEXT DEFAULT ''",
            "ALTER TABLE pedidos ADD COLUMN codigo_rastreio TEXT DEFAULT ''",
            "ALTER TABLE pedidos ADD COLUMN atualizado_em TEXT DEFAULT ''",
            "ALTER TABLE itens_pedido ADD COLUMN produto_nome TEXT DEFAULT ''",
            "ALTER TABLE itens_pedido ADD COLUMN jogo_nome TEXT DEFAULT ''",
            "ALTER TABLE itens_pedido ADD COLUMN imagem_url TEXT DEFAULT ''",
        ]
        for sql_migracao in migracoes:
            try:
                cursor.execute(sql_migracao)
            except sqlite3.OperationalError:
                pass

        cursor.execute(
            "INSERT OR IGNORE INTO _config (chave, valor) VALUES (?, ?)",
            ("token_secret", secrets.token_hex(32)),
        )

        cursor.execute("""
            INSERT OR IGNORE INTO estoques (produto_id, quantidade, estoque_minimo)
            SELECT id_produto, quantidade, 3 FROM produtos;
        """)


def obter_segredo_auth() -> str:
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS _config (
                chave TEXT PRIMARY KEY,
                valor TEXT NOT NULL
            );
        """)
        cursor.execute("SELECT valor FROM _config WHERE chave = ?", ("token_secret",))
        row = cursor.fetchone()
        if row and row["valor"]:
            return row["valor"]
        novo_segredo = secrets.token_hex(32)
        cursor.execute(
            "INSERT OR IGNORE INTO _config (chave, valor) VALUES (?, ?)",
            ("token_secret", novo_segredo),
        )
        cursor.execute("SELECT valor FROM _config WHERE chave = ?", ("token_secret",))
        row = cursor.fetchone()
        return row["valor"]


def atualizar_usuario_perfil(id_usuario, tipo_usuario, cargo=None):
    cargo_atualizar = cargo.strip() if cargo is not None else ("" if tipo_usuario == "cliente" else None)
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE usuarios SET tipo_usuario = ?, cargo = COALESCE(?, cargo) WHERE id_usuario = ?",
            (tipo_usuario, cargo_atualizar, id_usuario),
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
            cargo=row["cargo"] or "Administrador Geral",
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
    usuario.email = (usuario.email or "").strip().lower()
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
    if not email:
        return None
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?)", (email.strip(),))
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
    agora = datetime.now().strftime("%d/%m/%Y %H:%M")
    with obter_conexao() as conn:
        cursor = conn.cursor()

        numero = pedido.numero
        if numero is not None:
            cursor.execute("SELECT 1 FROM pedidos WHERE numero = ?", (numero,))
            if cursor.fetchone():
                numero = None
        while numero is None:
            candidato = random.randint(1000, 999999)
            cursor.execute("SELECT 1 FROM pedidos WHERE numero = ?", (candidato,))
            if not cursor.fetchone():
                numero = candidato
        pedido.numero = numero

        cursor.execute(
            """
            INSERT INTO pedidos (
                numero, data, valor_total, status, cliente_id, cliente_nome, cliente_email,
                cliente_telefone, endereco_entrega, codigo_rastreio, atualizado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                pedido.numero,
                pedido.data,
                pedido.valorTotal,
                pedido.status,
                pedido.cliente_id,
                pedido.cliente_nome,
                pedido.cliente_email,
                getattr(pedido, "cliente_telefone", "") or "",
                getattr(pedido, "endereco_entrega", "") or "",
                getattr(pedido, "codigo_rastreio", "") or "",
                getattr(pedido, "atualizado_em", "") or agora,
            ),
        )
        pedido.id_pedido = cursor.lastrowid
        pedido.atualizado_em = getattr(pedido, "atualizado_em", "") or agora

        for item in pedido.itens:
            cursor.execute(
                """
                SELECT quantidade, nome, ativo, jogo_nome, imagem_url
                FROM produtos
                WHERE id_produto = ?
                """,
                (item.produto_id,),
            )
            prod_row = cursor.fetchone()
            if not prod_row or not bool(prod_row["ativo"]):
                raise ValueError(f"Produto ID {item.produto_id} não encontrado ou inativo.")

            saldo_anterior = int(prod_row["quantidade"])
            if saldo_anterior < item.quantidade:
                raise ValueError(
                    f"Estoque insuficiente para o produto '{prod_row['nome']}'. Disponível: {saldo_anterior}"
                )
            saldo_posterior = saldo_anterior - item.quantidade

            snap_nome = getattr(item, "produto_nome", "") or prod_row["nome"] or ""
            snap_jogo = getattr(item, "jogo_nome", "") or prod_row["jogo_nome"] or ""
            snap_img = getattr(item, "imagem_url", "") or prod_row["imagem_url"] or ""
            item.produto_nome = snap_nome
            item.jogo_nome = snap_jogo
            item.imagem_url = snap_img

            cursor.execute(
                """
                INSERT INTO itens_pedido (
                    pedido_id, produto_id, quantidade, preco_unitario, subtotal,
                    produto_nome, jogo_nome, imagem_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    pedido.id_pedido,
                    item.produto_id,
                    item.quantidade,
                    item.precoUnitario,
                    item.subtotal,
                    snap_nome,
                    snap_jogo,
                    snap_img,
                ),
            )
            item.id_item = cursor.lastrowid
            item.pedido_id = pedido.id_pedido

            cursor.execute(
                "UPDATE produtos SET quantidade = quantidade - ? WHERE id_produto = ? AND quantidade >= ?",
                (item.quantidade, item.produto_id, item.quantidade),
            )
            if cursor.rowcount != 1:
                raise ValueError(f"Estoque insuficiente para o produto '{snap_nome}'.")

            cursor.execute(
                """
                INSERT INTO estoques (produto_id, quantidade, estoque_minimo)
                VALUES (?, ?, 3)
                ON CONFLICT(produto_id) DO UPDATE SET
                    quantidade = excluded.quantidade
                """,
                (item.produto_id, saldo_posterior),
            )

            cursor.execute(
                """
                INSERT INTO movimentacoes_estoque (
                    produto_id, produto_nome, tipo, quantidade,
                    saldo_anterior, saldo_posterior, motivo, responsavel, data_hora
                ) VALUES (?, ?, 'saida', ?, ?, ?, ?, ?, ?)
                """,
                (
                    item.produto_id,
                    snap_nome,
                    int(item.quantidade),
                    saldo_anterior,
                    saldo_posterior,
                    f"Pedido #{pedido.id_pedido}",
                    pedido.cliente_nome or "Cliente",
                    agora,
                ),
            )

    return pedido


def _carregar_pedido_com_cursor(cursor, row):
    chaves = row.keys()
    pedido = Pedido(
        id_pedido=row["id_pedido"],
        numero=row["numero"],
        data=row["data"],
        valorTotal=float(row["valor_total"]),
        status=row["status"],
        cliente_id=row["cliente_id"],
        cliente_nome=row["cliente_nome"] or "",
        cliente_email=row["cliente_email"] or "",
        cliente_telefone=row["cliente_telefone"] if "cliente_telefone" in chaves and row["cliente_telefone"] else "",
        endereco_entrega=row["endereco_entrega"] if "endereco_entrega" in chaves and row["endereco_entrega"] else "",
        codigo_rastreio=row["codigo_rastreio"] if "codigo_rastreio" in chaves and row["codigo_rastreio"] else "",
        atualizado_em=row["atualizado_em"] if "atualizado_em" in chaves and row["atualizado_em"] else "",
    )

    cursor.execute("SELECT * FROM itens_pedido WHERE pedido_id = ?", (pedido.id_pedido,))
    itens_rows = cursor.fetchall()
    for linha_item in itens_rows:
        cursor.execute(
            """
            SELECT p.*, COALESCE(e.estoque_minimo, 3) AS estoque_minimo
            FROM produtos p
            LEFT JOIN estoques e ON e.produto_id = p.id_produto
            WHERE p.id_produto = ?
            """,
            (linha_item["produto_id"],),
        )
        prod_row = cursor.fetchone()
        produto = instanciar_produto_da_linha(prod_row) if prod_row else None

        chaves_item = linha_item.keys()
        snap_nome = (linha_item["produto_nome"] if "produto_nome" in chaves_item else "") or (
            produto.nome if produto else ""
        )
        snap_jogo = (linha_item["jogo_nome"] if "jogo_nome" in chaves_item else "") or (
            produto.jogo_nome if produto else ""
        )
        snap_img = (linha_item["imagem_url"] if "imagem_url" in chaves_item else "") or (
            produto.imagem_url if produto else ""
        )

        item = ItemPedido(
            id_item=linha_item["id_item"],
            pedido_id=linha_item["pedido_id"],
            produto_id=linha_item["produto_id"],
            produto=produto,
            quantidade=linha_item["quantidade"],
            precoUnitario=linha_item["preco_unitario"],
            produto_nome=snap_nome,
            jogo_nome=snap_jogo,
            imagem_url=snap_img,
        )
        pedido.itens.append(item)

    return pedido


def obter_pedido_por_id(id_pedido):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pedidos WHERE id_pedido = ?", (id_pedido,))
        row = cursor.fetchone()
        if not row:
            return None
        return _carregar_pedido_com_cursor(cursor, row)


def listar_pedidos(cliente_id=None):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        if cliente_id is not None:
            cursor.execute("SELECT * FROM pedidos WHERE cliente_id = ? ORDER BY id_pedido DESC", (cliente_id,))
        else:
            cursor.execute("SELECT * FROM pedidos ORDER BY id_pedido DESC")
        rows = cursor.fetchall()
        return [_carregar_pedido_com_cursor(cursor, row) for row in rows]


def atualizar_status_pedido(
    id_pedido: int,
    novo_status: str,
    codigo_rastreio: str | None = None,
    responsavel: str = "Sistema",
):
    agora = datetime.now().strftime("%d/%m/%Y %H:%M")
    codigo_limpo = codigo_rastreio.strip() if codigo_rastreio is not None else None

    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM pedidos WHERE id_pedido = ?", (id_pedido,))
        row = cursor.fetchone()
        if not row:
            return None

        if novo_status == "Cancelado":
            cursor.execute(
                """
                UPDATE pedidos
                SET status = 'Cancelado',
                    codigo_rastreio = COALESCE(?, codigo_rastreio),
                    atualizado_em = ?
                WHERE id_pedido = ? AND status != 'Cancelado'
                """,
                (codigo_limpo, agora, id_pedido),
            )
            if cursor.rowcount == 1:
                cursor.execute("SELECT * FROM itens_pedido WHERE pedido_id = ?", (id_pedido,))
                itens_rows = cursor.fetchall()
                for item_row in itens_rows:
                    prod_id = item_row["produto_id"]
                    qtd_estorno = int(item_row["quantidade"])
                    if qtd_estorno <= 0:
                        continue
                    cursor.execute(
                        "SELECT quantidade, nome FROM produtos WHERE id_produto = ?",
                        (prod_id,),
                    )
                    prod_row = cursor.fetchone()
                    if not prod_row:
                        continue

                    saldo_anterior = int(prod_row["quantidade"])
                    saldo_posterior = saldo_anterior + qtd_estorno
                    chaves_item = item_row.keys()
                    nome_prod = prod_row["nome"] or (
                        item_row["produto_nome"] if "produto_nome" in chaves_item else f"Produto #{prod_id}"
                    )

                    cursor.execute(
                        "UPDATE produtos SET quantidade = quantidade + ? WHERE id_produto = ?",
                        (qtd_estorno, prod_id),
                    )
                    cursor.execute(
                        """
                        INSERT INTO estoques (produto_id, quantidade, estoque_minimo)
                        VALUES (?, ?, 3)
                        ON CONFLICT(produto_id) DO UPDATE SET
                            quantidade = estoques.quantidade + ?
                        """,
                        (prod_id, saldo_posterior, qtd_estorno),
                    )
                    cursor.execute(
                        """
                        INSERT INTO movimentacoes_estoque (
                            produto_id, produto_nome, tipo, quantidade,
                            saldo_anterior, saldo_posterior, motivo, responsavel, data_hora
                        ) VALUES (?, ?, 'entrada', ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            prod_id,
                            nome_prod,
                            qtd_estorno,
                            saldo_anterior,
                            saldo_posterior,
                            f"Estorno - Cancelamento Pedido #{id_pedido}",
                            responsavel or "Sistema",
                            agora,
                        ),
                    )
            else:
                cursor.execute(
                    """
                    UPDATE pedidos
                    SET codigo_rastreio = COALESCE(?, codigo_rastreio),
                        atualizado_em = ?
                    WHERE id_pedido = ?
                    """,
                    (codigo_limpo, agora, id_pedido),
                )
        else:
            cursor.execute(
                """
                UPDATE pedidos
                SET status = ?,
                    codigo_rastreio = COALESCE(?, codigo_rastreio),
                    atualizado_em = ?
                WHERE id_pedido = ?
                """,
                (novo_status, codigo_limpo, agora, id_pedido),
            )

        cursor.execute("SELECT * FROM pedidos WHERE id_pedido = ?", (id_pedido,))
        atualizado_row = cursor.fetchone()
        if not atualizado_row:
            return None
        return _carregar_pedido_com_cursor(cursor, atualizado_row)
