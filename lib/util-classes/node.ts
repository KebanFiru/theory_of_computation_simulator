export class Node {
  x: number;
  y: number;
  r: number;
  id: number;

  constructor({ x, y, r, id }: { x: number; y: number; r: number; id: number }) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.id = id;
  }

  static generateId() {
    return Date.now() + Math.random();
  }

  static from(value: { x: number; y: number; r: number; id: number }) {
    return new Node(value);
  }
}
