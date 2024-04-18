"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wait = void 0;
const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));
exports.wait = wait;
