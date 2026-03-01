export type MoveDirection = "L" | "R" | "S";

export type TmTransition = {
  from: string;
  read: string;
  to: string;
  write: string;
  move: MoveDirection;
};
