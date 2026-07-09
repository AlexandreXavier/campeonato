# Media Facebook ORC

Colocar aqui fotografias autorizadas/exportadas da pagina Facebook
`Campeonato de Portugal ORC`.

Exemplos de nomes:

- `campeonato-orc-01.jpg`
- `campeonato-orc-02.jpg`
- `campeonato-orc-03.jpg`

Depois de copiar as imagens para esta pasta, executar:

```bash
npm run media:optimize
```

O script cria versões `.webp` leves em `public/media/facebook-orc/webp`. A rota
`/api/media/facebook-orc` usa essas versões otimizadas automaticamente e o mural
mostra-as antes dos itens Convex.
