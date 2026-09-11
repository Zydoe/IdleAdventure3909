# Idle Adventure

Idle Adventure is a multiplayer text‑adventure game hosted at https://idleadventure.benjudson.com. Originally created as the final project for an Internet Programming course, it earned a perfect 100%. The game blends classic text‑adventure mechanics with a modern graphical interface, combining hand‑drawn artwork with AI‑assisted visuals.

## Overview

Idle Adventure allows players to explore a shared world using simple text commands. The interface updates in real time as players move, interact with objects, and encounter other players. The world is lightweight, responsive, and intentionally nostalgic.

The entire project is built with:
- Vanilla JavaScript
- JQuery
- Pure CSS and HTML
- A Node.js backend
- No frameworks like React

## Features

### Text‑Driven Exploration
Players navigate using natural commands such as `go north`, `look`, `take`, or `talk`.

### Multiplayer World
All players inhabit the same world simultaneously. Movement, interactions, and world changes are broadcast in real time.

### Hybrid Art Style
Idle Adventure uses a mix of:
- Hand‑drawn illustrations
- AI‑generated assets
- Minimalist UI elements

This creates a unique aesthetic that feels both retro and modern.

### Pure Vanilla Web Stack
Idle Adventure is intentionally built without frameworks. Everything is handcrafted using:
- JavaScript for logic and networking
- CSS for layout and animation
- HTML for structure
- Node.js for the server
This keeps the project lightweight, transparent, and easy to understand.

### Combat and inventory management
- A combat system for fighting enemies in a turn based fashion
- An inventory and item system for gearing up and taking on challenges

## Architecture

Idle Adventure is structured around a simple but robust architecture:

| Layer | Description |
|-------|-------------|
| Client | Renders the UI, sends commands, displays world state |
| Server (Node.js) | Processes commands, updates world state, broadcasts changes |
| World Engine | Custom text‑adventure engine with rooms, items, NPCs, and events |
| Networking | Lightweight real‑time communication for multiplayer interactions |

## How to Play

1. Visit https://idleadventure.benjudson.com  
2. Enter a username  
3. Use text commands to explore  
4. Watch the world respond in real time  
5. Encounter other players and discover hidden areas  

## Development Goals

Idle Adventure began as a class project but is built with long‑term potential in mind. Future improvements may include:
- Additional areas and storylines
- Richer NPC interactions
- Inventory and crafting systems
- Player‑to‑player trading
- In depth and progression

## Project Philosophy

Idle Adventure is inspired by:
- Early text adventures
- Minimalist web development
- Multiplayer experimentation
- Creative worldbuilding

By avoiding frameworks, the project remains transparent and educational—ideal for students, hobbyists, and anyone curious about building a multiplayer browser game from scratch.

## Author

**Ben Judson**  
Computer Science student, game developer, and creator of Idle Adventure.
