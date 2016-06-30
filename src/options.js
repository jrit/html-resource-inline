var xtend = require( "xtend" );

function resolveContent( content ) {
    if ( content instanceof Buffer ) {
        return content.toString();
    }
    return content;
}

module.exports = function ( options ) {
    options.fileContent = resolveContent( options.fileContent );

    return xtend( {}, {
        images: 8,
        svgs: 8,
        scripts: true,
        links: true,
        cssmin: false,
        strict: false,
        relativeTo: "",
        rebaseRelativeTo: "",
        inlineAttribute: "data-inline",
        fileContent: "",
        requestTransform: undefined,
        scriptTransform: undefined,
        linkTransform: undefined
    }, options );
};
