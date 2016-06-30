var url = require( "url" );
var datauri = require( "datauri" );

var getRemote = require( "./getRemote" );
var isRemotePath = require( "./isRemotePath" );
var getInlineFilePath = require( "./getInlineFilePath" );

module.exports = function( src, settings, callback ) {
    if( isRemotePath( settings.relativeTo ) )
    {
        getRemote( url.resolve( settings.relativeTo, src ), settings, callback, true );
    }
    else if( isRemotePath( src ) )
    {
        getRemote( src, settings, callback, true );
    }
    else
    {
        var result = ( new datauri( getInlineFilePath( src, settings.relativeTo ) ) ).content;
        callback( result === undefined ? new Error( "Local file not found" ) : null, result );
    }
};
