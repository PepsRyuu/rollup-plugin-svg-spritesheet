# rollup-plugin-svg-spritesheet

Allows you to import SVGs into your code, but bundles the SVGs separately into a separate SVG file.
This is preferable for maximising parallel loading, and to minimise parse/compile times.

## How to use

```
let svg_spritesheet = require('rollup-plugin-svg-spritesheet');

rollup({
    ...
    plugins: [
        svg_spritesheet({
            file: 'spritesheet.svg'
        }),
    ]
});
```

In your code, use the SVG use tag:

```
import SVG from './svgs/MyIcon.svg';

export function MyIcon () {
    return (
        <svg>
            <use xlinkHref={svg.file + '#' + SVG.id} />
        </svg>
    );
}
```

## Options

* **file**: String, Specify the filename for the output. This will following your Rollup config's `assetFileNames` pattern.
* **cleanSymbols**: Array of strings, Clear the symbols of these attributes prior to adding to spritesheet. eg. `['fill', 'style']`
* **symbolAttrs**: Object, Additional attribute and values to add to each symbol. eg. `{ fill: 'currentColor' }`