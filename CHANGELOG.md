# Changelog

All notable changes to fordMath. Every page is in German with an English toggle, works offline after the first visit, and shows its working step by step.

## 1.4.0 (2026-11-07)

- **Lineare Funktionen** (`/lineare-funktionen/`, #37): set m and b and watch y = m·x + b.
  - The line is drawn with its Steigungsdreieck, its y-axis point and its Nullstelle, and each is explained in words.
  - Add a second line to see where the two meet, or that they're parallel. A taxi example compares two tariffs.
  - Punktprobe for any point you type.
  - Tap two points to get the line through them, with Δx, Δy and the working for m and b.
  - A 10-question quiz: read m and b, pick the right line from four look-alikes, m from two points, Punktprobe, Nullstelle, tariffs.
  - Lineare Funktionen also come up in Heute üben for Klasse 5–7.

## 1.3.0 (2026-11-07)

- **Koordinaten** (`/koordinaten/`, #30): plot points by tapping and join them up. Each point is explained as "erst gehen, dann steigen" (first along, then up), and named shapes are recognised.
  - Schiffe versenken: set x and y, then fire.
  - A 10-question quiz: read a point, find a point, which quadrant, which shape, the fourth corner of a rectangle.
  - First quadrant for class 4–5, or all four quadrants.
  - Shown for Grundschule and Sek I.

## 1.2.0 (2026-11-07)

- **Gleichungen lösen** (`/gleichungen/`, #34): linear equations step by step, written like in the exercise book with the step on the right ("| − 2", "| : 3").
  - Five levels: a balance (Waage), x on both sides, negatives, brackets, and special cases (fraction answers, L = { }, L = ℚ).
  - The child picks each step. Wrong steps are explained with their own numbers, for example "3x heißt 3 · x. Das Gegenteil von · 3 ist : 3, nicht − 3."
  - The Probe at the end. You can also type your own equation from homework.
  - Gleichungen also come up in Heute üben for Klasse 5–7.
- Planned: **Lineare Funktionen** (#37), with a tile on the homepage.

## 1.1.0 (2026-11-06)

- **Statistik, Quadratische Gleichungen and Funktionen in German** (#36): the DE/EN toggle on the last three English-only pages, sharing the language setting with every other page.
  - Statistics: German words (Mittelwert, Modalwert, Standardabweichung, Quartilsabstand, Ausreißer), decimal commas, and numbers typed as 2,5; 3; 4,5. Switching language rewrites the numbers in the box.
  - Quadratics: the Mitternachtsformel, the p-q-Formel when a = 1, the Scheitelpunkt as S(h | k) with the Scheitelpunktform, the Satz von Vieta as the check, and L = { } when there's no real solution.
  - Functions: the working with · and :, and every typing mistake explained in German, still with the ^ under the problem.
  - The Range warm-up in the DEV_GUIDE now shows both languages.

## 1.0.0 (2026-11-06)

The first complete release: everything a child needs from Grundschule class 3 up to Klasse 7/8, plus a few Oberstufe tools.

### For everyone

- **Heute üben** (`/heute/`): 10 mixed questions a day from the child's level, a day streak 🔥 and progress per topic. Topics a child finds hard come up more often. Now also draws on Prozente and Dreisatz for Klasse 5–7.
- **Homepage**: tiles filtered by school level (Grundschule, Sek I, Oberstufe); planned helpers shown faded, linking to their issue. A "Für Eltern" footer has the test count, the source and the plans, kept away from the children's tiles.
- **Works offline** after the first visit (service worker), and can be added to the home screen.
- **One shared quiz** on the topic pages: dots, streak, stars, and the working after every answer.

### Grundschule

- **Einmaleins**: times tables trainer with Kernaufgaben strategies, dot pictures after a mistake, and Leitner boxes so missed facts come back.
- **Kopfrechnen**: plus and minus up to 1 000, five kinds of question, the school strategy as jumps on a number line.
- **Halbschriftlich**: split by place value (7 · 46 = 7 · 40 + 7 · 6), divide in easy steps, put it back together.
- **Schriftlich rechnen**: written +, −, · and : in the German layout; subtraction by Ergänzen or Abziehen; step through or do it yourself.
- **Stellenwerte**: place-value table up to the billions, numbers in words, rounding on a number line.
- **Größen**: money, length, mass and time with a unit table, time spans in jumps, change counted up with coins.
- **Umfang und Fläche**: draw on squared paper, area and perimeter live, area units.
- **Symmetrie**: mirror a half figure, a "Zaubertafel" that mirrors as you draw, count the lines of symmetry.
- **Sachaufgaben**: find the question, pick the numbers you need, choose the calculation and the answer sentence.

### Sek I (Klasse 5–8)

- **Punkt vor Strich**: tap the operation that comes first and work line by line; place brackets to hit a target.
- **Teiler und Primzahlen**: divisibility rules, divisor pairs, the prime factor ladder, ggT and kgV (lists and Euclid).
- **Brüche**: a game with six levels that unlock with stars, with pizzas and bars and the working after a mistake.
- **Dezimalzahlen**: place-value table with a comma, a zoomable number line, rounding, comparing, written + and −.
- **Negative Zahlen**: a thermometer with the move as an arrow, the four rules, Gegenzahl and Betrag.
- **Winkel**: kinds of angle, estimating, measuring with a draggable Geodreieck, drawing.
- **Quader und Würfelnetze**: a 3D cuboid, volume and surface, units, test any net, all 11 cube nets.
- **Prozentrechnung**: Grundwert, Prozentwert and Prozentsatz from any two, with a Prozentstreifen, the Dreisatz and the formula; discounts, 19 % VAT both ways, interest, and the classic traps.
- **Dreisatz**: proportional and antiproportional Zuordnungen, the three lines with arrows on both sides, a table checker with the graph (line through 0 or hyperbola).
- **Gleichungssysteme**: two equations by Gleichsetzungs-, Einsetzungs- and Additionsverfahren, both lines drawn, with the Probe.
- **Statistik**: mean, median, mode, standard deviation, quartiles and a box plot with outliers.

### Oberstufe

- **Quadratische Gleichungen**: roots, vertex and graph for ax² + bx + c = 0, with the working.
- **Funktionen**: type any f(x) and see how it was read, its graph and f(x) worked out.

### For grown-ups and developers

- Every helper is pure TypeScript with tests (over 800); exact fractions (`Rational`) wherever school maths expects exact answers.
- A **DEV_GUIDE** that teaches TypeScript through this codebase, with a lesson for each feature and an exercise ladder.
- GitHub Actions runs the unit tests, the build and the browser tests (every page offline, a full quiz round on every quiz page) and only then deploys.

## Before 1.0

0.1.0 to 0.29.0 (5–6 November 2026) added the helpers above one issue at a time; see the [closed issues](https://github.com/littleGex/fordMath/issues?q=is%3Aclosed) for each step.
