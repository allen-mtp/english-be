import { aiService } from './ai.service';
import { Quiz, IQuizQuestion } from '../models/Quiz';

const QUIZ_SYSTEM_PROMPT = `You are an English proficiency test designer. Create a comprehensive quiz.
Return ONLY valid JSON (no markdown, no code block):
{
  "title": string,
  "level": string,
  "questions": [
    {
      "type": "multiple-choice" | "fill-blank" | "true-false",
      "category": "vocabulary" | "grammar" | "reading",
      "question": string,
      "options": [string, string, string, string] (for multiple-choice/true-false),
      "correctIndex": number (0-3, for multiple-choice),
      "correctAnswer": string (for fill-blank),
      "explanation": string (Vietnamese explanation),
      "difficulty": number (1-3)
    }
  ]
}

For placement tests: include questions across A1-C1 levels, starting easy and getting harder.
For practice quizzes: focus on the specified category and level.
For achievement tests: comprehensive review of the level.

Question distribution (for mixed quizzes):
- 40% vocabulary (word meaning, collocations, synonyms)
- 40% grammar (tenses, prepositions, sentence structure)
- 20% reading comprehension (short passage + questions)

Make questions clear and unambiguous. Vietnamese explanations.`;

export class QuizService {
  async generate(
    userId: string,
    type: 'placement' | 'practice' | 'achievement' = 'practice',
    category: 'mixed' | 'vocabulary' | 'grammar' | 'listening' | 'reading' = 'mixed',
    level: string = 'A1',
    questionCount: number = 10,
    topic?: string,
  ) {
    let levelInstruction = level;
    if (type === 'placement') {
      levelInstruction = 'mixed (A1 to C2, progressively harder)';
    }

    const userPrompt = `Create a ${type} quiz.
Category: ${category}
Level: ${levelInstruction}
Number of questions: ${questionCount}
${topic ? `Topic/Theme: "${topic}" — make all questions revolve around this theme.` : ''}

${type === 'placement' ? 'Start with A1 questions and progressively increase difficulty to C2.' : ''}
${type === 'achievement' ? `Focus on ${level} level topics and skills.` : ''}
${!topic && category !== 'mixed' ? `Focus only on ${category} questions.` : ''}`;

    const data = await aiService.generateJSON<any>(QUIZ_SYSTEM_PROMPT, userPrompt, 12288);

    const quiz = await Quiz.create({
      userId,
      title: data.title || `${type} quiz`,
      level,
      type,
      category,
      questions: data.questions || [],
      totalQuestions: (data.questions || []).length,
      completed: false,
      startedAt: new Date(),
      timeLimit: type === 'placement' ? 30 : 15,
    });

    return quiz;
  }

  async submit(userId: string, quizId: string, answers: Array<number | string>) {
    const quiz = await Quiz.findOne({ _id: quizId, userId });
    if (!quiz) throw new Error('Quiz not found');

    let correctCount = 0;
    const results = quiz.questions.map((question, index) => {
      const userAnswer = answers[index];
      let isCorrect = false;

      if (question.type === 'fill-blank') {
        isCorrect = (userAnswer as string)?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
      } else {
        isCorrect = userAnswer === question.correctIndex;
      }

      if (isCorrect) correctCount++;
      return {
        question: question.question,
        options: question.options,
        correctIndex: question.correctIndex,
        correctAnswer: question.correctAnswer,
        userAnswer,
        correct: isCorrect,
        explanation: question.explanation,
        category: question.category,
      };
    });

    const score = Math.round((correctCount / quiz.questions.length) * 100);
    quiz.score = score;
    quiz.correctCount = correctCount;
    quiz.completed = true;
    quiz.completedAt = new Date();
    await quiz.save();

    // Determine CEFR level for placement test
    let determinedLevel: string | undefined;
    if (quiz.type === 'placement') {
      determinedLevel = this.determineLevel(correctCount, quiz.questions.length);
    }

    return {
      score,
      correctCount,
      totalQuestions: quiz.questions.length,
      results,
      determinedLevel,
    };
  }

  private determineLevel(correct: number, total: number): string {
    const percentage = (correct / total) * 100;
    if (percentage < 20) return 'A1';
    if (percentage < 40) return 'A2';
    if (percentage < 60) return 'B1';
    if (percentage < 75) return 'B2';
    if (percentage < 90) return 'C1';
    return 'C2';
  }
}

export const quizService = new QuizService();