# Skupni ORKA obrazci in prioritete

Mapa `.github/ISSUE_TEMPLATE/` vsebuje skupne obrazce Bug, Naloga in
Funkcionalnost. GitHub jih ponudi repozitorijem organizacije, ki nimajo svojih
veljavnih obrazcev ali konfiguracije v `.github/ISSUE_TEMPLATE/`.
Lokalni in skupni obrazci se ne združujejo.

## Označevanje nalog

`.github/workflows/issue-priority.yml` je ponovno uporaben workflow. Ob odprtju
ali urejanju naloge prebere trenutno vsebino razdelka `### Prioriteta` in nastavi
oznako `1P`, `2P`, `3P` ali `4P`. Manjkajočo, podvojeno ali nepravilno prioriteto
pusti brez sprememb oznak.

**Ohranjena politika iz prvotnega workflowa: na nalogi ostane samo izbrana
prioriteta. Vse druge oznake na tej nalogi se odstranijo.** To velja tudi za
poslovne in ročno dodane oznake. Definicij oznak v repozitoriju ne briše.
Ročna sprememba oznake ne spreminja vsebine obrazca.

Workflow uporablja običajni `GITHUB_TOKEN` s pravico `issues: write`.
Prioriteta na projektni tabli je oznaka same naloge. Dodatno polje Projects,
`PROJECT_TOKEN` in `PROJECT_NUMBER` za ta način niso potrebni.

## Vključitev repozitorija

1. Skupne obrazce objavimo na privzeti veji `main`, pregledano različico
   workflowa pa na izdajni veji `stable`.
2. Uporabimo `templates/issue-priority-caller.yml`, ki kliče `@stable`.
3. Datoteko dodamo ciljnemu repozitoriju kot
   `.github/workflows/orka-issue-priority.yml`.
4. Če obstajata stara `label-priority.yml` in `sync-project-priority.yml`, ju
   po pregledu odstranimo v istem PR-ju. Preverimo tudi morebitne druge
   workflowe za označevanje ali čiščenje oznak.
5. Standardne lokalne obrazce lahko odstranimo šele po preverjeni objavi
   skupnih. Posebne lokalne obrazce ohranimo in skupne obrazce vključimo v
   njihov lokalni komplet, če naj bodo na voljo vsi.
6. V pilotnem repozitoriju preverimo ustvarjanje naloge, spremembo prioritete,
   rezultat Actions in oznako naloge na projektni tabli.

Actions morajo biti omogočeni in dovoljevati ta workflow ter uporabljeno
akcijo. Običajne popravke logike pregledamo in preverimo enkrat ter objavimo
na veji `stable`. Vsi klici `@stable` jih uporabljajo pri naslednjem novem
zagonu, brez sprememb datotek v posameznih repozitorijih. Spremembe
sprožilcev, dovoljenj ali vmesnika klica lahko še vedno zahtevajo spremembo
klicnih datotek.

Novi repozitoriji lahko skupne obrazce dedujejo samodejno. Klicne datoteke
workflowov se ne dedujejo. Robot ORKA Repository Automation, nastavljen v
zasebnem repozitoriju `.github-private`, jih predlaga s PR-jem ob dnevnem
pregledu po prvem commitu. Obdeluje primerne repozitorije z vključenimi Issues;
arhivirane, prazne, izključene repozitorije in konflikte z lastnimi workflowi
pusti brez sprememb. Lastni preverjeni PR lahko sam združi, ko to dovoljujejo
obstoječe zaščite. Če je potreben pregled ali preverjanja še niso uspešna,
PR ostane odprt. Obstoječih tujih PR-jev ne prevzame.

## Objava naslednje različice

1. Popravek skupnega workflowa pripravimo v veji iz `stable` in odpremo PR
   proti `stable`. Obrazci ostajajo na `main` in se s to objavo ne spreminjajo.
2. Zaženemo spodnje teste ter pregledamo spremembo in njene pravice.
3. Po preverjanju združimo PR v `stable`. Ta veja je skupna izdaja za vse
   vključene repozitorije; običajna sprememba na `main` je ne posodobi.
4. V pilotnem repozitoriju preverimo izvajanje in nato rezultat spremljamo.
   Če je potreben povratek, objavimo povrnitveni commit na `stable`, brez
   prepisovanja zgodovine.

Vejo `stable` upravljajo skrbniki organizacije enako kot privzeto vejo.
Izdajni pregled opravljamo centralno, ker sprememba te veje vpliva na vse
repozitorije, ki jo kličejo. Prvotni klici na posamezni SHA potrebujejo samo
enkratno zamenjavo sklica z `@stable`.

## Lokalno preverjanje

Z Node.js 24 ali novejšim:

```sh
npm ci --ignore-scripts
npm run test:priority
```

Testi izvajajo dejansko JavaScript kodo iz workflowa s simuliranim GitHub API.
Preverjajo trenutne podatke naloge, nepravilne vnose, spremembe med izvajanjem,
sočasno ustvarjanje oznak, napake API in navedeno politiko odstranjevanja oznak.
Lokalni testi ne nadomestijo pilotnega preizkusa na GitHubu.

Branje naloge in zapis oznak nista ena transakcija. Če uporabnik vmes spremeni
prioriteto, lahko za kratek čas ostane prejšnja oznaka; naslednji dogodek
`edited` ponovno prebere aktualno vsebino. Sprememba kode sama ne preoznači
vseh starih nalog.

Dokumentacija GitHub: [privzeti obrazci](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file),
[ponovno uporabni workflowi](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows).
