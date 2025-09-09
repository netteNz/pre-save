# 🎵 Pre-Save Project

A successor to the original `web-audio-app` — evolving the standalone audio player into a pre-save platform for music releases.

## Overview
- Keeps the original player as a module at `web-audio-app/`.
- Plan: add a client (`client/`) and a backend to coordinate pre-save flows (Spotify / Apple Music), artist pages, and analytics.

## Repo layout (planned)
- web-audio-app/ — original audio player (kept as-is)
- client/ — React + Vite frontend (TBD)
- server/ — Flask or Django REST API (TBD)
- docs/ — design / API notes (TBD)

## Quick start (notes)
- The `web-audio-app/` module can be run independently. Add project-specific setup instructions here when the frontend/server are scaffolded.

## Roadmap
- [ ] Keep `web-audio-app` standalone
- [ ] Scaffold `client/` (React + Vite + Tailwind)
- [ ] Implement `server/` (Flask or Django)
- [ ] Integrate Spotify / Apple pre-save flows
- [ ] Add analytics and engagement tracking

## Contributing
Open issues or PRs. Add design notes to `docs/` and implementation work to `client/` or `server/` folders.

## License
MIT

## Author
Built by netteNz — https://github.com/netteNz
