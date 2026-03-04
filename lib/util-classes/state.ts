import { Node } from "./node";

export class State extends Node {
  color: string;

  constructor({ x, y, r, color, id }: { x: number; y: number; r: number; color: string; id: number }) {
    super({ x, y, r, id });
    this.color = color;
  }

  static create({ x, y, color, r = 20, id = Node.generateId() }: { x: number; y: number; color: string; r?: number; id?: number }) {
    return new State({ x, y, r, color, id });
  }

  static from(value: { x: number; y: number; r: number; color: string; id: number }) {
    return new State(value);
  }

  moveTo(x: number, y: number) {
    return new State({ ...this, x, y });
  }
}
