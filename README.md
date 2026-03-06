# Computation Theory Simulator

Interactive canvas-based simulator for finite automata and Turing machine workflows.

## Features

### Finite Automata (FA)

- Create start / normal / accept states on a zoomable canvas
- Add transitions with symbol-level labels
- Save selected automata, reopen for editing, move, and export/import JSON
- Convert selected NFA to DFA
- Generate GNFA and CFG artifacts from selected FA
- View transition table, regex view, and run input tests

### Turing Machines (TM)

- Create TM states: normal, final (accept), and reject
- Create TM transitions with format:
  - single tape: `read/write,move` (example: `0/1,R`)
  - multi tape: `segment;segment;...` where each segment is `read/write,move`
    (example for 2 tapes: `0/1,R;_/_,N`)
- Supported moves per tape: `L`, `R`, `N`
- Nondeterministic TM transitions are supported (multiple outgoing transitions for the same read tuple)
- Multi-tape TM transitions are supported (tape count inferred from transition labels)
- TM transition-only validation between TM states
- Save and inspect TM cards with:
	- transition table (`State`, per-tape `Read/Write/Move`, `Next`)
	- 7-tuple summary (`Q, Γ, b, Σ, δ, q0, F`)
	- input execution test with branch exploration (accept/reject)

## TM Model Scope

Current TM implementation is:

- supports single-tape and multi-tape transitions
- supports deterministic and nondeterministic branching
- single-symbol read/write per tape segment
- halting by accept state, explicit reject state, or undefined transition
- input is placed on tape 1; additional tapes start blank

## Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4

## Getting Started

### Install

```bash
pnpm install
```

### Run development server

```bash
pnpm dev
```