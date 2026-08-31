import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getFilteredGames,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

/** Seeds two categories, two publishers, and one game for each combination. */
async function seedFilterableGames(db: Database): Promise<{
    strategyId: number;
    puzzleId: number;
    publisherOneId: number;
    publisherTwoId: number;
}> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'cat' })
        .returning({ id: categories.id });
    const [publisherOne] = await db
        .insert(publishers)
        .values({ name: 'Publisher One', description: 'pub' })
        .returning({ id: publishers.id });
    const [publisherTwo] = await db
        .insert(publishers)
        .values({ name: 'Publisher Two', description: 'pub' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Strategy One Game',
            description: 'd',
            starRating: 4.0,
            categoryId: strategy.id,
            publisherId: publisherOne.id,
        },
        {
            title: 'Strategy Two Game',
            description: 'd',
            starRating: 4.0,
            categoryId: strategy.id,
            publisherId: publisherTwo.id,
        },
        {
            title: 'Puzzle One Game',
            description: 'd',
            starRating: 4.0,
            categoryId: puzzle.id,
            publisherId: publisherOne.id,
        },
        {
            title: 'Puzzle Two Game',
            description: 'd',
            starRating: 4.0,
            categoryId: puzzle.id,
            publisherId: publisherTwo.id,
        },
    ]);

    return {
        strategyId: strategy.id,
        puzzleId: puzzle.id,
        publisherOneId: publisherOne.id,
        publisherTwoId: publisherTwo.id,
    };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});

describe('getFilteredGames', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title when no filters are active', async () => {
        await seedFilterableGames(db);
        const result = await getFilteredGames(db, {});
        expect(result.map((g) => g.title)).toEqual([
            'Puzzle One Game',
            'Puzzle Two Game',
            'Strategy One Game',
            'Strategy Two Game',
        ]);
    });

    it('filters by a single category', async () => {
        const { strategyId } = await seedFilterableGames(db);
        const result = await getFilteredGames(db, { categoryIds: [strategyId] });
        expect(result.map((g) => g.title)).toEqual(['Strategy One Game', 'Strategy Two Game']);
    });

    it('matches any of multiple selected categories', async () => {
        const { strategyId, puzzleId } = await seedFilterableGames(db);
        const result = await getFilteredGames(db, { categoryIds: [strategyId, puzzleId] });
        expect(result).toHaveLength(4);
    });

    it('filters by publisher', async () => {
        const { publisherOneId } = await seedFilterableGames(db);
        const result = await getFilteredGames(db, { publisherId: publisherOneId });
        expect(result.map((g) => g.title)).toEqual(['Puzzle One Game', 'Strategy One Game']);
    });

    it('combines category and publisher filters with AND semantics', async () => {
        const { strategyId, publisherTwoId } = await seedFilterableGames(db);
        const result = await getFilteredGames(db, {
            categoryIds: [strategyId],
            publisherId: publisherTwoId,
        });
        expect(result.map((g) => g.title)).toEqual(['Strategy Two Game']);
    });

    it('returns an empty array when no games match the filters', async () => {
        const { strategyId } = await seedFilterableGames(db);
        const [publisherWithNoGames] = await db
            .insert(publishers)
            .values({ name: 'Publisher Three', description: 'pub' })
            .returning({ id: publishers.id });

        const result = await getFilteredGames(db, {
            categoryIds: [strategyId],
            publisherId: publisherWithNoGames.id,
        });
        expect(result).toEqual([]);
    });

    it('treats an empty category list the same as no category filter', async () => {
        await seedFilterableGames(db);
        const result = await getFilteredGames(db, { categoryIds: [] });
        expect(result).toHaveLength(4);
    });
});
