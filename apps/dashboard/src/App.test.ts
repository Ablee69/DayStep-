import { describe, expect, it } from 'vitest';
import { filterStudents, isTeacherRole, isValidScore } from './App';

describe('filterStudents', () => {
  it('matches a student name or course', () => {
    expect(filterStudents('林晓晴', 'all').map((student) => student.name)).toEqual(['林晓晴']);
    expect(filterStudents('托福', 'all').map((student) => student.name)).toEqual(['陈子轩']);
  });

  it('returns only students requiring attention', () => {
    expect(filterStudents('', 'attention').map((student) => student.name)).toEqual(['陈子轩']);
  });

  it('returns no results for an unknown keyword', () => {
    expect(filterStudents('不存在的项目', 'all')).toEqual([]);
  });
});

describe('isValidScore', () => {
  it('accepts the inclusive score boundaries', () => {
    expect(isValidScore('0')).toBe(true);
    expect(isValidScore('100')).toBe(true);
  });

  it('rejects empty, non-numeric, and out-of-range values', () => {
    expect(isValidScore('')).toBe(false);
    expect(isValidScore('A')).toBe(false);
    expect(isValidScore('-1')).toBe(false);
    expect(isValidScore('101')).toBe(false);
  });
});

describe('isTeacherRole', () => {
  it('allows only workspace owners and teachers into the teacher shell', () => {
    expect(isTeacherRole('owner')).toBe(true);
    expect(isTeacherRole('teacher')).toBe(true);
    expect(isTeacherRole('student')).toBe(false);
    expect(isTeacherRole('member')).toBe(false);
  });
});
