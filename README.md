Computational Theory Simulator (Frontend)

Overview
This is the Next.js frontend for a DFA-focused computation theory simulator. It provides an interactive canvas to build automata, manage alphabets, create transitions, and inspect transition tables.

Features
- Interactive DFA canvas with states, transitions, and self-loops
- Transition labels and alphabet management
- DFA finalization with transition table and regex view
- Editable saved DFAs

Tech Stack
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

Getting Started
Requirements
- Node.js 18+
- pnpm

Project Structure
- app: Next.js app router pages
- components: UI components (canvas, inputs, dialogs)
- hooks: Canvas and DFA state management hooks
- types: Shared TypeScript types
- public: Static assets

Contributing
Thanks for contributing. Please follow these steps:

1) Fork and clone the repo
2) Create a feature branch
	git checkout -b feature/my-change
3) Install dependencies
	pnpm install
4) Make your changes
5) Run checks
	pnpm lint
	pnpm build
6) Commit and push
	git commit -m "feat: describe change"
	git push origin feature/my-change
7) Open a pull request

Contribution Guidelines
- Keep changes focused and minimal
- Preserve existing UI behavior unless the change requires it
- Prefer typed, reusable utilities and hooks
- Add or update documentation when you change behavior

Issue Reporting
When reporting a bug, include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS details
- Screenshots if applicable

License
See the repository license for details.
