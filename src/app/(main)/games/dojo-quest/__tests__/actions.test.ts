jest.mock('@/lib/aws/auth-utils', () => ({ getUserSession: jest.fn() }));
jest.mock('@/lib/quest-access', () => ({ getQuestAccess: jest.fn() }));
jest.mock('@/lib/aws/repositories/user.repository', () => ({
  UserRepository: { getTypingDNA: jest.fn() },
}));
jest.mock('@/lib/groq/quest-generator', () => ({ generateQuestContent: jest.fn() }));

import { prepareQuestStage } from '../actions';
import { getUserSession } from '@/lib/aws/auth-utils';
import { getQuestAccess } from '@/lib/quest-access';
import { generateQuestContent } from '@/lib/groq/quest-generator';
import { UserRepository } from '@/lib/aws/repositories/user.repository';

beforeEach(() => {
  jest.resetAllMocks();
  (getUserSession as jest.Mock).mockResolvedValue({ id: 'student', role: 'student' });
  (getQuestAccess as jest.Mock).mockResolvedValue({ belt: 1, profile: { grade_level: 5 } });
  (UserRepository.getTypingDNA as jest.Mock).mockResolvedValue({ weak_keys: { a: 3 } });
});

it('blocks unauthenticated and non-student calls before generating content', async () => {
  for (const user of [null, { id: 'teacher', role: 'teacher' }, { id: 'parent', role: 'parent' }]) {
    (getUserSession as jest.Mock).mockResolvedValue(user);
    await expect(prepareQuestStage(0)).rejects.toThrow('Sign in');
  }
  expect(generateQuestContent).not.toHaveBeenCalled();
});

it('blocks future belts and invalid stage IDs', async () => {
  await expect(prepareQuestStage(2)).rejects.toThrow('Earn this belt');
  await expect(prepareQuestStage(1.5)).rejects.toThrow('Unknown stage');
  expect(generateQuestContent).not.toHaveBeenCalled();
});

it('uses the authenticated learner weakness profile for unlocked stages', async () => {
  (generateQuestContent as jest.Mock).mockResolvedValue({ source: 'ai' });
  await expect(prepareQuestStage(1)).resolves.toEqual({ source: 'ai' });
  expect(UserRepository.getTypingDNA).toHaveBeenCalledWith('student');
  expect(generateQuestContent).toHaveBeenCalledWith(expect.objectContaining({ belt: 1 }), { a: 3 });
});
