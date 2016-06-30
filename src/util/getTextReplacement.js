var url = require( "url" );
var fs = require( "fs" );

var getRemote = require( "./getRemote" );
var isRemotePath = require( "./isRemotePath" );
var getInlineFilePath = require( "./getInlineFilePath" );

module.exports = function( src, settings, callback )
{
    if( isRemotePath( settings.relativeTo ) || isRemotePath( src ) )
    {
        getRemote( url.resolve( settings.relativeTo, src ), settings, callback );
    }
    else if( isRemotePath( src ) )
    {
        getRemote( src, settings, callback );
    }
    else
    {
        return fs.readFile( getInlineFilePath( src, settings.relativeTo ), callback );
    }
};
