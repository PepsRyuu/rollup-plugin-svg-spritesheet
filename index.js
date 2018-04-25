let fs = require('fs');
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
function parse (name, code) {
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
    let symbolWidth = svg.attr('width');
    let symbolHeight = svg.attr('height');
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

    symbolOutput = (`
        <symbol id="${symbolId}" height="${symbolHeight}" width="${symbolWidth}" viewBox="${symbolViewBox}">
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

    return {
        /**
         * Parse the SVG document and cache the results.
         *
         * @method transform
         */ 
        transform: (code, id) => {
            if (path.extname(id) !== '.svg') {
                return;
            }

            let { symbol, defs } = parse(path.parse(id).name, code);
            storedSymbols[id] = symbol;

            if (defs) {
                storedDefs[id] = defs;
            }

            changed = true;

            return {
                code: `export default {
                    id: '${symbol.id}'
                }`,
                map: {mappings: ''}
            }
        },

        /**
         * Call the output function with the final spritesheet.
         *
         * @method ongenerate
         */
        ongenerate: () => {
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

            options.output(output);
        }
    };
}