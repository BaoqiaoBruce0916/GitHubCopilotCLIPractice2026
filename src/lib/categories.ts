/**
 * Data-access helpers for game categories.
 * Queries the SQLite database to fetch category data.
 */

import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { categories } from '../../db/schema';
import type { Category } from '../types/game';

/**
 * Retrieves all categories from the database, ordered alphabetically by name.
 *
 * @param db - The database instance to query.
 * @returns A promise that resolves to an array of categories sorted by name.
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
    const rows = await db
        .select({
            id: categories.id,
            name: categories.name,
        })
        .from(categories)
        .orderBy(asc(categories.name));

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
    }));
}
