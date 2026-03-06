// Wikipedia 7-tuple: M = ⟨Q, Γ, b, Σ, δ, q0, F⟩
// Move directions: L (left), R (right), N (none/stay) — per Wikipedia variant
export type MoveDirection = "L" | "R" | "N";

// 5-tuple: (qi, Sj, Sk, d, qm)
export type TmTransition = {
  from: string;   // current state qi
  read: string;   // symbol scanned Sj
  to: string;     // next state qm
  write: string;  // print symbol Sk
  move: MoveDirection; // tape movement d
};
