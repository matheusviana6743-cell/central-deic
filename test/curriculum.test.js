import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, lessonById, checkAnswer } from '../curriculum.js';
test('curriculum IDs and answer options are valid', () => {
  assert.equal(new Set(lessons.map(x => x.id)).size, lessons.length);
  for (const lesson of lessons) {
    assert.equal(lessonById(lesson.id), lesson);
    assert.equal(lesson.options.length, 3);
    assert.ok(lesson.options.every(x => x.length <= 80));
    assert.equal(checkAnswer(lesson.id, lesson.answer).correct, true);
    assert.equal(checkAnswer(lesson.id, (lesson.answer + 1) % 3).correct, false);
  }
});
test('invalid answers are rejected', () => {
  for (const value of [-1, 3, NaN, '1', 1.5]) assert.equal(checkAnswer('conduta', value), null);
  assert.equal(checkAnswer('unknown', 1), null);
});
