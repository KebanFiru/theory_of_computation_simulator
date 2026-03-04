# Computation Theory Simulator (Frontend)

Interactive canvas-based simulator for finite automata and Turing machine workflows.

## What this app supports

- Create and edit FA/TM states and transitions on a zoomable canvas
- Save selected automata, reopen them for editing, and export/import JSON
- Build NFA from regex and place generated result onto canvas
- Convert selected NFA to DFA
- Generate GNFA / ε-NFA / CFG artifacts from saved automata
- Inspect saved automata cards with transition table, regex view, and input testing

## Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4

## Getting started

### Install

```bash
pnpm install
```

### Run development server

```bash
pnpm dev
```

Open `http://localhost:3000`.

## License

See repository license.
