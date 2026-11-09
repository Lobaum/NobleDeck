import type { ActiveGameApi, ExternalCard } from '../types';

const USD_TO_BRL = 5.65;
const EUR_TO_BRL = 6.15;

export function toWebGLSafeImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  if (!import.meta.env.DEV) return rawUrl;

  if (rawUrl.startsWith('https://cards.scryfall.io/')) {
    return rawUrl.replace('https://cards.scryfall.io/', '/img-scryfall/');
  }
  if (rawUrl.startsWith('https://assets.tcgdex.net/')) {
    return rawUrl.replace('https://assets.tcgdex.net/', '/img-tcgdex/');
  }
  if (rawUrl.startsWith('https://images.ygoprodeck.com/')) {
    return rawUrl.replace('https://images.ygoprodeck.com/', '/img-ygo/');
  }
  if (rawUrl.startsWith('https://optcgapi.com/')) {
    return rawUrl.replace('https://optcgapi.com/', '/img-optcg/');
  }
  return rawUrl;
}

async function fetchWithFallback(devPath: string, directUrl: string, init?: RequestInit): Promise<any> {
  if (import.meta.env.DEV) {
    try {
      const res = await fetch(devPath, init);
      if (res.ok) return await res.json();
    } catch {
      // Tenta URL direta em seguida
    }
  }
  const directRes = await fetch(directUrl, init);
  if (!directRes.ok) {
    throw new Error(`HTTP ${directRes.status}`);
  }
  return await directRes.json();
}

function usdToBrl(usd: number | null | undefined, fallbackUsd = 2.5): { brl: number; usd: number | null } {
  const numeric = Number(usd);
  if (Number.isFinite(numeric) && numeric > 0) {
    return {
      brl: Number((numeric * USD_TO_BRL).toFixed(2)),
      usd: Number(numeric.toFixed(2)),
    };
  }
  return {
    brl: Number((fallbackUsd * USD_TO_BRL).toFixed(2)),
    usd: null,
  };
}

// ============================================================================
// 1. MAGIC: THE GATHERING — Scryfall API
// ============================================================================
export async function searchMagicScryfall(query: string, page = 1): Promise<ExternalCard[]> {
  const cleanQ = query.trim()
    ? `${query.trim()} game:paper`
    : 'game:paper is:booster (rarity:mythic OR rarity:rare) usd>=8';
  const params = `q=${encodeURIComponent(cleanQ)}&unique=cards&order=usd&dir=desc&page=${page}`;

  const data = await fetchWithFallback(
    `/ext-scryfall/cards/search?${params}`,
    `https://api.scryfall.com/cards/search?${params}`,
    { headers: { Accept: 'application/json' } }
  );

  const list: any[] = Array.isArray(data?.data) ? data.data : [];
  return list
    .map((c): ExternalCard | null => {
      const img =
        c.image_uris?.normal ||
        c.image_uris?.large ||
        c.card_faces?.[0]?.image_uris?.normal ||
        '';
      if (!img) return null;

      const rawUsd = parseFloat(c.prices?.usd || c.prices?.usd_foil || c.prices?.usd_etched || '');
      const { brl, usd } = usdToBrl(rawUsd, c.rarity === 'mythic' ? 12 : 3.5);
      const year = c.released_at ? Number(String(c.released_at).slice(0, 4)) : undefined;

      return {
        uid: `magic:${c.id}`,
        externalId: String(c.id),
        nome: String(c.printed_name || c.name),
        jogo: 'magic',
        jogoNome: 'Magic: The Gathering',
        colecao: String(c.set_name || 'Expansion'),
        codigoCarta: `${String(c.set || '').toUpperCase()}-${c.collector_number || ''}`,
        raridade: String(c.rarity || 'rare').toUpperCase(),
        descricao: String(c.oracle_text || c.card_faces?.[0]?.oracle_text || c.type_line || ''),
        imagemUrl: img,
        glImageUrl: toWebGLSafeImageUrl(img),
        precoMercadoBrl: brl,
        precoOriginalUsd: usd,
        fonteApi: 'Scryfall',
        ano: year,
        atributos: c.type_line ? `${c.type_line}${c.mana_cost ? ` • ${c.mana_cost}` : ''}` : undefined,
      };
    })
    .filter((item): item is ExternalCard => item !== null)
    .slice(0, 24);
}

