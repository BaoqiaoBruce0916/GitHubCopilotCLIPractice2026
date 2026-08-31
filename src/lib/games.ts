/**
 * Data-access helpers for game listings and game details.
 * Queries the SQLite database and maps joined rows to application-facing types.
 */

import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

/** Optional criteria used to narrow a game listing. */
export interface GameFilters {
    categoryIds?: number[];
    publisherId?: number;
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/**
 * Retrieves every game ordered alphabetically by title.
 *
 * @param db - The database instance to query.
 * @returns A promise that resolves to all games with their category and publisher.
 */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Retrieves games matching the supplied category and publisher criteria.
 *
 * When multiple category IDs are provided, a game matches any one of them.
 * Active category and publisher criteria are combined with AND semantics.
 *
 * @param db - The database instance to query.
 * @param filters - Optional category and publisher criteria.
 * @returns A promise that resolves to matching games ordered alphabetically by title.
 */
export async function getFilteredGames(db: Database, filters: GameFilters): Promise<Game[]> {
    const conditions: SQL[] = [];

    if (filters.categoryIds !== undefined && filters.categoryIds.length > 0) {
        conditions.push(inArray(games.categoryId, filters.categoryIds));
    }

    if (filters.publisherId !== undefined) {
        conditions.push(eq(games.publisherId, filters.publisherId));
    }

    const rows = await baseGamesQuery(db)
        .where(and(...conditions))
        .orderBy(asc(games.title));

    return rows.map(mapGame);
}

/**
 * Retrieves every game ID ordered alphabetically by its corresponding title.
 *
 * @param db - The database instance to query.
 * @returns A promise that resolves to ordered game IDs.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * Retrieves a single game by its ID.
 *
 * @param db - The database instance to query.
 * @param id - The game ID to look up.
 * @returns A promise that resolves to the game or `null` when it does not exist.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
