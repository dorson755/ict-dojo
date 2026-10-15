import { isLearnerProfile } from '../learner-filter';

describe('isLearnerProfile', () => {
  it('keeps students and profiles with no role', () => {
    expect(isLearnerProfile({ id: '1', role: 'student' })).toBe(true);
    expect(isLearnerProfile({ id: '2' })).toBe(true);
    expect(isLearnerProfile({ id: '3', email: 'kid@gmail.com' })).toBe(true);
  });

  it('drops teachers, admins and parents', () => {
    expect(isLearnerProfile({ id: '1', role: 'teacher', email: 'dorson@live.com' })).toBe(false);
    expect(isLearnerProfile({ id: '2', role: 'admin' })).toBe(false);
    expect(isLearnerProfile({ id: '3', role: 'parent' })).toBe(false);
  });

  it('drops developer teacher and principal test accounts that have no role', () => {
    expect(isLearnerProfile({ id: '1', email: 'dev.ai.teacher@ict-dojo.test' })).toBe(false);
    expect(isLearnerProfile({ id: '2', email: 'dev.principal@ict-dojo.test' })).toBe(false);
  });

  it('keeps the developer student account, which the teacher page also lists', () => {
    expect(isLearnerProfile({ id: '1', email: 'dev.ai.student@ict-dojo.test' })).toBe(true);
  });
});
