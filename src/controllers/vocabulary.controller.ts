import { Request, Response } from 'express';
import { getUserId } from '../utils/auth-request';
import { parsePagination } from '../utils/pagination';
import { Vocabulary } from '../models/Vocabulary';
import { UserVocabulary } from '../models/UserVocabulary';
import { LearningLog } from '../models/LearningLog';
import { vocabularyService } from '../services/vocabulary.service';
import { calculateSM2 } from '../services/srs.service';
import { calculateXP } from '../services/xp.service';
import { updateStreak } from '../services/streak.service';
import { withAIStream } from '../utils/ai-stream-response';

export async function generateVocabulary(req: Request, res: Response): Promise<void> {
  const { word, topic } = req.body;
  if (!word) {
    res.status(400).json({ error: 'Word is required' });
    return;
  }

  await withAIStream(
    res,
    201,
    async (emitChunk) => {
      const vocabulary = await vocabularyService.generateSingle(getUserId(req), word, topic, emitChunk);
      await updateStreak(getUserId(req));

      await LearningLog.create({
        userId: getUserId(req),
        date: new Date(),
        type: 'VOCABULARY',
        durationMinutes: 2,
        xpEarned: calculateXP('NEW_WORD'),
        details: { vocabularyIds: [vocabulary._id.toString()] },
      });

      return vocabulary;
    },
    (vocabulary) => ({ vocabulary }),
  );
}

export async function generateBatchVocabularies(req: Request, res: Response): Promise<void> {
  const { words, topic } = req.body;
  if (!Array.isArray(words) || words.length === 0) {
    res.status(400).json({ error: 'Words array is required' });
    return;
  }
  if (words.length > 20) {
    res.status(400).json({ error: 'Maximum 20 words per batch' });
    return;
  }

  await withAIStream(
    res,
    201,
    async (emitChunk) => {
      const vocabularies = await vocabularyService.generateBatch(getUserId(req), words, topic, emitChunk);
      await updateStreak(getUserId(req));

      const xp = vocabularies.length * calculateXP('NEW_WORD');
      await LearningLog.create({
        userId: getUserId(req),
        date: new Date(),
        type: 'VOCABULARY',
        durationMinutes: Math.ceil(vocabularies.length * 2),
        xpEarned: xp,
        details: { vocabularyIds: vocabularies.map((v: any) => v._id.toString()) },
      });

      return vocabularies;
    },
    (vocabularies) => ({ vocabularies }),
  );
}

export async function getMyVocabularies(req: Request, res: Response): Promise<void> {
  try {
    const { status, level, topic, ...pagination } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(pagination as any);

    const userVocabIds = await UserVocabulary.find({ userId: getUserId(req) }, { vocabularyId: 1 });
    const vocabIds = userVocabIds.map(uv => uv.vocabularyId);

    const vocabFilter: any = { _id: { $in: vocabIds } };
    if (level) vocabFilter.level = level;
    if (topic) vocabFilter.topic = topic;

    const total = await Vocabulary.countDocuments(vocabFilter);
    const vocabularies = await Vocabulary.find(vocabFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      vocabularies,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getReviewToday(req: Request, res: Response): Promise<void> {
  try {
    const today = new Date();
    const userVocabs = await UserVocabulary.find({
      userId: getUserId(req),
      nextReview: { $lte: today },
      status: { $ne: 'MASTERED' },
    })
      .populate('vocabularyId')
      .sort({ nextReview: 1 });

    res.json({ count: userVocabs.length, items: userVocabs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function reviewVocabulary(req: Request, res: Response): Promise<void> {
  try {
    const { vocabularyId, quality } = req.body;
    if (!vocabularyId || quality === undefined) {
      res.status(400).json({ error: 'vocabularyId and quality are required' });
      return;
    }

    const userVocab = await UserVocabulary.findOne({ userId: getUserId(req), vocabularyId });
    if (!userVocab) {
      res.status(404).json({ error: 'User vocabulary not found' });
      return;
    }

    const result = calculateSM2(
      quality,
      userVocab.easeFactor,
      userVocab.interval,
      userVocab.repetitions
    );

    userVocab.easeFactor = result.easeFactor;
    userVocab.interval = result.interval;
    userVocab.repetitions = result.repetitions;
    userVocab.nextReview = result.nextReview;
    userVocab.lastReview = new Date();
    userVocab.status = result.status;
    await userVocab.save();

    const user = await updateStreak(getUserId(req));
    const xp = calculateXP('REVIEW_WORD', quality, user.streak);

    await LearningLog.create({
      userId: getUserId(req),
      date: new Date(),
      type: 'REVIEW',
      durationMinutes: 0.5,
      xpEarned: xp,
      details: { vocabularyIds: [vocabularyId] },
    });

    res.json({
      userVocabulary: userVocab,
      xpEarned: xp,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getVocabularyStats(req: Request, res: Response): Promise<void> {
  try {
    const userVocabs = await UserVocabulary.find({ userId: getUserId(req) });

    const stats = {
      total: userVocabs.length,
      newCount: userVocabs.filter(uv => uv.status === 'NEW').length,
      learning: userVocabs.filter(uv => uv.status === 'LEARNING').length,
      review: userVocabs.filter(uv => uv.status === 'REVIEW').length,
      mastered: userVocabs.filter(uv => uv.status === 'MASTERED').length,
      dueToday: userVocabs.filter(uv => uv.nextReview <= new Date() && uv.status !== 'MASTERED').length,
    };

    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteVocabulary(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await UserVocabulary.deleteOne({ userId: getUserId(req), vocabularyId: id });
    res.json({ message: 'Vocabulary removed from collection' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
