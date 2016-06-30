var path = require( "path" );

module.exports = function( src, relativeTo )
{
    src = src.replace( /^\//, "" );
    return path.resolve( relativeTo, src ).replace( /\?.*$/, "" );
};
