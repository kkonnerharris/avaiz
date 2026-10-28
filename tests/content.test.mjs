import test from 'node:test';
import assert from 'node:assert/strict';
import {services,clamp,smooth,makeBrief} from '../src/content.js';
test('three services have unique identifiers and complete details',()=>{assert.equal(Object.keys(services).length,3);assert.equal(new Set(Object.values(services).map(s=>s.number)).size,3);for(const service of Object.values(services)){assert.ok(service.title);assert.ok(service.description.length>80);assert.equal(service.items.length,4)}});
test('scroll progress is bounded',()=>{assert.equal(clamp(-1),0);assert.equal(clamp(2),1);assert.equal(clamp(.4),.4)});
test('scene transitions are continuous with bounded endpoints',()=>{assert.equal(smooth(.1,.4,-2),0);assert.equal(smooth(.1,.4,2),1);assert.ok(Math.abs(smooth(.1,.4,.25)-.5)<1e-10)});
test('brief preserves user content as plain text and states submission status',()=>{const result=makeBrief(' Avaiz ',' <script>alert(1)</script> ');assert.match(result,/Name \/ business: Avaiz/);assert.match(result,/<script>alert\(1\)<\/script>/);assert.match(result,/has not been submitted/)});
