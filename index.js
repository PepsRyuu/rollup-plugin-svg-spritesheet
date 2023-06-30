let path = require('path');
let cheerio = require('cheerio');

/**
 * Parses the SVG code, converting it 
 * to a symbol. Definitions are also
 * returned separately as they have to
 * be attached globally to the spritesheet
 * in order to work.
 *
 * @method parse
 * @param {String} name
 * @param {String} code
 * @return {Object}
 */
function parse (options, id, name, code) {
    // Load the current SVG and create a target placeholder.
    let svg = cheerio.load(code, { xmlMode: true })('svg');

    // Remove unnecessary tags in the SVG code.
    // Ideally the developer would manually remove these.
    svg.contents().filter(function () {
        return this.name === 'title' ||
               this.name === 'desc' ||
               this.nodeType === 8 // comment
    }).remove();

    // Root properties for the symbol. More or less
    // just copying them over from the original SVG tag.
    let symbolId = '__svg__spritesheet__' + name;
    let symbolViewBox = svg.attr('viewBox');

    // We need to move the defs out of their original location
    // to a global location in the final document.
    let defs = svg.find('defs').remove();
    let symbolOutput = svg.html();
    let defsOutput;

    // No check would make html() crash.
    if (defs.length) {
        // Find all of the IDs, and scope them.
        defsOutput = defs.html().replace(/\s+id="(.*?)"/g, (match, inner) => {
            let newId = symbolId + '_' + inner;

            // The url() function needs to be replaced with the new ID.
            symbolOutput = symbolOutput.replace(
                new RegExp(`url\\(#${inner}\\)`, 'g'), 
                `url(#${newId})`
            );
            return ` id="${newId}"`;
        });
    }

    let extraAttrs = '';

    if (options) {
        if (options.cleanSymbols) {
            let cleanSymbols = (typeof options.cleanSymbols === 'function'? options.cleanSymbols(id) : options.cleanSymbols) || [];

            cleanSymbols.forEach(prop => {
                symbolOutput = symbolOutput.replace(
                    new RegExp(`\\s+${prop}="(.*?)"`, 'g'),
                    ''
                );
            });
        }

        if (options.symbolAttrs) {
            let symbolAttrs = (typeof options.symbolAttrs === 'function'? options.symbolAttrs(id) : options.symbolAttrs) || {};
            extraAttrs = Object.entries((symbolAttrs) || {}).map(([key, value]) => {
                return `${key}="${value}"`
            }).join(' ');
        }
    }

    symbolOutput = (`
        <symbol id="${symbolId}" viewBox="${symbolViewBox}" ${extraAttrs}>
            ${symbolOutput}
        </symbol>
    `);

    return {
        symbol: {
            id: symbolId,
            code: symbolOutput
        },
        defs: defsOutput
    };
}

module.exports = function (options) {
    let storedDefs = {};
    let storedSymbols = {};
    let changed = false;
    let output;
    let fileRef;

    return {
        /**
         * Parse the SVG document and cache the results.
         *
         * @method transform
         */ 
        transform (code, id) {
            if (path.extname(id) !== '.svg') {
                return;
            }

            let { symbol, defs } = parse(options, id, path.parse(id).name, code);
            storedSymbols[id] = symbol;

            if (defs) {
                storedDefs[id] = defs;
            }

            changed = true;

            return {
                code: `export default {
                    id: '${symbol.id}',
                    file: import.meta.SVG_SPRITESHEET_URL
                }`,
                map: {mappings: ''}
            }
        },

        renderStart() {
            if (changed) {
                output = (`
                    <svg xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            ${Object.keys(storedDefs).map(key => {
                                return storedDefs[key];
                            }).join('\n')}
                        </defs>
                        ${Object.keys(storedSymbols).map(key => {
                            return storedSymbols[key].code;
                        }).join('\n')}
                    </svg> 
                `).replace(/\s+/g, ' ');

                changed = false;
            }

            fileRef = this.emitFile({
                type: 'asset',
                name: options.file,
                source: output
            });
        },

        resolveImportMeta(property) {
            if (property === 'SVG_SPRITESHEET_URL') {
                return `"${this.getFileName(fileRef)}"`
            }
        }
    };
}