# Mate Reset

AplicaÈ›ie educaÈ›ionalÄƒ pentru clasele Vâ€“VII:
- trasee ghidate;
- lecÈ›ii animate;
- simulÄƒri interactive;
- joc pe echipe turn-based cu validare automatÄƒ;
- rapoarte È™i export PDF;
- import/export conÈ›inut custom + Content QA.

## Cum porneÈ™ti proiectul

Important: ruleazÄƒ comenzile din folderul proiectului (`mate-reset`), nu din folderul pÄƒrinte.

```bash
cd "F:\mate rest\mate-reset"
npm install
npm run dev
```

Scripturi disponibile:
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run fix:content`

## Ce s-a adÄƒugat

1. UI kit unificat: `src/ui/` (`Button`, `Card`, `Modal`, `Progress`, `Badge`, `Icon`).
2. AnimaÈ›ii reale: `src/animation/` + tranziÈ›ii de paginÄƒ.
3. Ecran nou `AdminContent`: upload/import/export/reset pentru conÈ›inut custom.
4. QA stabil: validare pentru exerciÈ›ii, lecÈ›ii È™i simulÄƒri + sugestii + filtre.
5. TeamQuiz: Ã®ntrebÄƒri custom suportate prin `teamQuiz` Ã®n JSON.
6. Export PDF: utilitar dedicat `src/reports/generateReport.js`.

## Cum foloseÈ™ti Admin upload

1. IntrÄƒ Ã®n `Panou Administrator` (card pe Home sau din Mod profesor).
2. `DescarcÄƒ Template JSON`.
3. CompleteazÄƒ fiÈ™ierul cu:
   - `exercises`
   - `lessons`
   - `simulations`
   - `teamQuiz` (opÈ›ional)
4. `Import conÈ›inut (JSON)` È™i verificÄƒ raportul.
5. `AplicÄƒ importul`.
6. OpÈ›ional:
   - `Export conÈ›inut importat`
   - `Export conÈ›inut (merged)`
   - `Reset conÈ›inut importat`.

Datele se pÄƒstreazÄƒ local Ã®n `localStorage`:
- `mateReset.customContent.v1`
- `mateResetProgress`

## Cum generezi raport

1. IntrÄƒ Ã®n `Rapoarte`.
2. Alege tab: `Raport elev` sau `Raport clasÄƒ`.
3. ApasÄƒ `Download PDF` sau `PrinteazÄƒ`.

## Cum porneÈ™ti jocul pe echipe

1. IntrÄƒ Ã®n `Joc pe echipe`.
2. ConfigureazÄƒ modul, dificultate, echipe, runde.
3. Start joc:
   - fiecare echipÄƒ rÄƒspunde pe rÃ¢nd;
   - validare automatÄƒ;
   - puncte/streak;
   - clasament final + export JSON sesiune.


## Revenire rapida la varianta curenta

Daca vrei sa testezi schimbari mari si sa poti reveni imediat:

1. Creeaza snapshot:
```bash
npm run snapshot
```

2. Revino la ultimul snapshot:
```bash
npm run restore:snapshot
```

3. Revino la un snapshot specific:
```bash
npm run restore:snapshot -- --id=YYYYMMDD-HHMMSS
```


## Revenire rapida la varianta curenta

Daca vrei sa testezi schimbari mari si sa poti reveni imediat:
- Creeaza snapshot: npm run snapshot
- Revino la ultimul snapshot: npm run restore:snapshot
- Revino la un snapshot specific: npm run restore:snapshot -- --id=YYYYMMDD-HHMMSS

