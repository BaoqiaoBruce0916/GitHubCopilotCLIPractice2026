import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories } from '../../db/schema';
import type { Database } from './db';
import { getAllCategories } from './categories';

describe('getAllCategories', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns an empty array when no categories exist', async () => {
        expect(await getAllCategories(db)).toEqual([]);
    });

    it('returns all categories ordered alphabetically by name', async () => {
        await db.insert(categories).values([
            { name: 'Strategy', description: 'cat' },
            { name: 'Adventure', description: 'cat' },
            { name: 'Puzzle', description: 'cat' },
        ]);

        const result = await getAllCategories(db);
        expect(result.map((c) => c.name)).toEqual(['Adventure', 'Puzzle', 'Strategy']);
        expect(result[0]).toEqual({ id: expect.any(Number), name: 'Adventure' });
    });
});
