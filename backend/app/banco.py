import sqlite3
from pathlib import Path
from contextlib import contextmanager
from app.modelos.usuario import Usuario, Cliente, Funcionario, Administrador
from app.modelos.produto import Produto
from app.modelos.estoque import Estoque
from app.modelos.pedido import Pedido, ItemPedido
from app.modelos.torneio import Torneio, Inscricao, Partida

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
            CREATE TABLE IF NOT EXISTS torneios (
                id_torneio INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                jogo TEXT NOT NULL DEFAULT 'outros',
                jogo_nome TEXT DEFAULT 'Geral',
                data TEXT NOT NULL,
                horario TEXT NOT NULL,
                limite_participantes INTEGER NOT NULL DEFAULT 16,
                vagas_ocupadas INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'aberto',
                formato TEXT DEFAULT 'Suíço',
                local TEXT DEFAULT 'Noble Deck Arena',
                taxa_inscricao REAL DEFAULT 0.0,
                premiacao TEXT DEFAULT '',
                is_premium INTEGER DEFAULT 0
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inscricoes (
                id_inscricao INTEGER PRIMARY KEY AUTOINCREMENT,
                torneio_id INTEGER NOT NULL,
                cliente_id INTEGER,
                cliente_nome TEXT NOT NULL,
                data_inscricao TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'confirmada',
                FOREIGN KEY (torneio_id) REFERENCES torneios (id_torneio) ON DELETE CASCADE,
                FOREIGN KEY (cliente_id) REFERENCES usuarios (id_usuario)
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS partidas (
                id_partida INTEGER PRIMARY KEY AUTOINCREMENT,
                torneio_id INTEGER NOT NULL,
                jogador1 TEXT NOT NULL,
                jogador2 TEXT NOT NULL,
                resultado TEXT NOT NULL DEFAULT 'Pendente',
                FOREIGN KEY (torneio_id) REFERENCES torneios (id_torneio) ON DELETE CASCADE
            );
        """)


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

def instanciar_produto_da_linha(row):
    return Produto(
        id_produto=row["id_produto"],
        nome=row["nome"],
        descricao=row["descricao"] or "",
        categoria=row["categoria"] or "Geral",
        jogo=row["jogo"] or "outros",
        preco=float(row["preco"]),
        quantidade=int(row["quantidade"]),
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
                produto.preco,
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
                produto.preco,
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
        cursor.execute(
            "UPDATE estoques SET quantidade = ? WHERE produto_id = ?",
            (produto.quantidade, produto.id_produto),
        )
    return produto


def obter_produto_por_id(id_produto):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM produtos WHERE id_produto = ?", (id_produto,))
        row = cursor.fetchone()
        if row:
            return instanciar_produto_da_linha(row)
    return None


def listar_produtos(jogo=None, categoria=None, apenas_ativos=True):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        sql = "SELECT * FROM produtos WHERE 1=1"
        params = []
        if apenas_ativos:
            sql += " AND ativo = 1"
        if jogo and jogo != "all":
            sql += " AND jogo = ?"
            params.append(jogo)
        if categoria:
            sql += " AND categoria = ?"
            params.append(categoria)
        sql += " ORDER BY id_produto ASC"

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
            resultado.append(instanciar_estoque_da_linha(linha, produto))
        return resultado

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

def instanciar_torneio_da_linha(row):
    return Torneio(
        id_torneio=row["id_torneio"],
        nome=row["nome"],
        jogo=row["jogo"],
        jogo_nome=row["jogo_nome"] or "Geral",
        data=row["data"],
        horario=row["horario"],
        limiteParticipantes=row["limite_participantes"],
        vagas_ocupadas=row["vagas_ocupadas"],
        status=row["status"],
        formato=row["formato"] or "Suíço",
        local=row["local"] or "Noble Deck Arena",
        taxa_inscricao=float(row["taxa_inscricao"] or 0.0),
        premiacao=row["premiacao"] or "",
        is_premium=bool(row["is_premium"]),
    )


def salvar_torneio(torneio):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO torneios (
                nome, jogo, jogo_nome, data, horario, limite_participantes,
                vagas_ocupadas, status, formato, local, taxa_inscricao, premiacao, is_premium
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                torneio.nome,
                torneio.jogo,
                torneio.jogo_nome,
                torneio.data,
                torneio.horario,
                torneio.limiteParticipantes,
                torneio.vagas_ocupadas,
                torneio.status,
                torneio.formato,
                torneio.local,
                torneio.taxa_inscricao,
                torneio.premiacao,
                1 if torneio.is_premium else 0,
            ),
        )
        torneio.id_torneio = cursor.lastrowid
    return torneio


def obter_torneio_por_id(id_torneio):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM torneios WHERE id_torneio = ?", (id_torneio,))
        row = cursor.fetchone()
        if not row:
            return None

        torneio = instanciar_torneio_da_linha(row)

        cursor.execute("SELECT * FROM inscricoes WHERE torneio_id = ?", (id_torneio,))
        for i_row in cursor.fetchall():
            inscricao = Inscricao(
                id_inscricao=i_row["id_inscricao"],
                torneio_id=i_row["torneio_id"],
                cliente_id=i_row["cliente_id"],
                cliente_nome=i_row["cliente_nome"],
                data_inscricao=i_row["data_inscricao"],
                status=i_row["status"],
            )
            torneio.inscricoes.append(inscricao)

        cursor.execute("SELECT * FROM partidas WHERE torneio_id = ?", (id_torneio,))
        for p_row in cursor.fetchall():
            partida = Partida(
                id_partida=p_row["id_partida"],
                torneio_id=p_row["torneio_id"],
                jogador1=p_row["jogador1"],
                jogador2=p_row["jogador2"],
                resultado=p_row["resultado"],
            )
            torneio.partidas.append(partida)

        return torneio


def listar_torneios():
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id_torneio FROM torneios ORDER BY id_torneio ASC")
        ids = [row["id_torneio"] for row in cursor.fetchall()]
    return [obter_torneio_por_id(i) for i in ids if i is not None]


def salvar_inscricao(torneio, inscricao):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO inscricoes (torneio_id, cliente_id, cliente_nome, data_inscricao, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                inscricao.torneio_id,
                inscricao.cliente_id,
                inscricao.cliente_nome,
                inscricao.dataInscricao,
                inscricao.status,
            ),
        )
        inscricao.id_inscricao = cursor.lastrowid
        cursor.execute(
            "UPDATE torneios SET vagas_ocupadas = ?, status = ? WHERE id_torneio = ?",
            (torneio.vagas_ocupadas, torneio.status, torneio.id_torneio),
        )
    return inscricao


def salvar_partida(partida):
    with obter_conexao() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO partidas (torneio_id, jogador1, jogador2, resultado)
            VALUES (?, ?, ?, ?)
            """,
            (partida.torneio_id, partida.jogador1, partida.jogador2, partida.resultado),
        )
        partida.id_partida = cursor.lastrowid
    return partida
