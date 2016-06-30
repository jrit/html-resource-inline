var htmlparser = require( "htmlparser2" );

module.exports = function( content, id ) {
    return new Promise( function( resolve, reject ) {
        var handler = new htmlparser.DomHandler( function( err, dom ) {
            if( err ) {
                return reject( err );
            }

            var svg = htmlparser.DomUtils.getElements( { id: id }, dom );
            if( svg.length ) {
                return resolve( svg[ 0 ] );
            }

            return resolve( "" );

        }, { normalizeWhitespace: true } );
        var parser = new htmlparser.Parser( handler, { xmlMode: true } );
        parser.write( content );
        parser.done();
    } );
};