// ============================================================================
// 2. POKÉMON TCG — TCGdex API v2
// ============================================================================
export async function searchPokemonTcgdex(query: string, page = 1): Promise<ExternalCard[]> {
  let summaries: any[] = [];

  if (query.trim()) {
    const params = `name=${encodeURIComponent(query.trim())}&pagination:page=${page}&pagination:itemsPerPage=28`;
    const list = await fetchWithFallback(
      `/ext-tcgdex/v2/en/cards?${params}`,
      `https://api.tcgdex.net/v2/en/cards?${params}`
    );
    summaries = Array.isArray(list) ? list : [];
  } else {
    // Sem termo digitado: busca cartas reais da coleção Scarlet & Violet 151 (sv03.5) / Crown Zenith (swsh12.5)
    const setCode = page % 2 === 1 ? 'sv03.5' : 'swsh12.5';
    const setRes = await fetchWithFallback(
      `/ext-tcgdex/v2/en/sets/${setCode}`,
      `https://api.tcgdex.net/v2/en/sets/${setCode}`
    );
    const allCards: any[] = Array.isArray(setRes?.cards) ? setRes.cards : [];
    // Prioriza o final da coleção (Illustration Rare / Ultra Rare / Hyper Rare)
    summaries = [...allCards].reverse().slice(0, 24);
  }

  const withImages = summaries.filter((c) => Boolean(c?.image)).slice(0, 20);

  const hydrated = await Promise.all(
    withImages.map(async (item): Promise<ExternalCard | null> => {
      const fullImg = `${item.image}/high.webp`;
      try {
        const detail = await fetchWithFallback(
          `/ext-tcgdex/v2/en/cards/${encodeURIComponent(item.id)}`,
          `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(item.id)}`
        );

        const tcgUsd =
          detail?.pricing?.tcgplayer?.holofoil?.marketPrice ??
          detail?.pricing?.tcgplayer?.normal?.marketPrice ??
          detail?.pricing?.tcgplayer?.reverseHolofoil?.marketPrice ??
          null;
        const cmEur =
          detail?.pricing?.cardmarket?.avg ??
          detail?.pricing?.cardmarket?.trend ??
          null;

        let brl = 19.9;
        let usd: number | null = null;
        if (tcgUsd && Number(tcgUsd) > 0) {
          usd = Number(Number(tcgUsd).toFixed(2));
          brl = Number((usd * USD_TO_BRL).toFixed(2));
        } else if (cmEur && Number(cmEur) > 0) {
          brl = Number((Number(cmEur) * EUR_TO_BRL).toFixed(2));
        }

        const attacksText = Array.isArray(detail?.attacks)
          ? detail.attacks.map((a: any) => `${a.name}${a.damage ? ` (${a.damage})` : ''}`).join(' • ')
          : '';

        return {
          uid: `pokemon:${item.id}`,
          externalId: String(item.id),
          nome: String(detail?.name || item.name),
          jogo: 'pokemon',
          jogoNome: 'Pokémon TCG',
          colecao: String(detail?.set?.name || 'Pokémon Expansion'),
          codigoCarta: String(item.id).toUpperCase(),
          raridade: String(detail?.rarity || 'Holo Rare'),
          descricao:
            detail?.description ||
            attacksText ||
            `Ilustração oficial por ${detail?.illustrator || 'The Pokémon Company'}.`,
          imagemUrl: fullImg,
          glImageUrl: toWebGLSafeImageUrl(fullImg),
          precoMercadoBrl: brl,
          precoOriginalUsd: usd,
          fonteApi: 'TCGdex',
          atributos: [
            detail?.hp ? `HP ${detail.hp}` : null,
            Array.isArray(detail?.types) ? detail.types.join('/') : null,
            detail?.stage || detail?.category,
          ]
            .filter(Boolean)
            .join(' • '),
        };
      } catch {
        return {
          uid: `pokemon:${item.id}`,
          externalId: String(item.id),
          nome: String(item.name),
          jogo: 'pokemon',
          jogoNome: 'Pokémon TCG',
          colecao: 'Pokémon TCG Official',
          codigoCarta: String(item.id).toUpperCase(),
          raridade: 'Rare',
          descricao: 'Carta oficial obtida via TCGdex API.',
          imagemUrl: fullImg,
          glImageUrl: toWebGLSafeImageUrl(fullImg),
          precoMercadoBrl: 24.9,
          precoOriginalUsd: null,
          fonteApi: 'TCGdex',
        };
      }
    })
  );

  return hydrated.filter((c): c is ExternalCard => c !== null);
}

