# Skupni ORKA obrazci in prioritete

Mapa `.github/ISSUE_TEMPLATE/` vsebuje skupne obrazce Napaka (Bug), Naloga in
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

1. Objavimo in preverimo skupne obrazce ter ta workflow na privzeti veji.
2. V `templates/issue-priority-caller.yml` nadomestimo
   `__WORKFLOW_COMMIT_SHA__` s celotnim SHA pregledanega objavljenega commita.
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
akcijo. Pripetje na SHA pomeni, da je treba poznejšo spremembo skupnega
workflowa vključiti tudi s posodobitvijo SHA v klicnih datotekah.

Novi repozitoriji lahko skupne obrazce dedujejo samodejno. Klicne datoteke
workflowov se ne dedujejo. Doda jih predloga repozitorija ob njegovi izdelavi
ali posebej nastavljena avtomatizacija. Ta sprememba takega robota ne namešča.

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
