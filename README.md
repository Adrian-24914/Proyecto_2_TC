# CFG Parser

Gramática en `cfg-input/gramatica.txt` y la cadena a
validar en `cfg-input/cadena.txt`. Separar cada símbolo de la cadena con espacios, por ejemplo: `id + id * id`.

```sh
npm run cfg
```

El comando muestra la conversión a Forma Normal de Chomsky, la tabla CYK, el
árbol sintáctico (si la cadena es aceptada) y el resultado final.
