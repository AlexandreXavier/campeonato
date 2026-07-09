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

## Quadro Polar ORC

Vista de performance de um barco inscrito que mostra curvas polares ORC por velocidade e angulo de vento, a partir do VPP associado ao certificado.

## VPP ORC

Dados de previsao de performance do certificado ORC que relacionam velocidade do vento, angulo ao vento e velocidade estimada do barco.

## Participante Autenticado

Pessoa com sessao iniciada no portal que pode gerir os seus proprios barcos e aceder a ferramentas privadas da prova.

## Barco Do Participante

Perfil de um barco pertencente a um Participante Autenticado, ainda separado da sua presenca oficial numa prova.

## Inscricao Na Regata

Pedido que associa um Barco Do Participante a uma regata e frota especificas, sujeito a estado de validacao antes de contar como inscrito oficial.

## Certificado ORC Associado

Certificado ORC ligado a um Barco Do Participante ou a uma Inscricao Na Regata para sustentar classe, rating e dados de performance.

## Base Publica ORC

Fonte externa de certificados ORC usada para pesquisar e associar certificados quando os dados ainda nao existem no portal.

## Calculadora ORC/PCS

Area privada para utilizadores autenticados analisarem pontuacao por curva de performance, vento implicito, tempos corrigidos e dados que suportam resultados ORC.

## Vento Implicito

Vento estimado pelo calculo ORC/PCS a partir do desempenho real de um barco numa regata.

## Tempo Corrigido

Tempo usado para classificar um barco depois de aplicar o calculo ORC/PCS ao seu tempo real e aos dados de performance.

## Percurso Construido

Modelo de percurso composto por pernas com distancia, rumo, vento e corrente, usado pela Calculadora ORC/PCS para gerar curvas e tempos corrigidos.

## Resultado Oficial

Classificacao ou resultado publicado pelo portal como comunicacao oficial da prova, sob responsabilidade editorial da organizacao.

## Frota Aprovada

Conjunto de Inscricoes Na Regata validadas que representa os barcos oficiais da prova.

## Simulacao Privada

Sessao de calculo individual em que um utilizador autenticado pode alterar barcos, tempos, percurso ou parametros sem mudar dados oficiais da prova.

## Mural De Media

Experiencia interactiva de fotografias baseada no projecto `AlexandreXavier/mural`, integrada nativamente no portal e alimentada pelos `mediaItems` do Convex/admin. As imagens devem ser URLs curadas e creditadas a partir da pagina Facebook do evento, nao um manifesto S3 separado.

Na home, o Mural De Media aparece como bloco imersivo alto dentro do portal. Na rota `/media`, a mesma experiencia deve ocupar quase todo o ecra sem perder a navegacao do portal.

## Relações

- Um **Participante Autenticado** pode ter zero ou mais **Barcos Do Participante**.
- Um **Barco Do Participante** pode originar zero ou mais **Inscricoes Na Regata**.
- Uma **Inscricao Na Regata** submetida por um participante deve partir de um **Barco Do Participante** que lhe pertence.
- Uma **Inscricao Na Regata** pertence a uma unica regata e a uma unica frota.
- Uma **Inscricao Na Regata** so deve ser tratada como inscrito oficial depois de validada.
- Uma **Inscricao Na Regata** submetida por participante nasce pendente e so entra na **Frota Aprovada** depois de validacao da organizacao.
- A **Frota Aprovada** e formada por **Inscricoes Na Regata** validadas, nao por **Barcos Do Participante** isolados.
- Um **Barco Do Participante** pode existir sem **Certificado ORC Associado**, mas uma **Inscricao Na Regata** so deve ficar completa quando houver certificado associado.
- A **Base Publica ORC** pode fornecer um **Certificado ORC Associado** quando o portal ainda nao tem o certificado necessario.
- A **Calculadora ORC/PCS** esta disponivel para qualquer **Participante Autenticado**, incluindo utilizadores com papel de editor ou administrador.
- A **Calculadora ORC/PCS** pode explicar **Vento Implicito**, **Tempo Corrigido** e outros calculos, mas nao cria um **Resultado Oficial** por si so.
- A **Calculadora ORC/PCS** deve partir da **Frota Aprovada** quando o objectivo for explicar resultados da prova.
- Uma **Simulacao Privada** pode alterar a base de calculo sem alterar a **Frota Aprovada** nem qualquer **Resultado Oficial**.