// ============================================================================
// 3. YU-GI-OH! — YGOPRODeck API v7
// ============================================================================
export async function searchYugiohProdeck(query: string, page = 1): Promise<ExternalCard[]> {
  const offset = (Math.max(1, page) - 1) * 24;
  const qs = query.trim()
    ? `fname=${encodeURIComponent(query.trim())}&num=24&offset=${offset}`
    : `staple=yes&num=24&offset=${offset}`;

  const data = await fetchWithFallback(
    `/ext-ygo/api/v7/cardinfo.php?${qs}`,
    `https://db.ygoprodeck.com/api/v7/cardinfo.php?${qs}`
  );

  const list: any[] = Array.isArray(data?.data) ? data.data : [];
  return list
    .map((c): ExternalCard | null => {
      const img = c.card_images?.[0]?.image_url || '';
      if (!img) return null;

      const firstSet = c.card_sets?.[0];
      const prices = c.card_prices?.[0];
      const rawUsd = parseFloat(
        prices?.tcgplayer_price || prices?.ebay_price || prices?.cardmarket_price || ''
      );
      const { brl, usd } = usdToBrl(rawUsd, 3.0);

      return {
        uid: `yugioh:${c.id}`,
        externalId: String(c.id),
        nome: String(c.name),
        jogo: 'yugioh',
        jogoNome: 'Yu-Gi-Oh!',
        colecao: String(firstSet?.set_name || c.frameType || 'Official Card Game'),
        codigoCarta: String(firstSet?.set_code || `YGO-${c.id}`),
        raridade: String(firstSet?.set_rarity || c.humanReadableCardType || 'Ultra Rare'),
        descricao: String(c.desc || ''),
        imagemUrl: img,
        glImageUrl: toWebGLSafeImageUrl(img),
        precoMercadoBrl: brl,
        precoOriginalUsd: usd,
        fonteApi: 'YGOPRODeck',
        atributos: [
          c.humanReadableCardType || c.type,
          c.race,
          c.atk !== undefined ? `ATK ${c.atk}` : null,
          c.def !== undefined ? `DEF ${c.def}` : null,
        ]
          .filter(Boolean)
          .join(' • '),
      };
    })
    .filter((item): item is ExternalCard => item !== null);
}

