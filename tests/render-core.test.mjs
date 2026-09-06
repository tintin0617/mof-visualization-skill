import test from 'node:test';
import assert from 'node:assert/strict';
import { rotatePoint, projectPoint, bondVisualStyle } from '../skill/mof-visualization/scripts/render-core.mjs';

test('3D rotation changes x and z coordinates', () => {
  const point = rotatePoint([1, 0, 0], 0, { ax: 0, ay: Math.PI / 2, az: 0 });
  assert.ok(Math.abs(point[0]) < 1e-10);
  assert.ok(Math.abs(point[2] + 1) < 1e-10);
});

test('3D perspective makes nearer points larger', () => {
  const near = projectPoint([1, 0, 2], 10);
  const far = projectPoint([1, 0, -2], 10);
  assert.ok(near.perspective > far.perspective);
  assert.ok(near.x > far.x);
});

test('3D animation endpoints are equivalent', () => {
  const start = rotatePoint([1.2, -0.7, 2.4], 0);
  const end = rotatePoint([1.2, -0.7, 2.4], Math.PI * 2);
  start.forEach((value, index) => assert.ok(Math.abs(value - end[index]) < 1e-10));
});

test('coordination bonds are visually stronger than organic bonds', () => {
  const coordination = bondVisualStyle('Zn', 'N', 0.5);
  const organic = bondVisualStyle('C', 'N', 0.5);
  assert.ok(coordination.widthMultiplier > organic.widthMultiplier);
  assert.notEqual(coordination.color, organic.color);
});
