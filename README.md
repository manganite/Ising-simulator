# 2D Ising Model Multi-Sim

A real-time simulation of the 2D Ising model comparing phase transitions at different temperatures (Below, At, and Above the Critical Temperature $T_c$).

### [Live Demo](https://manganite.github.io/Ising-simulator/)

## Features
- **Triple Simulation**: Compare three independent grids running at different temperatures simultaneously.
- **Real-time Visualization**: High-performance canvas rendering using direct pixel manipulation.
- **Thermodynamic Stats**: Live tracking of Magnetization, Energy, Susceptibility ($\chi$), and Specific Heat ($C_v$).
- **Interactive Controls**: Adjust grid size and pause/reset simulations.
- **Responsive Design**: Optimized for both desktop and mobile viewing.

## Tech Stack
- **React 19** + **Vite**
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Lucide React** for iconography
- **GitHub Actions** for automated deployment to GitHub Pages

## Running Locally
1. Clone the repo: `git clone https://github.com/manganite/Ising-simulator.git`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Build for production: `npm run build`
