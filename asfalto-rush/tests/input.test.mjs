import assert from 'node:assert/strict';
import { InputManager } from '../src/systems/InputManager.js';

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

function makePad(id) {
  return {
    id,
    connected: true,
    buttons: Array.from({ length: 12 }, () => ({ pressed: false })),
    axes: [0, 0],
    mapping: ''
  };
}

function makeInputs(pad) {
  const scene = {
    input: { keyboard: null, gamepad: { total: 1, getPad: () => pad } },
    sys: { game: { device: { input: { touch: false } } } },
    events: { on() {}, once() {}, off() {} }
  };
  return new InputManager(scene);
}

{
  const pad = makePad('USB Joystick (Vendor: 0079 Product: 0006)');
  const inputs = makeInputs(pad);
  inputs.update();

  pad.buttons[0].pressed = true;
  inputs.update();
  assert.equal(inputs.isDown('jump'), true);
  assert.equal(inputs.isDown('confirm'), false);

  pad.buttons[0].pressed = false;
  inputs.update();
  pad.buttons[2].pressed = true;
  inputs.update();
  assert.equal(inputs.justPressed('confirm'), true);
  assert.equal(inputs.isDown('dash'), false);

  pad.buttons[2].pressed = false;
  pad.buttons[3].pressed = true;
  inputs.update();
  assert.equal(inputs.isDown('dash'), true);
  assert.equal(inputs.isDown('confirm'), false);
  inputs.destroy();
}

{
  const pad = makePad('Standard Gamepad');
  pad.mapping = 'standard';
  const inputs = makeInputs(pad);
  inputs.update();
  pad.buttons[0].pressed = true;
  inputs.update();
  assert.equal(inputs.isDown('confirm'), true);
  inputs.destroy();
}

console.log('gamepad input tests passed');
