# Für Fabienne – Ein Licht

Die zweite, neu gebaute Fassung der Geschichte. Ein einziges Licht aus Tausenden Teilchen
(Three.js) verwandelt sich mit jedem Satz: Treppe, Fall, Glut, Herzschlag, Splitter,
Schutzhülle mit Briefen, eure Karte, Aliyah, der Vorhang, eine Galaxie, der Knoten im Kopf,
28 Tage, Regen, Erinnerungen, eine Blume – und am Ende eine Pusteblume, die sie selbst
wegpustet. Dazu leise, erzeugte Musik (abschaltbar).

- `/` – die Geschichte (`/#s=5` springt direkt zu Seite 5)
- `/alexander` – Lesefortschritt (Passwort = Railway-Variable `ADMIN_PASSWORD`, Benutzername egal)

## Entwickeln
```
npm install
npm run build      # bündelt src/ nach public/app.js
DATABASE_URL=… ADMIN_PASSWORD=… npm start
```

## Umgebungsvariablen
- `DATABASE_URL` – Postgres (auf Railway: `${{Postgres.DATABASE_URL}}`)
- `ADMIN_PASSWORD` – mind. 8 Zeichen
- `PORT` – optional, Standard 3000

Tabellen (`nf_visits`, `nf_progress`, `nf_moments`) werden beim Start angelegt und
vermischen sich nicht mit denen der ersten Seite.
