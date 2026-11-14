import base64
import binascii
import hashlib
import hmac
import json
import secrets
import time
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SCRYPT_N = 16384
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_DKLEN = 32
SCRYPT_MAXMEM = 64 * 1024 * 1024
TOKEN_EXPIRACAO_SEGUNDOS = 7 * 24 * 60 * 60

_bearer_scheme = HTTPBearer(auto_error=False)


def gerar_hash_senha(senha: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        senha.encode("utf-8"),
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        maxmem=SCRYPT_MAXMEM,
        dklen=SCRYPT_DKLEN,
    )
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${digest.hex()}"


def precisa_rehash_senha(armazenada: str) -> bool:
    return not (isinstance(armazenada, str) and armazenada.startswith("scrypt$"))


def verificar_senha(senha_plana: str, armazenada: str) -> bool:
    if not isinstance(senha_plana, str) or not isinstance(armazenada, str) or not armazenada:
        return False

    if armazenada.startswith("scrypt$"):
        partes = armazenada.split("$")
        try:
            if len(partes) == 6:
                _, n_str, r_str, p_str, salt_hex, digest_hex = partes
                n = int(n_str)
                r = int(r_str)
                p = int(p_str)
            elif len(partes) == 3:
                _, salt_hex, digest_hex = partes
                n, r, p = SCRYPT_N, SCRYPT_R, SCRYPT_P
            else:
                return False

            if n <= 1 or r <= 0 or p <= 0:
                return False

            salt = bytes.fromhex(salt_hex)
            digest_esperado = bytes.fromhex(digest_hex)
            if not salt or not digest_esperado:
                return False

            digest_calculado = hashlib.scrypt(
                senha_plana.encode("utf-8"),
                salt=salt,
                n=n,
                r=r,
                p=p,
                maxmem=SCRYPT_MAXMEM,
                dklen=len(digest_esperado),
            )
            return hmac.compare_digest(digest_calculado, digest_esperado)
        except (ValueError, TypeError):
            return False

    return hmac.compare_digest(senha_plana.encode("utf-8"), armazenada.encode("utf-8"))


def _b64url_encode(dados: bytes) -> str:
    return base64.urlsafe_b64encode(dados).rstrip(b"=").decode("ascii")


def _b64url_decode(texto: str) -> bytes:
    padding = "=" * (-len(texto) % 4)
    return base64.urlsafe_b64decode((texto + padding).encode("ascii"))


def criar_token_acesso(usuario, expira_em_segundos: int = TOKEN_EXPIRACAO_SEGUNDOS) -> str:
    from app.banco import obter_segredo_auth

    if getattr(usuario, "id_usuario", None) is None:
        raise ValueError("Usuário sem id_usuario não pode gerar token de acesso.")

    agora = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(usuario.id_usuario),
        "email": getattr(usuario, "email", ""),
        "tipo": getattr(usuario, "tipoUsuario", "cliente"),
        "iat": agora,
        "exp": agora + int(expira_em_segundos),
    }

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    conteudo_assinado = f"{header_b64}.{payload_b64}"

    segredo = obter_segredo_auth().encode("utf-8")
    assinatura = hmac.new(segredo, conteudo_assinado.encode("ascii"), hashlib.sha256).digest()
    return f"{conteudo_assinado}.{_b64url_encode(assinatura)}"


def validar_token_acesso(token: str) -> dict | None:
    from app.banco import obter_segredo_auth

    if not isinstance(token, str) or not token.strip():
        return None

    partes = token.strip().split(".")
    if len(partes) != 3:
        return None

    header_b64, payload_b64, sig_b64 = partes
    try:
        header = json.loads(_b64url_decode(header_b64).decode("utf-8"))
        if not isinstance(header, dict) or header.get("alg") != "HS256":
            return None

        conteudo_assinado = f"{header_b64}.{payload_b64}"
        segredo = obter_segredo_auth().encode("utf-8")
        assinatura_esperada = _b64url_encode(
            hmac.new(segredo, conteudo_assinado.encode("ascii"), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(sig_b64, assinatura_esperada):
            return None

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if not isinstance(payload, dict):
            return None

        exp = payload.get("exp")
        if isinstance(exp, bool) or not isinstance(exp, (int, float)) or int(time.time()) >= exp:
            return None

        sub = payload.get("sub")
        int(sub)
        return payload
    except (ValueError, TypeError, binascii.Error, UnicodeDecodeError, json.JSONDecodeError):
        return None


def obter_usuario_atual(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer_scheme),
):
    from app.banco import obter_usuario_por_id

    headers_www = {"WWW-Authenticate": "Bearer"}
    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária.",
            headers=headers_www,
        )

    payload = validar_token_acesso(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada. Faça login novamente.",
            headers=headers_www,
        )

    try:
        id_usuario = int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acesso inválido.",
            headers=headers_www,
        )

    usuario = obter_usuario_por_id(id_usuario)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou sessão inválida.",
            headers=headers_www,
        )
    return usuario


def obter_usuario_opcional(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer_scheme),
):
    from app.banco import obter_usuario_por_id

    if credentials is None or credentials.scheme.lower() != "bearer" or not credentials.credentials:
        return None

    payload = validar_token_acesso(credentials.credentials)
    if not payload:
        return None

    try:
        id_usuario = int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        return None

    return obter_usuario_por_id(id_usuario)


def exigir_equipe(usuario_atual=Depends(obter_usuario_atual)):
    if getattr(usuario_atual, "tipoUsuario", "") not in ("funcionario", "administrador"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito à equipe da loja.",
        )
    return usuario_atual


def exigir_admin(usuario_atual=Depends(obter_usuario_atual)):
    if getattr(usuario_atual, "tipoUsuario", "") != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )
    return usuario_atual