// ============================================================================
// 4. ONE PIECE CARD GAME — OPTCG API
// ============================================================================
export async function searchOnePieceOptcg(query: string): Promise<ExternalCard[]> {
  const endpoint = query.trim()
    ? `/api/sets/filtered/?card_name=${encodeURIComponent(query.trim())}`
    : `/api/sets/OP-05/`;

  const raw = await fetchWithFallback(
    `/ext-optcg${endpoint}`,
    `https://optcgapi.com${endpoint}`
  );

  const arr: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];

  // Sem busca, prioriza cartas de maior valor de mercado do set
  const sorted = query.trim()
    ? arr
    : [...arr].sort(
        (a, b) => (parseFloat(b?.market_price) || 0) - (parseFloat(a?.market_price) || 0)
      );

  return sorted
    .slice(0, 24)
    .map((c, idx): ExternalCard | null => {
      let img = String(c.card_image || c.image_url || '');
      if (!img) return null;
      if (img.startsWith('/')) {
        img = `https://optcgapi.com${img}`;
      }

      const cardId = String(c.card_set_id || c.card_id || `OP-${idx}`);
      const rawUsd = parseFloat(c.market_price || c.inventory_price || '');
      const { brl, usd } = usdToBrl(rawUsd, 4.0);

      return {
        uid: `onepiece:${cardId}-${c.card_image_id || idx}`,
        externalId: cardId,
        nome: String(c.card_name || c.name || cardId),
        jogo: 'onepiece',
        jogoNome: 'One Piece Card Game',
        colecao: String(c.set_name || 'One Piece Expansion'),
        codigoCarta: cardId,
        raridade: String(c.rarity || 'Rare'),
        descricao: String(c.card_text || `${c.card_type || 'Card'} • ${c.card_color || ''}`),
        imagemUrl: img,
        glImageUrl: toWebGLSafeImageUrl(img),
        precoMercadoBrl: brl,
        precoOriginalUsd: usd,
        fonteApi: 'OPTCG',
        atributos: [
          c.card_type,
          c.card_color,
          c.card_power ? `Power ${c.card_power}` : null,
          c.card_cost ? `Cost ${c.card_cost}` : null,
        ]
          .filter(Boolean)
          .join(' • '),
      };
    })
    .filter((item): item is ExternalCard => item !== null);
}

// ============================================================================
// BUSCA UNIFICADA MULTI-API
// ============================================================================
export async function searchLiveCards(
  game: ActiveGameApi | 'all',
  query: string,
  page = 1
): Promise<{ cards: ExternalCard[]; errors: string[] }> {
  if (game !== 'all') {
    try {
      if (game === 'magic') return { cards: await searchMagicScryfall(query, page), errors: [] };
      if (game === 'pokemon') return { cards: await searchPokemonTcgdex(query, page), errors: [] };
      if (game === 'yugioh') return { cards: await searchYugiohProdeck(query, page), errors: [] };
      if (game === 'onepiece') return { cards: await searchOnePieceOptcg(query), errors: [] };
    } catch (err: any) {
      return { cards: [], errors: [`${game}: ${err?.message || 'falha de rede'}`] };
    }
  }

  // Modo 'all': consulta as 4 APIs públicas em paralelo e intercala os resultados reais
  const tasks: [ActiveGameApi, Promise<ExternalCard[]>][] = [
    ['pokemon', searchPokemonTcgdex(query, page)],
    ['magic', searchMagicScryfall(query, page)],
    ['yugioh', searchYugiohProdeck(query, page)],
    ['onepiece', searchOnePieceOptcg(query)],
  ];

  const settled = await Promise.allSettled(tasks.map(([, p]) => p));
  const buckets: ExternalCard[][] = [];
  const errors: string[] = [];

  settled.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      buckets.push(res.value.slice(0, 8));
    } else {
      errors.push(`${tasks[i][0]}: indisponível no momento`);
    }
  });

  const interleaved: ExternalCard[] = [];
  const maxLen = Math.max(0, ...buckets.map((b) => b.length));
  for (let idx = 0; idx < maxLen; idx++) {
    for (const b of buckets) {
      if (b[idx]) interleaved.push(b[idx]);
    }
  }

  return { cards: interleaved, errors };
}

export async function drawLiveBoosterPack(game: ActiveGameApi): Promise<ExternalCard[]> {
  let pool: ExternalCard[] = [];
  if (game === 'magic') {
    pool = await searchMagicScryfall('is:booster year>=2023', Math.floor(1 + Math.random() * 3));
  } else if (game === 'pokemon') {
    pool = await searchPokemonTcgdex('', Math.floor(1 + Math.random() * 2));
  } else if (game === 'yugioh') {
    pool = await searchYugiohProdeck('', Math.floor(1 + Math.random() * 4));
  } else {
    pool = await searchOnePieceOptcg('');
  }

  if (pool.length <= 5) return pool;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

