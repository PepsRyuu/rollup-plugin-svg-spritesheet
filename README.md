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
            output: code => {
                // Do something with the generated code
                // eg. write to "spritesheet.svg"
            }
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
            <use xlinkHref={'#' + SVG.id} />
        </svg>
    );
}
```

The above example assumes that you're externally loading the spritesheet and attaching it to the DOM.
You can specify the file using the `use` tag, but if you want to support IE11, you have to use the approach below:

```
let xhr = new XMLHttpRequest();
xhr.open('GET', 'spritesheet.svg', true);
xhr.onload = () => {
    let parser = new DOMParser();
    let doc = parser.parseFromString(xhr.responseText, 'image/svg+xml');
    document.body.insertBefore(doc.documentElement, document.body.firstChild);
};
xhr.send(); 

```