# CONTEXT.md — Campeonato de Portugal ORC 2026

Glossario canonico do projecto. Nao contem decisoes de implementacao — so termos e definicoes precisas.

---

## Tracking Da Regata

A vista publica que acompanha a regata num mapa com barcos, percurso e estado da prova. Quando os dados ainda forem simulados, deve continuar a ser apresentada como uma simulacao visual de tracking.

## Simulacao Visual De Tracking

Representacao animada da regata gerada a partir dos barcos inscritos, certificados e regras de tempo do portal. Nao e GPS real nem fonte oficial de resultados; serve para visualizacao publica ate existir uma fonte live.

## Campo 1 Aproximado

Percurso Barlavento-Sotavento desenhado com coordenadas aproximadas na Baia da Figueira da Foz para suportar a Simulacao Visual De Tracking. Deve poder ser substituido por coordenadas oficiais das marcas quando forem publicadas.

## Anexo A2 / Percurso Barlavento-Sotavento

Documento ou imagem de referencia que explica o percurso oficial da prova. Serve para consulta no Programa, Quadro Oficial ou documentos do evento; nao e a experiencia principal do Tracking Da Regata.

## Mural De Media

Experiencia interactiva de fotografias baseada no projecto `AlexandreXavier/mural`, integrada nativamente no portal e alimentada pelos `mediaItems` do Convex/admin. As imagens devem ser URLs curadas e creditadas a partir da pagina Facebook do evento, nao um manifesto S3 separado.

Na home, o Mural De Media aparece como bloco imersivo alto dentro do portal. Na rota `/media`, a mesma experiencia deve ocupar quase todo o ecra sem perder a navegacao do portal.
